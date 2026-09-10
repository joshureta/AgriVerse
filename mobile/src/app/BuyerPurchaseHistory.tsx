import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { BuyerBottomNavigation } from '@/components/buyer-bottom-navigation';
import { BuyerHeader } from '@/components/buyer-header';
import { BuyerOrder, BuyerOrderStatus, confirmBuyerOrderReceipt, loadBuyerOrders } from '@/lib/buyer-marketplace';
import { GREEN, styles } from '@/styles/buyer-purchase-history.styles';

function ReceiptIcon({ color = GREEN, size = 36 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 7h8M8 11h8M8 15h4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

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

const ORDER_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'to_pay', label: 'To Pay' },
  { id: 'preparing', label: 'To Ship' },
  { id: 'to_receive', label: 'To Receive' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'returns', label: 'Returns & Refunds' },
] as const;

type OrderFilter = typeof ORDER_FILTERS[number]['id'];

function isReturnOrRefund(order: BuyerOrder) {
  return order.payment_status === 'refunded' || Boolean(order.delivery_dispute_status);
}

function needsPayment(order: BuyerOrder) {
  return order.payment_method === 'gcash' && !['paid', 'refunded'].includes(order.payment_status) && order.order_status !== 'cancelled';
}

function matchesOrderFilter(order: BuyerOrder, filter: OrderFilter) {
  if (filter === 'all') return true;
  if (filter === 'returns') return isReturnOrRefund(order);
  // A disputed/refunded order belongs only in Returns & Refunds, regardless of its underlying order_status.
  if (isReturnOrRefund(order)) return false;
  if (filter === 'to_pay') return needsPayment(order);
  // An order still awaiting payment belongs only in To Pay until it's settled, regardless of fulfillment progress.
  if (needsPayment(order)) return false;
  if (filter === 'preparing') return ['pending', 'confirmed', 'preparing', 'ready_for_delivery'].includes(order.order_status);
  if (filter === 'to_receive') return ['out_for_delivery', 'delivered'].includes(order.order_status);
  if (filter === 'completed') return order.order_status === 'completed';
  if (filter === 'cancelled') return order.order_status === 'cancelled';
  return true;
}

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
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('all');
  const [confirmingOrderId, setConfirmingOrderId] = useState<number | null>(null);

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

  const filteredOrders = orders.filter((order) => matchesOrderFilter(order, activeFilter));

  async function confirmReceipt(order: BuyerOrder) {
    setConfirmingOrderId(order.id);
    try {
      const updated = await confirmBuyerOrderReceipt(order.id);
      setOrders((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (caught) {
      Alert.alert('Could not confirm receipt', caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setConfirmingOrderId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <BuyerHeader showBack />

      <View style={styles.mainBodyContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.titleText}>My Purchases</Text>

        <ScrollView
          contentContainerStyle={styles.filterTabs}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}>
          {ORDER_FILTERS.map((filter) => {
            const active = activeFilter === filter.id;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                key={filter.id}
                onPress={() => setActiveFilter(filter.id)}
                style={[styles.filterTab, active && styles.filterTabActive]}>
                <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>{filter.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={GREEN} />
        ) : error ? (
          <Text style={styles.loadError}>{error}</Text>
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <ReceiptIcon size={48} color="#8B9B8E" />
            <Text style={styles.emptyText}>You have no past orders yet.</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <ReceiptIcon size={44} color="#8B9B8E" />
            <Text style={styles.emptyText}>No orders in this category yet.</Text>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <Pressable
              key={order.id}
              accessibilityRole="button"
              accessibilityLabel={`View order ${order.order_number}`}
              onPress={() => router.push({ pathname: '/BuyerOrderTracking', params: { id: String(order.id) } })}
              style={({ pressed }) => [styles.orderCardMain, pressed && styles.orderCardPressed]}>
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
              {order.order_status === 'delivered' && (
                <>
                  <Pressable onPress={() => router.push({ pathname: '/BuyerOrderTracking', params: { id: String(order.id) } })} style={styles.deliveryNotice}>
                    <Text style={styles.deliveryNoticeText}>Delivered {order.delivered_at ? `on ${formatDate(order.delivered_at)}` : ''}</Text>
                    <Text style={styles.deliveryNoticeArrow}>›</Text>
                  </Pressable>
                  {!order.delivery_dispute_status && (
                    <View style={styles.orderActions}>
                      <Pressable onPress={() => router.push({ pathname: '/BuyerReturnRequest', params: { id: String(order.id) } })} style={styles.actionButton}>
                        <Text style={styles.actionButtonText}>Report an Issue</Text>
                      </Pressable>
                      <Pressable disabled={confirmingOrderId === order.id} onPress={() => confirmReceipt(order)} style={[styles.actionButton, styles.actionButtonPrimary, confirmingOrderId === order.id && styles.actionButtonDisabled]}>
                        <Text style={styles.actionButtonPrimaryText}>{confirmingOrderId === order.id ? 'Confirming…' : 'Order Received'}</Text>
                      </Pressable>
                    </View>
                  )}
                </>
              )}
              {order.order_status === 'completed' && (
                <View style={styles.orderActions}>
                  {!order.delivery_dispute_status && (
                    <Pressable onPress={() => router.push({ pathname: '/BuyerReturnRequest', params: { id: String(order.id) } })} style={styles.actionButton}>
                      <Text style={styles.actionButtonText}>Return/Refund</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => router.push({ pathname: '/BuyerRateOrder', params: { id: String(order.id) } })} style={[styles.actionButton, styles.actionButtonPrimary]}>
                    <Text style={styles.actionButtonPrimaryText}>Rate</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
      </View>

      <BuyerBottomNavigation activeTab="account" />
    </SafeAreaView>
  );
}
