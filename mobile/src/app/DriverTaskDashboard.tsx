import { styles } from '@/styles/driver-task-dashboard.styles';
import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import { DriverOrder, DriverOrdersResponse, formatDeliveryAddress, isActiveDelivery } from '@/lib/driver-deliveries';

type TaskSummary = { pending: number; active: number; completed: number; total: number };

const COLORS = {
  background: '#fbfbf3',
  green: '#216c36',
  deepGreen: '#176b32',
  white: '#ffffff',
};

const heroImage = require('@/assets/images/driver-dashboard-hero.png');
const weatherImage = require('@/assets/images/driver-weather-rain.png');
const equipmentImage = require('@/assets/images/driver-equipment.png');

function PartlyCloudyIcon() {
  return (
    <View style={styles.weatherIcon}>
      <View style={styles.sun} />
      <View style={[styles.sunRay, styles.sunRayTop]} />
      <View style={[styles.sunRay, styles.sunRayLeft]} />
      <View style={[styles.sunRay, styles.sunRayRight]} />
      <View style={styles.cloudBack} />
      <View style={styles.cloudFront} />
    </View>
  );
}

function WeatherCard() {
  return (
    <ImageBackground source={weatherImage} imageStyle={styles.weatherImage} style={styles.weatherCard}>
      <View style={styles.weatherShade} />
      <View style={styles.weatherCopy}>
        <Text style={styles.todayLabel}>Today</Text>
        <Text style={styles.weatherTitle}>Raining</Text>
        <Text style={styles.location}>Silang, Cavite Philippines</Text>
        <Text style={styles.wind}>Wind: 12km/h</Text>
      </View>
      {['June 26', 'June 27'].map((date) => (
        <View key={date} style={styles.forecastColumn}>
          <Text style={styles.forecastDate}>{date}</Text>
          <View style={styles.forecastTile}><PartlyCloudyIcon /></View>
        </View>
      ))}
    </ImageBackground>
  );
}

function MetricCard({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={[styles.metricCard, { backgroundColor: color }]}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function EquipmentCard({ label, tint }: { label: string; tint: string }) {
  return (
    <View style={[styles.equipmentCard, { backgroundColor: tint }]}>
      <Image source={equipmentImage} style={styles.equipmentVehicle} />
      <Text style={styles.equipmentLabel}>{label}</Text>
    </View>
  );
}

function ClipboardIcon() {
  return (
    <View style={styles.clipboard}>
      <View style={styles.clipboardClip} />
      {[0, 1, 2].map((line) => (
        <View key={line} style={[styles.clipboardLine, { top: 12 + line * 8 }]}>
          <Text style={styles.clipboardCheck}>✓</Text><View style={styles.clipboardRule} />
        </View>
      ))}
    </View>
  );
}

function TaskRow({ order }: { order: DriverOrder }) {
  const isActive = isActiveDelivery(order);

  return (
    <View style={styles.taskCard}>
      <View style={styles.taskThumbnail}>
        <Image source={equipmentImage} style={styles.taskVehicle} />
      </View>
      <View style={styles.taskCopy}>
        <Text style={styles.taskCategory}>{order.order_number}</Text>
        <Text numberOfLines={1} style={styles.taskDescription}>
          {formatDeliveryAddress(order)}
        </Text>
      </View>
      {isActive ? <ActivityIndicator color="#70736f" size="small" /> : <View style={styles.statusDot} />}
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

  const horizontalPadding = width < 360 ? 14 : 18;
  const contentWidth = Math.min(width, 600);

  if (authLoading) return <View style={styles.center}><ActivityIndicator color={COLORS.deepGreen} size="large" /></View>;
  if (!profile) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.page, { maxWidth: contentWidth }]}>
        <WorkerHeader />
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]}
          refreshControl={<RefreshControl colors={[COLORS.deepGreen]} onRefresh={() => loadTasks(true)} refreshing={refreshing} />}
          showsVerticalScrollIndicator={false}>
          <View style={styles.welcomeRow}>
            <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={2} style={styles.greeting}>Good Day{`\n`}Driver!</Text>
            <Image source={heroImage} style={styles.heroArt} />
          </View>

          <WeatherCard />

          <View style={styles.metricsRow}>
            <MetricCard color="#afd28b" label="Total Deliveries" value={summary.total} />
            <MetricCard color="#a6b28f" label="Pending Deliveries" value={summary.pending} />
            <MetricCard color="#70a77f" label="Active Deliveries" value={summary.active} />
            <MetricCard color="#8da879" label="Completed Deliveries" value={summary.completed} />
          </View>

          <Text style={styles.equipmentTitle}>Equipment Status</Text>
          <View style={styles.equipmentRow}>
            <EquipmentCard label="Available" tint="#1e7639" />
            <EquipmentCard label="On Transit" tint="#5d9b6d" />
            <EquipmentCard label="Available" tint="#1e7639" />
          </View>

          <View style={styles.sectionHeading}><ClipboardIcon /><Text style={styles.sectionTitle}>Today’s Deliveries</Text></View>
          {error ? <Text style={styles.loadError}>{error}</Text> : null}
          {loading ? <ActivityIndicator style={styles.loader} color={COLORS.deepGreen} /> : orders.slice(0, 3).map((order) => <TaskRow key={order.id} order={order} />)}
        </ScrollView>
        <WorkerBottomNavigation activeTab="home" />
      </View>
    </SafeAreaView>
  );
}
