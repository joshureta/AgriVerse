import { GREEN, styles } from '@/styles/driver-task-dashboard.styles';
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiWeatherBanner } from '@/components/api-weather-banner';
import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import {
  DriverOrder,
  DriverOrdersResponse,
  formatDeliveryAddress,
  formatDeliveryRoute,
  isActiveDelivery,
} from '@/lib/driver-deliveries';
import { loadWeather, type WeatherSnapshot } from '@/lib/weather';

type TaskSummary = { pending: number; active: number; completed: number; total: number };

function ClipboardDocumentIcon() {
  return (
    <View style={styles.clipboardIconWrap}>
      <View style={styles.clipboardTopClip} />
      <View style={styles.clipboardLine} />
      <View style={styles.clipboardLine} />
      <View style={styles.clipboardLineShort} />
    </View>
  );
}

function MetricCard({
  color,
  label,
  value,
  onPress,
}: {
  color: string;
  label: string;
  value: number;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.metricCard, { backgroundColor: color }]}>
      <Text style={styles.metricTopLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </Pressable>
  );
}

function EquipmentCard({
  label,
  isTransit = false,
  onPress,
}: {
  label: string;
  isTransit?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.equipmentCard,
        isTransit ? styles.equipmentCard_transit : styles.equipmentCard_available,
      ]}>
      <Image
        source={require('@/assets/images/driver-equipment.png')}
        style={styles.equipmentVehicle}
      />
      <Text style={styles.equipmentLabel}>{label}</Text>
    </Pressable>
  );
}

function DeliveryDashboardCard({
  order,
  onPress,
}: {
  order: DriverOrder | { id: number; order_number?: string; category?: string; description?: string };
  onPress: () => void;
}) {
  const isDriverOrder = 'delivery_assignment_status' in order;
  const orderNumber = isDriverOrder
    ? (order as DriverOrder).order_number || `Order #${order.id}`
    : (order as { order_number?: string }).order_number || `Order #${order.id}`;

  const route = isDriverOrder
    ? formatDeliveryRoute(order as DriverOrder)
    : (order as { description?: string }).description || 'Silang -> Tagaytay';

  return (
    <View style={styles.taskCard}>
      {/* Left: Squircle Vehicle Icon */}
      <View style={[styles.categorySquircle, { backgroundColor: '#DCFCE7' }]}>
        <Text style={styles.categoryIcon}>🚚</Text>
      </View>

      {/* Center: Stacked Badges */}
      <View style={styles.taskCenterColumn}>
        <View style={[styles.priorityPill, styles.priorityPill_order]}>
          <Text style={[styles.priorityText, styles.priorityText_order]}>{orderNumber}</Text>
        </View>

        <View style={styles.durationPill}>
          <Text style={styles.durationClockIcon}>📍</Text>
          <Text numberOfLines={1} style={styles.durationPillText}>
            {route}
          </Text>
        </View>
      </View>

      {/* Right: Accept / View CTA */}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.startTaskBtn, pressed && styles.startTaskBtnPressed]}>
        <Text style={styles.startTaskBtnText}>Accept</Text>
      </Pressable>
    </View>
  );
}

export default function DriverTaskDashboardScreen() {
  const { width } = useWindowDimensions();
  const { loading: authLoading, profile } = useAuth();
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [summary, setSummary] = useState<TaskSummary>({ pending: 0, active: 0, completed: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [navbarBlurred, setNavbarBlurred] = useState(false);

  const loadTasks = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const response = await apiRequest<DriverOrdersResponse>('/api/driver/orders');
      const assignedOrders = response.orders ?? [];
      const pending = assignedOrders.filter((order) => order.delivery_assignment_status === 'assigned').length;
      const active = assignedOrders.filter(isActiveDelivery).length;
      const completed = assignedOrders.filter((order) => order.delivery_assignment_status === 'delivered').length;

      setOrders(assignedOrders);
      setSummary({ pending, active, completed, total: pending + active + completed });
    } catch (caught) {
      setOrders([]);
      setSummary({ pending: 0, active: 0, completed: 0, total: 0 });
      setError(caught instanceof Error ? caught.message : 'Could not load assigned deliveries.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (profile) {
      loadTasks();
      loadWeather().then(setWeather);
    }
  }, [loadTasks, profile]);

  const [equipmentFilter, setEquipmentFilter] = useState<'all' | 'available' | 'transit'>('all');
  const dashboard = summary;
  const pendingOrders = orders.filter((o) => o.delivery_assignment_status === 'assigned');
  const previewOrders = pendingOrders.slice(0, 3);
  const contentInset = width < 360 ? styles.contentInsetCompact : styles.contentInset;

  const fleetItems = [
    { id: '1', name: 'Delivery Truck A', meta: 'Plate: AGV-4081', status: 'available' as const },
    { id: '2', name: 'Delivery Truck B', meta: 'Silang ➔ Tagaytay', status: 'transit' as const },
    { id: '3', name: 'Farm Utility Pickup', meta: 'Plate: AGV-1024', status: 'available' as const },
  ];
  const availableCount = fleetItems.filter((e) => e.status === 'available').length;
  const transitCount = fleetItems.filter((e) => e.status === 'transit').length;
  const displayedEquipment =
    equipmentFilter === 'all'
      ? fleetItems
      : fleetItems.filter((e) => e.status === equipmentFilter);

  if (authLoading) return <View style={styles.center}><ActivityIndicator color={GREEN} size="large" /></View>;
  if (!profile) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <WorkerHeader
        extendUnderStatusBar
        height={72}
        transparent
        overlay
        logoSource={require('@/assets/images/driver-dashboard-logo-green.png')}
        logoSize={48}
        logoPosition="left"
        blurred={navbarBlurred}
      />

      <View style={styles.mainBodyContainer}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          onScroll={(event) => setNavbarBlurred(event.nativeEvent.contentOffset.y > 12)}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                loadTasks(true);
                loadWeather().then(setWeather);
              }}
              colors={[GREEN]}
            />
          }>
          
          {/* API Weather Banner Card */}
          <ApiWeatherBanner weather={weather} flushTop topContentInset={92} />

          <View style={contentInset}>
            {/* COMBINED TASK & EQUIPMENT DASHBOARD CARD (Mobile Theme) */}
            <View style={styles.combinedCard}>
              {/* Section Header */}
              <View style={styles.combinedHeaderRow}>
                <View style={styles.combinedTitleBlock}>
                  <View style={styles.combinedTitleWrap}>
                    <Text style={styles.combinedIcon}>▦</Text>
                    <Text style={styles.combinedHeaderTitle}>Task Overview</Text>
                  </View>
                  <Text style={styles.combinedSubtitle}>Your delivery activity at a glance</Text>
                </View>
                <View style={styles.todayBadge}>
                  <Text style={styles.todayBadgeText}>Today</Text>
                </View>
              </View>

              {/* 4-Column Stats Row: Total Tasks | Pending | In Progress | Completed */}
              <View style={styles.statsFourCol}>
                <Pressable
                  style={styles.statCol}
                  onPress={() => router.push('/DriverTaskPending')}>
                  <Text style={[styles.statNumber, styles.statNumberTotal]}>{dashboard.total}</Text>
                  <Text style={[styles.statLabel, styles.statLabelTotal]}>Total{'\n'}Tasks</Text>
                </Pressable>

                <View style={styles.colDivider} />

                <Pressable
                  style={styles.statCol}
                  onPress={() => router.push('/DriverTaskPending')}>
                  <Text style={styles.statNumber}>{String(dashboard.pending).padStart(2, '0')}</Text>
                  <Text style={styles.statLabel}>Tasks{'\n'}Pending</Text>
                </Pressable>

                <View style={styles.colDivider} />

                <Pressable
                  style={styles.statCol}
                  onPress={() => router.push('/DriverTaskActive')}>
                  <Text style={styles.statNumber}>{String(dashboard.active).padStart(2, '0')}</Text>
                  <Text style={styles.statLabel}>Tasks{'\n'}In Progress</Text>
                </Pressable>

                <View style={styles.colDivider} />

                <Pressable
                  style={styles.statCol}
                  onPress={() => router.push('/DriverTaskCompleted')}>
                  <Text style={styles.statNumber}>{String(dashboard.completed).padStart(2, '0')}</Text>
                  <Text style={styles.statLabel}>Tasks{'\n'}Completed</Text>
                </Pressable>
              </View>

            </View>

            {/* Equipment Status Section */}
              <View style={styles.nestedEquipmentCard}>
                <View style={styles.nestedEquipmentHeader}>
                  <View style={styles.nestedEquipmentTitleWrap}>
                    <Text style={styles.nestedEquipmentIcon}>🚚</Text>
                    <Text style={styles.nestedEquipmentHeading}>Equipment Status</Text>
                  </View>
                  <View style={styles.fleetActiveBadge}>
                    <Text style={styles.fleetActiveText}>Fleet Active</Text>
                  </View>
                </View>

                {/* Filter Pills */}
                <View style={styles.filterPillsRow}>
                  <Pressable
                    onPress={() => setEquipmentFilter('all')}
                    style={[styles.filterPill, equipmentFilter === 'all' && styles.filterPillActive]}>
                    <Text style={[styles.filterPillText, equipmentFilter === 'all' && styles.filterPillTextActive]}>
                      All: {fleetItems.length}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setEquipmentFilter('available')}
                    style={[styles.filterPill, equipmentFilter === 'available' && styles.filterPillActive]}>
                    <Text style={[styles.filterPillText, equipmentFilter === 'available' && styles.filterPillTextActive]}>
                      Available: {availableCount}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setEquipmentFilter('transit')}
                    style={[styles.filterPill, equipmentFilter === 'transit' && styles.filterPillActive]}>
                    <Text style={[styles.filterPillText, equipmentFilter === 'transit' && styles.filterPillTextActive]}>
                      On Transit: {transitCount}
                    </Text>
                  </Pressable>
                </View>

                {/* Equipment Unit Items */}
                <View style={styles.equipmentList}>
                  {displayedEquipment.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => router.push(item.status === 'transit' ? '/DriverTaskActive' : '/DriverTaskPending')}
                      style={({ pressed }) => [styles.equipmentItemRow, pressed && { opacity: 0.9 }]}>
                      <View style={styles.equipmentItemLeft}>
                        <View style={styles.equipmentIconSquare}>
                          <Image source={require('@/assets/images/driver-equipment.png')} style={styles.equipmentItemThumb} />
                        </View>
                        <View>
                          <Text style={styles.equipmentItemName}>{item.name}</Text>
                          <Text style={styles.equipmentItemMeta}>{item.meta}</Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.equipmentStatusTag,
                          item.status === 'transit' ? styles.statusTag_transit : styles.statusTag_available,
                        ]}>
                        <Text
                          style={[
                            styles.statusTagText,
                            item.status === 'transit' ? styles.statusTagText_transit : styles.statusTagText_available,
                          ]}>
                          {item.status === 'transit' ? 'On Transit' : 'Available'}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>

            {/* Today's Deliveries Section Header */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWrap}>
                <ClipboardDocumentIcon />
                <Text style={styles.sectionTitle}>Today’s Deliveries</Text>
              </View>
              <Pressable onPress={() => router.push('/DriverTaskPending')}>
                <Text style={styles.sectionLink}>View All ({dashboard.total}) ›</Text>
              </Pressable>
            </View>

            {/* Deliveries List */}
            {loading ? (
              <ActivityIndicator style={{ marginTop: 20 }} color={GREEN} />
            ) : previewOrders.length > 0 ? (
              previewOrders.map((order) => (
                <DeliveryDashboardCard
                  key={order.id}
                  order={order}
                  onPress={() => router.push('/DriverTaskPending')}
                />
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No pending deliveries</Text>
                <Text style={styles.emptySubtitle}>All assigned dispatches have been completed.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      <WorkerBottomNavigation activeTab="home" />
    </SafeAreaView>
  );
}


