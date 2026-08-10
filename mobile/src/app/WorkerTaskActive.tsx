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

import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

type TaskStatus = 'pending' | 'in_progress' | 'completed';
type WorkerTaskRecord = {
  id: number;
  category: string;
  field: string;
  priority: 'high' | 'medium' | 'low';
  status: TaskStatus;
  description: string | null;
};

const GREEN = '#176d34';
const taskIcons: Record<string, string> = {
  Planting: '🌱',
  Fertilizing: '🌿',
  Fertilizer: '🌿',
  'Pests & Disease Control': '🔎',
  'Crop Inspection': '🔎',
  Irrigation: '💧',
  Harvesting: '🍍',
};

function FilterTabs() {
  return (
    <View style={styles.filters}>
      <Pressable onPress={() => router.replace('/WorkerTaskPending')} style={styles.filterButton}>
        <Text style={styles.filterText}>Pending</Text>
      </Pressable>
      <Pressable accessibilityState={{ selected: true }} style={[styles.filterButton, styles.filterButtonActive]}>
        <Text style={[styles.filterText, styles.filterTextActive]}>Active</Text>
      </Pressable>
      <Pressable onPress={() => router.replace('/WorkerTaskCompleted')} style={styles.filterButton}>
        <Text style={styles.filterText}>Completed</Text>
      </Pressable>
    </View>
  );
}

function ActiveTaskCard({
  expanded,
  onComplete,
  onToggle,
  task,
}: {
  expanded: boolean;
  onComplete: () => void;
  onToggle: () => void;
  task: WorkerTaskRecord;
}) {
  return (
    <View style={[styles.taskShell, expanded && styles.taskShellExpanded]}>
      <Pressable onPress={onToggle} style={styles.taskSummary}>
        <View style={styles.taskIconBox}><Text style={styles.taskIcon}>{taskIcons[task.category] || '🌾'}</Text></View>
        <View style={styles.taskTitleArea}>
          <Text style={styles.taskCategory}>{task.category}</Text>
          <Text numberOfLines={1} style={styles.taskDescription}>{task.description || `${task.category} task`}</Text>
        </View>
        <View style={styles.priorityPill}><Text style={styles.priorityText}>{task.priority}</Text></View>
      </Pressable>

      {expanded ? (
        <View style={styles.expandedCard}>
          <View style={styles.fieldBox}>
            <Text style={styles.detailLabel}>Field</Text>
            <Text style={styles.fieldValue}>{task.field}</Text>
          </View>
          <View style={styles.descriptionBox}>
            <Text style={styles.detailLabel}>Description</Text>
            <Text style={styles.detailDescription}>{task.description || 'No description provided.'}</Text>
          </View>
          <Pressable onPress={onComplete} style={({ pressed }) => [styles.completeButton, pressed && styles.buttonPressed]}>
            <Text style={styles.completeButtonText}>Mark as Completed</Text>
          </Pressable>
        </View>
      ) : null}
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <WorkerHeader />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
        refreshControl={<RefreshControl colors={[GREEN]} refreshing={refreshing} onRefresh={() => loadTasks(true)} />}>
        <Text style={styles.pageTitle}>Today’s Tasks</Text>
        <FilterTabs />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {loading ? (
          <ActivityIndicator color={GREEN} style={styles.loader} />
        ) : tasks.length ? (
          tasks.map((task) => (
            <ActiveTaskCard
              expanded={expandedId === task.id}
              key={task.id}
              onComplete={() => router.push({ pathname: '/WorkerTaskCompletion', params: { taskId: String(task.id) } })}
              onToggle={() => setExpandedId((current) => current === task.id ? null : task.id)}
              task={task}
            />
          ))
        ) : (
          <View style={styles.emptyState}><Text style={styles.emptyCheck}>✓</Text><Text style={styles.emptyTitle}>No active tasks</Text><Text style={styles.emptyCopy}>Start a pending task to see it here.</Text></View>
        )}
      </ScrollView>
      <WorkerBottomNavigation activeTab="tasks" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fbfbf4' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fbfbf4' },
  content: { paddingTop: 17, paddingBottom: 105, flexGrow: 1 },
  pageTitle: { color: '#176b32', fontSize: 28, lineHeight: 36, fontWeight: '800', marginBottom: 19 },
  filters: { flexDirection: 'row', gap: 8, marginHorizontal: 0, marginBottom: 24 },
  filterButton: { flex: 1, height: 25, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#d7dadd', elevation: 4, shadowColor: '#777', shadowOffset: { width: 0, height: 4 }, shadowOpacity: .17, shadowRadius: 6 },
  filterButtonActive: { backgroundColor: '#207b3c', borderColor: '#207b3c' },
  filterText: { color: '#24713a', fontSize: 10, fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  errorText: { color: '#a83d36', fontSize: 11, marginBottom: 10 },
  loader: { marginTop: 50 },
  taskShell: { backgroundColor: '#fff', borderRadius: 8, marginBottom: 18, borderWidth: 1, borderColor: '#d8dbde', elevation: 4, shadowColor: '#777', shadowOffset: { width: 0, height: 5 }, shadowOpacity: .16, shadowRadius: 7, overflow: 'hidden' },
  taskShellExpanded: { backgroundColor: '#eaf4d9', borderColor: '#eaf4d9', padding: 11 },
  taskSummary: { height: 59, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  taskIconBox: { width: 43, height: 43, backgroundColor: '#f1f5ee', alignItems: 'center', justifyContent: 'center' },
  taskIcon: { fontSize: 27 },
  taskTitleArea: { flex: 1, paddingHorizontal: 12 },
  taskCategory: { color: '#176b32', fontSize: 10, fontWeight: '700', marginBottom: 5 },
  taskDescription: { color: '#232323', fontSize: 16 },
  priorityPill: { width: 68, height: 25, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8dadd', alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#777', shadowOffset: { width: 0, height: 3 }, shadowOpacity: .16, shadowRadius: 5 },
  priorityText: { color: '#25713c', textTransform: 'capitalize', fontSize: 10, fontWeight: '700' },
  expandedCard: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d8dadd', padding: 15, paddingBottom: 12 },
  fieldBox: { minHeight: 67, borderWidth: 1, borderColor: '#ececec', paddingHorizontal: 28, paddingVertical: 11 },
  descriptionBox: { minHeight: 97, borderWidth: 1, borderColor: '#e7e7e7', borderRadius: 8, paddingHorizontal: 28, paddingVertical: 10, marginTop: 8 },
  detailLabel: { color: '#176b32', fontSize: 9, fontWeight: '700', marginBottom: 10 },
  fieldValue: { color: '#151515', fontSize: 16, fontWeight: '600' },
  detailDescription: { color: '#202020', fontSize: 16 },
  completeButton: { minWidth: 132, height: 29, backgroundColor: '#237b3d', borderRadius: 5, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 14, paddingHorizontal: 18, elevation: 4, shadowColor: '#555', shadowOffset: { width: 0, height: 3 }, shadowOpacity: .28, shadowRadius: 4 },
  completeButtonText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  buttonPressed: { opacity: .75 },
  emptyState: { alignItems: 'center', paddingVertical: 65 },
  emptyCheck: { color: '#72a83c', fontSize: 38, fontWeight: '800' },
  emptyTitle: { color: '#26643a', fontSize: 17, fontWeight: '800', marginTop: 10 },
  emptyCopy: { color: '#849086', fontSize: 12, marginTop: 6 },
});
