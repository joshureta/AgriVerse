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
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="m15 18-6-6 6-6" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CheckIcon({ size = 12, color = '#166534' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6 9 17l-5-5" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
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
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 7.2c0 7.3-8 11.8-8 11.8z"
        stroke="#176D34"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={10} r={3} stroke="#176D34" strokeWidth={2} />
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
      const response = await apiRequest<{ order: DriverOrder }>(`/api/driver/orders/${id}`);
      setOrder(response.order);
    } catch {
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

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Completed';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-PH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return 'Completed';
    }
  };

  const formatTimeOnly = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return null;
    }
  };

  const deliveredTime =
    formatDateTime(order?.delivered_at) ||
    formatDateTime(order?.delivery_proof_submitted_at) ||
    'Completed';

  const deliveredTimeShort =
    formatTimeOnly(order?.delivered_at) ||
    formatTimeOnly(order?.delivery_proof_submitted_at) ||
    'Completed';

  const totalItemsCount = order?.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

  const handleCall = () => {
    if (order?.delivery_mobile_number) {
      Linking.openURL(`tel:${order.delivery_mobile_number}`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}>
          <BackIcon />
        </Pressable>
      </View>

      {/* Main Curved Body Container */}
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

            {/* Official Digital Receipt Card */}
            <View style={styles.receiptCard}>
              {/* Receipt Header */}
              <View style={styles.receiptTopHeader}>
                <View style={styles.receiptLogoBadge}>
                  <Text style={styles.receiptLogoText}>AgriVerse Delivery Slip</Text>
                </View>
                <Text style={styles.receiptOrderNumber}>{order.order_number || `Order #${order.id}`}</Text>
                <Text style={styles.receiptDateStamp}>{deliveredTime}</Text>

                <View style={styles.receiptStatusStamp}>
                  <CheckIcon size={12} color="#166534" />
                  <Text style={styles.receiptStatusStampText}>DELIVERED</Text>
                </View>
              </View>

              <View style={styles.dashedDivider} />

              {/* Recipient & Destination Info */}
              <Text style={styles.receiptSectionKicker}>Recipient & Destination</Text>
              
              <View style={styles.recipientRow}>
                <View>
                  <Text style={styles.recipientName}>{order.delivery_full_name || 'Customer'}</Text>
                  <Text style={styles.recipientPhone}>{order.delivery_mobile_number || 'No contact provided'}</Text>
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

              <View style={styles.infoGrid}>
                <Text style={styles.infoLabel}>Route Dispatch:</Text>
                <Text style={styles.infoValue}>{formatDeliveryRoute(order)}</Text>
              </View>

              <View style={styles.infoGrid}>
                <Text style={styles.infoLabel}>Assigned Vehicle:</Text>
                <Text style={styles.infoValue}>
                  {order.vehicle ? `${order.vehicle.vehicle_name} (${order.vehicle.plate_number})` : 'Standard Delivery Unit'}
                </Text>
              </View>

              <View style={styles.dashedDivider} />

              {/* Itemized Manifest Table */}
              <Text style={styles.receiptSectionKicker}>
                Cargo Manifest ({order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'} · {totalItemsCount} units)
              </Text>

              <View style={styles.manifestHeaderRow}>
                <Text style={styles.manifestColItem}>Item / Description</Text>
                <Text style={styles.manifestColTotal}>Subtotal</Text>
              </View>

              {order.items && order.items.length > 0 ? (
                order.items.map((item) => (
                  <View key={item.id} style={styles.manifestItemRow}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={styles.manifestItemName}>{item.product_name}</Text>
                      <Text style={styles.manifestItemMeta}>
                        {item.quantity} {item.quantity === 1 ? 'unit' : 'units'}
                        {item.weight_label ? ` · ${item.weight_label}` : ''}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.manifestItemPrice}>{formatPeso(item.line_total)}</Text>
                      <Text style={styles.manifestItemUnitRate}>{formatPeso(item.unit_price)} / unit</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.manifestItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.manifestItemName}>Fresh Pineapple Harvest Package</Text>
                    <Text style={styles.manifestItemMeta}>Standard Produce Delivery</Text>
                  </View>
                  <View>
                    <Text style={styles.manifestItemPrice}>{formatPeso(order.total_amount)}</Text>
                  </View>
                </View>
              )}

              <View style={styles.dashedDivider} />

              {/* Payment Summary */}
              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Payment Method</Text>
                  <View style={styles.paymentMethodBadge}>
                    <CheckIcon size={10} color="#166534" />
                    <Text style={styles.paymentMethodBadgeText}>
                      {order.payment_method === 'gcash' ? 'GCash (Paid)' : `${order.payment_method.toUpperCase()} (Collected)`}
                    </Text>
                  </View>
                </View>

                <View style={styles.grandTotalRow}>
                  <Text style={styles.grandTotalLabel}>Grand Total</Text>
                  <Text style={styles.grandTotalValue}>{formatPeso(order.total_amount)}</Text>
                </View>
              </View>

              {/* Proof of Delivery Photo Section */}
              {order.delivery_proof_image_url ? (
                <>
                  <View style={styles.dashedDivider} />
                  <Text style={styles.receiptSectionKicker}>Proof of Delivery (POD)</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setModalVisible(true)}
                    style={styles.podWrapper}>
                    <Image
                      source={{ uri: order.delivery_proof_image_url }}
                      style={styles.podImage}
                    />
                    <View style={styles.podZoomBadge}>
                      <ZoomIcon />
                      <Text style={styles.podZoomBadgeText}>Tap to Zoom</Text>
                    </View>
                  </Pressable>
                </>
              ) : null}

              {/* Driver Hand-off Notes */}
              {order.delivery_proof_notes ? (
                <View style={[styles.notesBox, { marginTop: 8 }]}>
                  <Text style={styles.notesKicker}>Driver's notes</Text>
                  <Text style={styles.notesText}>{order.delivery_proof_notes}</Text>
                </View>
              ) : null}

              {/* Delivery Timeline Stepper at the Bottom */}
              <View style={styles.dashedDivider} />
              <Text style={styles.receiptSectionKicker}>Delivery Timeline</Text>

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
                      {formatTimeOnly(order.delivery_accepted_at) || deliveredTimeShort} · Vehicle {order.vehicle?.plate_number || 'Linked'}
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
                    <Text style={styles.timelineStepTitle}>Picked Up from Hub</Text>
                    <Text style={styles.timelineStepSub}>
                      {formatTimeOnly(order.delivery_picked_up_at) || deliveredTimeShort} · Cargo loaded & verified
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
                      {deliveredTimeShort} · Proof of delivery submitted
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.dashedDivider} />

              {/* Receipt Footer Watermark */}
              <View style={styles.receiptFooter}>
                <Text style={styles.receiptFooterText}>Official Delivery Receipt · AgriVerse Philippines</Text>
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Fullscreen Photo Zoom Modal */}
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
