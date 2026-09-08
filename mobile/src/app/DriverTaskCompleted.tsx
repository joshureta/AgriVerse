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

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Path d={expanded ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} stroke="#64748B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

function CompletedDeliveryCard({
  order,
  expanded,
  onToggle,
}: {
  order: DriverOrder;
  expanded: boolean;
  onToggle: () => void;
}) {
  const vehicle = order.vehicle
    ? `${order.vehicle.vehicle_name} (${order.vehicle.plate_number})`
    : 'Vehicle Assigned';

  return (
    <View style={styles.taskCard}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onToggle} style={styles.completedBanner}>
        <View style={styles.completedStatusContent}>
          <Image
            source={require('@/assets/images/delivery-produce-icon.png')}
            style={styles.deliveryProductIconSmall}
          />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={styles.completedText}>Delivered Successfully</Text>
            <Text numberOfLines={1} style={styles.completedOrderNumber}>
            {order.order_number || `Order #${order.id}`}
            </Text>
          </View>
        </View>
        <ChevronIcon expanded={expanded} />
      </Pressable>

      {expanded ? (
        <>
          {/* Main Delivery Title */}
          <Text style={[styles.taskTitle, { marginTop: 14 }]}>
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
        </>
      ) : null}
    </View>
  );
}

export default function DriverTaskCompletedScreen() {
  const { width } = useWindowDimensions();
  const { loading: authLoading, profile } = useAuth();
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
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
              <CompletedDeliveryCard
                expanded={expandedId === order.id}
                key={order.id}
                onToggle={() => setExpandedId((current) => (current === order.id ? null : order.id))}
                order={order}
              />
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

