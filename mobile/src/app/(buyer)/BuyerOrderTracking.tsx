import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { BuyerCancelOrderModal } from '@/components/buyer-cancel-order-modal';
import { BuyerHeader } from '@/components/buyer-header';
import {
  BuyerOrder,
  canCancelBuyerOrder,
  confirmBuyerOrderReceipt,
  DisputeCategory,
  loadBuyerOrder,
  readBuyerCart,
  writeBuyerCart,
} from '@/lib/buyer-marketplace';
import { w } from '@/styles/buyer-order-details.styles';
import { GREEN, styles } from '@/styles/buyer-order-tracking.styles';

const DISPUTE_CATEGORY_OPTIONS: { value: DisputeCategory; label: string }[] = [
  { value: 'damaged', label: 'Damaged' },
  { value: 'spoiled_rotten', label: 'Spoiled / Rotten' },
  { value: 'wrong_item', label: 'Wrong item' },
  { value: 'missing_item', label: 'Missing item' },
  { value: 'wrong_quantity', label: 'Wrong quantity' },
];

const PAYMENT_METHOD_LABELS: Record<BuyerOrder['payment_method'], string> = {
  cash: 'Cash on Delivery',
  bank: 'Bank Transfer',
  gcash: 'GCash',
};

const STATUS_RANK: Record<BuyerOrder['order_status'], number> = {
  pending: 0,
  confirmed: 1,
  preparing: 1,
  ready_for_delivery: 1,
  out_for_delivery: 2,
  ready_for_pickup: 2,
  delivered: 3,
  completed: 4,
  cancelled: 0,
};

function formatDate(value: string | null) {
  if (!value) return 'Pending';
  return new Intl.DateTimeFormat('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function formatShortDate(value: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(new Date(value));
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

function formatPeso(value: number | null | undefined) {
  return `₱${Number(value || 0).toFixed(2)}`;
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
    case 'ready_for_pickup':
      return 'Ready for Pickup';
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

// A cancelled order (refunded automatically if it was paid) is not a return.
function isReturnOrRefund(order: BuyerOrder) {
  if (order.order_status === 'cancelled') return false;
  return order.payment_status === 'refunded' || Boolean(order.delivery_dispute_status);
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

// Extra icons for the web-style cards. Same stroke style as above, drawn through one wrapper.
function Glyph({ color, size = 18, stroke = 2, children }: { color: string; size?: number; stroke?: number; children: ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

const CameraIcon = ({ color = GREEN, size = 15 }: { color?: string; size?: number }) => (
  <Glyph color={color} size={size}>
    <Path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <Circle cx={12} cy={13} r={3} />
  </Glyph>
);
const ExpandIcon = ({ color = '#173b21', size = 14 }: { color?: string; size?: number }) => (
  <Glyph color={color} size={size}>
    <Path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </Glyph>
);
const CloseIcon = ({ color = '#ffffff', size = 20 }: { color?: string; size?: number }) => (
  <Glyph color={color} size={size} stroke={2.4}>
    <Path d="M18 6 6 18M6 6l12 12" />
  </Glyph>
);
const ChevronLeftIcon = ({ color = '#237538', size = 22 }: { color?: string; size?: number }) => (
  <Glyph color={color} size={size} stroke={2.4}>
    <Path d="m15 18-6-6 6-6" />
  </Glyph>
);
const CheckIcon = ({ color = '#ffffff', size = 13 }: { color?: string; size?: number }) => (
  <Glyph color={color} size={size} stroke={2.6}>
    <Path d="M20 6 9 17l-5-5" />
  </Glyph>
);
const StoreIcon = ({ color = '#176b32', size = 17 }: { color?: string; size?: number }) => (
  <Glyph color={color} size={size}>
    <Path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
    <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <Path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
    <Path d="M2 7h20" />
  </Glyph>
);
const HourglassIcon = ({ color, size = 18 }: { color: string; size?: number }) => (
  <Glyph color={color} size={size}>
    <Path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
  </Glyph>
);
const BanknoteIcon = ({ color, size = 18 }: { color: string; size?: number }) => (
  <Glyph color={color} size={size}>
    <Rect width={20} height={12} x={2} y={6} rx={2} />
    <Circle cx={12} cy={12} r={2} />
    <Path d="M6 12h.01M18 12h.01" />
  </Glyph>
);
const XIcon = ({ color, size = 18 }: { color: string; size?: number }) => (
  <Glyph color={color} size={size}>
    <Path d="M18 6 6 18M6 6l12 12" />
  </Glyph>
);
const ChevronRightIcon = ({ color = '#1f7438', size = 16 }: { color?: string; size?: number }) => (
  <Glyph color={color} size={size} stroke={2.4}>
    <Path d="m9 18 6-6-6-6" />
  </Glyph>
);
const BellIcon = ({ color = '#5a695d', size = 15 }: { color?: string; size?: number }) => (
  <Glyph color={color} size={size}>
    <Path d="M10.268 21a2 2 0 0 0 3.464 0" />
    <Path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .738-1.674C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
  </Glyph>
);

type Step = { key: 'placed' | 'confirmed' | 'transit' | 'ready_pickup' | 'delivered'; label: string; date: string | null; estimated?: boolean };

function buildSteps(order: BuyerOrder): Step[] {
  if (order.delivery_method === 'pickup') {
    return [
      { key: 'placed', label: 'Order Placed', date: order.created_at },
      { key: 'confirmed', label: 'Confirmed & Packing', date: order.confirmed_at || order.preparing_at },
      { key: 'ready_pickup', label: 'Ready for Pickup', date: order.ready_for_pickup_at, estimated: !order.ready_for_pickup_at },
      { key: 'delivered', label: 'Picked Up', date: order.picked_up_at || order.completed_at, estimated: !order.picked_up_at },
    ];
  }
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
      case 'ready_pickup':
        return <MapPinIcon color={iconColor} size={16} />;
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

// ---------- Web-style pieces ----------

type ReturnStep = { key: string; label: string; sub: string; state: 'done' | 'current' | 'declined' | ''; icon: (color: string) => ReactNode };

function buildReturnSteps(order: BuyerOrder): ReturnStep[] {
  const resolved = order.delivery_dispute_status === 'resolved';
  const dismissed = resolved && order.delivery_dispute_resolution === 'dismissed';
  const decisionSub = !resolved ? '1–2 days' : dismissed ? 'Dismissed' : 'Approved';
  return [
    {
      key: 'submitted',
      label: 'Submitted',
      sub: order.delivery_dispute_created_at ? formatShortDate(order.delivery_dispute_created_at) : 'Done',
      state: 'done',
      icon: (color) => <CheckIcon color={color} size={15} />,
    },
    { key: 'decision', label: 'Decision', sub: decisionSub, state: resolved ? 'done' : 'current', icon: (color) => <HourglassIcon color={color} size={15} /> },
    dismissed
      ? { key: 'refund', label: 'No refund', sub: 'Not approved', state: 'declined', icon: (color) => <XIcon color={color} size={15} /> }
      : { key: 'refund', label: 'Refund', sub: resolved ? 'Completed' : 'Pending', state: resolved ? 'done' : '', icon: (color) => <BanknoteIcon color={color} size={15} /> },
  ];
}

function ReturnStepper({ steps }: { steps: ReturnStep[] }) {
  return (
    <View style={w.stepper}>
      {steps.map((step, index) => {
        const iconColor = step.state === 'done' || step.state === 'declined' ? '#ffffff' : step.state === 'current' ? '#176b32' : '#8a968b';
        const lineOn = step.state === 'done' || step.state === 'current' || step.state === 'declined';
        return (
          <View key={step.key} style={w.stepCol}>
            {index > 0 ? <View style={[w.stepLine, lineOn && w.stepLineOn]} /> : null}
            <View style={[w.stepRing, step.state === 'current' && w.stepRingCurrent]}>
              <View
                style={[
                  w.stepNode,
                  step.state === 'done' && w.stepNodeDone,
                  step.state === 'current' && w.stepNodeCurrent,
                  step.state === 'declined' && w.stepNodeDeclined,
                ]}>
                {step.icon(iconColor)}
              </View>
            </View>
            <Text style={[w.stepLabel, step.state !== '' && w.stepLabelOn]}>{step.label}</Text>
            <Text style={w.stepSub}>{step.sub}</Text>
          </View>
        );
      })}
    </View>
  );
}

// Status-first summary of a return request: pill + link on one row, short title, detail chips,
// a compact three-step progress line, and a footer that says what happens next.
function ReturnCard({ order }: { order: BuyerOrder }) {
  const category = DISPUTE_CATEGORY_OPTIONS.find((option) => option.value === order.delivery_dispute_category)?.label || 'Damaged produce';
  const photoCount = Array.isArray(order.delivery_dispute_photo_urls) ? order.delivery_dispute_photo_urls.length : 0;
  const resolved = order.delivery_dispute_status === 'resolved';
  const dismissed = resolved && order.delivery_dispute_resolution === 'dismissed';
  const notes = order.delivery_dispute_resolution_notes;
  const pillLabel = !resolved ? 'Under review' : dismissed ? 'Claim dismissed' : 'Refund approved';
  const pillStyle = !resolved ? w.pillReview : dismissed ? w.pillDismissed : w.pillApproved;
  const pillTextStyle = !resolved ? w.pillReviewText : dismissed ? w.pillDismissedText : w.pillApprovedText;
  const chips = [
    category,
    order.delivery_dispute_affected_quantity ? `${order.delivery_dispute_affected_quantity} affected` : '',
    photoCount > 0 ? `${photoCount} photo${photoCount > 1 ? 's' : ''}` : '',
  ].filter(Boolean);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="View return request details"
      onPress={() => router.push({ pathname: '/BuyerReturnDetails', params: { id: String(order.id) } })}
      style={w.returnCard}>
      <View style={w.returnTopRow}>
        <View style={[w.pill, pillStyle]}>
          {resolved ? null : <View style={w.pillDot} />}
          <Text style={[w.pillText, pillTextStyle]}>{pillLabel}</Text>
        </View>
        <View style={w.returnView}>
          <Text style={w.returnViewText}>View details</Text>
          <ChevronRightIcon />
        </View>
      </View>

      <Text style={w.returnTitle}>{resolved ? 'Update on your return' : 'We’re reviewing your return'}</Text>
      <View style={w.chipRow}>
        {chips.map((chip) => (
          <View key={chip} style={w.chip}>
            <Text style={w.chipText}>{chip}</Text>
          </View>
        ))}
      </View>

      <ReturnStepper steps={buildReturnSteps(order)} />

      <View style={w.returnFooter}>
        {resolved ? (
          <View style={{ flex: 1 }}>
            {!dismissed && order.refund_amount != null ? <Text style={w.footerAmount}>Refund of {formatPeso(order.refund_amount)}</Text> : null}
            {notes ? <Text style={w.footerText}>{notes}</Text> : null}
            {!notes && dismissed ? <Text style={w.footerText}>Your request wasn&apos;t approved. Open the details to see why.</Text> : null}
            {!notes && !dismissed && order.refund_amount == null ? <Text style={w.footerText}>Your request was approved.</Text> : null}
          </View>
        ) : (
          <>
            <BellIcon />
            <Text style={w.footerText}>We&apos;ll notify you as soon as there&apos;s a decision.</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

function IconBadge({ children }: { children: ReactNode }) {
  return (
    <LinearGradient colors={['#4d9f48', '#27783a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={w.badge}>
      {children}
    </LinearGradient>
  );
}

function DetailRow({ icon, label, value, first }: { icon: ReactNode; label: string; value: string; first?: boolean }) {
  return (
    <View style={[w.detailRow, first && w.detailRowFirst]}>
      <IconBadge>{icon}</IconBadge>
      <View style={w.detailText}>
        <Text style={w.detailLabel}>{label}</Text>
        <Text style={w.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function OrderDetailsCard({ order, onOpenProof }: { order: BuyerOrder; onOpenProof: () => void }) {
  const isPickup = order.delivery_method === 'pickup';
  return (
    <View style={[w.card, w.tintCard]}>
      <Text style={w.cardHeading}>Order Details</Text>
      <View style={w.detailList}>
        <DetailRow first icon={<ReceiptIcon color="#ffffff" size={22} />} label="Order Number" value={order.order_number} />
        <DetailRow icon={<CalendarIcon color="#ffffff" size={22} />} label="Order Date" value={formatDateTime(order.created_at)} />
        <DetailRow
          icon={<TransitTruckIcon color="#ffffff" size={22} />}
          label="Est. Delivery"
          value={isPickup ? 'On-site pickup' : formatDate(order.estimated_delivery_at)}
        />
      </View>

      {order.delivery_proof_image_url ? (
        <View style={w.proof}>
          <View style={w.proofLabelRow}>
            <CameraIcon />
            <Text style={w.proofLabel}>Proof of delivery</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="View full proof of delivery photo" onPress={onOpenProof} style={w.proofPhoto}>
            <Image accessibilityIgnoresInvertColors source={{ uri: order.delivery_proof_image_url }} style={w.proofImage} resizeMode="cover" />
            <View style={w.proofZoom}>
              <ExpandIcon />
            </View>
          </Pressable>
          {order.delivery_proof_notes ? (
            <Text style={w.proofNote}>
              <Text style={w.proofNoteBold}>Driver note:</Text> “{order.delivery_proof_notes}”
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function OrderItemsCard({ order }: { order: BuyerOrder }) {
  return (
    <View style={[w.card, w.tintCard]}>
      <Text style={w.cardHeading}>Order Items</Text>
      <View style={w.itemList}>
        {order.items.map((item) => (
          <View key={item.id} style={w.item}>
            <Image accessibilityIgnoresInvertColors source={require('@/assets/images/pineapple-product.png')} style={w.itemImage} />
            <View style={{ flex: 1 }}>
              <Text style={w.itemName}>{item.product_name}</Text>
              <Text style={w.itemMeta}>
                {item.weight_label} · {item.quantity} {item.quantity === 1 ? 'piece' : 'pieces'}
              </Text>
              <Text style={w.itemPrice}>{formatPeso(item.line_total)}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={w.costRow}>
        <Text style={w.costLabel}>Shipping</Text>
        <Text style={w.costValue}>{formatPeso(order.shipping_fee)}</Text>
      </View>
      <View style={w.totalBar}>
        <Text style={w.totalLabel}>Total</Text>
        <Text style={w.totalValue}>{formatPeso(order.total_amount)}</Text>
      </View>
    </View>
  );
}

function PickupTicket({ order }: { order: BuyerOrder }) {
  return (
    <View style={[w.card, w.ticket]}>
      <Text style={w.ticketLabel}>Order number</Text>
      <Text style={w.ticketCode}>{order.order_number}</Text>
      <Text style={w.ticketCopy}>
        Show this order number to farm staff when you arrive. No need to wait for a courier — collect it whenever the farm is open.
      </Text>
      <View style={w.ticketMeta}>
        <View style={w.ticketMetaRow}>
          <StoreIcon />
          <View>
            <Text style={w.ticketMetaTitle}>JToledo Trading Farm</Text>
            <Text style={w.ticketMetaSub}>Tagaytay City, Cavite</Text>
          </View>
        </View>
        <View style={w.ticketMetaRow}>
          <CalendarIcon color="#176b32" size={17} />
          <View>
            <Text style={w.ticketMetaTitle}>Pickup hours</Text>
            <Text style={w.ticketMetaSub}>Mon – Sat, 8:00 AM – 5:00 PM</Text>
          </View>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => Linking.openURL('https://www.google.com/maps/search/?api=1&query=JToledo+Trading+Farm+Tagaytay+City')}
        style={w.ticketButton}>
        <MapPinIcon color="#ffffff" size={15} />
        <Text style={w.ticketButtonText}>Get Directions</Text>
      </Pressable>
    </View>
  );
}

function RatingCard({ order }: { order: BuyerOrder }) {
  const rated = Boolean(order.buyer_rating);
  const value = order.buyer_rating || 0;
  return (
    <View style={[w.card, w.rateCard]}>
      <View style={w.rateText}>
        <Text style={w.rateTitle}>{rated ? 'Your rating' : 'How was your order?'}</Text>
        <Text style={w.rateCopy}>{rated ? 'Thanks for rating your order.' : 'Tap a star to rate — it helps other buyers and the farm.'}</Text>
      </View>
      <View style={w.stars}>
        {[1, 2, 3, 4, 5].map((star) =>
          rated ? (
            <Text key={star} style={[w.star, star <= value && w.starFilled]}>★</Text>
          ) : (
            <Pressable
              accessibilityLabel={`${star} star${star === 1 ? '' : 's'}`}
              accessibilityRole="button"
              hitSlop={4}
              key={star}
              onPress={() => router.push({ pathname: '/BuyerRateOrder', params: { id: String(order.id), rating: String(star) } })}>
              <Text style={w.star}>★</Text>
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}

function CancelledReceipt({
  order,
  onShowDetails,
  onBuyAgain,
  buyingAgain,
}: {
  order: BuyerOrder;
  onShowDetails: () => void;
  onBuyAgain: () => void;
  buyingAgain: boolean;
}) {
  const canBuyAgain = order.items.some((item) => item.pineapple_size_id);
  const paymentLabel = PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method;
  return (
    <>
      <View style={[w.card, w.receiptCard]}>
        <View style={w.receiptHero}>
          <XIcon color="#b13b3b" size={26} />
        </View>
        <Text style={w.receiptTitle}>Order cancelled</Text>
        <Text style={w.receiptWhen}>
          {order.cancelled_at ? formatDateTime(order.cancelled_at) : 'Cancellation time unavailable'} · {order.order_number}
        </Text>
        <View style={w.facts}>
          <View style={w.fact}>
            <Text style={w.factLabel}>Reason</Text>
            <Text style={w.factValue}>{order.cancellation_reason || 'Not specified'}</Text>
          </View>
          <View style={w.fact}>
            <Text style={w.factLabel}>Payment</Text>
            <Text style={w.factValue}>{paymentLabel}</Text>
          </View>
          <View style={w.fact}>
            <Text style={w.factLabel}>Placed</Text>
            <Text style={w.factValue}>{formatDateTime(order.created_at)}</Text>
          </View>
          {order.refund_amount != null ? (
            <View style={w.fact}>
              <Text style={w.factLabel}>Refund</Text>
              <Text style={w.factValue}>{formatPeso(order.refund_amount)} · Refund requested</Text>
            </View>
          ) : null}
        </View>
        {order.refund_amount != null ? (
          <Text style={w.refundNote}>We&apos;ll return the refund to your {paymentLabel}, the payment method you used.</Text>
        ) : null}
      </View>

      <View style={[w.card, { padding: 20 }]}>
        <Text style={w.itemsHeading}>Items</Text>
        <View style={w.tableHead}>
          <View style={w.colThumb} />
          <Text style={[w.tableHeadText, w.colItem]}>Item</Text>
          <Text style={[w.tableHeadText, w.colQty]}>Qty</Text>
          <Text style={[w.tableHeadText, w.colPrice]}>Price</Text>
        </View>
        {order.items.map((item) => (
          <View key={item.id} style={w.tableRow}>
            <Image accessibilityIgnoresInvertColors source={require('@/assets/images/pineapple-product.png')} style={w.tableThumb} />
            <View style={w.colItem}>
              <Text style={w.tableName}>{item.product_name}</Text>
              <Text style={w.tableMeta}>{item.weight_label}</Text>
            </View>
            <Text style={[w.tableCell, w.colQty]}>×{item.quantity}</Text>
            <Text style={[w.tableCell, w.colPrice]}>{formatPeso(item.line_total)}</Text>
          </View>
        ))}
        <View style={w.sumRow}>
          <Text style={w.sumText}>Shipping</Text>
          <Text style={w.sumText}>{formatPeso(order.shipping_fee)}</Text>
        </View>
        <View style={[w.sumRow, w.sumTotal]}>
          <Text style={w.sumTotalText}>Total</Text>
          <Text style={w.sumTotalText}>{formatPeso(order.total_amount)}</Text>
        </View>
      </View>

      <View style={w.bigButtons}>
        <Pressable accessibilityRole="button" onPress={onShowDetails} style={[w.bigButton, w.bigButtonOutline]}>
          <ReceiptIcon color="#26743a" size={20} />
          <Text style={[w.bigButtonText, w.bigButtonOutlineText]}>Order details</Text>
        </Pressable>
        {canBuyAgain ? (
          <Pressable
            accessibilityRole="button"
            disabled={buyingAgain}
            onPress={onBuyAgain}
            style={[w.bigButton, w.bigButtonFilled, buyingAgain && w.buttonDisabled]}>
            {buyingAgain ? <ActivityIndicator color="#ffffff" /> : <Text style={[w.bigButtonText, w.bigButtonFilledText]}>Buy again</Text>}
          </Pressable>
        ) : null}
      </View>
    </>
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
  const [showPreCancelDetails, setShowPreCancelDetails] = useState(false);
  const [viewingProof, setViewingProof] = useState(false);
  const [buyingAgain, setBuyingAgain] = useState(false);

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

  // Adds the order's items to the saved cart; the cart screen re-checks them against live stock.
  async function handleBuyAgain() {
    if (!order) return;
    setBuyingAgain(true);
    try {
      const cart = await readBuyerCart();
      const merged = cart.map((item) => ({ ...item }));
      order.items.forEach((item) => {
        if (!item.pineapple_size_id) return;
        const existing = merged.find((entry) => entry.product_id === item.pineapple_size_id);
        if (existing) {
          existing.quantity = (Number(existing.quantity) || 0) + item.quantity;
        } else {
          merged.push({
            product_id: item.pineapple_size_id,
            quantity: item.quantity,
            size_name: item.product_name,
            weight: item.weight_label,
            price: item.unit_price,
          });
        }
      });
      await writeBuyerCart(merged);
      router.push('/BuyerCart' as never);
    } finally {
      setBuyingAgain(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={w.safeArea}>
        <BuyerHeader showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={GREEN} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={w.safeArea}>
        <BuyerHeader showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Text style={{ color: '#a33d35', fontSize: 13, textAlign: 'center' }}>{error || 'Order not found.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isPickup = order.delivery_method === 'pickup';
  const isCancelled = order.order_status === 'cancelled';
  const destinationCity = isPickup ? 'Tagaytay City' : order.delivery_city_municipality || 'Delivery Address';
  const destinationAddress = isPickup ? 'JToledo Trading Farm, Tagaytay City' : getDeliveryAddress(order) || 'Address not provided';
  const showReceipt = isCancelled && !showPreCancelDetails;
  const returnOrRefund = isReturnOrRefund(order);

  return (
    <SafeAreaView style={w.safeArea}>
      <BuyerHeader showBack />

      <ScrollView contentContainerStyle={w.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={w.title}>Order {order.order_number}</Text>

        {showReceipt ? (
          <CancelledReceipt
            buyingAgain={buyingAgain}
            onBuyAgain={handleBuyAgain}
            onShowDetails={() => setShowPreCancelDetails(true)}
            order={order}
          />
        ) : (
          <>
            {isCancelled ? (
              <Pressable accessibilityRole="button" onPress={() => setShowPreCancelDetails(false)} style={w.backToCancellation}>
                <ChevronLeftIcon color="#26743a" size={18} />
                <Text style={w.backToCancellationText}>Back to cancellation</Text>
              </Pressable>
            ) : null}

            {order.delivery_dispute_status ? <ReturnCard order={order} /> : null}

            {/* DELIVERY ROUTE & PROGRESS STEPPER (unchanged) */}
            <View style={[styles.card, { marginBottom: 20 }]}>
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

              {isCancelled ? (
                <View style={styles.cancellationPanel}>
                  <View style={styles.cancellationRow}>
                    <Text style={styles.cancellationLabel}>Requested by</Text>
                    <Text style={styles.cancellationValue}>You</Text>
                  </View>
                  <View style={styles.cancellationRow}>
                    <Text style={styles.cancellationLabel}>Requested at</Text>
                    <Text style={styles.cancellationValue}>{formatDateTime(order.cancelled_at)}</Text>
                  </View>
                  <View style={styles.cancellationRow}>
                    <Text style={styles.cancellationLabel}>Reason</Text>
                    <Text style={styles.cancellationValue}>{order.cancellation_reason || 'Not specified'}</Text>
                  </View>
                  <View style={[styles.cancellationRow, styles.cancellationRowLast]}>
                    <Text style={styles.cancellationLabel}>Payment method</Text>
                    <Text style={styles.cancellationValue}>{PAYMENT_METHOD_LABELS[order.payment_method]}</Text>
                  </View>
                </View>
              ) : (
                <DeliveryStepper order={order} />
              )}
            </View>

            {order.order_status === 'ready_for_pickup' ? <PickupTicket order={order} /> : null}

            <OrderDetailsCard onOpenProof={() => setViewingProof(true)} order={order} />
            <OrderItemsCard order={order} />

            {/* CANCEL (PENDING/CONFIRMED ONLY) */}
            {canCancelBuyerOrder(order) ? (
              <View style={[w.card, w.actionCard]}>
                <Text style={w.actionTitle}>Need to cancel this order?</Text>
                <Text style={w.actionText}>
                  This order hasn&apos;t started preparing yet, so you can still cancel it
                  {order.payment_method === 'gcash' && order.payment_status === 'paid' ? ' for a full refund to your GCash.' : '.'}
                </Text>
                <View style={w.actionButtons}>
                  <Pressable accessibilityRole="button" onPress={() => setShowCancelModal(true)} style={[w.button, w.buttonDanger]}>
                    <Text style={[w.buttonText, w.buttonDangerText]}>Cancel Order</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {/* CONFIRM RECEIPT / REPORT AN ISSUE (IF DELIVERED) */}
            {order.order_status === 'delivered' && order.delivery_dispute_status !== 'open' ? (
              <View style={[w.card, w.actionCard]}>
                <Text style={w.actionTitle}>Did you receive your order?</Text>
                <Text style={w.actionText}>
                  Confirm everything arrived as expected, or report a problem while the delivery details are still fresh.
                </Text>
                {actionError ? <Text style={w.actionErrorText}>{actionError}</Text> : null}
                <View style={w.actionButtons}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={confirming}
                    onPress={handleConfirmReceipt}
                    style={[w.button, w.buttonPrimary, confirming && w.buttonDisabled]}>
                    {confirming ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={[w.buttonText, w.buttonPrimaryText]}>Confirm Receipt</Text>}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={confirming}
                    onPress={() => router.push({ pathname: '/BuyerReturnRequest', params: { id: String(order.id) } })}
                    style={[w.button, w.buttonSecondary, confirming && w.buttonDisabled]}>
                    <Text style={[w.buttonText, w.buttonSecondaryText]}>Report an Issue</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {/* RATING + REPORT LINK (COMPLETED DELIVERY ORDERS WITHOUT A RETURN) */}
            {order.order_status === 'completed' && !returnOrRefund && !isPickup ? (
              <>
                <RatingCard order={order} />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/BuyerReturnRequest', params: { id: String(order.id) } })}>
                  <Text style={w.reportNote}>Noticed something wrong? Report an issue</Text>
                </Pressable>
              </>
            ) : null}

            {/* PICKED UP AT THE FARM (PICKUP ORDERS REACHING COMPLETED) */}
            {isPickup && order.order_status === 'completed' ? (
              <>
                {!returnOrRefund ? <RatingCard order={order} /> : null}
                <View style={[w.card, w.actionCard]}>
                  <Text style={w.actionTitle}>Picked up at the farm</Text>
                  <Text style={w.actionText}>
                    {order.picked_up_at ? `Verified at the counter on ${formatDateTime(order.picked_up_at)}.` : 'Verified at the counter.'} There&apos;s no
                    confirm-receipt step for pickup orders — you inspected it in person.
                  </Text>
                  {!order.delivery_dispute_status ? (
                    <View style={w.actionButtons}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => router.push({ pathname: '/BuyerReturnRequest', params: { id: String(order.id) } })}
                        style={[w.button, w.buttonSecondary]}>
                        <Text style={[w.buttonText, w.buttonSecondaryText]}>Report an issue</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      <BuyerCancelOrderModal
        onCancelled={(updated) => {
          setOrder(updated);
          setShowCancelModal(false);
          setShowPreCancelDetails(false);
        }}
        onClose={() => setShowCancelModal(false)}
        order={showCancelModal ? order : null}
      />

      <Modal animationType="fade" onRequestClose={() => setViewingProof(false)} transparent visible={viewingProof && Boolean(order.delivery_proof_image_url)}>
        <Pressable accessibilityLabel="Close photo preview" onPress={() => setViewingProof(false)} style={w.lightbox}>
          {order.delivery_proof_image_url ? (
            <Image accessibilityIgnoresInvertColors resizeMode="contain" source={{ uri: order.delivery_proof_image_url }} style={w.lightboxImage} />
          ) : null}
          {order.delivery_proof_notes ? <Text style={w.lightboxCaption}>Driver note: {order.delivery_proof_notes}</Text> : null}
          <View style={w.lightboxClose}>
            <CloseIcon />
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
