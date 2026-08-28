import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { BuyerBottomNavigation } from '@/components/buyer-bottom-navigation';
import { BuyerHeader } from '@/components/buyer-header';
import { styles } from '@/styles/buyer-product-detail.styles';

// Preview-only mock data — no backend wiring yet.
const PRODUCT = {
  name: 'Pineapple',
  subtitle: 'Perfectly sweet and tender.',
  description:
    'Premium pineapple, sweet and juicy with a perfect balance of flavor. Handpicked from our local farm and delivered fresh to your door. Rich in vitamins and naturally delicious.',
};

const SIZES = [
  { key: 'S', label: 'Small', weight: '400g - 600g', price: 50 },
  { key: 'M', label: 'Medium', weight: '700g - 900g', price: 80 },
  { key: 'L', label: 'Large', weight: '1kg - 1.3kg', price: 120 },
] as const;

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
  const [selectedSize, setSelectedSize] = useState<(typeof SIZES)[number]['key']>('S');
  const [quantity, setQuantity] = useState(1);

  const size = SIZES.find((item) => item.key === selectedSize) ?? SIZES[0];
  const total = size.price * quantity;

  return (
    <SafeAreaView style={styles.safeArea}>
      <BuyerHeader showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🍍</Text>
        </View>

        <View style={styles.sheet}>
          <View style={styles.titleRow}>
            <Text style={styles.productName}>{PRODUCT.name}</Text>
            <Text style={styles.weightRange}>{size.weight}</Text>
          </View>
          <Text style={styles.subtitle}>{PRODUCT.subtitle}</Text>

          <Text style={styles.sizeLabel}>Choose Size</Text>
          <View style={styles.sizeRow}>
            {SIZES.map((item) => {
              const active = item.key === selectedSize;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${item.label} size`}
                  accessibilityState={{ selected: active }}
                  key={item.key}
                  onPress={() => setSelectedSize(item.key)}
                  style={[styles.sizePill, active && styles.sizePillActive]}>
                  <Text style={[styles.sizePillTitle, active && styles.sizePillTitleActive]}>{item.key}</Text>
                  <Text style={[styles.sizePillSubtitle, active && styles.sizePillSubtitleActive]}>{item.label}</Text>
                  <View style={[styles.sizePillUnderline, active && styles.sizePillUnderlineActive]} />
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.descriptionHeading}>Description</Text>
          <Text style={styles.descriptionText}>{PRODUCT.description}</Text>

          <View style={styles.footer}>
            <View style={styles.priceBlock}>
              <Text style={styles.priceLabel}>Total</Text>
              <Text style={styles.priceValue}>PHP {total.toFixed(2)}</Text>
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
                onPress={() => setQuantity((value) => Math.min(99, value + 1))}
                style={styles.quantityButton}>
                <Text style={styles.quantityButtonText}>+</Text>
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add to cart"
              style={({ pressed }) => [styles.addToCartButton, pressed && styles.addToCartPressed]}>
              <Text style={styles.addToCartText}>Add to Cart</Text>
            </Pressable>
          </View>

          <Text style={styles.reviewsTitle}>Customer Reviews</Text>

          {REVIEWS.map((review) => (
            <ReviewCard key={review.key} review={review} />
          ))}
        </View>
      </ScrollView>

      <BuyerBottomNavigation activeTab="home" />
    </SafeAreaView>
  );
}
