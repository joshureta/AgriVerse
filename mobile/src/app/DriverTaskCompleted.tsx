import { styles } from '@/styles/driver-task-pending.styles';
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, SafeAreaView, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import { DriverOrder, DriverOrdersResponse, formatDeliveryAddress, formatDeliveryWindow, formatPeso } from '@/lib/driver-deliveries';

const GREEN = '#176d34';
const vehicleImage = require('@/assets/images/driver-equipment.png');

function CompletedIcon() { return <View style={styles.completedIcon}><Text style={styles.completedCheck}>✓</Text></View>; }

function CompletedDeliveryCard({ order, expanded, onToggle }: { order: DriverOrder; expanded: boolean; onToggle: () => void }) {
  const vehicle = order.vehicle ? `${order.vehicle.vehicle_name} · ${order.vehicle.plate_number}` : 'Not recorded';
  return <View style={[styles.taskCard, expanded && styles.taskCardExpanded]}>
    <Pressable onPress={onToggle} style={styles.taskSummary}>
      <View style={styles.taskIconCircle}><Image source={vehicleImage} style={styles.taskIcon} /></View>
      <View style={styles.taskTitleArea}><Text style={styles.taskCategory}>{order.order_number}</Text><Text numberOfLines={1} style={styles.taskDescription}>{order.delivery_full_name}</Text></View>
      <CompletedIcon />
    </Pressable>
    {expanded ? <View style={styles.details}>
      <View style={styles.detailBox}><Text style={styles.detailLabel}>Contact Number</Text><Text style={styles.detailValue}>{order.delivery_mobile_number || 'Not provided'}</Text></View>
      <View style={styles.detailBox}><Text style={styles.detailLabel}>Delivery Location</Text><Text style={styles.detailValue}>{formatDeliveryAddress(order)}</Text></View>
      <View style={styles.detailBox}><Text style={styles.detailLabel}>Delivery Window</Text><Text style={styles.detailValue}>{formatDeliveryWindow(order.delivery_scheduled_at, order.delivery_window_end_at)}</Text></View>
      <View style={styles.detailBox}><Text style={styles.detailLabel}>Payment</Text><Text style={styles.detailValue}>{`${order.payment_method} · ${formatPeso(order.total_amount)}`}</Text></View>
      <View style={styles.detailBox}><Text style={styles.detailLabel}>Vehicle Used</Text><Text style={styles.detailValue}>{vehicle}</Text></View>
      <View style={styles.completedBanner}><Text style={styles.completedText}>✓ Delivery completed</Text></View>
    </View> : null}
  </View>;
}

export default function DriverTaskCompletedScreen() {
  const { width } = useWindowDimensions();
  const { loading: authLoading, profile } = useAuth();
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadDeliveries = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true); setError('');
    try {
      const response = await apiRequest<DriverOrdersResponse>('/api/driver/orders');
      const completed = (response.orders ?? []).filter((order) => order.delivery_assignment_status === 'delivered');
      setOrders(completed);
      setExpandedId((current) => completed.some((order) => order.id === current) ? current : null);
    } catch (caught) {
      setOrders([]); setExpandedId(null);
      setError(caught instanceof Error ? caught.message : 'Could not load completed deliveries.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { if (profile) loadDeliveries(); }, [loadDeliveries, profile]);
  if (authLoading) return <View style={styles.center}><ActivityIndicator color={GREEN} size="large" /></View>;
  if (!profile) return <Redirect href="/login" />;
  const horizontalPadding = width < 360 ? 14 : 23;

  return <SafeAreaView style={styles.safeArea}><WorkerHeader />
    <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]} refreshControl={<RefreshControl colors={[GREEN]} refreshing={refreshing} onRefresh={() => loadDeliveries(true)} />}>
      <Text style={styles.sectionTitle}>Today’s Deliveries</Text>
      <View style={styles.filters}>
        <Pressable onPress={() => router.replace('/DriverTaskPending')} style={styles.filterButton}><Text style={[styles.filterText, styles.completedFilterText]}>Pending</Text></Pressable>
        <Pressable onPress={() => router.replace('/DriverTaskActive')} style={styles.filterButton}><Text style={[styles.filterText, styles.completedFilterText]}>Active</Text></Pressable>
        <Pressable accessibilityState={{ selected: true }} style={[styles.filterButton, styles.filterButtonActive]}><Text style={[styles.filterText, styles.filterTextActive]}>Completed</Text></Pressable>
      </View>
      {error ? <Pressable onPress={() => loadDeliveries()} style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Text style={styles.retry}>Tap to retry</Text></Pressable> : null}
      {loading ? <ActivityIndicator color={GREEN} style={styles.loader} /> : orders.length ? orders.map((order) => <CompletedDeliveryCard expanded={expandedId === order.id} key={order.id} onToggle={() => setExpandedId((current) => current === order.id ? null : order.id)} order={order} />) : <View style={styles.emptyBox}><CompletedIcon /><Text style={styles.emptyTitle}>No completed deliveries</Text><Text style={styles.emptyText}>Delivered orders will appear here.</Text></View>}
    </ScrollView><WorkerBottomNavigation activeTab="tasks" />
  </SafeAreaView>;
}
