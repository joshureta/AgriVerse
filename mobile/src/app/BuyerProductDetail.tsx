import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { BuyerBottomNavigation } from '@/components/buyer-bottom-navigation';
import { BuyerHeader } from '@/components/buyer-header';
import { CartItem, PineappleProduct, loadPineappleProducts, readBuyerCart, writeBuyerCart } from '@/lib/buyer-marketplace';
import { GREEN, styles } from '@/styles/buyer-product-detail.styles';

// No backend exists for reviews yet — web's own reviews are a hardcoded
// array too (see web/src/pages/Buyer/BuyerOrders.jsx), so these stay static.
const REVIEWS = [
  {
    key: '1',
    name: 'Maria Santos',
    date: '2 days ago',
    comment: "Sweetest pineapples I've had! Delivered fresh and right on time.",
  },
  {
    key: '2',
    name: 'Carlos Reyes',
    date: '1 week ago',
    comment: 'Great quality and size, though a couple pieces were slightly bruised.',
  },
  {
    key: '3',
    name: 'Ana Lim',
    date: '2 weeks ago',
    comment: 'Perfectly ripe and juicy. Will definitely order again from this farm.',
  },
] as const;

// Same copy for every size — this listing is for bulk/wholesale ordering,
// so the pitch doesn't change when the buyer switches sizes.
const BULK_DESCRIPTION =
  'Buy in bulk directly from our farm. Every pineapple is handpicked, sorted, and freshly packed for wholesale and large-volume orders.';

function sizeBadge(sizeName: string) {
  return sizeName.trim().charAt(0).toUpperCase() || '?';
}

function ReviewCard({ review }: { review: (typeof REVIEWS)[number] }) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeaderRow}>
        <Text style={styles.reviewerName}>{review.name}</Text>
        <Text style={styles.reviewDate}>{review.date}</Text>
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

          <Text style={styles.reviewsTitle}>Customer Reviews</Text>

          {REVIEWS.map((review) => (
            <ReviewCard key={review.key} review={review} />
          ))}
        </View>
      </ScrollView>

      <BuyerBottomNavigation activeTab="order" />
    </SafeAreaView>
  );
}
