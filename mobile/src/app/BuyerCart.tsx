import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { BuyerBottomNavigation } from '@/components/buyer-bottom-navigation';
import { BuyerHeader } from '@/components/buyer-header';
import {
  ReconciledCartItem,
  loadPineappleProducts,
  readBuyerCart,
  reconcileBuyerCart,
  reconciledToCartItems,
  writeBuyerCart,
} from '@/lib/buyer-marketplace';
import { GREEN, styles } from '@/styles/buyer-cart.styles';

const SHIPPING_FEE = 100;

function CartItemRow({
  item,
  onDecrease,
  onIncrease,
  onRemove,
}: {
  item: ReconciledCartItem;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}) {
  const name = `${item.size_name} Pineapple`;
  return (
    <View style={styles.itemCard}>
      <View style={styles.itemIconBox}>
        <Image accessibilityIgnoresInvertColors source={require('@/assets/images/pineapple-product.png')} style={styles.itemImage} />
      </View>

      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{name}</Text>
        <Text style={styles.itemWeight}>{item.weight}</Text>

        <View style={styles.qtyRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Decrease ${name} quantity`}
            disabled={item.quantity <= 1}
            onPress={onDecrease}
            style={[styles.qtyButton, item.quantity <= 1 && styles.qtyButtonDisabled]}>
            <Text style={styles.qtyButtonText}>−</Text>
          </Pressable>
          <Text style={styles.qtyValue}>{item.quantity}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Increase ${name} quantity`}
            disabled={item.quantity >= item.stock_quantity}
            onPress={onIncrease}
            style={[styles.qtyButton, item.quantity >= item.stock_quantity && styles.qtyButtonDisabled]}>
            <Text style={styles.qtyButtonText}>+</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.itemRight}>
        <Text style={styles.itemPrice}>PHP {item.price.toFixed(2)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${name} from cart`}
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
  const [items, setItems] = useState<ReconciledCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refreshCart = useCallback(async () => {
    setLoading(true);
    setError('');
    setNotice('');
    const savedItems = await readBuyerCart();
    if (savedItems.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      const products = await loadPineappleProducts();
      const reconciled = reconcileBuyerCart(savedItems, products);
      const changed =
        reconciled.length !== savedItems.length ||
        reconciled.some((item, index) => item.quantity !== Number(savedItems[index]?.quantity));
      setItems(reconciled);
      await writeBuyerCart(reconciledToCartItems(reconciled));
      if (changed) setNotice('Your cart was updated to match the latest available inventory.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load your cart.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const updateQuantity = useCallback((productId: number, delta: number) => {
    setItems((current) => {
      const updated = current
        .map((item) =>
          item.product_id === productId
            ? { ...item, quantity: Math.min(item.stock_quantity, Math.max(0, item.quantity + delta)) }
            : item,
        )
        .filter((item) => item.quantity > 0);
      writeBuyerCart(reconciledToCartItems(updated));
      return updated;
    });
  }, []);

  const removeItem = useCallback((productId: number) => {
    setItems((current) => {
      const updated = current.filter((item) => item.product_id !== productId);
      writeBuyerCart(reconciledToCartItems(updated));
      return updated;
    });
  }, []);

  const removeAll = useCallback(() => {
    if (items.length === 0) return;
    Alert.alert('Remove All Items', 'Remove all pineapples from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove All',
        style: 'destructive',
        onPress: () => {
          setItems([]);
          writeBuyerCart([]);
        },
      },
    ]);
  }, [items.length]);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = items.length > 0 ? SHIPPING_FEE : 0;
  const total = subtotal + shippingFee;

  return (
    <SafeAreaView style={styles.safeArea}>
      <BuyerHeader showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.titleIcon}>🛒</Text>
          <Text style={styles.titleText}>Shopping Cart</Text>
        </View>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        {loading ? (
          <ActivityIndicator style={styles.loader} color={GREEN} />
        ) : error ? (
          <Text style={styles.loadError}>{error}</Text>
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🍍</Text>
            <Text style={styles.emptyText}>Your cart is empty.</Text>
          </View>
        ) : (
          <>
            {items.map((item) => (
              <CartItemRow
                key={item.product_id}
                item={item}
                onDecrease={() => updateQuantity(item.product_id, -1)}
                onIncrease={() => updateQuantity(item.product_id, 1)}
                onRemove={() => removeItem(item.product_id)}
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
              <Text style={styles.itemsTotalText}>Total: ₱{subtotal.toFixed(2)}</Text>
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
            <Text style={styles.summaryValue}>₱{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping Fee</Text>
            <Text style={styles.summaryValue}>₱{shippingFee.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={[styles.summaryRow, { marginBottom: 0 }]}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>₱{total.toFixed(2)}</Text>
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
