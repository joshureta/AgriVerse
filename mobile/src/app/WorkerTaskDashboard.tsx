import { Redirect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useAuth } from '@/context/auth-context';
import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
import { apiRequest } from '@/lib/api';

type TaskStatus = 'pending' | 'in_progress' | 'completed';
type WorkerTask = {
  id: number;
  category: string;
  status: TaskStatus;
  description: string | null;
};
type TaskSummary = { pending: number; active: number; completed: number; total: number };

const GREEN = '#176b32';
function ClipboardIcon({ checked = false }: { checked?: boolean }) {
  return (
    <View style={styles.clipboard}>
      <View style={styles.clipClip} />
      {[0, 1, 2].map((line) => (
        <View key={line} style={[styles.clipLine, { top: 12 + line * 8 }]}>
          <Text style={styles.clipCheck}>{checked || line !== 1 ? '✓' : '•'}</Text>
          <View style={styles.clipRule} />
        </View>
      ))}
    </View>
  );
}

function HeroArt() {
  return (
    <View style={styles.heroArt}>
      <View style={[styles.hill, styles.hillBack]} />
      <View style={[styles.hill, styles.hillFront]} />
      <Text style={styles.farmer}>👨‍🌾</Text>
      <View style={styles.soil} />
      <View style={styles.seedlings}>
        {Array.from({ length: 7 }).map((_, index) => <Text key={index} style={styles.seedling}>🌱</Text>)}
      </View>
    </View>
  );
}

function WeatherCard() {
  return (
    <View style={styles.weatherCard}>
      <View style={styles.rainLines} />
      <View style={styles.weatherMain}>
        <Text style={styles.todayLabel}>Today</Text>
        <Text style={styles.weatherTitle}>Raining</Text>
        <Text style={styles.location}>Silang, Cavite Philippines</Text>
        <Text style={styles.wind}>Wind: 12km/h</Text>
      </View>
      {['June 26', 'June 27'].map((date) => (
        <View key={date} style={styles.forecastColumn}>
          <Text style={styles.forecastDate}>{date}</Text>
          <View style={styles.forecastTile}><Text style={styles.weatherEmoji}>🌤️</Text></View>
        </View>
      ))}
    </View>
  );
}

function MetricCard({ color, label, value }: { color: string; label: string; value: number }) {
  return <View style={[styles.metricCard, { backgroundColor: color }]}><Text style={styles.metricValue}>{value}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricLabel}>{label}</Text></View>;
}

function TaskRow({ task }: { task: WorkerTask }) {
  return (
    <View style={styles.taskCard}>
      <View style={styles.taskCopy}>
        <Text style={styles.taskCategory}>{task.category}</Text>
        <Text numberOfLines={1} style={styles.taskDescription}>{task.description || `${task.category} task`}</Text>
      </View>
      {task.status === 'in_progress' ? <ActivityIndicator color="#6f746f" size="small" /> : <View style={styles.statusDot} />}
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

  const dashboard = summary;
  const todayTasks = tasks.slice(0, 3);
  const horizontalPadding = width < 360 ? 14 : 18;

  if (authLoading) return <View style={styles.center}><ActivityIndicator color={GREEN} size="large" /></View>;
  if (!profile) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <WorkerHeader />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadTasks(true)} colors={[GREEN]} />}>
        <View style={styles.welcomeRow}>
          <Text style={styles.greeting}>Good Day{`\n`}Worker!</Text>
          <HeroArt />
        </View>
        <WeatherCard />

        <View style={styles.metricsRow}>
          <MetricCard color="#b0d48c" label="Total Tasks" value={dashboard.total} />
          <MetricCard color="#a9b693" label="Pending Tasks" value={dashboard.pending} />
          <MetricCard color="#79ab86" label="Active Tasks" value={dashboard.active} />
          <MetricCard color="#91aa7c" label="Completed Tasks" value={dashboard.completed} />
        </View>

        <View style={styles.sectionHeading}><ClipboardIcon /><Text style={styles.sectionTitle}>Today’s Tasks</Text></View>
        {error ? <Text style={styles.loadError}>{error}</Text> : null}
        {loading ? <ActivityIndicator style={styles.loader} color={GREEN} /> : todayTasks.map((task) => <TaskRow key={task.id} task={task} />)}
      </ScrollView>

      <WorkerBottomNavigation activeTab="home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fbfbf3' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fbfbf3' },
  scrollContent: { paddingTop: 28, paddingBottom: 112 },
  welcomeRow: { height: 144, flexDirection: 'row', alignItems: 'flex-start' },
  greeting: { width: '40%', color: '#196a32', fontSize: 35, lineHeight: 49, fontWeight: '800', letterSpacing: .2, zIndex: 2 },
  heroArt: { flex: 1, height: 145, overflow: 'hidden', position: 'relative' },
  hill: { position: 'absolute', bottom: 24, width: 130, height: 55, borderRadius: 70, transform: [{ rotate: '-8deg' }] },
  hillBack: { left: 16, backgroundColor: '#e2edd7' },
  hillFront: { right: -5, backgroundColor: '#d7e8ca' },
  farmer: { position: 'absolute', right: 43, bottom: 16, fontSize: 86, zIndex: 3 },
  soil: { position: 'absolute', height: 10, left: 0, right: 0, bottom: 1, backgroundColor: '#b47d35', borderRadius: 8 },
  seedlings: { position: 'absolute', bottom: 1, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', zIndex: 4 },
  seedling: { fontSize: 29 },
  weatherCard: { height: 185, borderRadius: 8, backgroundColor: '#61746b', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, marginBottom: 54 },
  rainLines: { position: 'absolute', inset: 0, backgroundColor: 'rgba(35,55,50,.24)', borderTopWidth: 28, borderBottomWidth: 36, borderColor: 'rgba(255,255,255,.04)' },
  weatherMain: { flex: 1, alignSelf: 'stretch', paddingTop: 21 },
  todayLabel: { color: '#fff', fontWeight: '800', fontSize: 20 },
  weatherTitle: { color: '#fff', fontWeight: '800', fontSize: 41, lineHeight: 47 },
  location: { color: '#fff', fontSize: 14, marginTop: 1 },
  wind: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 13 },
  forecastColumn: { width: 87, alignItems: 'center' },
  forecastDate: { color: '#fff', fontSize: 13, fontWeight: '800', marginBottom: 12 },
  forecastTile: { width: 72, height: 77, borderRadius: 8, backgroundColor: 'rgba(240,240,236,.58)', alignItems: 'center', justifyContent: 'center' },
  weatherEmoji: { fontSize: 44 },
  metricsRow: { flexDirection: 'row', gap: 12, marginHorizontal: 3, marginBottom: 40 },
  metricCard: { flex: 1, height: 98, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, elevation: 4, shadowColor: '#65705e', shadowOffset: { width: 0, height: 5 }, shadowOpacity: .18, shadowRadius: 7 },
  metricValue: { color: GREEN, fontSize: 27, lineHeight: 34, fontWeight: '700', marginBottom: 7 },
  metricLabel: { color: '#fff', fontSize: 11, textAlign: 'center' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 15, marginLeft: 14, marginBottom: 27 },
  sectionTitle: { color: '#08642b', fontSize: 28, fontWeight: '800' },
  clipboard: { width: 37, height: 46, borderColor: '#237840', borderWidth: 3, borderRadius: 3, position: 'relative' },
  clipClip: { position: 'absolute', top: -7, left: 9, width: 15, height: 9, borderRadius: 2, borderWidth: 3, borderColor: '#237840', backgroundColor: '#fff' },
  clipLine: { position: 'absolute', left: 4, right: 4, height: 8, flexDirection: 'row', alignItems: 'center' },
  clipCheck: { color: '#237840', fontSize: 11, fontWeight: '900', width: 12 },
  clipRule: { height: 3, borderRadius: 2, backgroundColor: '#237840', flex: 1 },
  loader: { marginTop: 25 },
  loadError: { color: '#a33d35', fontSize: 12, textAlign: 'center', marginVertical: 18 },
  taskCard: { height: 62, borderRadius: 8, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 19, marginHorizontal: 10, marginBottom: 14, borderWidth: 1, borderColor: '#d8dadd', elevation: 4, shadowColor: '#777', shadowOffset: { width: 0, height: 5 }, shadowOpacity: .16, shadowRadius: 7 },
  taskCopy: { flex: 1 },
  taskCategory: { color: '#176638', fontSize: 10, fontWeight: '700', marginBottom: 7 },
  taskDescription: { color: '#252525', fontSize: 16 },
  statusDot: { width: 13, height: 13, borderRadius: 7, backgroundColor: '#18743a' },
});
