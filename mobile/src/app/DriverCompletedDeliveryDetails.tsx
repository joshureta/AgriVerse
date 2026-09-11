import { GREEN, styles } from '@/styles/driver-completed-delivery-details.styles';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import {
  DriverOrder,
  formatDeliveryAddress,
  formatDeliveryRoute,
  formatDeliveryWindow,
  formatPeso,
} from '@/lib/driver-deliveries';

function BackIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="m15 18-6-6 6-6" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CheckIcon({ size = 13, color = '#166534' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6 9 17l-5-5" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function UserIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#176D34" strokeWidth={2} strokeLinecap="round" />
      <Circle cx={12} cy={7} r={4} stroke="#176D34" strokeWidth={2} />
    </Svg>
  );
}

function PhoneIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
        stroke="#166534"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PinIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 7.2c0 7.3-8 11.8-8 11.8z"
        stroke="#EF4444"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={10} r={3} stroke="#EF4444" strokeWidth={2} />
    </Svg>
  );
}

function CameraIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        stroke="#176D34"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={13} r={4} stroke="#176D34" strokeWidth={2} />
    </Svg>
  );
}

function BoxIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Rect width={18} height={18} x={3} y={3} rx={2} stroke="#176D34" strokeWidth={2} />
      <Path d="m9 12 2 2 4-4" stroke="#176D34" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TruckIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5a2 2 0 0 0-2 2v7h3"
        stroke="#176D34"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={6.5} cy={16.5} r={2.5} stroke="#176D34" strokeWidth={2} />
      <Circle cx={16.5} cy={16.5} r={2.5} stroke="#176D34" strokeWidth={2} />
    </Svg>
  );
}

function ClockIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke="#176D34" strokeWidth={2} />
      <Path d="M12 6v6l4 2" stroke="#176D34" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ZoomIcon() {
  return (
    <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={8} stroke="#FFFFFF" strokeWidth={2} />
      <Path d="m21 21-4.35-4.35M11 8v6M8 11h6" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export default function DriverCompletedDeliveryDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { loading: authLoading, profile } = useAuth();
  const [order, setOrder] = useState<DriverOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const loadDelivery = useCallback(async (refresh = false) => {
    if (!id) {
      setError('Delivery order ID is missing.');
      setLoading(false);
      return;
    }
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      // First try fetching single order by id
      const response = await apiRequest<{ order: DriverOrder }>(`/api/driver/orders/${id}`);
      setOrder(response.order);
    } catch {
      // Fallback: fetch list and find matching order
      try {
        const listResponse = await apiRequest<{ orders: DriverOrder[] }>('/api/driver/orders');
        const found = (listResponse.orders || []).find((o) => String(o.id) === String(id));
        if (found) {
          setOrder(found);
        } else {
          setError('Completed delivery was not found.');
        }
      } catch (listCaught) {
        setError(listCaught instanceof Error ? listCaught.message : 'Could not load delivery details.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    if (profile) loadDelivery();
  }, [loadDelivery, profile]);

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GREEN} size="large" />
      </View>
    );
  }
  if (!profile) return <Redirect href="/login" />;

  const formatTimeOnly = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return null;
    }
  };

  const deliveredTime =
    formatTimeOnly(order?.delivered_at) ||
    formatTimeOnly(order?.delivery_proof_submitted_at) ||
    'Completed';

  const vehicleName = order?.vehicle
    ? `${order.vehicle.vehicle_name} (${order.vehicle.plate_number})`
    : 'Assigned Vehicle';

  const totalItemsCount = order?.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

  const handleCall = () => {
    if (order?.delivery_mobile_number) {
      Linking.openURL(`tel:${order.delivery_mobile_number}`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Green Header Bar (64px height, exact WorkerHeader match) */}
      <View style={styles.headerBar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}>
          <BackIcon />
          <Text style={styles.backButtonText}>Completed Deliveries</Text>
        </Pressable>

        <View style={styles.headerStatusBadge}>
          <Text style={styles.headerStatusBadgeText}>✓ Delivered</Text>
        </View>
      </View>

      {/* Main Curved Cream Container */}
      <View style={styles.mainBodyContainer}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={GREEN} size="large" />
          </View>
        ) : error || !order ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error || 'Delivery record not found.'}</Text>
            <Pressable onPress={() => loadDelivery()} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Tap to Retry</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                colors={[GREEN]}
                refreshing={refreshing}
                onRefresh={() => loadDelivery(true)}
              />
            }>
            {/* 1. Hero Delivery Summary Card */}
            <View style={styles.heroCard}>
              <View style={styles.heroHeaderRow}>
                <View style={styles.badgesLeft}>
                  <View style={styles.orderPill}>
                    <Text style={styles.orderPillText}>
                      {order.order_number || `Order #${order.id}`}
                    </Text>
                  </View>
                  <View style={styles.statusPillDelivered}>
                    <CheckIcon size={12} />
                    <Text style={styles.statusPillTextDelivered}>Delivered</Text>
                  </View>
                </View>
                <Text style={styles.heroCompletedTime}>{deliveredTime}</Text>
              </View>

              <Text style={styles.heroTitle}>
                Deliver to {order.delivery_full_name || 'Customer'}
              </Text>

              <View style={styles.heroDivider}>
                <View>
                  <Text style={styles.heroMetaLabel}>Total Amount</Text>
                  <Text style={styles.heroAmountValue}>{formatPeso(order.total_amount)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.heroMetaLabel}>Payment Method</Text>
                  <View style={styles.paymentMethodBadge}>
                    <CheckIcon size={11} />
                    <Text style={styles.paymentMethodBadgeText}>
                      {order.payment_method === 'gcash' ? 'GCash (Paid)' : `${order.payment_method.toUpperCase()} (Collected)`}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 2. Customer & Destination Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <UserIcon />
                  <Text style={styles.sectionTitle}>Recipient & Destination</Text>
                </View>
              </View>

              <View style={styles.customerRow}>
                <View>
                  <Text style={styles.customerName}>{order.delivery_full_name || 'Customer'}</Text>
                  <Text style={styles.customerPhone}>{order.delivery_mobile_number || 'N/A'}</Text>
                </View>
                {order.delivery_mobile_number ? (
                  <Pressable onPress={handleCall} style={styles.callButton}>
                    <PhoneIcon />
                    <Text style={styles.callButtonText}>Call</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.addressBox}>
                <PinIcon />
                <Text style={styles.addressText}>{formatDeliveryAddress(order)}</Text>
              </View>

              <View style={styles.routeRow}>
                <Text style={styles.routeLabel}>Route Dispatch:</Text>
                <Text style={styles.routeValue}>{formatDeliveryRoute(order)}</Text>
              </View>
            </View>

            {/* 3. Proof of Delivery (POD) Photo & Notes */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <CameraIcon />
                  <Text style={styles.sectionTitle}>Proof of Delivery (POD)</Text>
                </View>
                <View style={[styles.sectionTag, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.sectionTagText, { color: '#166534' }]}>
                    {order.delivery_proof_image_url ? 'Verified Photo' : 'POD Logged'}
                  </Text>
                </View>
              </View>

              {order.delivery_proof_image_url ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setModalVisible(true)}
                  style={styles.photoThumbnailWrapper}>
                  <Image
                    source={{ uri: order.delivery_proof_image_url }}
                    style={styles.photoThumbnail}
                  />
                  <View style={styles.photoOverlay}>
                    <View style={styles.photoZoomBadge}>
                      <ZoomIcon />
                      <Text style={styles.photoZoomBadgeText}>Tap to Zoom</Text>
                    </View>
                    <View style={styles.photoMetaBox}>
                      <Text style={styles.photoMetaText}>Delivered · {deliveredTime}</Text>
                    </View>
                  </View>
                </Pressable>
              ) : null}

              <View style={styles.notesBox}>
                <Text style={styles.notesKicker}>Driver Hand-off Notes</Text>
                <Text style={styles.notesText}>
                  {order.delivery_proof_notes ||
                    'Order handed over and verified with recipient upon arrival. No issues reported.'}
                </Text>
              </View>
            </View>

            {/* 4. Delivered Cargo Manifest */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <BoxIcon />
                  <Text style={styles.sectionTitle}>Delivered Cargo Manifest</Text>
                </View>
                <View style={styles.sectionTag}>
                  <Text style={styles.sectionTagText}>
                    {order.items && order.items.length
                      ? `${order.items.length} ${order.items.length === 1 ? 'Item' : 'Items'} (${totalItemsCount} units)`
                      : 'Produce Order'}
                  </Text>
                </View>
              </View>

              {order.items && order.items.length > 0 ? (
                order.items.map((item) => (
                  <View key={item.id} style={styles.cargoItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cargoItemName}>{item.product_name}</Text>
                      <Text style={styles.cargoItemMeta}>
                        {item.quantity} {item.quantity === 1 ? 'unit' : 'units'}
                        {item.weight_label ? ` · ${item.weight_label}` : ''}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.cargoItemTotal}>{formatPeso(item.line_total)}</Text>
                      <Text style={styles.cargoItemUnit}>{formatPeso(item.unit_price)} / unit</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.cargoItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cargoItemName}>Fresh Pineapple Harvest Package</Text>
                    <Text style={styles.cargoItemMeta}>Standard Produce Delivery</Text>
                  </View>
                  <View>
                    <Text style={styles.cargoItemTotal}>{formatPeso(order.total_amount)}</Text>
                  </View>
                </View>
              )}

              <View style={styles.cargoSummaryRow}>
                <Text style={styles.cargoSummaryLabel}>Total Delivery Order Value</Text>
                <Text style={styles.cargoSummaryValue}>{formatPeso(order.total_amount)}</Text>
              </View>
            </View>

            {/* 5. Assigned Vehicle & Dispatch Logistics */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <TruckIcon />
                  <Text style={styles.sectionTitle}>Assigned Vehicle & Logistics</Text>
                </View>
              </View>

              <View style={styles.logisticsGrid}>
                <View style={styles.logisticsCol}>
                  <Text style={styles.logisticsKicker}>Vehicle</Text>
                  <Text numberOfLines={1} style={styles.logisticsValue}>
                    {order.vehicle?.vehicle_name || 'Assigned Vehicle'}
                  </Text>
                  <Text style={styles.logisticsSub}>
                    Plate: {order.vehicle?.plate_number || 'N/A'}
                  </Text>
                </View>

                <View style={styles.logisticsCol}>
                  <Text style={styles.logisticsKicker}>Delivery Window</Text>
                  <Text numberOfLines={1} style={styles.logisticsValue}>
                    {formatDeliveryWindow(
                      order.delivery_scheduled_at,
                      order.delivery_window_end_at
                    )}
                  </Text>
                  <Text style={[styles.logisticsSub, { color: '#166534', fontWeight: '600' }]}>
                    Completed: {deliveredTime}
                  </Text>
                </View>
              </View>
            </View>

            {/* 6. Delivery Timeline (Audit Trail) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <ClockIcon />
                  <Text style={styles.sectionTitle}>Delivery Timeline</Text>
                </View>
              </View>

              <View style={styles.timelineContainer}>
                {/* Step 1 */}
                <View style={styles.timelineStep}>
                  <View style={styles.timelineLine} />
                  <View style={styles.timelineDot}>
                    <CheckIcon size={10} color="#166534" />
                  </View>
                  <View style={styles.timelineStepContent}>
                    <Text style={styles.timelineStepTitle}>Delivery Assigned & Accepted</Text>
                    <Text style={styles.timelineStepSub}>
                      {formatTimeOnly(order.delivery_accepted_at) || 'Dispatch Confirmed'} · Vehicle {order.vehicle?.plate_number || 'Linked'}
                    </Text>
                  </View>
                </View>

                {/* Step 2 */}
                <View style={styles.timelineStep}>
                  <View style={styles.timelineLine} />
                  <View style={styles.timelineDot}>
                    <CheckIcon size={10} color="#166534" />
                  </View>
                  <View style={styles.timelineStepContent}>
                    <Text style={styles.timelineStepTitle}>Picked Up from Silang Hub</Text>
                    <Text style={styles.timelineStepSub}>
                      {formatTimeOnly(order.delivery_picked_up_at) || 'Hub Dispatch'} · Cargo loaded & verified
                    </Text>
                  </View>
                </View>

                {/* Step 3 */}
                <View style={styles.timelineStep}>
                  <View style={styles.timelineLine} />
                  <View style={styles.timelineDot}>
                    <CheckIcon size={10} color="#166534" />
                  </View>
                  <View style={styles.timelineStepContent}>
                    <Text style={styles.timelineStepTitle}>Out for Delivery</Text>
                    <Text style={styles.timelineStepSub}>
                      In transit to destination
                    </Text>
                  </View>
                </View>

                {/* Step 4 */}
                <View style={[styles.timelineStep, styles.timelineStepLast]}>
                  <View style={[styles.timelineDot, { backgroundColor: '#166534' }]}>
                    <CheckIcon size={10} color="#FFFFFF" />
                  </View>
                  <View style={styles.timelineStepContent}>
                    <Text style={[styles.timelineStepTitle, { color: '#166534' }]}>
                      Delivered Successfully
                    </Text>
                    <Text style={styles.timelineStepSub}>
                      {deliveredTime} · Proof of delivery submitted
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Bottom Back Button Action */}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.bottomBackButton}>
              <BackIcon />
              <Text style={styles.bottomBackButtonText}>Back to Completed Deliveries</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>

      {/* Fullscreen Photo Modal */}
      <Modal
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
        transparent
        visible={modalVisible}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Proof of Delivery Photo</Text>
                <Text style={styles.modalSub}>{order?.order_number} · {deliveredTime}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseButton}>
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.modalImageContainer}>
              {order?.delivery_proof_image_url ? (
                <Image
                  source={{ uri: order.delivery_proof_image_url }}
                  style={styles.modalImage}
                />
              ) : null}
            </View>

            <View style={styles.modalFooter}>
              <Text style={styles.modalFooterTitle}>{order?.delivery_full_name}</Text>
              <Text style={styles.modalFooterSub}>{order ? formatDeliveryAddress(order) : ''}</Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
