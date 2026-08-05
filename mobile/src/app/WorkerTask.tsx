import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/context/auth-context';
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

function getWeekDays() {
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + index);
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3),
      date: date.getDate(),
      active: date.toDateString() === today.toDateString(),
    };
  });
}

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

export default function WorkerTask() {
  const { loading: authLoading, profile, signOut } = useAuth();
  const [tasks, setTasks] = useState<WorkerTaskRecord[]>([]);
  const [filter, setFilter] = useState<TaskStatus>('pending');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const weekDays = useMemo(getWeekDays, []);
  const today = useMemo(() => new Date(), []);

  const loadTasks = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const result = await apiRequest<{ tasks: WorkerTaskRecord[] }>('/api/worker/tasks');
      setTasks(result.tasks);
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
      setTasks((current) => current.map((item) => (item.id === task.id ? result.task : item)));
      setFilter(status);
      setExpandedId(task.id);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.fullDate}>
          {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
        <Text style={styles.month}>{today.toLocaleDateString('en-US', { month: 'long' })}</Text>
        <View style={styles.calendarRow}>
          {weekDays.map((item) => (
            <View key={`${item.day}-${item.date}`} style={styles.calendarDay}>
              <Text style={styles.dayName}>{item.day}</Text>
              <View style={[styles.dayCircle, item.active && styles.dayCircleActive]}>
                <Text style={[styles.dayNumber, item.active && styles.dayNumberActive]}>{item.date}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl colors={['#237c31']} onRefresh={() => loadTasks(true)} refreshing={refreshing} />}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.sectionTitle}>Today&apos;s Tasks</Text>
            <Text style={styles.welcome}>Assigned to {profile.full_name}</Text>
          </View>
          <Pressable onPress={logout}><Text style={styles.signOut}>Sign out</Text></Pressable>
        </View>

        <View style={styles.filters}>
          {filters.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setFilter(item.value)}
              style={[styles.filterButton, filter === item.value && styles.filterButtonActive]}>
              <Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>{item.label}</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{tasks.filter((task) => task.status === item.value).length}</Text>
              </View>
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

      <View style={styles.bottomNav}>
        <View style={styles.navItem}><Text style={styles.navIcon}>⌂</Text><Text style={styles.navLabel}>Home</Text></View>
        <View style={[styles.navItem, styles.navItemActive]}><Text style={styles.navIconActive}>▣</Text><Text style={styles.navLabelActive}>Tasks</Text></View>
        <View style={styles.navItem}><Text style={styles.navIcon}>♙</Text><Text style={styles.navLabel}>Profile</Text></View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8faef' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8faef' },
  header: { backgroundColor: '#358b32', paddingTop: 10, paddingHorizontal: 16, paddingBottom: 14 },
  fullDate: { color: '#d9efd4', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  month: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center', marginTop: 5, marginBottom: 10 },
  calendarRow: { flexDirection: 'row', justifyContent: 'space-between' },
  calendarDay: { alignItems: 'center', width: 40 },
  dayName: { color: '#e8f6e5', fontSize: 10, fontWeight: '700', marginBottom: 4 },
  dayCircle: { width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayCircleActive: { backgroundColor: '#9ac73d' },
  dayNumber: { color: '#fff', fontSize: 14, fontWeight: '800' },
  dayNumberActive: { color: '#fff' },
  content: { padding: 15, paddingBottom: 28, flexGrow: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  sectionTitle: { color: '#1b642f', fontSize: 22, fontWeight: '900' },
  welcome: { color: '#758173', fontSize: 12, marginTop: 2 },
  signOut: { color: '#247637', fontSize: 12, fontWeight: '800', paddingVertical: 6 },
  filters: { flexDirection: 'row', gap: 7, marginTop: 14, marginBottom: 13 },
  filterButton: {
    minHeight: 32,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dfe8da',
  },
  filterButtonActive: { backgroundColor: '#2f8335', borderColor: '#2f8335' },
  filterText: { color: '#58705c', fontSize: 10, fontWeight: '800' },
  filterTextActive: { color: '#fff' },
  countBadge: { minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: '#edf3e9', alignItems: 'center', justifyContent: 'center' },
  countText: { color: '#296e34', fontSize: 9, fontWeight: '900' },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 13,
    marginBottom: 10,
    shadowColor: '#314e2e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  taskCardExpanded: { backgroundColor: '#eef6df' },
  taskSummary: { minHeight: 63, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 9 },
  taskIconCircle: { width: 39, height: 39, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#d5e4ce' },
  taskIcon: { fontSize: 21 },
  taskTitleArea: { flex: 1, paddingHorizontal: 10 },
  taskCategory: { color: '#417743', fontSize: 10, fontWeight: '800' },
  taskDescription: { color: '#1b241d', fontSize: 14, fontWeight: '600', marginTop: 2 },
  priority: { borderRadius: 11, paddingHorizontal: 10, paddingVertical: 4 },
  priority_high: { backgroundColor: '#f5e9e1' },
  priority_medium: { backgroundColor: '#edf4e5' },
  priority_low: { backgroundColor: '#e8f0f6' },
  priorityText: { color: '#54705a', fontSize: 9, fontWeight: '800', textTransform: 'capitalize' },
  details: { paddingHorizontal: 11, paddingBottom: 12 },
  detailBox: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e1e9dc', padding: 11, marginBottom: 7, borderRadius: 7 },
  detailLabel: { color: '#4c8050', fontSize: 9, fontWeight: '900', marginBottom: 6 },
  detailValue: { color: '#202a22', fontSize: 13, lineHeight: 18 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 3, marginBottom: 10 },
  metaText: { color: '#718070', fontSize: 11, fontWeight: '600' },
  startButton: { height: 39, width: 132, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: '#237d35', borderRadius: 6 },
  startButtonText: { color: '#fff', fontSize: 11, fontWeight: '900' },
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
  bottomNav: { height: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#dfe7dc', paddingHorizontal: 35 },
  navItem: { width: 63, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  navItemActive: { backgroundColor: '#d8edbd' },
  navIcon: { color: '#2f8949', fontSize: 27, lineHeight: 29 },
  navIconActive: { color: '#2d8945', fontSize: 26, lineHeight: 28 },
  navLabel: { color: '#66806b', fontSize: 9, fontWeight: '700' },
  navLabelActive: { color: '#216c37', fontSize: 9, fontWeight: '900' },
});
