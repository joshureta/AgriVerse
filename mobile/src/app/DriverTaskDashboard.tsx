import { styles } from '@/styles/driver-task-dashboard.styles';
import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import { DriverOrder, DriverOrdersResponse, formatDeliveryAddress, isActiveDelivery } from '@/lib/driver-deliveries';

type TaskSummary = { pending: number; active: number; completed: number; total: number };

const GREEN = '#134B24';

const sampleDeliveries = [
  { id: 1, category: 'Delivery', description: 'Deliver 1000 pineapples.', status: 'pending' },
  { id: 2, category: 'Delivery', description: 'Deliver 2000 pineapples.', status: 'pending' },
  { id: 3, category: 'Delivery', description: 'Deliver 500 pineapples.', status: 'in_progress' },
];

function ClipboardHeaderIcon() {
  return (
    <View style={styles.clipboardIcon}>
      <View style={styles.clipClip} />
      {[0, 1, 2].map((line) => (
        <View key={line} style={styles.clipCheckRow}>
          <Text style={styles.clipCheck}>✓</Text>
          <View style={styles.clipLine} />
        </View>
      ))}
    </View>
  );
}

function WeatherWidget() {
  return (
    <View style={styles.weatherBlock}>
      <Image
        source={require('@/assets/images/worker-weather-rain-icon.png')}
        style={styles.weatherIconImage}
      />
      <View style={styles.weatherInfo}>
        <View style={styles.weatherTitleRow}>
          <Text style={styles.weatherTitle}>Raining</Text>
          <Text style={styles.weatherDate}>June 26</Text>
        </View>
        <Text style={styles.weatherLocation}>Silang, Cavite Philippines</Text>
      </View>
    </View>
  );
}

function MetricCard({ color, label, value, textColor }: { color: string; label: string; value: number; textColor: string }) {
  return (
    <View style={[styles.metricCard, { backgroundColor: color }]}>
      <Text style={[styles.metricValue, { color: textColor }]}>{value}</Text>
      <Text numberOfLines={2} adjustsFontSizeToFit style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function EquipmentCard({ label, tint }: { label: string; tint: string }) {
  return (
    <View style={[styles.equipmentCard, { backgroundColor: tint }]}>
      <Image source={require('@/assets/images/driver-equipment.png')} style={styles.equipmentVehicle} />
      <Text style={styles.equipmentLabel}>{label}</Text>
    </View>
  );
}

function TaskRow({ order }: { order: DriverOrder | { id: number; category: string; description: string; status: string } }) {
  const isDriverOrder = 'delivery_assignment_status' in order;
  const isActive = isDriverOrder ? isActiveDelivery(order as DriverOrder) : (order as { status: string }).status === 'in_progress';
  const description = isDriverOrder
    ? (order as DriverOrder).order_number
      ? `Deliver order ${(order as DriverOrder).order_number}.`
      : formatDeliveryAddress(order as DriverOrder)
    : (order as { description: string }).description;

  return (
    <View style={styles.taskCard}>
      <View style={styles.taskThumbnail}>
        <Image
          source={require('@/assets/images/driver-task-delivery-icon.png')}
          style={styles.taskVehicle}
        />
      </View>
      <View style={styles.taskCopy}>
        <Text style={styles.taskCategory}>Delivery</Text>
        <Text numberOfLines={1} style={styles.taskDescription}>
          {description}
        </Text>
      </View>
      {isActive ? <ActivityIndicator color="#70736F" size="small" /> : <View style={styles.statusDot} />}
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

  useEffect(() => { if (profile) loadTasks(); }, [loadTasks, profile]);

  const hasSummary = summary.total > 0 || summary.pending > 0 || summary.active > 0 || summary.completed > 0;
  const totalTasks = hasSummary ? summary.total : 6;
  const pendingTasks = hasSummary ? summary.pending : 3;
  const activeTasks = hasSummary ? summary.active : 2;
  const completedTasks = hasSummary ? summary.completed : 9;

  const horizontalPadding = width < 360 ? 14 : 18;

  if (authLoading) return <View style={styles.center}><ActivityIndicator color={GREEN} size="large" /></View>;
  if (!profile) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <WorkerHeader />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]}
        refreshControl={<RefreshControl colors={[GREEN]} onRefresh={() => loadTasks(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}
        style={styles.page}>
        
        {/* Top Greeting & Weather Header */}
        <View style={styles.topRow}>
          <View style={styles.greetingBlock}>
            <Text style={styles.greeting}>Good Day{'\n'}Driver!</Text>
          </View>
          <WeatherWidget />
        </View>

        {/* Driver Hero Art */}
        <View style={styles.heroWrapper}>
          <Image
            source={require('@/assets/images/driver-dashboard-hero.png')}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        {/* 4 Metric Cards */}
        <View style={styles.metricsRow}>
          <MetricCard color="#A5C982" label="Total Tasks" value={totalTasks} textColor="#1B4D27" />
          <MetricCard color="#1E6B37" label="Pending Tasks" value={pendingTasks} textColor="#FFFFFF" />
          <MetricCard color="#1B6434" label="Active Tasks" value={activeTasks} textColor="#FFFFFF" />
          <MetricCard color="#7E9F6B" label="Completed Tasks" value={completedTasks} textColor="#1B4D27" />
        </View>

        {/* Equipment Status Section */}
        <Text style={styles.equipmentTitle}>Equipment Status</Text>
        <View style={styles.equipmentRow}>
          <EquipmentCard label="Available" tint="#1E6B37" />
          <EquipmentCard label="On Transit" tint="#4A855A" />
          <EquipmentCard label="Available" tint="#1E6B37" />
        </View>

        {/* Today's Tasks Section */}
        <View style={styles.sectionHeading}>
          <ClipboardHeaderIcon />
          <Text style={styles.sectionTitle}>Today’s Tasks</Text>
        </View>

        {error ? <Text style={styles.loadError}>{error}</Text> : null}
        {loading ? (
          <ActivityIndicator style={styles.loader} color={GREEN} />
        ) : orders.length > 0 ? (
          orders.slice(0, 3).map((order) => <TaskRow key={order.id} order={order} />)
        ) : (
          sampleDeliveries.map((delivery) => <TaskRow key={delivery.id} order={delivery} />)
        )}
      </ScrollView>

      <WorkerBottomNavigation activeTab="home" />
    </SafeAreaView>
  );
}

