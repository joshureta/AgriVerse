import { styles } from '@/styles/worker-task-pending.styles';
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { WorkerTaskSegmentedTabs } from '@/components/worker-task-segmented-tabs';
import { apiRequest } from '@/lib/api';
import { canWorkCropTaskNow, CROP_WORK_HOURS_LABEL } from '@/lib/crop-work-hours';

type TaskStatus = 'pending' | 'in_progress' | 'completed';
type WorkerTaskRecord = {
  id: number;
  category: string;
  field: string;
  priority: 'high' | 'medium' | 'low';
  status: TaskStatus;
  schedule_start: string;
  estimated_duration_minutes: number;
  description: string | null;
};
type TaskSummary = { pending: number; active: number; completed: number; total: number };

const filters: { label: string; value: TaskStatus }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Active', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
];

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

function TaskCard({
  task,
  expanded,
  busy,
  workAllowed,
  onExpand,
  onStatusChange,
}: {
  task: WorkerTaskRecord;
  expanded: boolean;
  busy: boolean;
  workAllowed: boolean;
  onExpand: () => void;
  onStatusChange: (status: TaskStatus) => void;
}) {
  const nextStatus = task.status === 'pending' ? 'in_progress' : 'completed';
  const priorityKey = task.priority || 'medium';
  const theme = categoryThemes[task.category] || { icon: '🌾', bg: '#F1F5F9', color: '#475569' };
  const duration = task.estimated_duration_minutes || 45;

  return (
    <View style={[styles.taskCard, expanded && styles.taskCardExpanded]}>
      {/* Top Header Row */}
      <Pressable onPress={onExpand} style={styles.cardHeaderRow}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.categorySquircle, { backgroundColor: theme.bg }]}>
            <Text style={styles.categoryIconText}>{theme.icon}</Text>
          </View>
          <View style={[styles.priorityPill, styles[`priority_${priorityKey}`]]}>
            <Text style={[styles.priorityText, styles[`priorityText_${priorityKey}`]]}>
              {formatPriorityLabel(task.priority)}
            </Text>
          </View>
        </View>

        <View style={styles.cardHeaderRight}>
          <View style={styles.durationRow}>
            <Text style={styles.durationClock}>🕒</Text>
            <Text style={styles.durationText}>{duration} min</Text>
          </View>
          <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </Pressable>

      {/* Title */}
      <Pressable onPress={onExpand}>
        <Text style={styles.taskTitle}>
          {task.category} - {task.description || `Task in ${task.field}`}
        </Text>
      </Pressable>

      {/* Expandable Details */}
      {expanded ? (
        <View style={styles.detailsSection}>
          <View style={styles.detailGrid}>
            <View style={styles.detailBoxSmall}>
              <Text style={styles.detailLabel}>FIELD LOCATION</Text>
              <Text style={styles.detailValue}>{task.field}</Text>
            </View>
            <View style={styles.detailBoxSmall}>
              <Text style={styles.detailLabel}>SCHEDULED TIME</Text>
              <Text style={styles.detailValue}>
                {new Date(task.schedule_start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </Text>
            </View>
          </View>

          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>TASK INSTRUCTIONS</Text>
            <Text style={styles.detailValue}>{task.description || 'Follow standard operating procedure for this sector.'}</Text>
          </View>
        </View>
      ) : null}

      {/* Start Task Action CTA */}
      {task.status !== 'completed' ? (
        <Pressable
          disabled={busy || !workAllowed}
          onPress={() => onStatusChange(nextStatus)}
          style={({ pressed }) => [styles.startButton, (pressed || busy || !workAllowed) && styles.startButtonPressed]}>
          {busy ? (
            <ActivityIndicator color="#176D34" size="small" />
          ) : workAllowed ? (
            <Text style={styles.startButtonText}>Start Task</Text>
          ) : (
            <Text style={[styles.startButtonText, styles.startButtonTextWrap]}>{CROP_WORK_HOURS_LABEL}</Text>
          )}
        </Pressable>
      ) : (
        <View style={styles.completedBanner}>
          <Text style={styles.completedText}>✓ Task completed</Text>
        </View>
      )}
    </View>
  );
}

export default function WorkerTaskPending() {
  const { width } = useWindowDimensions();
  const { loading: authLoading, profile } = useAuth();
  const [tasks, setTasks] = useState<WorkerTaskRecord[]>([]);
  const [summary, setSummary] = useState<TaskSummary>({ pending: 0, active: 0, completed: 0, total: 0 });
  const [filter, setFilter] = useState<TaskStatus>('pending');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadTasks = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const result = await apiRequest<{ tasks: WorkerTaskRecord[]; summary: TaskSummary }>('/api/worker/tasks?status=pending');
      setTasks(result.tasks);
      setSummary(result.summary);
      setExpandedId((current) => current ?? result.tasks[0]?.id ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load assigned tasks.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (profile) loadTasks();
  }, [loadTasks, profile]);

  const visibleTasks = tasks.filter((task) => task.status === filter);
  const workAllowed = canWorkCropTaskNow();

  async function updateTaskStatus(task: WorkerTaskRecord, status: TaskStatus) {
    setBusyId(task.id);
    setError('');
    try {
      const result = await apiRequest<{ task: WorkerTaskRecord }>(`/api/worker/tasks/${task.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setTasks((current) => current.filter((item) => item.id !== task.id));
      setSummary((current) => ({ ...current, pending: Math.max(0, current.pending - 1), active: current.active + 1 }));
      if (result.task.status === 'in_progress') router.replace('/WorkerTaskActive');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update this task.');
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading) {
    return <View style={styles.center}><ActivityIndicator color="#237c31" size="large" /></View>;
  }
  if (!profile) return <Redirect href="/login" />;
  const horizontalPadding = width < 360 ? 14 : 18;

  return (
    <SafeAreaView style={styles.safeArea}>
      <WorkerHeader />

      <View style={styles.mainBodyContainer}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
          refreshControl={<RefreshControl colors={['#237c31']} onRefresh={() => loadTasks(true)} refreshing={refreshing} />}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.sectionTitle}>Today&apos;s Tasks</Text>
            </View>
          </View>

          <WorkerTaskSegmentedTabs
            activeTab={filter}
            onTabChange={(tabValue, route) => {
              if (tabValue === 'pending') {
                setFilter('pending');
              } else {
                router.replace(route as any);
              }
            }}
          />

          {error ? <Pressable onPress={() => loadTasks()} style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Text style={styles.retry}>Tap to retry</Text></Pressable> : null}

          {loading ? (
            <View style={styles.loadingBox}><ActivityIndicator color="#237c31" /><Text style={styles.loadingText}>Loading assigned tasks...</Text></View>
          ) : visibleTasks.length ? (
            visibleTasks.map((task) => (
              <TaskCard
                busy={busyId === task.id}
                expanded={expandedId === task.id}
                key={task.id}
                onExpand={() => setExpandedId((current) => (current === task.id ? null : task.id))}
                onStatusChange={(status) => updateTaskStatus(task, status)}
                task={task}
                workAllowed={workAllowed}
              />
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>✓</Text>
              <Text style={styles.emptyTitle}>No {filters.find((item) => item.value === filter)?.label.toLowerCase()} tasks</Text>
              <Text style={styles.emptyText}>Pull down to check for newly assigned work.</Text>
            </View>
          )}
        </ScrollView>
      </View>

      <WorkerBottomNavigation activeTab="tasks" />
    </SafeAreaView>
  );
}
