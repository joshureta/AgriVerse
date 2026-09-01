import { GREEN, styles } from '@/styles/driver-task-pending.styles';
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
import {
  DRIVER_TASK_TABS,
  WorkerTaskSegmentedTabs,
} from '@/components/worker-task-segmented-tabs';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import {
  DriverOrder,
  DriverOrdersResponse,
  formatDeliveryAddress,
  formatDeliveryWindow,
  formatPeso,
} from '@/lib/driver-deliveries';

function CompletedDeliveryCard({ order }: { order: DriverOrder }) {
  const vehicle = order.vehicle
    ? `${order.vehicle.vehicle_name} (${order.vehicle.plate_number})`
    : 'Vehicle Assigned';

  return (
    <View style={styles.taskCard}>
      {/* Completed Mint Banner */}
      <View style={styles.completedBanner}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: GREEN,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '900' }}>✓</Text>
          </View>
          <Text style={styles.completedText}>Delivered Successfully</Text>
        </View>
        <Text style={{ fontSize: 12, fontWeight: '800', color: GREEN }}>
          {order.order_number || `Order #${order.id}`}
        </Text>
      </View>

      {/* Main Delivery Title */}
      <Text style={[styles.taskTitle, { marginTop: 4 }]}>
        Deliver to {order.delivery_full_name || 'Customer'}
      </Text>

      {/* Structured Details Table */}
      <View style={styles.activeDataTable}>
        <View style={styles.activeDataRow}>
          <Text style={styles.activeRowKey}>Receiver:</Text>
          <Text numberOfLines={1} style={styles.activeRowVal}>
            {order.delivery_full_name || 'Not provided'} ({order.delivery_mobile_number || 'N/A'})
          </Text>
        </View>

        <View style={styles.activeDataRow}>
          <Text style={styles.activeRowKey}>Location:</Text>
          <Text numberOfLines={2} style={styles.activeRowVal}>
            {formatDeliveryAddress(order)}
          </Text>
        </View>

        <View style={styles.activeDataRow}>
          <Text style={styles.activeRowKey}>Vehicle:</Text>
          <Text numberOfLines={1} style={styles.activeRowVal}>
            {vehicle}
          </Text>
        </View>

        <View style={styles.activeDataRow}>
          <Text style={styles.activeRowKey}>Payment:</Text>
          <Text numberOfLines={1} style={styles.activeRowVal}>
            {order.payment_method} · {formatPeso(order.total_amount)}
          </Text>
        </View>

        <View style={[styles.activeDataRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.activeRowKey}>Delivered:</Text>
          <Text numberOfLines={1} style={styles.activeRowVal}>
            {formatDeliveryWindow(order.delivery_scheduled_at, order.delivery_window_end_at)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function DriverTaskCompletedScreen() {
  const { width } = useWindowDimensions();
  const { loading: authLoading, profile } = useAuth();
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadDeliveries = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const response = await apiRequest<DriverOrdersResponse>('/api/driver/orders');
      const completed = (response.orders ?? []).filter(
        (order) => order.delivery_assignment_status === 'delivered'
      );
      setOrders(completed);
    } catch (caught) {
      setOrders([]);
      setError(caught instanceof Error ? caught.message : 'Could not load completed deliveries.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (profile) loadDeliveries();
  }, [loadDeliveries, profile]);

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GREEN} size="large" />
      </View>
    );
  }
  if (!profile) return <Redirect href="/login" />;
  const horizontalPadding = width < 360 ? 14 : 20;

  return (
    <SafeAreaView style={styles.safeArea}>
      <WorkerHeader />

      <View style={styles.mainBodyContainer}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
          refreshControl={
            <RefreshControl
              colors={[GREEN]}
              refreshing={refreshing}
              onRefresh={() => loadDeliveries(true)}
            />
          }>
          {/* Section Title */}
          <View style={styles.titleRow}>
            <Text style={styles.sectionTitle}>Today’s Tasks</Text>
          </View>

          {/* Segmented 3-Tab Filter Bar */}
          <WorkerTaskSegmentedTabs
            activeTab="completed"
            tabs={DRIVER_TASK_TABS}
            onTabChange={(_, route) => router.replace(route as any)}
          />

          {/* Error Banner */}
          {error ? (
            <Pressable onPress={() => loadDeliveries()} style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Text style={styles.retry}>Tap to retry</Text>
            </Pressable>
          ) : null}

          {/* Completed Deliveries List */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={GREEN} />
              <Text style={styles.loadingText}>Loading completed deliveries...</Text>
            </View>
          ) : orders.length ? (
            orders.map((order) => <CompletedDeliveryCard key={order.id} order={order} />)
          ) : (
            <View style={styles.emptyBox}>
              <View style={styles.emptyCheckCircle}>
                <Text style={styles.emptyCheckText}>✓</Text>
              </View>
              <Text style={styles.emptyTitle}>No completed tasks</Text>
              <Text style={styles.emptyText}>Completed work will appear here.</Text>
            </View>
          )}
        </ScrollView>
      </View>

      <WorkerBottomNavigation activeTab="tasks" />
    </SafeAreaView>
  );
}

