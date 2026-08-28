import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { BuyerBottomNavigation } from '@/components/buyer-bottom-navigation';
import { BuyerHeader } from '@/components/buyer-header';
import { BuyerOrder, loadBuyerOrder } from '@/lib/buyer-marketplace';
import { GREEN, styles } from '@/styles/buyer-order-tracking.styles';

const STATUS_RANK: Record<BuyerOrder['order_status'], number> = {
  pending: 0,
  confirmed: 1,
  preparing: 1,
  ready_for_delivery: 1,
  out_for_delivery: 2,
  delivered: 3,
  cancelled: 0,
};

function formatDate(value: string | null) {
  if (!value) return 'Pending';
  return new Intl.DateTimeFormat('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function getDeliveryAddress(order: BuyerOrder) {
  return [order.delivery_barangay, order.delivery_city_municipality, order.delivery_province, order.delivery_region, order.delivery_country]
    .filter(Boolean)
    .join(', ');
}

type Step = { key: string; label: string; icon: string; date: string | null; estimated?: boolean };

function buildSteps(order: BuyerOrder): Step[] {
  return [
    { key: 'placed', label: 'Order Placed', icon: '🧾', date: order.created_at },
    { key: 'confirmed', label: 'Confirmed & Packing', icon: '📋', date: order.confirmed_at || order.preparing_at },
    { key: 'transit', label: 'In Transit', icon: '🚚', date: order.out_for_delivery_at },
    { key: 'delivered', label: 'Delivered', icon: '✓', date: order.delivered_at || order.estimated_delivery_at, estimated: !order.delivered_at },
  ];
}

function StepCircle({ state, icon }: { state: 'done' | 'current' | 'pending'; icon: string }) {
  if (state === 'done') {
    return (
      <View style={[styles.stepCircle, styles.stepCircleDone]}>
        <Text style={styles.stepCheckText}>✓</Text>
      </View>
    );
  }
  return (
    <View style={[styles.stepCircle, styles.stepCirclePending]}>
      <Text style={styles.stepIconText}>{icon}</Text>
    </View>
  );
}

function DeliveryStepper({ order }: { order: BuyerOrder }) {
  const stage = STATUS_RANK[order.order_status];
  const steps = buildSteps(order);
  return (
    <View style={styles.stepperRow}>
      {steps.map((step, index) => {
        const state: 'done' | 'current' | 'pending' = index < stage ? 'done' : index === stage ? 'current' : 'pending';
        return (
          <View key={step.key} style={{ flexDirection: 'row', alignItems: 'flex-start', flex: index < steps.length - 1 ? 1 : undefined }}>
            <View style={styles.stepColumn}>
              <StepCircle state={state} icon={step.icon} />
              <Text style={[styles.stepLabel, state !== 'done' && styles.stepLabelPending]}>{step.label}</Text>
              <Text style={styles.stepDate}>{step.estimated && state === 'pending' ? 'Est. ' : ''}{formatDate(step.date)}</Text>
            </View>
            {index < steps.length - 1 ? (
              <View style={[styles.stepConnector, { borderTopColor: index < stage ? GREEN : '#D6DED4' }]} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function CalendarBadge() {
  return (
    <View style={styles.estimateCalendar}>
      <View style={styles.estimateCalendarGrid}>
        {[0, 1, 2, 3].map((dot) => (
          <View key={dot} style={styles.estimateCalendarDot} />
        ))}
      </View>
    </View>
  );
}

export default function BuyerOrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [order, setOrder] = useState<BuyerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrder = useCallback(async () => {
    if (!id) {
      setError('No order was specified.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setOrder(await loadBuyerOrder(Number(id)));
    } catch (caught) {
      setOrder(null);
      setError(caught instanceof Error ? caught.message : 'Could not load this order.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <BuyerHeader />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={GREEN} size="large" />
        </View>
        <BuyerBottomNavigation activeTab="account" />
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <BuyerHeader />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Text style={{ color: '#a33d35', fontSize: 13, textAlign: 'center' }}>{error || 'Order not found.'}</Text>
        </View>
        <BuyerBottomNavigation activeTab="account" />
      </SafeAreaView>
    );
  }

  const isPickup = order.delivery_method === 'pickup';
  const destinationCity = isPickup ? 'Tagaytay City' : order.delivery_city_municipality || 'Delivery Address';
  const destinationLabel = isPickup ? 'Farm Pickup' : 'Delivery Address';

  return (
    <SafeAreaView style={styles.safeArea}>
      <BuyerHeader />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Progress</Text>

          <View style={styles.routeRow}>
            <View style={styles.routeLine} />
            <View style={styles.routePillFrom}>
              <Text style={styles.routePillLabel}>Tagaytay City</Text>
              <Text style={styles.routePillSub}>JToledo Trading Farm</Text>
            </View>
            <View style={styles.routeTruckCircle}>
              <Text style={styles.routeTruckIcon}>{isPickup ? '📦' : '🚚'}</Text>
            </View>
            <View style={styles.routePillTo}>
              <Text style={styles.routePillLabelLight}>{destinationCity}</Text>
              <Text style={styles.routePillSubLight}>{destinationLabel}</Text>
            </View>
          </View>

          {order.order_status === 'cancelled' ? (
            <Text style={styles.cancelledText}>This order was cancelled on {formatDate(order.cancelled_at)}.</Text>
          ) : (
            <DeliveryStepper order={order} />
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.confirmedRow}>
            <View style={styles.confirmedCheckCircle}>
              <Text style={styles.confirmedCheck}>✓</Text>
            </View>
            <View>
              <Text style={styles.confirmedTitle}>Order {order.order_number}</Text>
              <Text style={styles.confirmedSubtitle}>
                {isPickup ? 'Pickup at JToledo Trading Farm' : `Delivery to ${order.delivery_full_name || 'you'}`}
              </Text>
            </View>
          </View>

          <View style={styles.estimateStrip}>
            <CalendarBadge />
            <View>
              <Text style={styles.estimateLabel}>{isPickup ? 'Ready for pickup on' : 'Estimated delivery on'}</Text>
              <Text style={styles.estimateDate}>{formatDate(order.estimated_delivery_at)}</Text>
            </View>
          </View>

          {order.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemIconBox}>
                <Image accessibilityIgnoresInvertColors source={require('@/assets/images/pineapple-product.png')} style={styles.itemImage} />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product_name}</Text>
                <Text style={styles.itemMeta}>
                  {item.weight_label} · {item.quantity} {item.quantity === 1 ? 'piece' : 'pieces'}
                </Text>
              </View>
              <Text style={styles.itemPrice}>PHP {item.line_total.toFixed(2)}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.addressRow}>
            <Text style={styles.addressPin}>📍</Text>
            <Text style={styles.addressText}>{isPickup ? 'JToledo Trading Farm, Tagaytay City' : getDeliveryAddress(order) || 'Address not provided'}</Text>
          </View>
        </View>
      </ScrollView>

      <BuyerBottomNavigation activeTab="account" />
    </SafeAreaView>
  );
}
