import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

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

function TrashIcon({ color = '#B4463A', size = 15 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M10 11v6M14 11v6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MinusIcon({ color = '#10351D', size = 12 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PlusIcon({ color = '#10351D', size = 12 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CartEmptyIcon({ color = GREEN, size = 44 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={8} cy={21} r={1.5} stroke={color} strokeWidth={2} />
      <Circle cx={19} cy={21} r={1.5} stroke={color} strokeWidth={2} />
      <Path
        d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ShoppingBagIcon({ color = GREEN, size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M3 6h18M16 10a4 4 0 0 1-8 0" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CartItemRow({
  item,
  isFirst,
  onDecrease,
  onIncrease,
  onRemove,
}: {
  item: ReconciledCartItem;
  isFirst: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}) {
  const name = `${item.size_name} Pineapple`;
  return (
    <View style={[styles.itemRow, !isFirst && styles.itemRowBorderTop]}>
      <View style={styles.itemIconBox}>
        <Image accessibilityIgnoresInvertColors source={require('@/assets/images/pineapple-product.png')} style={styles.itemImage} />
      </View>

      <View style={styles.itemInfo}>
        <View style={styles.itemHeaderRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.itemName}>{name}</Text>
            <Text style={styles.itemWeight}>{item.weight}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${name} from cart`}
            hitSlop={8}
            onPress={onRemove}
            style={styles.trashButton}>
            <TrashIcon color="#B4463A" size={15} />
          </Pressable>
        </View>

        <View style={styles.itemBottomRow}>
          <Text style={styles.itemPrice}>₱{item.price.toFixed(2)}</Text>

          <View style={styles.qtyControlBox}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Decrease ${name} quantity`}
              disabled={item.quantity <= 1}
              onPress={onDecrease}
              style={[styles.qtyButton, item.quantity <= 1 && styles.qtyButtonDisabled]}>
              <MinusIcon color="#10351D" size={11} />
            </Pressable>
            <Text style={styles.qtyValue}>{item.quantity}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Increase ${name} quantity`}
              disabled={item.quantity >= item.stock_quantity}
              onPress={onIncrease}
              style={[styles.qtyButton, item.quantity >= item.stock_quantity && styles.qtyButtonDisabled]}>
              <PlusIcon color="#10351D" size={11} />
            </Pressable>
          </View>
        </View>
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
    Alert.alert('Clear Cart', 'Remove all pineapples from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
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

      <View style={styles.mainBodyContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.titleBlock}>
            <Text style={styles.titleText}>Shopping Cart</Text>
          </View>

          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          {loading ? (
            <ActivityIndicator style={styles.loader} color={GREEN} size="large" />
          ) : error ? (
            <Text style={styles.loadError}>{error}</Text>
          ) : items.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <View style={styles.emptyIconCircle}>
                <CartEmptyIcon color={GREEN} size={36} />
              </View>
              <Text style={styles.emptyTitle}>Your cart is empty</Text>
              <Text style={styles.emptySubtitle}>Add fresh farm pineapples to your cart to get started.</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Browse Pineapples"
                onPress={() => router.push('/BuyerHome' as never)}
                style={styles.emptyBrowseButton}>
                <Text style={styles.emptyBrowseButtonText}>Browse Pineapples</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* CARD 1: PRODUCE ITEMS */}
              <View style={styles.sectionCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Produce Items</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear all items"
                    onPress={removeAll}
                    style={styles.clearAllButton}>
                    <TrashIcon color="#B4463A" size={13} />
                    <Text style={styles.clearAllText}>Clear All</Text>
                  </Pressable>
                </View>

                {items.map((item, index) => (
                  <CartItemRow
                    key={item.product_id}
                    isFirst={index === 0}
                    item={item}
                    onDecrease={() => updateQuantity(item.product_id, -1)}
                    onIncrease={() => updateQuantity(item.product_id, 1)}
                    onRemove={() => removeItem(item.product_id)}
                  />
                ))}
              </View>

              {/* CARD 2: ORDER SUMMARY */}
              <View style={styles.sectionCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Items Subtotal</Text>
                  <Text style={styles.summaryValue}>₱{subtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Shipping Fee</Text>
                  <Text style={styles.summaryValue}>₱{shippingFee.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={[styles.summaryRow, { marginTop: 4, marginBottom: 0 }]}>
                  <Text style={styles.summaryTotalLabel}>Total Amount</Text>
                  <Text style={styles.summaryTotalValue}>₱{total.toFixed(2)}</Text>
                </View>

                {/* PRIMARY CHECKOUT BUTTON */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Checkout"
                  disabled={items.length === 0}
                  onPress={() => router.push('/BuyerCheckout' as never)}
                  style={({ pressed }) => [
                    styles.checkoutButton,
                    items.length === 0 && styles.checkoutButtonDisabled,
                    pressed && items.length > 0 && styles.checkoutButtonPressed,
                  ]}>
                  <Text style={styles.checkoutButtonText}>CHECKOUT</Text>
                </Pressable>

                {/* SECONDARY OUTLINED BUTTON (WHITE WITH GREEN BORDER) */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add more pineapples"
                  onPress={() => router.push('/BuyerHome' as never)}
                  style={({ pressed }) => [styles.addMoreButton, pressed && styles.addMoreButtonPressed]}>
                  <PlusIcon color={GREEN} size={15} />
                  <Text style={styles.addMoreButtonText}>ADD MORE PINEAPPLES</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </View>

      <BuyerBottomNavigation activeTab="cart" />
    </SafeAreaView>
  );
}

