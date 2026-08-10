import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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

const categoryIcons: Record<string, string> = {
  Planting: '🌱',
  Irrigation: '💧',
  Fertilizer: '🌿',
  'Crop Inspection': '🔎',
  Harvesting: '🍍',
};

function TaskCard({
  task,
  expanded,
  busy,
  onExpand,
  onStatusChange,
}: {
  task: WorkerTaskRecord;
  expanded: boolean;
  busy: boolean;
  onExpand: () => void;
  onStatusChange: (status: TaskStatus) => void;
}) {
  const nextStatus = task.status === 'pending' ? 'in_progress' : 'completed';
  const actionLabel = task.status === 'pending' ? 'Start Task' : 'Complete Task';

  return (
    <View style={[styles.taskCard, expanded && styles.taskCardExpanded]}>
      <Pressable onPress={onExpand} style={styles.taskSummary}>
        <View style={styles.taskIconCircle}>
          <Text style={styles.taskIcon}>{categoryIcons[task.category] || '✓'}</Text>
        </View>
        <View style={styles.taskTitleArea}>
          <Text style={styles.taskCategory}>{task.category}</Text>
          <Text numberOfLines={1} style={styles.taskDescription}>
            {task.description || `${task.category} task in ${task.field}.`}
          </Text>
        </View>
        <View style={[styles.priority, styles[`priority_${task.priority}`]]}>
          <Text style={styles.priorityText}>{task.priority}</Text>
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.details}>
          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>FIELD</Text>
            <Text style={styles.detailValue}>{task.field}</Text>
          </View>
          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>DESCRIPTION</Text>
            <Text style={styles.detailValue}>{task.description || 'No additional description provided.'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              {new Date(task.schedule_start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </Text>
            <Text style={styles.metaText}>{task.estimated_duration_minutes} min</Text>
          </View>
          {task.status !== 'completed' ? (
            <Pressable disabled={busy} onPress={() => onStatusChange(nextStatus)} style={styles.startButton}>
              {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.startButtonText}>{actionLabel}</Text>}
            </Pressable>
          ) : (
            <View style={styles.completedBanner}>
              <Text style={styles.completedText}>✓ Task completed</Text>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

export default function WorkerTaskPending() {
  const { width } = useWindowDimensions();
  const { loading: authLoading, profile, signOut } = useAuth();
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

  async function logout() {
    await signOut();
    router.replace('/login');
  }

  if (authLoading) {
    return <View style={styles.center}><ActivityIndicator color="#237c31" size="large" /></View>;
  }
  if (!profile) return <Redirect href="/login" />;
  const horizontalPadding = width < 360 ? 14 : 22;

  return (
    <SafeAreaView style={styles.safeArea}>
      <WorkerHeader />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
        refreshControl={<RefreshControl colors={['#237c31']} onRefresh={() => loadTasks(true)} refreshing={refreshing} />}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.sectionTitle}>Today&apos;s Tasks</Text>
          </View>
          <Pressable onPress={logout}><Text style={styles.signOut}>Sign out</Text></Pressable>
        </View>

        <View style={styles.filters}>
          {filters.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => {
                if (item.value === 'in_progress') router.push('/WorkerTaskActive');
                else if (item.value === 'completed') router.push('/WorkerTaskCompleted');
                else setFilter(item.value);
              }}
              style={[styles.filterButton, filter === item.value && styles.filterButtonActive]}>
              <Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

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

      <WorkerBottomNavigation activeTab="tasks" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8faef' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8faef' },
  content: { paddingTop: 17, paddingBottom: 105, flexGrow: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  sectionTitle: { color: '#176b32', fontSize: 28, lineHeight: 36, fontWeight: '800' },
  signOut: { color: '#247637', fontSize: 11, fontWeight: '800', paddingVertical: 8 },
  filters: { flexDirection: 'row', gap: 8, marginTop: 19, marginBottom: 24 },
  filterButton: {
    flex: 1,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d7dadd',
    elevation: 4,
    shadowColor: '#777',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: .17,
    shadowRadius: 6,
  },
  filterButtonActive: { backgroundColor: '#207b3c', borderColor: '#207b3c' },
  filterText: { color: '#24713a', fontSize: 10, fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#d8dbde',
    shadowColor: '#777',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: .16,
    shadowRadius: 7,
    elevation: 4,
    overflow: 'hidden',
  },
  taskCardExpanded: { backgroundColor: '#eaf4d9', borderColor: '#eaf4d9', padding: 11 },
  taskSummary: { minHeight: 59, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  taskIconCircle: { width: 43, height: 43, backgroundColor: '#f1f5ee', alignItems: 'center', justifyContent: 'center' },
  taskIcon: { fontSize: 27 },
  taskTitleArea: { flex: 1, paddingHorizontal: 12 },
  taskCategory: { color: '#176b32', fontSize: 10, fontWeight: '700', marginBottom: 5 },
  taskDescription: { color: '#232323', fontSize: 16 },
  priority: { width: 68, height: 25, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8dadd', alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#777', shadowOffset: { width: 0, height: 3 }, shadowOpacity: .16, shadowRadius: 5 },
  priority_high: { backgroundColor: '#fff' },
  priority_medium: { backgroundColor: '#fff' },
  priority_low: { backgroundColor: '#fff' },
  priorityText: { color: '#25713c', fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  details: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d8dadd', padding: 15, paddingBottom: 12 },
  detailBox: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e7e7e7', paddingHorizontal: 28, paddingVertical: 11, marginBottom: 8, borderRadius: 8, minHeight: 67 },
  detailLabel: { color: '#176b32', fontSize: 9, fontWeight: '700', marginBottom: 10 },
  detailValue: { color: '#202020', fontSize: 16, lineHeight: 20 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 3, marginBottom: 10 },
  metaText: { color: '#718070', fontSize: 11, fontWeight: '600' },
  startButton: { height: 29, minWidth: 132, paddingHorizontal: 18, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: '#237b3d', borderRadius: 5, elevation: 4, shadowColor: '#555', shadowOffset: { width: 0, height: 3 }, shadowOpacity: .28, shadowRadius: 4 },
  startButtonText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  completedBanner: { alignSelf: 'center', backgroundColor: '#dcefd5', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 7 },
  completedText: { color: '#23733a', fontSize: 11, fontWeight: '800' },
  errorBox: { backgroundColor: '#fff0ef', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#f0ceca' },
  errorText: { color: '#ad2d2d', fontSize: 12, lineHeight: 17 },
  retry: { color: '#7b2727', fontSize: 11, fontWeight: '800', marginTop: 4 },
  loadingBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, gap: 10 },
  loadingText: { color: '#6a796c', fontSize: 12 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, paddingHorizontal: 20 },
  emptyIcon: { color: '#77a33d', fontSize: 34, fontWeight: '900' },
  emptyTitle: { color: '#2b5d36', fontSize: 16, fontWeight: '800', marginTop: 8 },
  emptyText: { color: '#7b887c', fontSize: 12, textAlign: 'center', marginTop: 5 },
});
