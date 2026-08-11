import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

type TaskStatus = 'pending' | 'in_progress' | 'completed';
type WorkerTask = {
  id: number;
  category: string;
  status: TaskStatus;
  description: string | null;
};
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
          <Text style={styles.clipboardCheck}>âœ“</Text><View style={styles.clipboardRule} />
        </View>
      ))}
    </View>
  );
}

function TaskRow({ task }: { task: WorkerTask }) {
  const isLoading = task.status === 'in_progress';
  return (
    <View style={styles.taskCard}>
      <View style={styles.taskThumbnail}>
        <Image source={equipmentImage} style={styles.taskVehicle} />
      </View>
      <View style={styles.taskCopy}>
        <Text style={styles.taskCategory}>{task.category || 'Delivery'}</Text>
        <Text numberOfLines={1} style={styles.taskDescription}>{task.description || `${task.category} task`}</Text>
      </View>
      {isLoading ? <ActivityIndicator color="#70736f" size="small" /> : <View style={styles.statusDot} />}
    </View>
  );
}

export default function WorkerTaskDashboardScreen() {
  const { width } = useWindowDimensions();
  const { loading: authLoading, profile } = useAuth();
  const [tasks, setTasks] = useState<WorkerTask[]>([]);
  const [summary, setSummary] = useState<TaskSummary>({ pending: 0, active: 0, completed: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadTasks = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const response = await apiRequest<{ tasks: WorkerTask[]; summary: TaskSummary }>('/api/worker/tasks');
      setTasks(response.tasks);
      setSummary(response.summary);
    } catch (caught) {
      setTasks([]);
      setSummary({ pending: 0, active: 0, completed: 0, total: 0 });
      setError(caught instanceof Error ? caught.message : 'Could not load assigned tasks.');
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
            <Text style={styles.greeting}>Good Day{`\n`}Driver!</Text>
            <Image source={heroImage} style={styles.heroArt} />
          </View>

          <WeatherCard />

          <View style={styles.metricsRow}>
            <MetricCard color="#afd28b" label="Total Tasks" value={summary.total} />
            <MetricCard color="#a6b28f" label="Pending Tasks" value={summary.pending} />
            <MetricCard color="#70a77f" label="Active Tasks" value={summary.active} />
            <MetricCard color="#8da879" label="Completed Tasks" value={summary.completed} />
          </View>

          <Text style={styles.equipmentTitle}>Equipment Status</Text>
          <View style={styles.equipmentRow}>
            <EquipmentCard label="Available" tint="#1e7639" />
            <EquipmentCard label="On Transit" tint="#5d9b6d" />
            <EquipmentCard label="Available" tint="#1e7639" />
          </View>

          <View style={styles.sectionHeading}><ClipboardIcon /><Text style={styles.sectionTitle}>Todayâ€™s Tasks</Text></View>
          {error ? <Text style={styles.loadError}>{error}</Text> : null}
          {loading ? <ActivityIndicator style={styles.loader} color={COLORS.deepGreen} /> : tasks.slice(0, 3).map((task) => <TaskRow key={task.id} task={task} />)}
        </ScrollView>
        <WorkerBottomNavigation activeTab="home" />
      </View>
    </SafeAreaView>
  );
}

const cardShadow = {
  elevation: 4,
  shadowColor: '#586353',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 6,
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#e5e5e5', alignItems: 'center' },
  page: { flex: 1, width: '100%', backgroundColor: COLORS.background, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  scrollContent: { paddingTop: 25, paddingBottom: 34 },
  welcomeRow: { height: 158, flexDirection: 'row', position: 'relative', overflow: 'hidden' },
  greeting: { width: '39%', color: COLORS.green, fontSize: 35, lineHeight: 49, fontWeight: '800', letterSpacing: 0.1, zIndex: 2, paddingTop: 3 },
  heroArt: { position: 'absolute', width: '77%', height: 154, right: -8, bottom: 0, resizeMode: 'cover' },
  weatherCard: { height: 185, borderRadius: 8, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 19, marginBottom: 26 },
  weatherImage: { borderRadius: 8, resizeMode: 'cover' },
  weatherShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(24, 43, 35, 0.22)' },
  weatherCopy: { flex: 1, alignSelf: 'stretch', paddingTop: 20, zIndex: 1 },
  todayLabel: { color: COLORS.white, fontWeight: '800', fontSize: 20 },
  weatherTitle: { color: COLORS.white, fontWeight: '800', fontSize: 41, lineHeight: 47 },
  location: { color: COLORS.white, fontSize: 14 },
  wind: { color: COLORS.white, fontSize: 11, fontWeight: '700', marginTop: 13 },
  forecastColumn: { width: '20%', minWidth: 76, alignItems: 'center', zIndex: 1 },
  forecastDate: { color: COLORS.white, fontSize: 13, fontWeight: '800', marginBottom: 12 },
  forecastTile: { width: 72, height: 77, borderRadius: 7, backgroundColor: 'rgba(238, 241, 237, 0.63)', alignItems: 'center', justifyContent: 'center' },
  weatherIcon: { width: 58, height: 54, position: 'relative' },
  sun: { position: 'absolute', width: 23, height: 23, borderRadius: 12, backgroundColor: '#ffd400', right: 5, top: 5 },
  sunRay: { position: 'absolute', width: 4, height: 9, borderRadius: 3, backgroundColor: '#ffd400' },
  sunRayTop: { right: 14, top: -3 },
  sunRayLeft: { right: 34, top: 11, transform: [{ rotate: '-55deg' }] },
  sunRayRight: { right: -1, top: 11, transform: [{ rotate: '55deg' }] },
  cloudBack: { position: 'absolute', width: 31, height: 29, borderRadius: 18, backgroundColor: '#d3e4f3', left: 10, bottom: 7 },
  cloudFront: { position: 'absolute', width: 49, height: 19, borderRadius: 14, backgroundColor: '#d3e4f3', left: 2, bottom: 3 },
  metricsRow: { flexDirection: 'row', gap: 12, marginHorizontal: 4, marginBottom: 34 },
  metricCard: { flex: 1, height: 94, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, ...cardShadow },
  metricValue: { color: COLORS.deepGreen, fontSize: 27, lineHeight: 34, fontWeight: '700', marginBottom: 6 },
  metricLabel: { color: COLORS.white, fontSize: 11, textAlign: 'center', width: '100%' },
  equipmentTitle: { color: COLORS.green, fontSize: 29, fontWeight: '800', marginLeft: 16, marginBottom: 20 },
  equipmentRow: { flexDirection: 'row', gap: 16, marginHorizontal: 31, marginBottom: 35 },
  equipmentCard: { flex: 1, aspectRatio: 1.25, borderRadius: 8, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 9, overflow: 'hidden', ...cardShadow },
  equipmentVehicle: { position: 'absolute', width: '96%', height: '78%', top: 3, resizeMode: 'contain' },
  equipmentLabel: { color: COLORS.white, fontSize: 9, fontWeight: '700' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 14, marginLeft: 30, marginBottom: 20 },
  sectionTitle: { color: COLORS.green, fontSize: 28, fontWeight: '800' },
  clipboard: { width: 29, height: 36, borderColor: '#287d43', borderWidth: 2.5, borderRadius: 2, position: 'relative' },
  clipboardClip: { position: 'absolute', top: -6, left: 7, width: 12, height: 7, borderRadius: 2, borderWidth: 2.5, borderColor: '#287d43', backgroundColor: COLORS.background },
  clipboardLine: { position: 'absolute', left: 3, right: 3, height: 7, flexDirection: 'row', alignItems: 'center' },
  clipboardCheck: { color: '#287d43', fontSize: 9, fontWeight: '900', width: 10 },
  clipboardRule: { height: 2, borderRadius: 2, backgroundColor: '#287d43', flex: 1 },
  loader: { marginVertical: 25 },
  loadError: { color: '#a33d35', fontSize: 12, textAlign: 'center', marginBottom: 14 },
  taskCard: { height: 63, borderRadius: 8, backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center', paddingRight: 22, marginBottom: 18, borderWidth: 1, borderColor: '#d8dadd', ...cardShadow },
  taskThumbnail: { width: 60, height: 53, marginLeft: 1, marginRight: 20, backgroundColor: '#f0f2f0', alignItems: 'center', justifyContent: 'center' },
  taskVehicle: { width: 49, height: 44, resizeMode: 'contain' },
  taskCopy: { flex: 1 },
  taskCategory: { color: COLORS.deepGreen, fontSize: 10, fontWeight: '700', marginBottom: 7 },
  taskDescription: { color: '#252525', fontSize: 16 },
  statusDot: { width: 13, height: 13, borderRadius: 7, backgroundColor: '#247842' },
});

