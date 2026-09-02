import { GREEN, styles } from '@/styles/worker-task-dashboard.styles';
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
  useWindowDimensions,
  View,
} from 'react-native';

import { ApiWeatherBanner } from '@/components/api-weather-banner';
import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import { loadWeather, type WeatherSnapshot } from '@/lib/weather';

type TaskStatus = 'pending' | 'in_progress' | 'completed';
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

const categoryThemes: Record<string, { icon: string; bg: string; color: string }> = {
  Planting: { icon: '🌱', bg: '#FDF2E9', color: '#9A3412' },
  Irrigation: { icon: '💧', bg: '#E0F2FE', color: '#0369A1' },
  Fertilizer: { icon: '🌿', bg: '#DCFCE7', color: '#15803D' },
  Fertilizing: { icon: '🌿', bg: '#DCFCE7', color: '#15803D' },
  'Crop Inspection': { icon: '🔎', bg: '#F3E8FF', color: '#7E22CE' },
  'Pests & Disease Control': { icon: '🔎', bg: '#FEE2E2', color: '#B91C1C' },
  Harvesting: { icon: '🍍', bg: '#FEF3C7', color: '#B45309' },
};

function formatPriorityLabel(priority?: string) {
  if (!priority) return 'Medium Priority';
  const lower = priority.toLowerCase();
  if (lower === 'high') return 'High Priority';
  if (lower === 'low') return 'Low Priority';
  return 'Medium Priority';
}

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

function TaskDashboardCard({
  task,
  onStart,
}: {
  task: WorkerTask;
  onStart: () => void;
}) {
  const theme = categoryThemes[task.category] || { icon: '🌾', bg: '#F1F5F9', color: '#475569' };
  const priorityKey = task.priority || 'medium';

  return (
    <View style={styles.taskCard}>
      {/* Left: Squircle Category Container */}
      <View style={[styles.categorySquircle, { backgroundColor: theme.bg }]}>
        <Text style={styles.categoryIcon}>{theme.icon}</Text>
      </View>

      {/* Center: Stacked Badges */}
      <View style={styles.taskCenterColumn}>
        <View style={[styles.priorityPill, styles[`priority_${priorityKey}`]]}>
          <Text style={[styles.priorityText, styles[`priorityText_${priorityKey}`]]}>
            {formatPriorityLabel(task.priority)}
          </Text>
        </View>

        <View style={styles.durationPill}>
          <Text style={styles.durationClockIcon}>🕒</Text>
          <Text style={styles.durationPillText}>Duration</Text>
        </View>
      </View>

      {/* Right: Start Task CTA Button */}
      <Pressable
        onPress={onStart}
        style={({ pressed }) => [styles.startTaskBtn, pressed && styles.startTaskBtnPressed]}>
        <Text style={styles.startTaskBtnText}>Start Task</Text>
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
  const horizontalPadding = width < 360 ? 14 : 18;

  if (authLoading) return <View style={styles.center}><ActivityIndicator color={GREEN} size="large" /></View>;
  if (!profile) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <WorkerHeader />

      <View style={styles.mainBodyContainer}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]}
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
          
          {/* Top Greeting */}
          <Text style={styles.greeting}>Good Day, {profile?.full_name || 'Worker'}!</Text>

          {/* API Weather Banner Card */}
          <ApiWeatherBanner weather={weather} />

          {/* 4 Metric Status Cards (Horizontal 1-Row Grid) */}
          <View style={styles.metricsRow}>
            <MetricCard
              color="#0F3E22"
              label="Total Tasks"
              value={dashboard.total}
              onPress={() => router.push('/WorkerTaskPending')}
            />
            <MetricCard
              color="#237C3B"
              label="Pending"
              value={dashboard.pending}
              onPress={() => router.push('/WorkerTaskPending')}
            />
            <MetricCard
              color="#D99026"
              label="Active"
              value={dashboard.active}
              onPress={() => router.push('/WorkerTaskActive')}
            />
            <MetricCard
              color="#0F7D40"
              label="Completed"
              value={dashboard.completed}
              onPress={() => router.push('/WorkerTaskCompleted')}
            />
          </View>

          {/* Today's Tasks Section Header */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWrap}>
              <ClipboardDocumentIcon />
              <Text style={styles.sectionTitle}>Today’s Tasks</Text>
            </View>
            <Pressable onPress={() => router.push('/WorkerTaskPending')}>
              <Text style={styles.sectionLink}>View All ({dashboard.total}) ›</Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.loadError}>{error}</Text> : null}
          
          {loading ? (
            <ActivityIndicator style={styles.loader} color={GREEN} />
          ) : previewTasks.length > 0 ? (
            previewTasks.map((task) => (
              <TaskDashboardCard
                key={task.id}
                task={task}
                onStart={() => router.push('/WorkerTaskPending')}
              />
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No tasks scheduled for today.</Text>
            </View>
          )}

        </ScrollView>
      </View>

      <WorkerBottomNavigation activeTab="home" />
    </SafeAreaView>
  );
}
