import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { BuyerBottomNavigation } from '@/components/buyer-bottom-navigation';
import { BuyerCancelOrderModal } from '@/components/buyer-cancel-order-modal';
import { BuyerHeader } from '@/components/buyer-header';
import {
  BuyerOrder,
  canCancelBuyerOrder,
  confirmBuyerOrderReceipt,
  DisputeCategory,
  loadBuyerOrder,
} from '@/lib/buyer-marketplace';
import { GREEN, styles } from '@/styles/buyer-order-tracking.styles';

const DISPUTE_CATEGORY_OPTIONS: { value: DisputeCategory; label: string }[] = [
  { value: 'damaged', label: 'Damaged' },
  { value: 'spoiled_rotten', label: 'Spoiled / Rotten' },
  { value: 'wrong_item', label: 'Wrong item' },
  { value: 'missing_item', label: 'Missing item' },
  { value: 'wrong_quantity', label: 'Wrong quantity' },
];

const STATUS_RANK: Record<BuyerOrder['order_status'], number> = {
  pending: 0,
  confirmed: 1,
  preparing: 1,
  ready_for_delivery: 1,
  out_for_delivery: 2,
  delivered: 3,
  completed: 4,
  cancelled: 0,
};

function formatDate(value: string | null) {
  if (!value) return 'Pending';
  return new Intl.DateTimeFormat('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) return 'Pending';
  return new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function getDeliveryAddress(order: BuyerOrder) {
  return [order.delivery_barangay, order.delivery_city_municipality, order.delivery_province, order.delivery_region, order.delivery_country]
    .filter(Boolean)
    .join(', ');
}

function getStatusLabel(status: BuyerOrder['order_status']) {
  switch (status) {
    case 'pending':
      return 'Order Placed';
    case 'confirmed':
      return 'Confirmed';
    case 'preparing':
      return 'Preparing';
    case 'ready_for_delivery':
      return 'Ready for Delivery';
    case 'out_for_delivery':
      return 'In Transit';
    case 'delivered':
      return 'Delivered';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

function ReceiptIcon({ color = GREEN, size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 7h8M8 11h8M8 15h4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PackingIcon({ color = GREEN, size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="m3.3 7 8.7 5 8.7-5M12 22V12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TransitTruckIcon({ color = GREEN, size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 18H9M19 18h2a1 1 0 0 0 1-1v-5.5a1.5 1.5 0 0 0-.44-1.06L18.5 7.38A1.5 1.5 0 0 0 17.44 7H14v11h1"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={7} cy={18} r={2} stroke={color} strokeWidth={2} />
      <Circle cx={17} cy={18} r={2} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function DeliveredIcon({ color = GREEN, size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="m9 11 3 3L22 4"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CalendarIcon({ color = GREEN, size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect width={18} height={18} x={3} y={4} rx={2} stroke={color} strokeWidth={2} />
      <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={8} cy={14} r={1} fill={color} />
      <Circle cx={12} cy={14} r={1} fill={color} />
      <Circle cx={16} cy={14} r={1} fill={color} />
      <Circle cx={8} cy={18} r={1} fill={color} />
      <Circle cx={12} cy={18} r={1} fill={color} />
    </Svg>
  );
}

function MapPinIcon({ color = GREEN, size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={10} r={3} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function PlantIcon({ color = GREEN, size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22V12M12 12C12 7 7 4 2 5c0 5 3 10 10 10ZM12 12c0-5 5-8 10-7 0 5-3 10-10 10Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type Step = { key: 'placed' | 'confirmed' | 'transit' | 'delivered'; label: string; date: string | null; estimated?: boolean };

function buildSteps(order: BuyerOrder): Step[] {
  return [
    { key: 'placed', label: 'Order Placed', date: order.created_at },
    { key: 'confirmed', label: 'Confirmed', date: order.confirmed_at || order.preparing_at },
    { key: 'transit', label: 'In Transit', date: order.out_for_delivery_at },
    { key: 'delivered', label: 'Delivered', date: order.delivered_at || order.estimated_delivery_at, estimated: !order.delivered_at },
  ];
}

function StepCircle({ state, stepKey }: { state: 'done' | 'current' | 'pending'; stepKey: Step['key'] }) {
  const iconColor = state === 'done' ? '#ffffff' : state === 'current' ? GREEN : '#8B9B8E';

  const renderIcon = () => {
    switch (stepKey) {
      case 'placed':
        return <ReceiptIcon color={iconColor} size={16} />;
      case 'confirmed':
        return <PackingIcon color={iconColor} size={16} />;
      case 'transit':
        return <TransitTruckIcon color={iconColor} size={16} />;
      case 'delivered':
        return <DeliveredIcon color={iconColor} size={16} />;
    }
  };

  return (
    <View
      style={[
        styles.stepCircle,
        state === 'done' && styles.stepCircleDone,
        state === 'current' && styles.stepCircleCurrent,
        state === 'pending' && styles.stepCirclePending,
      ]}>
      {renderIcon()}
    </View>
  );
}

function DeliveryStepper({ order }: { order: BuyerOrder }) {
  const stage = STATUS_RANK[order.order_status];
  const steps = buildSteps(order);
  return (
    <View style={styles.stepperContainer}>
      {/* Background connecting track line segments */}
      <View style={styles.stepperLineBackground}>
        {steps.map((_, index) => {
          if (index === steps.length - 1) return null;
          const isDone = index < stage;
          return (
            <View
              key={index}
              style={[
                styles.stepperLineSegment,
                isDone ? styles.stepperLineSegmentDone : styles.stepperLineSegmentPending,
              ]}
            />
          );
        })}
      </View>

      {/* Stepper nodes row */}
      <View style={styles.stepperNodesRow}>
        {steps.map((step, index) => {
          const state: 'done' | 'current' | 'pending' = index < stage ? 'done' : index === stage ? 'current' : 'pending';
          return (
            <View key={step.key} style={styles.stepColumn}>
              <StepCircle state={state} stepKey={step.key} />
              <Text style={[styles.stepLabel, state !== 'done' && styles.stepLabelPending]}>{step.label}</Text>
              <Text style={styles.stepDate}>{step.estimated && state === 'pending' ? 'Est. ' : ''}{formatDate(step.date)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function BuyerOrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [order, setOrder] = useState<BuyerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

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

  async function handleConfirmReceipt() {
    if (!order) return;
    setConfirming(true);
    setActionError('');
    try {
      setOrder(await confirmBuyerOrderReceipt(order.id));
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Could not confirm this delivery.');
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <BuyerHeader />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={GREEN} size="large" />
        </View>
        <BuyerBottomNavigation activeTab="order" />
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
        <BuyerBottomNavigation activeTab="order" />
      </SafeAreaView>
    );
  }

  const isPickup = order.delivery_method === 'pickup';
  const destinationCity = isPickup ? 'Tagaytay City' : order.delivery_city_municipality || 'Delivery Address';
  const destinationAddress = isPickup ? 'JToledo Trading Farm, Tagaytay City' : getDeliveryAddress(order) || 'Address not provided';

  return (
    <SafeAreaView style={styles.safeArea}>
      <BuyerHeader />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* CARD 1: DELIVERY ROUTE & PROGRESS STEPPER */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>Delivery Route</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{getStatusLabel(order.order_status)}</Text>
            </View>
          </View>

          {/* Clean Vertical Route */}
          <View style={styles.verticalRouteBox}>
            {/* Origin Farm */}
            <View style={styles.routeItemRow}>
              <View style={styles.originIconCircle}>
                <PlantIcon color="#ffffff" size={15} />
              </View>
              <View style={styles.routeItemContent}>
                <Text style={styles.routeItemHeader}>FARM ORIGIN</Text>
                <Text style={styles.routeItemTitle}>Tagaytay City</Text>
                <Text style={styles.routeItemSubtitle}>JToledo Trading Farm</Text>
              </View>
            </View>

            {/* Subtle Vertical Connector Line */}
            <View style={styles.verticalConnectorLine} />

            {/* Destination Buyer */}
            <View style={styles.routeItemRow}>
              <View style={styles.destinationIconCircle}>
                <MapPinIcon color={GREEN} size={15} />
              </View>
              <View style={styles.routeItemContent}>
                <Text style={styles.routeItemHeader}>{isPickup ? 'FARM PICKUP LOCATION' : 'DELIVERY ADDRESS'}</Text>
                <Text style={styles.routeItemTitle}>{destinationCity}</Text>
                <Text style={styles.routeItemSubtitle}>{destinationAddress}</Text>
              </View>
            </View>
          </View>

          {order.order_status === 'cancelled' ? (
            <Text style={styles.cancelledText}>This order was cancelled on {formatDate(order.cancelled_at)}.</Text>
          ) : (
            <DeliveryStepper order={order} />
          )}
        </View>

        {/* CARD 2: ORDER DETAILS (Adapted from Web Architecture) */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Details</Text>

          <View style={[styles.detailRow, { marginTop: 12 }]}>
            <View style={styles.detailIconBox}>
              <ReceiptIcon color={GREEN} size={16} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>ORDER NUMBER</Text>
              <Text style={styles.detailValue}>{order.order_number}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <CalendarIcon color={GREEN} size={16} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>ORDER DATE</Text>
              <Text style={styles.detailValue}>{formatDateTime(order.created_at)}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <TransitTruckIcon color={GREEN} size={16} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>{isPickup ? 'PICKUP SCHEDULE' : 'ESTIMATED DELIVERY'}</Text>
              <Text style={styles.detailValue}>
                {isPickup ? 'Ready for on-site pickup' : formatDate(order.estimated_delivery_at)}
              </Text>
            </View>
          </View>
        </View>

        {/* CARD 3: ORDER ITEMS & FINANCIAL SUMMARY */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>Order Items</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
              </Text>
            </View>
          </View>

          {order.items.map((item, idx) => (
            <View key={item.id} style={[styles.itemRow, idx > 0 && styles.itemRowBorderTop]}>
              <View style={styles.itemIconBox}>
                <Image accessibilityIgnoresInvertColors source={require('@/assets/images/pineapple-product.png')} style={styles.itemImage} />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product_name}</Text>
                <Text style={styles.itemMeta}>
                  {item.weight_label} · {item.quantity} {item.quantity === 1 ? 'piece' : 'pieces'}
                </Text>
              </View>
              <Text style={styles.itemPrice}>₱{item.line_total.toFixed(2)}</Text>
            </View>
          ))}

          {/* Financial Breakdown */}
          <View style={styles.financialSummary}>
            <View style={styles.summaryLine}>
              <Text style={styles.summaryLabel}>Shipping Fee</Text>
              <Text style={styles.summaryValue}>₱{(order.shipping_fee || 0).toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryLine, styles.totalLine]}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₱{Number(order.total_amount || 0).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* CARD 4: CANCEL ORDER (PENDING/CONFIRMED ONLY) */}
        {canCancelBuyerOrder(order) ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Need to cancel this order?</Text>
            <Text style={styles.confirmationText}>
              This order hasn&apos;t started preparing yet, so you can still cancel it
              {order.payment_method === 'gcash' && order.payment_status === 'paid'
                ? ' for a full refund to your GCash.'
                : '.'}
            </Text>
            <View style={styles.actionRow}>
              <Pressable onPress={() => setShowCancelModal(true)} style={styles.dangerButton}>
                <Text style={styles.dangerButtonText}>Cancel Order</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* DELIVERY PROOF PHOTO (IF PRESENT) */}
        {order.delivery_proof_image_url ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Delivery Photo</Text>
            <Image accessibilityIgnoresInvertColors source={{ uri: order.delivery_proof_image_url }} style={styles.proofImage} />
            {order.delivery_proof_notes ? <Text style={styles.proofNote}>{order.delivery_proof_notes}</Text> : null}
          </View>
        ) : null}

        {/* CONFIRM RECEIPT / DISPUTE ACTIONS (IF DELIVERED) */}
        {order.order_status === 'delivered' && order.delivery_dispute_status !== 'open' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Did you receive your order?</Text>
            <Text style={styles.confirmationText}>
              Confirm everything arrived as expected, or report a problem while the delivery details are still fresh.
            </Text>
            {actionError ? <Text style={styles.actionErrorText}>{actionError}</Text> : null}
            <View style={styles.actionRow}>
              <Pressable
                disabled={confirming}
                onPress={handleConfirmReceipt}
                style={[styles.primaryButton, confirming && styles.buttonDisabled]}>
                {confirming ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.primaryButtonText}>Confirm Receipt</Text>}
              </Pressable>
              <Pressable
                disabled={confirming}
                onPress={() => router.push({ pathname: '/BuyerReturnRequest', params: { id: String(order.id) } })}
                style={[styles.secondaryButton, confirming && styles.buttonDisabled]}>
                <Text style={styles.secondaryButtonText}>Report an issue</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {order.delivery_dispute_status ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View return request details"
            onPress={() => router.push({ pathname: '/BuyerReturnDetails', params: { id: String(order.id) } })}
            style={[styles.card, styles.returnStatusCard]}>
            <View style={styles.returnStatusHead}>
              <View style={styles.returnStatusIcon}><Text>↻</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.returnStatusTitle}>{order.delivery_dispute_status === 'open' ? 'We’re reviewing your return request' : 'Update on your return request'}</Text>
                <Text style={styles.returnStatusCopy}>{order.delivery_dispute_status === 'open' ? 'We’ll review your report and evidence within 1–2 business days.' : order.delivery_dispute_resolution_notes || 'Your return request has been resolved.'}</Text>
              </View>
            </View>
            <View style={styles.returnSteps}>
              <Text style={styles.returnStepDone}>1  Report submitted</Text>
              <Text style={order.delivery_dispute_status === 'resolved' ? styles.returnStepDone : styles.returnStepCurrent}>2  Decision</Text>
              <Text style={order.delivery_dispute_resolution === 'refunded' ? styles.returnStepDone : styles.returnStep}>3  Refund</Text>
            </View>
            <View style={styles.returnFacts}>
              <View style={styles.returnFact}><Text style={styles.returnFactLabel}>Reported issue</Text><Text style={styles.returnFactValue}>{DISPUTE_CATEGORY_OPTIONS.find((option) => option.value === order.delivery_dispute_category)?.label || 'Delivery issue'}</Text></View>
              <View style={styles.returnFact}><Text style={styles.returnFactLabel}>Affected item</Text><Text style={styles.returnFactValue}>{order.items.find((item) => item.id === order.delivery_dispute_item_id)?.product_name || 'Order item'}{order.delivery_dispute_affected_quantity ? ` · ${order.delivery_dispute_affected_quantity} affected` : ''}</Text></View>
              {order.refund_amount != null ? <View style={styles.returnFact}><Text style={styles.returnFactLabel}>Refund amount</Text><Text style={styles.returnFactValue}>₱{Number(order.refund_amount).toFixed(2)}</Text></View> : null}
            </View>
            {order.delivery_dispute_reason ? <Text style={styles.returnReason}>{order.delivery_dispute_reason}</Text> : null}
            <Text style={styles.returnViewDetails}>View full details ›</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <BuyerCancelOrderModal
        onCancelled={(updated) => {
          setOrder(updated);
          setShowCancelModal(false);
        }}
        onClose={() => setShowCancelModal(false)}
        order={showCancelModal ? order : null}
      />

      <BuyerBottomNavigation activeTab="order" />
    </SafeAreaView>
  );
}

