import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { BuyerBottomNavigation } from '@/components/buyer-bottom-navigation';
import { BuyerHeader } from '@/components/buyer-header';
import { styles } from '@/styles/buyer-cart.styles';

const SHIPPING_FEE = 100;

type CartItem = {
  key: string;
  name: string;
  weight: string;
  price: number;
  quantity: number;
  stock: number;
};

// Preview-only mock data — no backend wiring yet.
const INITIAL_ITEMS: CartItem[] = [
  { key: 'S', name: 'Small Pineapple', weight: '400g - 600g', price: 50, quantity: 10, stock: 50 },
  { key: 'M', name: 'Medium Pineapple', weight: '700g - 900g', price: 80, quantity: 5, stock: 50 },
];

function CartItemRow({
  item,
  onDecrease,
  onIncrease,
  onRemove,
}: {
  item: CartItem;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.itemCard}>
      <View style={styles.itemIconBox}>
        <Text style={styles.itemEmoji}>🍍</Text>
      </View>

      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemWeight}>{item.weight}</Text>

        <View style={styles.qtyRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Decrease ${item.name} quantity`}
            disabled={item.quantity <= 1}
            onPress={onDecrease}
            style={[styles.qtyButton, item.quantity <= 1 && styles.qtyButtonDisabled]}>
            <Text style={styles.qtyButtonText}>−</Text>
          </Pressable>
          <Text style={styles.qtyValue}>{item.quantity}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Increase ${item.name} quantity`}
            disabled={item.quantity >= item.stock}
            onPress={onIncrease}
            style={[styles.qtyButton, item.quantity >= item.stock && styles.qtyButtonDisabled]}>
            <Text style={styles.qtyButtonText}>+</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.itemRight}>
        <Text style={styles.itemPrice}>PHP {item.price.toFixed(2)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${item.name} from cart`}
          hitSlop={8}
          onPress={onRemove}
          style={styles.trashButton}>
          <Text style={styles.trashIcon}>🗑️</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function BuyerCartScreen() {
  const [items, setItems] = useState<CartItem[]>(INITIAL_ITEMS);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = items.length > 0 ? SHIPPING_FEE : 0;
  const total = subtotal + shippingFee;

  const updateQuantity = (key: string, delta: number) => {
    setItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, quantity: Math.min(item.stock, Math.max(1, item.quantity + delta)) } : item,
      ),
    );
  };

  const removeItem = (key: string) => {
    setItems((current) => current.filter((item) => item.key !== key));
  };

  const removeAll = () => {
    if (items.length === 0) return;
    Alert.alert('Remove All Items', 'Remove all pineapples from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove All', style: 'destructive', onPress: () => setItems([]) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <BuyerHeader showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.titleIcon}>🛒</Text>
          <Text style={styles.titleText}>Shopping Cart</Text>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🍍</Text>
            <Text style={styles.emptyText}>Your cart is empty.</Text>
          </View>
        ) : (
          <>
            {items.map((item) => (
              <CartItemRow
                key={item.key}
                item={item}
                onDecrease={() => updateQuantity(item.key, -1)}
                onIncrease={() => updateQuantity(item.key, 1)}
                onRemove={() => removeItem(item.key)}
              />
            ))}

            <View style={styles.utilityRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove all items"
                onPress={removeAll}
                style={styles.removeAllButton}>
                <Text style={styles.trashIcon}>🗑️</Text>
                <Text style={styles.removeAllText}>Remove All</Text>
              </Pressable>
              <Text style={styles.itemsTotalText}>Total: PHP {subtotal.toFixed(2)}</Text>
            </View>
          </>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add more pineapples"
          onPress={() => router.push('/BuyerHome' as never)}
          style={({ pressed }) => [styles.addMoreCard, pressed && styles.addMorePressed]}>
          <View style={styles.addMoreIconCircle}>
            <Text style={styles.addMoreEmoji}>🛒</Text>
          </View>
          <View style={styles.addMoreTextBlock}>
            <Text style={styles.addMoreTitle}>Add More Pineapples</Text>
            <Text style={styles.addMoreSubtitle}>Browse more pineapple types and add to your cart</Text>
          </View>
          <Text style={styles.addMoreChevron}>›</Text>
        </Pressable>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>PHP {subtotal.toFixed(2)}</Text>
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
          accessibilityLabel="Check out"
          disabled={items.length === 0}
          onPress={() => router.push('/BuyerCheckout' as never)}
          style={({ pressed }) => [
            styles.checkoutButton,
            items.length === 0 && styles.checkoutButtonDisabled,
            pressed && items.length > 0 && styles.checkoutButtonPressed,
          ]}>
          <Text style={styles.checkoutButtonText}>Check Out</Text>
        </Pressable>
      </ScrollView>

      <BuyerBottomNavigation activeTab="cart" />
    </SafeAreaView>
  );
}
