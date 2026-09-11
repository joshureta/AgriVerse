import { GREEN, styles } from '@/styles/driver-task-dashboard.styles';
import { Redirect, router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
import Svg, { Circle, Path } from 'react-native-svg';

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

function MonitoringIcon({ size = 24, color = '#166534' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={10.5} cy={10.5} r={6.5} stroke={color} strokeWidth={2} />
      <Path d="m15.5 15.5 5 5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M10.5 7.5a3 3 0 0 0-3 3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function IrrigationIcon({ size = 24, color = '#0284C7' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9 15a3 3 0 0 0 3 3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function HarvestingIcon({ size = 24, color = '#B45309' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9h18l-2 11H5L3 9z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M7 9V6a5 5 0 0 1 10 0v3" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M10 14h4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function PlantingIcon({ size = 24, color = '#15803D' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22v-9" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path
        d="M12 13c-3-6-9-4-9 1 5 1 8-1 9-1z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 13c3-6 9-4 9 1-5 1-8-1-9-1z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M5 22h14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function FertilizingIcon({ size = 24, color = '#166534' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 3.5 1 5.5-.5 10A7 7 0 0 1 11 20z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="m7 15 5-5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function PestControlIcon({ size = 24, color = '#B91C1C' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="m9 12 2 2 4-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function DefaultTaskIcon({ size = 24, color = '#166534' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 3.5 1 5.5-.5 10A7 7 0 0 1 11 20z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type CategoryTheme = {
  squircleBg: string;
  iconColor: string;
  pillBg: string;
  pillColor: string;
  pillBorder: string;
  IconComponent: React.ComponentType<{ size?: number; color?: string }>;
};

const categoryConfig: Record<string, CategoryTheme> = {
  Monitoring: {
    squircleBg: '#E8F5E9',
    iconColor: '#166534',
    pillBg: '#DCFCE7',
    pillColor: '#166534',
    pillBorder: '#BBF7D0',
    IconComponent: MonitoringIcon,
  },
  'Crop Inspection': {
    squircleBg: '#E8F5E9',
    iconColor: '#166534',
    pillBg: '#DCFCE7',
    pillColor: '#166534',
    pillBorder: '#BBF7D0',
    IconComponent: MonitoringIcon,
  },
  Irrigation: {
    squircleBg: '#E0F2FE',
    iconColor: '#0284C7',
    pillBg: '#E0F2FE',
    pillColor: '#0369A1',
    pillBorder: '#BAE6FD',
    IconComponent: IrrigationIcon,
  },
  Harvesting: {
    squircleBg: '#FEF3C7',
    iconColor: '#B45309',
    pillBg: '#FEF3C7',
    pillColor: '#92400E',
    pillBorder: '#FDE68A',
    IconComponent: HarvestingIcon,
  },
  Planting: {
    squircleBg: '#DCFCE7',
    iconColor: '#15803D',
    pillBg: '#F0FDF4',
    pillColor: '#15803D',
    pillBorder: '#BBF7D0',
    IconComponent: PlantingIcon,
  },
  Fertilizer: {
    squircleBg: '#ECFDF5',
    iconColor: '#166534',
    pillBg: '#ECFDF5',
    pillColor: '#166534',
    pillBorder: '#A7F3D0',
    IconComponent: FertilizingIcon,
  },
  Fertilizing: {
    squircleBg: '#ECFDF5',
    iconColor: '#166534',
    pillBg: '#ECFDF5',
    pillColor: '#166534',
    pillBorder: '#A7F3D0',
    IconComponent: FertilizingIcon,
  },
  'Pests & Disease Control': {
    squircleBg: '#FEE2E2',
    iconColor: '#B91C1C',
    pillBg: '#FEF2F2',
    pillColor: '#B91C1C',
    pillBorder: '#FECACA',
    IconComponent: PestControlIcon,
  },
};

const defaultCategoryConfig: CategoryTheme = {
  squircleBg: '#E8F5E9',
  iconColor: '#166534',
  pillBg: '#F3F7F3',
  pillColor: '#166534',
  pillBorder: '#DCE8DE',
  IconComponent: DefaultTaskIcon,
};

function TaskDashboardCard({
  task,
  onStart,
}: {
  task: WorkerTask;
  onStart: () => void;
}) {
  const config = categoryConfig[task.category] || defaultCategoryConfig;
  const Icon = config.IconComponent;
  const fieldLabel = task.field
    ? task.field.toLowerCase().startsWith('field')
      ? task.field
      : `Field ${task.field}`
    : task.description || 'Assigned field task';

  return (
    <View style={styles.taskCard}>
      {/* Left: Squircle Category Icon */}
      <View style={[styles.categorySquircle, { backgroundColor: config.squircleBg }]}>
        <Icon size={24} color={config.iconColor} />
      </View>

      {/* Center: Stacked Badges */}
      <View style={styles.taskCenterColumn}>
        <View
          style={[
            styles.priorityPill,
            { backgroundColor: config.pillBg, borderWidth: 1, borderColor: config.pillBorder },
          ]}>
          <Text style={[styles.priorityText, { color: config.pillColor }]}>{task.category}</Text>
        </View>
        <View style={styles.deliveryRoutePill}>
          <Text numberOfLines={1} style={styles.deliveryRouteText}>{fieldLabel}</Text>
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
