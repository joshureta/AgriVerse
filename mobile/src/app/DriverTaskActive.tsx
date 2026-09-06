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
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { TaskCompletionBlurTarget } from '@/components/task-completion-blur-target';
import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import {
  activeDeliveryAction,
  DriverOrder,
  DriverOrdersResponse,
  formatDeliveryAddress,
  formatDeliveryWindow,
  formatPeso,
  isActiveDelivery,
} from '@/lib/driver-deliveries';

function SearchIcon() {
  return <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"><Circle cx={11} cy={11} r={6.5} stroke="#64748B" strokeWidth={2} /><Path d="m16 16 4 4" stroke="#64748B" strokeWidth={2} strokeLinecap="round" /></Svg>;
}

function ActiveDeliveryCard({
  order,
  busy,
  onAction,
}: {
  order: DriverOrder;
  busy: boolean;
  onAction: () => void;
}) {
  const action = activeDeliveryAction(order.delivery_assignment_status);
  const vehicle = order.vehicle
    ? `${order.vehicle.vehicle_name} (${order.vehicle.plate_number})`
    : 'Vehicle Assigned';

  const isOutForDelivery = order.delivery_assignment_status === 'out_for_delivery';
  const badgeLabel = isOutForDelivery ? 'OUT-FOR-DELIVERY' : 'IN-PROGRESS';

  return (
    <View style={styles.taskCard}>
      {/* Top Header Row with Active label & Radar Badge */}
      <View style={styles.cardHeaderRow}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: GREEN }}>Active Delivery</Text>
        <View style={styles.radarPulseBox}>
          <Text style={styles.radarBadgeText}>{badgeLabel}</Text>
        </View>
      </View>

      {/* Main Delivery Title */}
      <Text style={styles.taskTitle}>
        {order.order_number || `Order #${order.id}`} · {order.delivery_full_name || 'Customer'}
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

        <View style={styles.activeDataRow}>
          <Text style={styles.activeRowKey}>Schedule:</Text>
          <Text numberOfLines={1} style={styles.activeRowVal}>
            {formatDeliveryWindow(order.delivery_scheduled_at, order.delivery_window_end_at)}
          </Text>
        </View>
      </View>

      {/* Action Step Button */}
      {action ? (
        <Pressable
          disabled={busy}
          onPress={onAction}
          style={({ pressed }) => [
            styles.markCompletedBtn,
            busy && { opacity: 0.5 },
            pressed && { opacity: 0.85 },
          ]}>
          {busy ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text style={{ color: GREEN, fontSize: 11, fontWeight: '900' }}>✓</Text>
              </View>
              <Text style={styles.markCompletedBtnText}>{action.label}</Text>
            </>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

export default function DriverTaskActiveScreen() {
  const { width } = useWindowDimensions();
  const { loading: authLoading, profile } = useAuth();
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadDeliveries = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const response = await apiRequest<DriverOrdersResponse>('/api/driver/orders');
      const activeOrders = (response.orders ?? []).filter(isActiveDelivery);
      setOrders(activeOrders);
    } catch (caught) {
      setOrders([]);
      setError(caught instanceof Error ? caught.message : 'Could not load active deliveries.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (profile) loadDeliveries();
  }, [loadDeliveries, profile]);

  async function advanceDelivery(order: DriverOrder) {
    const action = activeDeliveryAction(order.delivery_assignment_status);
    if (!action) return;
    if (action.nextStatus === 'delivered') {
      router.push({ pathname: '/DriverTaskCompletion', params: { orderId: String(order.id) } });
      return;
    }
    setBusyId(order.id);
    setError('');
    try {
      const response = await apiRequest<{ order: DriverOrder }>(
        `/api/driver/orders/${order.id}/status`,
        {
          method: 'POST',
          body: JSON.stringify({ status: action.nextStatus }),
        }
      );
      setOrders((current) =>
        current.map((item) => (item.id === order.id ? response.order : item))
      );
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not update this delivery.';
      await loadDeliveries();
      setError(message);
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GREEN} size="large" />
      </View>
    );
  }
  if (!profile) return <Redirect href="/login" />;
  const horizontalPadding = width < 360 ? 14 : 20;
  const filteredOrders = orders.filter((order) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return `${order.order_number} ${order.delivery_full_name} ${formatDeliveryAddress(order)}`
      .toLowerCase()
      .includes(query);
  });

  return (
    <TaskCompletionBlurTarget>
      <SafeAreaView style={styles.safeArea}>
        <WorkerHeader logoPosition="left" logoSize={48} logoSource={require('@/assets/images/driver-dashboard-logo-green.png')} />

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
            <View style={styles.titleRow}>
              <Text style={styles.sectionTitle}>My Deliveries</Text>
            </View>

            <View style={styles.deliveryToolbar}>
              <View style={styles.deliverySearch}>
                <SearchIcon />
                <TextInput accessibilityLabel="Search deliveries" onChangeText={setSearchQuery} placeholder="Search deliveries" placeholderTextColor="#94A3B8" style={styles.deliverySearchInput} value={searchQuery} />
              </View>
            </View>
            <View style={styles.deliveryStatusTabs}>
              {[{ label: 'Pending', route: '/DriverTaskPending' }, { label: 'Active', route: '/DriverTaskActive' }, { label: 'Completed', route: '/DriverTaskCompleted' }].map((tab) => {
                const active = tab.label === 'Active';
                return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} key={tab.label} onPress={() => router.replace(tab.route as any)} style={[styles.deliveryStatusTab, active && styles.deliveryStatusTabActive]}><Text style={[styles.deliveryStatusTabText, active && styles.deliveryStatusTabTextActive]}>{tab.label}</Text></Pressable>;
              })}
            </View>

            {/* Error Box */}
            {error ? (
              <Pressable onPress={() => loadDeliveries()} style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
                <Text style={styles.retry}>Tap to retry</Text>
              </Pressable>
            ) : null}

            {/* Active Deliveries List */}
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={GREEN} />
                <Text style={styles.loadingText}>Loading active deliveries...</Text>
              </View>
            ) : filteredOrders.length ? (
              filteredOrders.map((order) => (
                <ActiveDeliveryCard
                  key={order.id}
                  order={order}
                  busy={busyId === order.id}
                  onAction={() => advanceDelivery(order)}
                />
              ))
            ) : (
              <View style={styles.emptyBox}>
                <View style={styles.emptyCheckCircle}>
                  <Text style={styles.emptyCheckText}>✓</Text>
                </View>
                <Text style={styles.emptyTitle}>{searchQuery ? 'No matching deliveries' : 'No active deliveries'}</Text>
                <Text style={styles.emptyText}>{searchQuery ? 'Try another search term.' : 'Accept a pending delivery to see it here.'}</Text>
              </View>
            )}
          </ScrollView>
        </View>

        <WorkerBottomNavigation activeTab="tasks" />
      </SafeAreaView>
    </TaskCompletionBlurTarget>
  );
}

