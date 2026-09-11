import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { BuyerBottomNavigation } from '@/components/buyer-bottom-navigation';
import { BuyerHeader } from '@/components/buyer-header';
import {
  BuyerReview,
  CartItem,
  PineappleProduct,
  loadBuyerReviews,
  loadPineappleProducts,
  readBuyerCart,
  writeBuyerCart,
} from '@/lib/buyer-marketplace';
import { GREEN, styles } from '@/styles/buyer-product-detail.styles';

type RatingFilter = 'all' | 1 | 2 | 3 | 4 | 5;
type SortOption = 'recent' | 'highest' | 'lowest' | 'helpful';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Recent' },
  { value: 'highest', label: 'Highest' },
  { value: 'lowest', label: 'Lowest' },
  { value: 'helpful', label: 'Helpful' },
];

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1].replace(/[^A-Za-z]/g, '')[0]).toUpperCase();
}

function formatReviewDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(parsed);
}

// Same copy for every size — this listing is for bulk/wholesale ordering,
// so the pitch doesn't change when the buyer switches sizes.
const BULK_DESCRIPTION =
  'Buy in bulk directly from our farm. Every pineapple is handpicked, sorted, and freshly packed for wholesale and large-volume orders.';

function sizeBadge(sizeName: string) {
  return sizeName.trim().charAt(0).toUpperCase() || '?';
}

function StarIcon({ filled = true, size = 11 }: { filled?: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#F59E0B' : '#E2E8F0'}>
      <Path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        stroke={filled ? '#F59E0B' : '#CBD5E1'}
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronRightIcon({ expanded = false, size = 20 }: { expanded?: boolean; size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}>
      <Path
        d="M9 18l6-6-6-6"
        stroke="#176D34"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ReviewCard({
  review,
  helpfulCount,
  marked,
  onToggleHelpful,
}: {
  review: BuyerReview;
  helpfulCount: number;
  marked: boolean;
  onToggleHelpful: () => void;
}) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewCardHeader}>
        <View style={styles.reviewerMeta}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initialsFor(review.name)}</Text>
          </View>
          <View style={styles.reviewerDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.reviewerName}>{review.name}</Text>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified</Text>
              </View>
            </View>
            <Text style={styles.reviewSubInfo}>
              {formatReviewDate(review.date)} • {review.productSize}
            </Text>
          </View>
        </View>
        <View style={styles.reviewStarsRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <StarIcon key={s} filled={s <= review.rating} size={11} />
          ))}
        </View>
      </View>
      <Text style={styles.reviewComment}>{review.text}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={marked ? 'Remove helpful vote' : 'Mark as helpful'}
        hitSlop={6}
        onPress={onToggleHelpful}
        style={[styles.helpfulButton, marked && styles.helpfulButtonActive]}>
        <Text style={[styles.helpfulButtonText, marked && styles.helpfulButtonTextActive]}>
          👍 Helpful ({helpfulCount})
        </Text>
      </Pressable>
    </View>
  );
}

export default function BuyerProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [products, setProducts] = useState<PineappleProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(id ? Number(id) : null);
  const [quantity, setQuantity] = useState(1);
  const [cartNotice, setCartNotice] = useState('');
  const [showAllReviews, setShowAllReviews] = useState(false);

  const [reviews, setReviews] = useState<BuyerReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState('');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [helpfulIds, setHelpfulIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setReviewsLoading(true);
    loadBuyerReviews()
      .then((loaded) => { if (!cancelled) setReviews(loaded); })
      .catch((caught) => { if (!cancelled) setReviewsError(caught instanceof Error ? caught.message : 'Could not load reviews.'); })
      .finally(() => { if (!cancelled) setReviewsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function toggleHelpful(reviewId: number) {
    setHelpfulIds((current) => {
      const next = new Set(current);
      if (next.has(reviewId)) next.delete(reviewId); else next.add(reviewId);
      return next;
    });
  }

  const ratingCounts = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((review) => { counts[review.rating] = (counts[review.rating] || 0) + 1; });
    return counts;
  }, [reviews]);

  const reviewAverage = useMemo(
    () => (reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0),
    [reviews],
  );

  const filteredReviews = useMemo(() => {
    const matching = ratingFilter === 'all' ? [...reviews] : reviews.filter((review) => review.rating === ratingFilter);
    const helpfulCount = (review: BuyerReview) => (helpfulIds.has(review.id) ? 1 : 0);
    return matching.sort((a, b) => {
      if (sortBy === 'highest') return b.rating - a.rating;
      if (sortBy === 'lowest') return a.rating - b.rating;
      if (sortBy === 'helpful') return helpfulCount(b) - helpfulCount(a);
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [reviews, ratingFilter, sortBy, helpfulIds]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const loaded = await loadPineappleProducts();
      setProducts(loaded);
      setSelectedId((current) => {
        if (current && loaded.some((item) => item.id === current)) return current;
        return loaded.find((item) => item.available)?.id ?? loaded[0]?.id ?? null;
      });
    } catch (caught) {
      setProducts([]);
      setError(caught instanceof Error ? caught.message : 'Could not load this product.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const product = products.find((item) => item.id === selectedId) ?? null;
  const inStock = !!product && product.available && product.stock_quantity > 0;
  const total = product ? product.price * quantity : 0;

  const handleSelectSize = useCallback((nextId: number) => {
    setSelectedId(nextId);
    setQuantity(1);
    setCartNotice('');
  }, []);

  const handleAddToCart = useCallback(async () => {
    if (!product || !inStock) return;
    setCartNotice('');
    const cart = await readBuyerCart();
    const existing = cart.find((item) => item.product_id === product.id);
    const nextCart: CartItem[] = existing
      ? cart.map((item) => (item.product_id === product.id ? { ...item, quantity: item.quantity + quantity } : item))
      : [...cart, { product_id: product.id, quantity, size_name: product.size_name, weight: product.weight, price: product.price }];
    await writeBuyerCart(nextCart);
    setCartNotice(`Added ${quantity} × ${product.size_name} Pineapple to your cart.`);
  }, [product, inStock, quantity]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <BuyerHeader showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image accessibilityIgnoresInvertColors source={require('@/assets/images/pineapple-product.png')} style={styles.heroImage} />
        </View>

        <View style={styles.sheet}>
          {loading ? (
            <ActivityIndicator style={styles.loader} color={GREEN} />
          ) : error ? (
            <Text style={styles.loadError}>{error}</Text>
          ) : !product ? (
            <Text style={styles.emptyText}>No pineapples available right now.</Text>
          ) : (
            <>
              <View style={styles.titleRow}>
                <Text style={styles.productName}>{product.size_name} Pineapple</Text>
                <Text style={styles.weightRange}>{product.weight}</Text>
              </View>
              <Text style={styles.subtitle}>{inStock ? `${product.stock_quantity} ${product.unit_label || 'pcs'} in stock` : 'Out of stock'}</Text>

              <Text style={styles.sizeLabel}>Choose Size</Text>
              <View style={styles.sizeRow}>
                {products.map((item) => {
                  const active = item.id === selectedId;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${item.size_name} size`}
                      accessibilityState={{ selected: active }}
                      key={item.id}
                      onPress={() => handleSelectSize(item.id)}
                      style={[styles.sizePill, active && styles.sizePillActive]}>
                      <Text style={[styles.sizePillTitle, active && styles.sizePillTitleActive]}>{sizeBadge(item.size_name)}</Text>
                      <Text style={[styles.sizePillSubtitle, active && styles.sizePillSubtitleActive]}>{item.size_name}</Text>
                      <View style={[styles.sizePillUnderline, active && styles.sizePillUnderlineActive]} />
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.descriptionHeading}>Description</Text>
              <Text style={styles.descriptionText}>{BULK_DESCRIPTION}</Text>

              <View style={styles.footer}>
                <View style={styles.priceBlock}>
                  <Text style={styles.priceLabel}>Total</Text>
                  <Text style={styles.priceValue}>₱{total.toFixed(2)}</Text>
                </View>

                <View style={styles.quantityRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Decrease quantity"
                    onPress={() => setQuantity((value) => Math.max(1, value - 1))}
                    style={styles.quantityButton}>
                    <Text style={styles.quantityButtonText}>−</Text>
                  </Pressable>
                  <Text style={styles.quantityValue}>{quantity}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Increase quantity"
                    onPress={() => setQuantity((value) => Math.min(product.stock_quantity || 99, value + 1))}
                    style={styles.quantityButton}>
                    <Text style={styles.quantityButtonText}>+</Text>
                  </Pressable>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={inStock ? 'Add to cart' : 'Out of stock'}
                  disabled={!inStock}
                  onPress={handleAddToCart}
                  style={({ pressed }) => [styles.addToCartButton, !inStock && styles.addToCartDisabled, pressed && inStock && styles.addToCartPressed]}>
                  <Text style={styles.addToCartText}>{inStock ? 'Add to Cart' : 'Out of Stock'}</Text>
                </Pressable>
              </View>

              {cartNotice ? <Text style={styles.cartNotice}>{cartNotice}</Text> : null}
            </>
          )}

          {/* CUSTOMER REVIEWS SECTION */}
          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeaderRow}>
              <View style={styles.reviewsTitleGroup}>
                <View style={styles.reviewsTitleRow}>
                  <Text style={styles.reviewsTitle}>Customer Reviews</Text>
                  <View style={styles.reviewsCountBadge}>
                    <Text style={styles.reviewsCountText}>({reviews.length})</Text>
                  </View>
                </View>
                <Text style={styles.reviewsSubtitle}>Verified purchases from Tagaytay farm</Text>
              </View>

              {/* Clean arrow button: no text, no border line */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showAllReviews ? 'Show fewer reviews' : 'View all reviews'}
                hitSlop={12}
                onPress={() => setShowAllReviews((prev) => !prev)}
                style={({ pressed }) => [styles.arrowButton, pressed && styles.arrowButtonPressed]}>
                <ChevronRightIcon expanded={showAllReviews} />
              </Pressable>
            </View>

            {/* RATING SUMMARY SCOREBOARD */}
            <View style={styles.scoreboardCard}>
              <View style={styles.scoreColumn}>
                <Text style={styles.scoreBig}>{reviewAverage ? reviewAverage.toFixed(1) : '—'}</Text>
                <View style={styles.scoreStarsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <StarIcon key={s} filled={s <= Math.round(reviewAverage)} size={11} />
                  ))}
                </View>
                <Text style={styles.scoreCountText}>{reviews.length} review{reviews.length === 1 ? '' : 's'}</Text>
              </View>

              <View style={styles.scoreBreakdown}>
                {[5, 4, 3, 2, 1].map((star) => (
                  <View key={star} style={styles.barRow}>
                    <Text style={styles.barLabel}>{star}★</Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { width: reviews.length ? `${(ratingCounts[star] / reviews.length) * 100}%` : '0%' },
                        ]}
                      />
                    </View>
                    <Text style={styles.barValue}>{ratingCounts[star]}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* RATING FILTER CHIPS */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {(['all', 5, 4, 3, 2, 1] as RatingFilter[]).map((value) => {
                const active = ratingFilter === value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    key={String(value)}
                    onPress={() => setRatingFilter(value)}
                    style={[styles.filterChip, active && styles.filterChipActive]}>
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {value === 'all' ? 'All' : `${value}★`}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* SORT ROW */}
            <View style={styles.sortRow}>
              <Text style={styles.sortLabel}>Sort by</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {SORT_OPTIONS.map((option) => {
                  const active = sortBy === option.value;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      key={option.value}
                      onPress={() => setSortBy(option.value)}
                      style={[styles.sortButton, active && styles.sortButtonActive]}>
                      <Text style={[styles.sortButtonText, active && styles.sortButtonTextActive]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* REVIEWS LIST */}
            {reviewsLoading ? (
              <ActivityIndicator style={styles.loader} color={GREEN} />
            ) : reviewsError ? (
              <Text style={styles.loadError}>{reviewsError}</Text>
            ) : filteredReviews.length === 0 ? (
              <Text style={styles.emptyText}>
                {reviews.length === 0 ? 'No reviews yet — be the first to rate an order!' : 'No reviews at this rating yet.'}
              </Text>
            ) : (
              (showAllReviews ? filteredReviews : filteredReviews.slice(0, 3)).map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  helpfulCount={helpfulIds.has(review.id) ? 1 : 0}
                  marked={helpfulIds.has(review.id)}
                  onToggleHelpful={() => toggleHelpful(review.id)}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <BuyerBottomNavigation activeTab="order" />
    </SafeAreaView>
  );
}
