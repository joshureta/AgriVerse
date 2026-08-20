import { styles } from '@/styles/driver-task-pending.styles';
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, SafeAreaView, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
import { TaskCompletionBlurTarget } from '@/components/task-completion-blur-target';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import { DriverOrder, DriverOrdersResponse, activeDeliveryAction, deliveryStatusLabel, formatDeliveryAddress, formatDeliveryWindow, formatPeso, isActiveDelivery } from '@/lib/driver-deliveries';

const GREEN = '#176d34';
const vehicleImage = require('@/assets/images/driver-equipment.png');

function DetailField({ label, value }: { label: string; value: string | number }) {
  return <View style={styles.detailBox}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

function FilterTabs() {
  return <View style={styles.filters}>
    <Pressable onPress={() => router.replace('/DriverTaskPending')} style={styles.filterButton}><Text style={styles.filterText}>Pending</Text></Pressable>
    <Pressable accessibilityState={{ selected: true }} style={[styles.filterButton, styles.filterButtonActive]}><Text style={[styles.filterText, styles.filterTextActive]}>Active</Text></Pressable>
    <Pressable onPress={() => router.replace('/DriverTaskCompleted')} style={styles.filterButton}><Text style={styles.filterText}>Completed</Text></Pressable>
  </View>;
}

function ActiveDeliveryCard({ order, expanded, busy, onAction, onToggle }: {
  order: DriverOrder;
  expanded: boolean;
  busy: boolean;
  onAction: () => void;
  onToggle: () => void;
}) {
  const action = activeDeliveryAction(order.delivery_assignment_status);
  const vehicle = order.vehicle ? `${order.vehicle.vehicle_name} · ${order.vehicle.plate_number}` : 'Not provided';
  return <View style={[styles.taskCard, expanded && styles.taskCardExpanded]}>
    <Pressable onPress={onToggle} style={styles.taskSummary}>
      <View style={styles.taskIconCircle}><Image source={vehicleImage} style={styles.taskIcon} /></View>
      <View style={styles.taskTitleArea}><Text style={styles.taskCategory}>{order.order_number}</Text><Text numberOfLines={1} style={styles.taskDescription}>{formatDeliveryAddress(order)}</Text></View>
      <View style={styles.statusPill}><Text style={styles.statusPillText}>{deliveryStatusLabel(order.delivery_assignment_status)}</Text></View>
    </Pressable>
    {expanded ? <View style={styles.details}>
      <DetailField label="Receiver Name" value={order.delivery_full_name || 'Not provided'} />
      <DetailField label="Contact Number" value={order.delivery_mobile_number || 'Not provided'} />
      <DetailField label="Delivery Location" value={formatDeliveryAddress(order)} />
      <DetailField label="Delivery Window" value={formatDeliveryWindow(order.delivery_scheduled_at, order.delivery_window_end_at)} />
      <DetailField label="Payment" value={`${order.payment_method} · ${formatPeso(order.total_amount)}`} />
      <DetailField label="Vehicle Used" value={vehicle} />
      {action ? <Pressable disabled={busy} onPress={onAction} style={[styles.startButton, busy && styles.startButtonDisabled]}>
        {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.startButtonText}>{action.label}</Text>}
      </Pressable> : null}
    </View> : null}
  </View>;
}

export default function DriverTaskActiveScreen() {
  const { width } = useWindowDimensions();
  const { loading: authLoading, profile } = useAuth();
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadDeliveries = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const response = await apiRequest<DriverOrdersResponse>('/api/driver/orders');
      const activeOrders = (response.orders ?? []).filter(isActiveDelivery);
      setOrders(activeOrders);
      setExpandedId((current) => activeOrders.some((order) => order.id === current) ? current : activeOrders[0]?.id ?? null);
    } catch (caught) {
      setOrders([]); setExpandedId(null);
      setError(caught instanceof Error ? caught.message : 'Could not load active deliveries.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { if (profile) loadDeliveries(); }, [loadDeliveries, profile]);

  async function advanceDelivery(order: DriverOrder) {
    const action = activeDeliveryAction(order.delivery_assignment_status);
    if (!action) return;
    if (action.nextStatus === 'delivered') {
      router.push({ pathname: '/DriverTaskCompletion', params: { orderId: String(order.id) } });
      return;
    }
    setBusyId(order.id); setError('');
    try {
      const response = await apiRequest<{ order: DriverOrder }>(`/api/driver/orders/${order.id}/status`, {
        method: 'POST', body: JSON.stringify({ status: action.nextStatus }),
      });
      setOrders((current) => current.map((item) => item.id === order.id ? response.order : item));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not update this delivery.';
      await loadDeliveries();
      setError(message);
    } finally { setBusyId(null); }
  }

  if (authLoading) return <View style={styles.center}><ActivityIndicator color={GREEN} size="large" /></View>;
  if (!profile) return <Redirect href="/login" />;
  const horizontalPadding = width < 360 ? 14 : 24;

  return <TaskCompletionBlurTarget><SafeAreaView style={styles.safeArea}>
    <WorkerHeader />
    <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]} refreshControl={<RefreshControl colors={[GREEN]} refreshing={refreshing} onRefresh={() => loadDeliveries(true)} />}>
      <Text style={styles.sectionTitle}>Today’s Deliveries</Text><FilterTabs />
      {error ? <Pressable onPress={() => loadDeliveries()} style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Text style={styles.retry}>Tap to retry</Text></Pressable> : null}
      {loading ? <ActivityIndicator color={GREEN} style={styles.loader} /> : orders.length ? orders.map((order) => (
        <ActiveDeliveryCard busy={busyId === order.id} expanded={expandedId === order.id} key={order.id} onAction={() => advanceDelivery(order)} onToggle={() => setExpandedId((current) => current === order.id ? null : order.id)} order={order} />
      )) : <View style={styles.emptyBox}><Text style={styles.emptyIcon}>✓</Text><Text style={styles.emptyTitle}>No active deliveries</Text><Text style={styles.emptyText}>Accept a pending delivery to see it here.</Text></View>}
    </ScrollView>
    <WorkerBottomNavigation activeTab="tasks" />
  </SafeAreaView></TaskCompletionBlurTarget>;
}
