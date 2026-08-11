import { styles } from '@/styles/worker-task-dashboard.styles';
import { Redirect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
