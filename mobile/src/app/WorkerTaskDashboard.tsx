import { styles } from '@/styles/worker-task-dashboard.styles';
import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
  task_name?: string;
};
type TaskSummary = { pending: number; active: number; completed: number; total: number };

const GREEN = '#134B24';

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

function TaskRow({ task }: { task: WorkerTask }) {
  return (
    <View style={styles.taskCard}>
      <View style={styles.taskCopy}>
        <Text style={styles.taskCategory}>{task.category}</Text>
        <Text numberOfLines={1} style={styles.taskDescription}>{task.description || task.task_name || `${task.category} task`}</Text>
      </View>
      {task.status === 'in_progress' ? <ActivityIndicator color="#666" size="small" /> : <View style={styles.statusDot} />}
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
        
        {/* Top Greeting & Weather Header */}
        <View style={styles.topRow}>
          <View style={styles.greetingBlock}>
            <Text style={styles.greeting}>Good Day{'\n'}Worker!</Text>
          </View>
          <WeatherWidget />
        </View>

        {/* Farmer Hero Art */}
        <View style={styles.heroWrapper}>
          <Image
            source={require('@/assets/images/worker-crop-farmer-hero.png')}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        {/* 4 Metric Cards */}
        <View style={styles.metricsRow}>
          <MetricCard color="#A5C982" label="Total Tasks" value={dashboard.total} textColor="#1B4D27" />
          <MetricCard color="#1E6B37" label="Pending Tasks" value={dashboard.pending} textColor="#FFFFFF" />
          <MetricCard color="#1E6B37" label="Active Tasks" value={dashboard.active} textColor="#FFFFFF" />
          <MetricCard color="#7E9F6B" label="Completed Tasks" value={dashboard.completed} textColor="#1B4D27" />
        </View>

        {/* Today's Tasks Section */}
        <View style={styles.sectionHeading}>
          <ClipboardHeaderIcon />
          <Text style={styles.sectionTitle}>Today’s Tasks</Text>
        </View>

        {error ? <Text style={styles.loadError}>{error}</Text> : null}
        {loading ? (
          <ActivityIndicator style={styles.loader} color={GREEN} />
        ) : todayTasks.length > 0 ? (
          todayTasks.map((task) => <TaskRow key={task.id} task={task} />)
        ) : (
          <TaskRow task={{ id: 0, category: 'Planting', status: 'pending', description: 'Prepare planting holes' }} />
        )}
      </ScrollView>

      <WorkerBottomNavigation activeTab="home" />
    </SafeAreaView>
  );
}
