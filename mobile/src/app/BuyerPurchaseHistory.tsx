import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { BuyerBottomNavigation } from '@/components/buyer-bottom-navigation';
import { BuyerHeader } from '@/components/buyer-header';
import { BuyerOrder, BuyerOrderStatus, loadBuyerOrders } from '@/lib/buyer-marketplace';
import { GREEN, styles } from '@/styles/buyer-purchase-history.styles';

const STATUS_LABELS: Record<BuyerOrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready_for_delivery: 'Ready for Delivery',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

type StatusVariant = 'pending' | 'active' | 'cancelled';

function statusVariant(status: BuyerOrderStatus): StatusVariant {
  if (status === 'pending') return 'pending';
  if (status === 'cancelled') return 'cancelled';
  return 'active';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function orderItemsText(order: BuyerOrder) {
  return order.items.map((item) => `${item.quantity} ${item.product_name}`).join(', ');
}

function StatusBadge({ status }: { status: BuyerOrderStatus }) {
  const variant = statusVariant(status);
  return (
    <View
      style={[
        styles.statusBadge,
        variant === 'active' && styles.statusBadgeDelivered,
        variant === 'pending' && styles.statusBadgeTransit,
        variant === 'cancelled' && styles.statusBadgeCancelled,
      ]}>
      <View
        style={[
          styles.statusDot,
          variant === 'active' && styles.statusDotDelivered,
          variant === 'pending' && styles.statusDotTransit,
          variant === 'cancelled' && styles.statusDotCancelled,
        ]}
      />
      <Text
        style={[
          styles.statusText,
          variant === 'active' && styles.statusTextDelivered,
          variant === 'pending' && styles.statusTextTransit,
          variant === 'cancelled' && styles.statusTextCancelled,
        ]}>
        {STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

export default function BuyerPurchaseHistoryScreen() {
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOrders(await loadBuyerOrders());
    } catch (caught) {
      setOrders([]);
      setError(caught instanceof Error ? caught.message : 'Could not load your purchase history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <BuyerHeader showBack />

      <View style={styles.mainBodyContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.titleText}>My Purchases</Text>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={GREEN} />
        ) : error ? (
          <Text style={styles.loadError}>{error}</Text>
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🧾</Text>
            <Text style={styles.emptyText}>You have no past orders yet.</Text>
          </View>
        ) : (
          orders.map((order) => (
            <Pressable
              key={order.id}
              accessibilityRole="button"
              accessibilityLabel={`View order ${order.order_number}`}
              onPress={() => router.push({ pathname: '/BuyerOrderTracking', params: { id: String(order.id) } })}
              style={({ pressed }) => [styles.orderCard, pressed && styles.orderCardPressed]}>
              <View style={styles.orderIconBox}>
                <Image accessibilityIgnoresInvertColors source={require('@/assets/images/pineapple-product.png')} style={styles.orderImage} />
              </View>
              <View style={styles.orderInfo}>
                <Text style={styles.orderId}>Order #{order.order_number}</Text>
                <Text style={styles.orderMeta} numberOfLines={1}>
                  {formatDate(order.created_at)} · {orderItemsText(order)}
                </Text>
                <Text style={styles.orderTotal}>₱{order.total_amount.toFixed(2)}</Text>
              </View>
              <StatusBadge status={order.order_status} />
            </Pressable>
          ))
        )}
      </ScrollView>
      </View>

      <BuyerBottomNavigation activeTab="orders" />
    </SafeAreaView>
  );
}
