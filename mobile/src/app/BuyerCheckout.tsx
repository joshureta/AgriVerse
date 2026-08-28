import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { BuyerBottomNavigation } from '@/components/buyer-bottom-navigation';
import { BuyerHeader } from '@/components/buyer-header';
import { styles } from '@/styles/buyer-checkout.styles';

const DELIVERY_FEE = 100;

// Preview-only mock data — mirrors the items/totals shown on the cart screen. No backend wiring yet.
const ADDRESS = {
  name: 'Juan Dela Cruz',
  line1: '123 Market Street, Manila City,',
  line2: 'Metro Manila, Philippines.',
  phone: '+63 1234 567 8900',
};

const ORDER_ITEMS = [
  { key: 'S', name: 'Pineapple', weight: '400g - 600g', size: 'Small', quantity: 10, price: 50 },
  { key: 'M', name: 'Pineapple', weight: '700g - 900g', size: 'Medium', quantity: 5, price: 80 },
];

const DELIVERY_METHODS = [
  { key: 'delivery', icon: '🚚', label: 'Standard Delivery', sub: '2 - 3 business days' },
  { key: 'pickup', icon: '📦', label: 'Pick-up', sub: 'Pick up your order at our farm' },
] as const;

const PAYMENT_METHODS = [
  { key: 'cash', icon: '💵', label: 'Cash on Delivery', sub: 'Pay when your order arrives' },
  { key: 'bank', icon: '💳', label: 'Bank Transfer', sub: 'Transfer funds to bank accounts' },
  { key: 'gcash', icon: 'G', label: 'GCash', sub: 'Pay securely via GCash' },
] as const;

function OptionCard({
  icon,
  label,
  sub,
  active,
  onPress,
}: {
  icon: string;
  label: string;
  sub: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.optionCard, active && styles.optionCardActive, pressed && styles.optionCardPressed]}>
      {icon === 'G' ? (
        <View style={styles.gcashBadge}>
          <Text style={styles.gcashBadgeText}>G</Text>
        </View>
      ) : (
        <View style={styles.optionIconCircle}>
          <Text style={styles.optionIconText}>{icon}</Text>
        </View>
      )}
      <View style={styles.optionTextBlock}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionSubLabel}>{sub}</Text>
      </View>
      <View style={[styles.radioOuter, active && styles.radioOuterActive]}>{active ? <View style={styles.radioInner} /> : null}</View>
    </Pressable>
  );
}

export default function BuyerCheckoutScreen() {
  const [deliveryMethod, setDeliveryMethod] = useState<(typeof DELIVERY_METHODS)[number]['key']>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]['key']>('cash');

  const itemCount = ORDER_ITEMS.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = ORDER_ITEMS.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = deliveryMethod === 'delivery' ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  const placeOrder = () => {
    router.push('/BuyerOrderTracking' as never);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <BuyerHeader showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.titleBlock}>
          <Text style={styles.titleText}>Delivery Information</Text>
          <Text style={styles.subtitleText}>Fill up the form, choose a payment method, and place your order.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.addressRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarEmoji}>👤</Text>
            </View>
            <View style={styles.addressTextBlock}>
              <View style={styles.addressHeaderRow}>
                <Text style={styles.addressName}>{ADDRESS.name}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Edit delivery address">
                  <Text style={styles.editLink}>Edit ›</Text>
                </Pressable>
              </View>
              <Text style={styles.addressText}>
                {ADDRESS.line1}
                {'\n'}
                {ADDRESS.line2}
                {'\n'}
                {ADDRESS.phone}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.summaryHeaderRow}>
            <Text style={styles.summaryHeaderIcon}>📋</Text>
            <Text style={styles.summaryHeaderTitle}>Order Summary</Text>
          </View>

          {ORDER_ITEMS.map((item) => (
            <View key={item.key} style={styles.summaryItemRow}>
              <View style={styles.summaryItemIconBox}>
                <Text style={styles.summaryItemEmoji}>🍍</Text>
              </View>
              <View style={styles.summaryItemInfo}>
                <Text style={styles.summaryItemName}>{item.name}</Text>
                <Text style={styles.summaryItemMeta}>
                  {item.weight} · Size: {item.size}
                </Text>
              </View>
              <Text style={styles.summaryItemPrice}>PHP {(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({itemCount} items)</Text>
            <Text style={styles.summaryValue}>PHP {subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>PHP {deliveryFee.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>PHP {total.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Select Delivery Method</Text>
        {DELIVERY_METHODS.map((method) => (
          <OptionCard
            key={method.key}
            icon={method.icon}
            label={method.label}
            sub={method.sub}
            active={deliveryMethod === method.key}
            onPress={() => setDeliveryMethod(method.key)}
          />
        ))}

        <Text style={styles.sectionLabel}>Select Payment Method</Text>
        {PAYMENT_METHODS.map((method) => (
          <OptionCard
            key={method.key}
            icon={method.icon}
            label={method.label}
            sub={method.sub}
            active={paymentMethod === method.key}
            onPress={() => setPaymentMethod(method.key)}
          />
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Place order now"
          onPress={placeOrder}
          style={({ pressed }) => [styles.placeOrderButton, pressed && styles.placeOrderButtonPressed, { marginTop: 6 }]}>
          <Text style={styles.placeOrderButtonText}>Place Order Now</Text>
        </Pressable>
      </ScrollView>

      <BuyerBottomNavigation activeTab="cart" />
    </SafeAreaView>
  );
}
