import { styles } from '@/styles/worker-task-active.styles';
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
import { WorkerTaskSegmentedTabs } from '@/components/worker-task-segmented-tabs';
import { TaskCompletionBlurTarget } from '@/components/task-completion-blur-target';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import { styles as deliveryStyles } from '@/styles/driver-task-pending.styles';
import Svg, { Circle, Path } from 'react-native-svg';

type TaskStatus = 'pending' | 'in_progress' | 'awaiting_approval' | 'completed';
type WorkerTaskRecord = {
  id: number;
  category: string;
  field: string;
  priority: 'high' | 'medium' | 'low';
  status: TaskStatus;
  description: string | null;
  started_at?: string | null;
  schedule_start?: string | null;
  estimated_duration_minutes?: number | null;
  harvest_rejection_reason?: string | null;
};

const GREEN = '#176d34';
function SearchIcon() { return <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"><Circle cx={11} cy={11} r={6.5} stroke="#64748B" strokeWidth={2} /><Path d="m16 16 4 4" stroke="#64748B" strokeWidth={2} strokeLinecap="round" /></Svg>; }

function MonitoringIcon({ size = 16, color = '#166534' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={10.5} cy={10.5} r={6.5} stroke={color} strokeWidth={2} />
      <Path d="m15.5 15.5 5 5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M10.5 7.5a3 3 0 0 0-3 3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function IrrigationIcon({ size = 16, color = '#0284C7' }: { size?: number; color?: string }) {
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

function HarvestingIcon({ size = 16, color = '#B45309' }: { size?: number; color?: string }) {
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

function PlantingIcon({ size = 16, color = '#15803D' }: { size?: number; color?: string }) {
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

function FertilizingIcon({ size = 16, color = '#166534' }: { size?: number; color?: string }) {
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

function PestControlIcon({ size = 16, color = '#B91C1C' }: { size?: number; color?: string }) {
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

function DefaultTaskIcon({ size = 16, color = '#166534' }: { size?: number; color?: string }) {
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
  bg: string;
  border: string;
  iconColor: string;
  IconComponent: React.ComponentType<{ size?: number; color?: string }>;
};

const categoryConfig: Record<string, CategoryTheme> = {
  Monitoring: {
    bg: '#E8F5E9',
    border: '#BBF7D0',
    iconColor: '#166534',
    IconComponent: MonitoringIcon,
  },
  'Crop Inspection': {
    bg: '#E8F5E9',
    border: '#BBF7D0',
    iconColor: '#166534',
    IconComponent: MonitoringIcon,
  },
  Irrigation: {
    bg: '#E0F2FE',
    border: '#BAE6FD',
    iconColor: '#0284C7',
    IconComponent: IrrigationIcon,
  },
  Harvesting: {
    bg: '#FEF3C7',
    border: '#FDE68A',
    iconColor: '#B45309',
    IconComponent: HarvestingIcon,
  },
  Planting: {
    bg: '#DCFCE7',
    border: '#BBF7D0',
    iconColor: '#15803D',
    IconComponent: PlantingIcon,
  },
  Fertilizer: {
    bg: '#ECFDF5',
    border: '#A7F3D0',
    iconColor: '#166534',
    IconComponent: FertilizingIcon,
  },
  Fertilizing: {
    bg: '#ECFDF5',
    border: '#A7F3D0',
    iconColor: '#166534',
    IconComponent: FertilizingIcon,
  },
  'Pests & Disease Control': {
    bg: '#FEF2F2',
    border: '#FECACA',
    iconColor: '#B91C1C',
    IconComponent: PestControlIcon,
  },
};

const defaultCategoryTheme: CategoryTheme = {
  bg: '#DCFCE7',
  border: '#BBF7D0',
  iconColor: '#166534',
  IconComponent: DefaultTaskIcon,
};

function formatStartTime(startedAt?: string | null, scheduleStart?: string | null) {
  const timeStr = startedAt || scheduleStart;
  if (!timeStr) return '08:30 AM';
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return '08:30 AM';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '08:30 AM';
  }
}

function formatDuration(startedAt?: string | null, estimatedMinutes?: number | null) {
  if (startedAt) {
    try {
      const diff = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
      const hrs = String(Math.floor(diff / 3600)).padStart(2, '0');
      const mins = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
      const secs = String(diff % 60).padStart(2, '0');
      return `${hrs}:${mins}:${secs} (Elapsed)`;
    } catch {
      // fallback
    }
  }
  if (estimatedMinutes) {
    return `${estimatedMinutes} mins (Est.)`;
  }
  return '01:24:18 (Elapsed)';
}

function getCleanActiveTitle(task: WorkerTaskRecord): string {
  if (task.description) {
    let desc = task.description.trim();
    // Strip " - Field X", " · Field X", " in Field X", " at Field X", " (Field X)", etc.
    desc = desc.replace(/\s*[-–—·]\s*field\s*[a-z0-9]+/i, '').trim();
    desc = desc.replace(/\s+(in|at|on|for)\s+field\s*[a-z0-9]+/i, '').trim();
    desc = desc.replace(/\s*\(field\s*[a-z0-9]+\)/i, '').trim();

    if (desc.toLowerCase().startsWith((task.category || '').toLowerCase())) {
      const remainder = desc.slice(task.category.length).replace(/^[\s\-–—·]+/, '').trim();
      if (!remainder) {
        return task.category;
      }
      return `${task.category} - ${remainder}`;
    }

    if (desc.length > 2) {
      return desc;
    }
  }

  return task.category || 'Farm Task';
}

function ActiveTaskCard({
  onComplete,
  task,
}: {
  onComplete: () => void;
  task: WorkerTaskRecord;
}) {
  const config = categoryConfig[task.category] || defaultCategoryTheme;
  const IconComponent = config.IconComponent;
  const rawField = task.field?.trim() || 'Field';
  const cleanField = rawField.toLowerCase().startsWith('field') ? rawField : `Field ${rawField}`;

  // Task title without trailing Field (e.g. Harvesting, Planting, Irrigation)
  const cleanTitle = getCleanActiveTitle(task);

  return (
    <View style={styles.taskCard}>
      {/* Top Header Row with Active label & Radar Badge (Driver Style) */}
      <View style={styles.cardHeaderRow}>
        <View style={styles.deliveryHeadingWithIcon}>
          <View style={[styles.categoryMiniSquircle, { backgroundColor: config.bg, borderColor: config.border }]}>
            <IconComponent size={16} color={config.iconColor} />
          </View>
          <Text style={styles.activeHeadingText}>Active Task</Text>
        </View>
        <View style={styles.radarPulseBox}>
          <Text style={styles.radarBadgeText}>IN-PROGRESS</Text>
        </View>
      </View>

      {/* Sanitized Task Title */}
      <Text style={styles.taskTitle}>{cleanTitle}</Text>

      {/* Sent back for changes alert box */}
      {task.harvest_rejection_reason ? (
        <View style={styles.rejectionBanner}>
          <View style={styles.rejectionBannerHeader}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <Path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" stroke="#DC2626" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M12 9v4" stroke="#DC2626" strokeWidth={2.5} strokeLinecap="round" />
              <Circle cx={12} cy={17} r={0.75} fill="#DC2626" stroke="#DC2626" />
            </Svg>
            <Text style={styles.rejectionBannerTitle}>Sent back for changes</Text>
          </View>
          <Text style={styles.rejectionBannerText}>{task.harvest_rejection_reason}</Text>
        </View>
      ) : null}

      {/* Structured Details Table (Driver activeDataTable Style - Field Restored) */}
      <View style={styles.activeDataTable}>
        <View style={styles.activeDataRow}>
          <Text style={styles.activeRowKey}>Field:</Text>
          <Text style={styles.activeRowVal}>{cleanField}</Text>
        </View>
        <View style={styles.activeDataRow}>
          <Text style={styles.activeRowKey}>Duration:</Text>
          <Text style={[styles.activeRowVal, styles.activeRowValHighlighted]}>
            {formatDuration(task.started_at, task.estimated_duration_minutes)}
          </Text>
        </View>
        <View style={styles.activeDataRow}>
          <Text style={styles.activeRowKey}>Start time:</Text>
          <Text style={styles.activeRowVal}>
            {formatStartTime(task.started_at, task.schedule_start)}
          </Text>
        </View>
      </View>

      {/* Mark as Completed Action Button (Driver markCompletedBtn Style) */}
      <Pressable
        onPress={onComplete}
        style={({ pressed }) => [
          styles.markCompletedBtn,
          pressed && styles.markCompletedBtnPressed,
        ]}>
        <View style={styles.checkCircleBadge}>
          <Text style={styles.checkCircleIcon}>✓</Text>
        </View>
        <Text style={styles.markCompletedBtnText}>Mark as Completed</Text>
      </Pressable>
    </View>
  );
}

export default function WorkerTaskActiveScreen() {
  const { width } = useWindowDimensions();
  const { loading: authLoading, profile } = useAuth();
  const [tasks, setTasks] = useState<WorkerTaskRecord[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadTasks = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const response = await apiRequest<{ tasks: WorkerTaskRecord[] }>('/api/worker/tasks?status=in_progress');
      setTasks(response.tasks);
      setExpandedId((current) => current ?? response.tasks[0]?.id ?? null);
    } catch (caught) {
      setTasks([]);
      setExpandedId(null);
      setError(caught instanceof Error ? caught.message : 'Could not load active tasks.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (profile) loadTasks(); }, [loadTasks, profile]);

  if (authLoading) return <View style={styles.center}><ActivityIndicator color={GREEN} size="large" /></View>;
  if (!profile) return <Redirect href="/login" />;

  const horizontalPadding = width < 360 ? 14 : 24;
  const filteredTasks = tasks.filter((task) => `${task.category} ${task.field} ${task.description || ''}`.toLowerCase().includes(searchQuery.trim().toLowerCase()));

  return (
    <TaskCompletionBlurTarget>
      <SafeAreaView style={styles.safeArea}>
        <WorkerHeader logoPosition="left" logoSize={48} logoSource={require('@/assets/images/driver-dashboard-emblem.png')} />

        <View style={styles.mainBodyContainer}>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
            refreshControl={<RefreshControl colors={[GREEN]} refreshing={refreshing} onRefresh={() => loadTasks(true)} />}>
            <Text style={styles.pageTitle}>My Tasks</Text>
            <View style={deliveryStyles.deliveryToolbar}><View style={deliveryStyles.deliverySearch}><SearchIcon /><TextInput accessibilityLabel="Search tasks" onChangeText={setSearchQuery} placeholder="Search tasks" placeholderTextColor="#94A3B8" style={deliveryStyles.deliverySearchInput} value={searchQuery} /></View></View>
            <View style={deliveryStyles.deliveryStatusTabs}>{[{ label: 'Pending', route: '/WorkerTaskPending' }, { label: 'Active', route: '/WorkerTaskActive' }, { label: 'Completed', route: '/WorkerTaskCompleted' }].map((tab) => { const active = tab.label === 'Active'; return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} key={tab.label} onPress={() => router.replace(tab.route as any)} style={[deliveryStyles.deliveryStatusTab, active && deliveryStyles.deliveryStatusTabActive]}><Text style={[deliveryStyles.deliveryStatusTabText, active && deliveryStyles.deliveryStatusTabTextActive]}>{tab.label}</Text></Pressable>; })}</View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {loading ? (
              <ActivityIndicator color={GREEN} style={styles.loader} />
            ) : filteredTasks.length ? (
              filteredTasks.map((task) => (
                <ActiveTaskCard
                  key={task.id}
                  onComplete={() => router.push({ pathname: '/WorkerTaskCompletion', params: { taskId: String(task.id), task: JSON.stringify(task) } })}
                  task={task}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyCheck}>✓</Text>
                <Text style={styles.emptyTitle}>No active tasks</Text>
                <Text style={styles.emptyCopy}>Start a pending task to see it here.</Text>
              </View>
            )}
          </ScrollView>
        </View>

        <WorkerBottomNavigation activeTab="tasks" />
      </SafeAreaView>
    </TaskCompletionBlurTarget>
  );
}
