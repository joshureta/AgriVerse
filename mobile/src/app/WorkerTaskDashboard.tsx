import { GREEN, styles } from '@/styles/driver-task-dashboard.styles';
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { loadWeather, type WeatherSnapshot } from '@/lib/weather';

type TaskStatus = 'pending' | 'in_progress' | 'awaiting_approval' | 'completed';
type WorkerTask = {
  id: number;
  category: string;
  field?: string;
  priority?: 'high' | 'medium' | 'low';
  status: TaskStatus;
  description: string | null;
  task_name?: string;
  estimated_duration_minutes?: number;
};
type TaskSummary = { pending: number; active: number; completed: number; total: number };

function formatPriorityLabel(priority?: string) {
  if (!priority) return 'Medium Priority';
  const lower = priority.toLowerCase();
  if (lower === 'high') return 'High Priority';
  if (lower === 'low') return 'Low Priority';
  return 'Medium Priority';
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

function TaskDashboardCard({
  task,
  onStart,
}: {
  task: WorkerTask;
  onStart: () => void;
}) {
  return (
    <View style={styles.taskCard}>
      <View style={styles.taskCenterColumn}>
        <View style={[styles.priorityPill, styles.priorityPill_order]}>
          <Text style={[styles.priorityText, styles.priorityText_order]}>{task.category}</Text>
        </View>
        <View style={styles.deliveryRoutePill}>
          <Text numberOfLines={1} style={styles.deliveryRouteText}>{task.field || task.description || 'Assigned field task'}</Text>
        </View>
      </View>

      {/* Right: Start Task CTA Button */}
      <Pressable
        onPress={onStart}
        style={({ pressed }) => [styles.startTaskBtn, pressed && styles.startTaskBtnPressed]}>
        <Text style={styles.startTaskBtnText}>Start</Text>
      </Pressable>
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
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [navbarBlurred, setNavbarBlurred] = useState(false);

  const loadTasks = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const response = await apiRequest<{ tasks: WorkerTask[]; summary: TaskSummary }>('/api/worker/tasks');
      setTasks(response.tasks || []);
      setSummary(response.summary || { pending: 0, active: 0, completed: 0, total: 0 });
    } catch (caught) {
      setTasks([]);
      setSummary({ pending: 0, active: 0, completed: 0, total: 0 });
      setError(caught instanceof Error ? caught.message : 'Could not load assigned tasks.');
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
  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const previewTasks = pendingTasks.slice(0, 3);
  const contentInset = width < 360 ? styles.contentInsetCompact : styles.contentInset;

  if (authLoading) return <View style={styles.center}><ActivityIndicator color={GREEN} size="large" /></View>;
  if (!profile) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <WorkerHeader extendUnderStatusBar height={72} transparent overlay logoPosition="left" logoSize={48} logoSource={require('@/assets/images/driver-dashboard-emblem.png')} blurred={navbarBlurred} />

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
          
          <ApiWeatherBanner weather={weather} flushTop topContentInset={92} />

          <View style={contentInset}>
          <View style={styles.overviewStack}>
            <View style={styles.combinedCard}>
              <View style={styles.combinedHeaderRow}>
                <Text style={styles.combinedHeaderTitle}>Task Overview</Text>
                <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>Today</Text></View>
              </View>
              <View style={styles.statsFourCol}>
                {[
                  ['Total', dashboard.total, '/WorkerTaskPending'],
                  ['Pending', dashboard.pending, '/WorkerTaskPending'],
                  ['Active', dashboard.active, '/WorkerTaskActive'],
                  ['Completed', dashboard.completed, '/WorkerTaskCompleted'],
                ].map(([label, value, route]) => <Pressable key={String(label)} onPress={() => router.push(route as any)} style={styles.statCol}><Text style={styles.statNumber}>{value}</Text><Text style={styles.statLabel}>{label}{'\n'}Tasks</Text></Pressable>)}
              </View>
            </View>
          </View>

          {/* Today's Tasks Section Header */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Today’s Tasks</Text>
            <Pressable onPress={() => router.push('/WorkerTaskPending')}>
              <Text style={styles.sectionLink}>View All ({dashboard.total}) ›</Text>
            </Pressable>
          </View>

          {error ? <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View> : null}
          
          {loading ? (
            <ActivityIndicator style={{ marginVertical: 20 }} color={GREEN} />
          ) : previewTasks.length > 0 ? (
            previewTasks.map((task) => (
              <TaskDashboardCard
                key={task.id}
                task={task}
                onStart={() => router.push('/WorkerTaskPending')}
              />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptySubtitle}>No tasks scheduled for today.</Text>
            </View>
          )}
          </View>

        </ScrollView>
      </View>

      <WorkerBottomNavigation activeTab="home" />
    </SafeAreaView>
  );
}
