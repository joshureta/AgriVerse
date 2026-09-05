import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { BuyerBottomNavigation } from '@/components/buyer-bottom-navigation';
import { BuyerHeader } from '@/components/buyer-header';
import { CartItem, PineappleProduct, loadPineappleProducts, readBuyerCart, writeBuyerCart } from '@/lib/buyer-marketplace';
import { GREEN, styles } from '@/styles/buyer-product-detail.styles';

interface ReviewItem {
  id: string;
  name: string;
  initials: string;
  rating: number;
  date: string;
  size: string;
  verified: boolean;
  comment: string;
}

const REVIEWS: ReviewItem[] = [
  {
    id: '1',
    name: 'Maria Santos',
    initials: 'MS',
    rating: 5,
    date: '2 days ago',
    size: 'Medium Size',
    verified: true,
    comment: "Sweetest pineapples I've had! Delivered fresh, naturally sweet, and right on time for our store.",
  },
  {
    id: '2',
    name: 'Carlos Reyes',
    initials: 'CR',
    rating: 4,
    date: '1 week ago',
    size: 'Large Size',
    verified: true,
    comment: 'Great quality and generous size. Perfectly sweet and firm leaves. Will definitely reorder again.',
  },
  {
    id: '3',
    name: 'Ana Lim',
    initials: 'AL',
    rating: 5,
    date: '2 weeks ago',
    size: 'Small Size',
    verified: true,
    comment: 'Perfect ripeness and fragrance. Used them for fresh fruit shakes and the natural flavor was incredible.',
  },
  {
    id: '4',
    name: 'Juan Dela Cruz',
    initials: 'JD',
    rating: 5,
    date: '3 weeks ago',
    size: 'Medium Size',
    verified: true,
    comment: 'Ordered 2 crates for wholesale. Super sweet and fresh from Tagaytay. Packed very securely.',
  },
  {
    id: '5',
    name: 'Angela Reyes',
    initials: 'AR',
    rating: 5,
    date: '1 month ago',
    size: 'Large Size',
    verified: true,
    comment: 'Very fragrant and juicy with low acidity. Everyone loved it during our family gathering.',
  },
  {
    id: '6',
    name: 'Kevin Lopez',
    initials: 'KL',
    rating: 4,
    date: '1 month ago',
    size: 'Large Size',
    verified: true,
    comment: 'Good flavor and fair farm price. The fruit inside was intact and very fresh on arrival.',
  },
];

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

function ReviewCard({ review }: { review: ReviewItem }) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewCardHeader}>
        <View style={styles.reviewerMeta}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{review.initials}</Text>
          </View>
          <View style={styles.reviewerDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.reviewerName}>{review.name}</Text>
              {review.verified ? (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓ Verified</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.reviewSubInfo}>
              {review.date} • {review.size}
            </Text>
          </View>
        </View>
        <View style={styles.reviewStarsRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <StarIcon key={s} filled={s <= review.rating} size={11} />
          ))}
        </View>
      </View>
      <Text style={styles.reviewComment}>{review.comment}</Text>
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
                    <Text style={styles.reviewsCountText}>({REVIEWS.length})</Text>
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
                <Text style={styles.scoreBig}>4.9</Text>
                <View style={styles.scoreStarsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <StarIcon key={s} filled={true} size={11} />
                  ))}
                </View>
                <Text style={styles.scoreCountText}>18 reviews</Text>
              </View>

              <View style={styles.scoreBreakdown}>
                <View style={styles.barRow}>
                  <Text style={styles.barLabel}>5★</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: '88%' }]} />
                  </View>
                  <Text style={styles.barValue}>16</Text>
                </View>
                <View style={styles.barRow}>
                  <Text style={styles.barLabel}>4★</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: '12%' }]} />
                  </View>
                  <Text style={styles.barValue}>2</Text>
                </View>
                <View style={styles.barRow}>
                  <Text style={styles.barLabel}>3★</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: '0%' }]} />
                  </View>
                  <Text style={styles.barValue}>0</Text>
                </View>
              </View>
            </View>

            {/* REVIEWS LIST */}
            {(showAllReviews ? REVIEWS : REVIEWS.slice(0, 3)).map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </View>
        </View>
      </ScrollView>

      <BuyerBottomNavigation activeTab="order" />
    </SafeAreaView>
  );
}
