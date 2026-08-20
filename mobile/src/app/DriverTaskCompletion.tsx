import { styles } from '@/styles/driver-task-completion.styles';
import { BlurView } from 'expo-blur';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
import { taskCompletionBlurTargetRef } from '@/components/task-completion-blur-target';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import { DriverOrder, DriverOrdersResponse, formatDeliveryAddress, formatDeliveryWindow, formatPeso } from '@/lib/driver-deliveries';

const GREEN = '#176d34';
const vehicleImage = require('@/assets/images/driver-equipment.png');

function ConfirmationField({ label, value }: { label: string; value: string }) {
  return <View style={styles.fieldGroup}><Text style={styles.label}>{label}</Text><Text style={styles.readonlyStrong}>{value}</Text></View>;
}

export default function DriverTaskCompletionScreen() {
  const { width } = useWindowDimensions();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const { loading: authLoading, profile } = useAuth();
  const [order, setOrder] = useState<DriverOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadOrder = useCallback(async () => {
    if (!orderId || !/^\d+$/.test(orderId)) { setError('A valid delivery order is required.'); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const response = await apiRequest<DriverOrdersResponse>('/api/driver/orders');
      const selectedOrder = (response.orders ?? []).find((item) => item.id === Number(orderId));
      if (!selectedOrder) throw new Error('This assigned delivery could not be found.');
      if (selectedOrder.delivery_assignment_status !== 'out_for_delivery') throw new Error('This delivery is not ready to be completed.');
      setOrder(selectedOrder);
    } catch (caught) {
      setOrder(null);
      setError(caught instanceof Error ? caught.message : 'Could not load this delivery.');
    } finally { setLoading(false); }
  }, [orderId]);

  useEffect(() => { if (profile) loadOrder(); }, [loadOrder, profile]);

  async function confirmDelivered() {
    if (!order) return;
    setSubmitting(true); setError('');
    try {
      await apiRequest(`/api/driver/orders/${order.id}/status`, { method: 'POST', body: JSON.stringify({ status: 'delivered' }) });
      router.replace('/DriverTaskCompleted');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not complete this delivery.');
    } finally { setSubmitting(false); }
  }

  if (authLoading) return <View style={styles.center}><ActivityIndicator color={GREEN} size="large" /></View>;
  if (!profile) return <Redirect href="/login" />;
  const pagePadding = width < 360 ? 14 : 25;
  const vehicle = order?.vehicle ? `${order.vehicle.vehicle_name} · ${order.vehicle.plate_number}` : 'Not recorded';

  return <SafeAreaView style={styles.safeArea}>
    <BlurView blurTarget={taskCompletionBlurTargetRef} blurMethod="dimezisBlurViewSdk31Plus" blurReductionFactor={2} intensity={60} pointerEvents="none" style={styles.blurBackdrop} tint="extraLight" />
    <WorkerHeader />
    <ScrollView contentContainerStyle={[styles.page, { paddingHorizontal: pagePadding }]}>
      {loading ? <View style={styles.loadingCard}><ActivityIndicator color={GREEN} /><Text style={styles.loadingText}>Loading delivery…</Text></View> : order ? (
        <View style={styles.formCard}>
          <View style={styles.categoryHeader}><View style={styles.categoryIcon}><Image source={vehicleImage} style={styles.categoryImage} /></View><View><Text style={styles.categoryTitle}>Confirm Delivery</Text><Text style={styles.categorySubtitle}>{order.order_number}</Text></View></View>
          <View style={styles.formBody}>
            <Text style={styles.confirmationText}>Confirm that this order reached the customer. This action marks the order delivered and releases the vehicle.</Text>
            <ConfirmationField label="RECEIVER" value={order.delivery_full_name || 'Not provided'} />
            <ConfirmationField label="CONTACT NUMBER" value={order.delivery_mobile_number || 'Not provided'} />
            <ConfirmationField label="DELIVERY LOCATION" value={formatDeliveryAddress(order)} />
            <ConfirmationField label="DELIVERY WINDOW" value={formatDeliveryWindow(order.delivery_scheduled_at, order.delivery_window_end_at)} />
            <ConfirmationField label="PAYMENT" value={`${order.payment_method} · ${formatPeso(order.total_amount)}`} />
            <ConfirmationField label="VEHICLE" value={vehicle} />
            {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
            <View style={styles.actions}>
              <Pressable disabled={submitting} onPress={() => router.replace('/DriverTaskActive')} style={styles.cancelButton}><Text style={styles.cancelText}>Back</Text></Pressable>
              <Pressable disabled={submitting} onPress={confirmDelivered} style={({ pressed }) => [styles.submitButton, (pressed || submitting) && styles.submitButtonPressed]}>
                {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitText}>Confirm Delivered</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      ) : <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => router.replace('/DriverTaskActive')}><Text style={styles.backText}>Return to active deliveries</Text></Pressable></View>}
    </ScrollView>
    <WorkerBottomNavigation activeTab="tasks" />
  </SafeAreaView>;
}
