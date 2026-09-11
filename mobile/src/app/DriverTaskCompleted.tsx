import { GREEN, styles } from '@/styles/driver-task-pending.styles';
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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

import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import {
  DriverOrder,
  DriverOrdersResponse,
  formatDeliveryAddress,
  formatDeliveryWindow,
  formatPeso,
} from '@/lib/driver-deliveries';

function SearchIcon() {
  return <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"><Circle cx={11} cy={11} r={6.5} stroke="#64748B" strokeWidth={2} /><Path d="m16 16 4 4" stroke="#64748B" strokeWidth={2} strokeLinecap="round" /></Svg>;
}

function ChevronRightIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="m9 18 6-6-6-6" stroke="#94A3B8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CompletedDeliveryCard({ order }: { order: DriverOrder }) {
  const destination =
    order.delivery_city_municipality ||
    order.delivery_province ||
    order.delivery_barangay ||
    'Delivery';

  const paymentLabel = order.payment_method === 'gcash' ? 'GCash' : 'COD';

  const deliveredTime = order.delivered_at
    ? new Date(order.delivered_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : order.delivery_proof_submitted_at
      ? new Date(order.delivery_proof_submitted_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : 'Delivered';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: '/DriverCompletedDeliveryDetails',
          params: { id: String(order.id) },
        })
      }
      style={({ pressed }) => [
        styles.taskCard,
        pressed && { opacity: 0.9, transform: [{ scale: 0.995 }] },
      ]}>
      {/* Top Header Row with Order Pill & Delivered Badge */}
      <View style={styles.completedCardHeaderRow}>
        <View style={styles.completedBadgesLeft}>
          <View style={styles.completedOrderPill}>
            <Text style={styles.completedOrderPillText}>
              {order.order_number || `Order #${order.id}`}
            </Text>
          </View>
          <View style={styles.completedStatusPill}>
            <Text style={styles.completedStatusPillText}>✓ Delivered</Text>
          </View>
        </View>

        <ChevronRightIcon />
      </View>

      {/* Main Delivery Title */}
      <Text style={styles.taskTitle}>
        Deliver to {order.delivery_full_name || 'Customer'}
      </Text>

      {/* Modern Meta Subtitle */}
      <Text style={styles.completedTaskMetaSubtitle}>
        {destination} · {formatPeso(order.total_amount)} ({paymentLabel}) · Delivered at {deliveredTime}
      </Text>
    </Pressable>
  );
}

export default function DriverTaskCompletedScreen() {
  const { width } = useWindowDimensions();
  const { loading: authLoading, profile } = useAuth();
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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
  const filteredOrders = orders.filter((order) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return `${order.order_number} ${order.delivery_full_name} ${formatDeliveryAddress(order)}`
      .toLowerCase()
      .includes(query);
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <WorkerHeader logoPosition="left" logoSize={48} logoSource={require('@/assets/images/driver-dashboard-emblem.png')} />

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

          <View style={styles.deliveryToolbar}><View style={styles.deliverySearch}><SearchIcon /><TextInput accessibilityLabel="Search deliveries" onChangeText={setSearchQuery} placeholder="Search deliveries" placeholderTextColor="#94A3B8" style={styles.deliverySearchInput} value={searchQuery} /></View></View>
          <View style={styles.deliveryStatusTabs}>{[{ label: 'Pending', route: '/DriverTaskPending' }, { label: 'Active', route: '/DriverTaskActive' }, { label: 'Completed', route: '/DriverTaskCompleted' }].map((tab) => { const active = tab.label === 'Completed'; return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} key={tab.label} onPress={() => router.replace(tab.route as any)} style={[styles.deliveryStatusTab, active && styles.deliveryStatusTabActive]}><Text style={[styles.deliveryStatusTabText, active && styles.deliveryStatusTabTextActive]}>{tab.label}</Text></Pressable>; })}</View>

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
          ) : filteredOrders.length ? (
            filteredOrders.map((order) => (
              <CompletedDeliveryCard key={order.id} order={order} />
            ))
          ) : (
            <View style={styles.emptyBox}>
              <View style={styles.emptyCheckCircle}>
                <Text style={styles.emptyCheckText}>✓</Text>
              </View>
              <Text style={styles.emptyTitle}>{searchQuery ? 'No matching deliveries' : 'No completed deliveries'}</Text>
              <Text style={styles.emptyText}>{searchQuery ? 'Try another search term.' : 'Completed deliveries will appear here.'}</Text>
            </View>
          )}
        </ScrollView>
      </View>

      <WorkerBottomNavigation activeTab="tasks" />
    </SafeAreaView>
  );
}

