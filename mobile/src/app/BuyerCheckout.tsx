import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { BuyerHeader } from '@/components/buyer-header';
import { styles } from '@/styles/buyer-checkout.styles';

const SHIPPING_FEE = 100;

// Preview-only mock data — mirrors the totals shown on the cart screen. No backend wiring yet.
const SUBTOTAL = 900;

const DELIVERY_METHODS = [
  { key: 'delivery', label: 'Standard Delivery', sub: 'Arrives in 2-3 business days' },
  { key: 'pickup', label: 'On-site Pickup', sub: 'Pick up at the Toledo Trading farm' },
] as const;

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash on Delivery', sub: 'Pay when your order arrives' },
  { key: 'bank', label: 'Bank Transfer', sub: 'Pay via QR bank transfer' },
  { key: 'gcash', label: 'GCash', sub: 'Pay securely through PayMongo' },
] as const;

function RadioOption<T extends string>({
  active,
  label,
  sub,
  first,
  onPress,
}: {
  active: boolean;
  label: string;
  sub: string;
  first?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.optionRow, first && styles.optionRowFirst]}>
      <View style={[styles.radioOuter, active && styles.radioOuterActive]}>{active ? <View style={styles.radioInner} /> : null}</View>
      <View style={styles.optionTextBlock}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionSubLabel}>{sub}</Text>
      </View>
    </Pressable>
  );
}

export default function BuyerCheckoutScreen() {
  const [deliveryMethod, setDeliveryMethod] = useState<(typeof DELIVERY_METHODS)[number]['key']>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]['key']>('cash');

  const shippingFee = deliveryMethod === 'delivery' ? SHIPPING_FEE : 0;
  const total = SUBTOTAL + shippingFee;

  const placeOrder = () => {
    Alert.alert('Order Placed', 'Your pineapple order has been placed successfully.', [
      { text: 'OK', onPress: () => router.push('/BuyerHome' as never) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <BuyerHeader showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.titleText}>Checkout</Text>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Delivery Address</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Change delivery address">
              <Text style={styles.cardLink}>Change</Text>
            </Pressable>
          </View>
          <Text style={styles.addressName}>Juan Dela Cruz</Text>
          <Text style={styles.addressText}>123 Mabini Street, Barangay San Isidro{'\n'}Toledo City, Cebu, Philippines</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery Method</Text>
          {DELIVERY_METHODS.map((method, index) => (
            <RadioOption
              key={method.key}
              active={deliveryMethod === method.key}
              label={method.label}
              sub={method.sub}
              first={index === 0}
              onPress={() => setDeliveryMethod(method.key)}
            />
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Method</Text>
          {PAYMENT_METHODS.map((method, index) => (
            <RadioOption
              key={method.key}
              active={paymentMethod === method.key}
              label={method.label}
              sub={method.sub}
              first={index === 0}
              onPress={() => setPaymentMethod(method.key)}
            />
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>PHP {SUBTOTAL.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping Fee</Text>
            <Text style={styles.summaryValue}>PHP {shippingFee.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={[styles.summaryRow, { marginBottom: 0 }]}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>PHP {total.toFixed(2)}</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Place order"
          onPress={placeOrder}
          style={({ pressed }) => [styles.placeOrderButton, pressed && styles.placeOrderButtonPressed]}>
          <Text style={styles.placeOrderButtonText}>Place Order</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
