import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';

import { BuyerBottomNavigation } from '@/components/buyer-bottom-navigation';
import { BuyerHeader } from '@/components/buyer-header';
import { BuyerOrder, confirmBuyerOrderReceipt, DisputeCategory, loadBuyerOrder, reportBuyerOrderDispute } from '@/lib/buyer-marketplace';
import { GREEN, styles } from '@/styles/buyer-order-tracking.styles';

const DISPUTE_CATEGORY_OPTIONS: { value: DisputeCategory; label: string }[] = [
  { value: 'damaged', label: 'Damaged' },
  { value: 'spoiled_rotten', label: 'Spoiled / Rotten' },
  { value: 'wrong_item', label: 'Wrong item' },
  { value: 'missing_item', label: 'Missing item' },
  { value: 'wrong_quantity', label: 'Wrong quantity' },
];

const DISPUTE_CATEGORY_HELP: Record<DisputeCategory, string> = {
  damaged: 'Crushed, bruised, or otherwise damaged',
  spoiled_rotten: 'Not fresh or no longer safe to use',
  wrong_item: 'Different product or size than ordered',
  missing_item: 'An item from the order was not included',
  wrong_quantity: 'You received fewer items than ordered',
};

type PickedPhoto = { uri: string; base64: string; mime: string };

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
  const [disputing, setDisputing] = useState(false);
  const [disputeFormOpen, setDisputeFormOpen] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState<DisputeCategory | ''>('');
  const [disputeItemId, setDisputeItemId] = useState<number | null>(null);
  const [disputeAffectedQuantity, setDisputeAffectedQuantity] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputePhotos, setDisputePhotos] = useState<PickedPhoto[]>([]);
  const [actionError, setActionError] = useState('');

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

  async function handlePickDisputePhoto() {
    setActionError('');
    if (disputePhotos.length >= 6) {
      Alert.alert('Limit Reached', 'You can attach up to 6 photos.');
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setActionError('Photo gallery permission is required to select photos.');
        Alert.alert('Permission Denied', 'Please enable gallery access in your device settings.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, base64: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          setDisputePhotos((current) => [...current, { uri: asset.uri, base64: asset.base64 as string, mime: asset.mimeType || 'image/jpeg' }]);
        }
      }
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Could not select photo from gallery.');
    }
  }

  function handleRemoveDisputePhoto(uri: string) {
    setDisputePhotos((current) => current.filter((photo) => photo.uri !== uri));
  }

  const disputeItem = order?.items.find((item) => item.id === disputeItemId) || null;
  const canSubmitDispute = Boolean(
    disputeCategory && disputeItemId && disputeAffectedQuantity.trim() && disputeReason.trim() && disputePhotos.length > 0,
  );

  async function handleSubmitDispute() {
    if (!order || !canSubmitDispute || !disputeCategory || !disputeItemId) return;
    setDisputing(true);
    setActionError('');
    try {
      setOrder(await reportBuyerOrderDispute(order.id, {
        category: disputeCategory,
        itemId: disputeItemId,
        affectedQuantity: Number(disputeAffectedQuantity),
        reason: disputeReason.trim(),
        photos: disputePhotos.map((photo) => ({ data: photo.base64, mime: photo.mime })),
      }));
      setDisputeFormOpen(false);
      setDisputeCategory('');
      setDisputeItemId(null);
      setDisputeAffectedQuantity('');
      setDisputeReason('');
      setDisputePhotos([]);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Could not submit this report.');
    } finally {
      setDisputing(false);
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
            {!disputeFormOpen ? (
              <View style={styles.actionRow}>
                <Pressable
                  disabled={confirming || disputing}
                  onPress={handleConfirmReceipt}
                  style={[styles.primaryButton, (confirming || disputing) && styles.buttonDisabled]}>
                  {confirming ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.primaryButtonText}>Confirm Receipt</Text>}
                </Pressable>
                <Pressable
                  disabled={confirming || disputing}
                  onPress={() => router.push({ pathname: '/BuyerReturnRequest', params: { id: String(order.id) } })}
                  style={[styles.secondaryButton, (confirming || disputing) && styles.buttonDisabled]}>
                  <Text style={styles.secondaryButtonText}>Report an issue</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.disputeIntro}>
                  <Text style={styles.disputeStep}>STEP 1 OF 3</Text>
                  <Text style={styles.disputeIntroTitle}>Tell us what went wrong</Text>
                  <Text style={styles.disputeIntroText}>Choose the issue that best matches your delivery. The farm team will review your report and propose the appropriate return or refund resolution.</Text>
                </View>
                <Text style={styles.disputeFieldLabel}>What happened?</Text>
                <View style={styles.chipRow}>
                  {DISPUTE_CATEGORY_OPTIONS.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => setDisputeCategory(option.value)}
                      style={[styles.chip, disputeCategory === option.value && styles.chipSelected]}>
                      <Text style={[styles.chipText, disputeCategory === option.value && styles.chipTextSelected]}>{option.label}</Text>
                      <Text style={[styles.chipHelpText, disputeCategory === option.value && styles.chipHelpTextSelected]}>{DISPUTE_CATEGORY_HELP[option.value]}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.disputeFieldLabel}>STEP 2 — Which item is affected?</Text>
                <View style={styles.chipRow}>
                  {order.items.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => { setDisputeItemId(item.id); setDisputeAffectedQuantity(''); }}
                      style={[styles.chip, disputeItemId === item.id && styles.chipSelected]}>
                      <Text style={[styles.chipText, disputeItemId === item.id && styles.chipTextSelected]}>
                        {item.product_name} ({item.quantity})
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.disputeFieldLabel}>How many were affected?</Text>
                <TextInput
                  accessibilityLabel="Affected quantity"
                  editable={Boolean(disputeItemId)}
                  keyboardType="number-pad"
                  onChangeText={setDisputeAffectedQuantity}
                  placeholder={disputeItem ? `Up to ${disputeItem.quantity}` : 'Select an item first'}
                  placeholderTextColor="#9ca3af"
                  style={styles.quantityInput}
                  value={disputeAffectedQuantity}
                />

                <Text style={styles.disputeFieldLabel}>Describe it</Text>
                <TextInput
                  accessibilityLabel="Describe what went wrong"
                  maxLength={1000}
                  multiline
                  onChangeText={setDisputeReason}
                  placeholder="What went wrong?"
                  placeholderTextColor="#9ca3af"
                  style={styles.disputeInput}
                  value={disputeReason}
                />

                <Text style={styles.disputeFieldLabel}>STEP 3 — Add photo evidence (required)</Text>
                <Pressable onPress={handlePickDisputePhoto} style={styles.addPhotoButton}>
                  <Text style={styles.addPhotoButtonText}>+ Add Photo ({disputePhotos.length}/6)</Text>
                </Pressable>
                <Text style={styles.evidenceHelp}>Add clear photos of the item, packaging, and any damage.</Text>
                {disputePhotos.length > 0 ? (
                  <View style={styles.photoRow}>
                    {disputePhotos.map((photo) => (
                      <View key={photo.uri} style={styles.photoThumbWrap}>
                        <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                        <Pressable onPress={() => handleRemoveDisputePhoto(photo.uri)} style={styles.photoRemoveBadge}>
                          <Text style={styles.photoRemoveBadgeText}>×</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View style={styles.actionRow}>
                  <Pressable
                    disabled={disputing || !canSubmitDispute}
                    onPress={handleSubmitDispute}
                    style={[styles.dangerButton, (disputing || !canSubmitDispute) && styles.buttonDisabled]}>
                    {disputing ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.dangerButtonText}>Submit Report</Text>}
                  </Pressable>
                  <Pressable disabled={disputing} onPress={() => setDisputeFormOpen(false)} style={[styles.secondaryButton, disputing && styles.buttonDisabled]}>
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        ) : null}

        {order.delivery_dispute_status === 'open' ? (
          <View style={[styles.card, styles.pendingReviewCard]}>
            <Text style={styles.pendingReviewTitle}>We're reviewing your report</Text>
            <Text style={styles.confirmationText}>{order.delivery_dispute_reason}</Text>
          </View>
        ) : null}

        {order.delivery_dispute_status === 'resolved' && order.delivery_dispute_resolution_notes ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Update on your report</Text>
            <Text style={styles.confirmationText}>{order.delivery_dispute_resolution_notes}</Text>
          </View>
        ) : null}
      </ScrollView>

      <BuyerBottomNavigation activeTab="order" />
    </SafeAreaView>
  );
}

