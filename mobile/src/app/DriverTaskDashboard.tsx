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
import Svg, { Path } from 'react-native-svg';

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

function TruckIcon({ size = 21, color = GREEN }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h11v10H3V6Zm11 4h3l3 3v3h-6v-6Z" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm10 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" stroke={color} strokeWidth={1.9} />
    </Svg>
  );
}

function LocationPinIcon({ size = 14, color = GREEN }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21s7-5.5 7-12a7 7 0 1 0-14 0c0 6.5 7 12 7 12Z" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke={color} strokeWidth={1.9} />
    </Svg>
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
      <View style={[styles.categorySquircle, { backgroundColor: '#EEF3EF' }]}>
        <TruckIcon size={27} />
      </View>

      {/* Center: Stacked Badges */}
      <View style={styles.taskCenterColumn}>
        <View style={[styles.priorityPill, styles.priorityPill_order]}>
          <Text style={[styles.priorityText, styles.priorityText_order]}>{orderNumber}</Text>
        </View>

        <View style={styles.deliveryRoutePill}>
          <LocationPinIcon />
          <Text numberOfLines={1} style={styles.deliveryRouteText}>
            {route.replace('->', '→')}
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

  const dashboard = summary;
  const pendingOrders = orders.filter((o) => o.delivery_assignment_status === 'assigned');
  const previewOrders = pendingOrders.slice(0, 3);
  const contentInset = width < 360 ? styles.contentInsetCompact : styles.contentInset;

  const fleetItems = [
    { id: '1', name: 'Delivery Truck A', meta: 'Plate: AGV-4081', status: 'available' as const },
    { id: '2', name: 'Delivery Truck B', meta: 'Silang ➔ Tagaytay', status: 'transit' as const },
    { id: '3', name: 'Farm Utility Pickup', meta: 'Plate: AGV-1024', status: 'available' as const },
  ];
  const displayedEquipment = fleetItems;

  if (authLoading) return <View style={styles.center}><ActivityIndicator color={GREEN} size="large" /></View>;
  if (!profile) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <WorkerHeader
        extendUnderStatusBar
        height={72}
        transparent
        overlay
        logoSource={require('@/assets/images/driver-dashboard-emblem.png')}
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
            <View style={styles.overviewStack}>
            {/* COMBINED TASK & EQUIPMENT DASHBOARD CARD (Mobile Theme) */}
            <View style={styles.combinedCard}>
              {/* Section Header */}
              <View style={styles.combinedHeaderRow}>
                <Text style={styles.combinedHeaderTitle}>Delivery Overview</Text>
                <View style={styles.todayBadge}>
                  <Text style={styles.todayBadgeText}>Today</Text>
                </View>
              </View>

              {/* 4-Column Stats Row: Total | Pending | Active | Completed Deliveries */}
              <View style={styles.statsFourCol}>
                <Pressable
                  style={styles.statCol}
                  onPress={() => router.push('/DriverTaskPending')}>
                  <Text style={[styles.statNumber, styles.statNumberTotal]}>{dashboard.total}</Text>
                  <Text style={[styles.statLabel, styles.statLabelTotal]}>Total{'\n'}Deliveries</Text>
                </Pressable>

                <View style={styles.colDivider} />

                <Pressable
                  style={styles.statCol}
                  onPress={() => router.push('/DriverTaskPending')}>
                  <Text style={styles.statNumber}>{String(dashboard.pending).padStart(2, '0')}</Text>
                  <Text style={styles.statLabel}>Pending{'\n'}Deliveries</Text>
                </Pressable>

                <View style={styles.colDivider} />

                <Pressable
                  style={styles.statCol}
                  onPress={() => router.push('/DriverTaskActive')}>
                  <Text style={styles.statNumber}>{String(dashboard.active).padStart(2, '0')}</Text>
                  <Text style={styles.statLabel}>Active{'\n'}Deliveries</Text>
                </Pressable>

                <View style={styles.colDivider} />

                <Pressable
                  style={styles.statCol}
                  onPress={() => router.push('/DriverTaskCompleted')}>
                  <Text style={styles.statNumber}>{String(dashboard.completed).padStart(2, '0')}</Text>
                  <Text style={styles.statLabel}>Completed{'\n'}Deliveries</Text>
                </Pressable>
              </View>

            </View>

            {/* Equipment Status Section */}
              <View style={styles.nestedEquipmentCard}>
                <View style={styles.nestedEquipmentHeader}>
                  <View style={styles.nestedEquipmentTitleWrap}>
                    <Text style={styles.nestedEquipmentHeading}>Equipment Status</Text>
                  </View>
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
                          <TruckIcon />
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
            </View>

            {/* Today's Deliveries Section Header */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWrap}>
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


