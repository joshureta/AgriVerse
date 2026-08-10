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

type WorkerTaskRecord = {
  id: number;
  category: string;
  field: string;
  status: 'pending' | 'in_progress' | 'completed';
  description: string | null;
  completed_at: string | null;
  completion_notes: string | null;
};

const GREEN = '#176d34';
const taskIcons: Record<string, string> = {
  Harvesting: '🚜',
  Fertilizing: '🌿',
  Fertilizer: '🌿',
  Irrigation: '🌧️',
  Planting: '🌱',
  'Pests & Disease Control': '🔎',
};

function CompletedIcon() {
  return <View style={styles.completedIcon}><Text style={styles.completedCheck}>✓</Text></View>;
}

function CompletedTaskCard({ task }: { task: WorkerTaskRecord }) {
  return (
    <View style={styles.taskCard}>
      <View style={styles.taskIconBox}><Text style={styles.taskIcon}>{taskIcons[task.category] || '🌾'}</Text></View>
      <View style={styles.taskCopy}>
        <Text style={styles.taskCategory}>{task.category}</Text>
        <Text numberOfLines={1} style={styles.taskDescription}>{task.description || `${task.category} task`}</Text>
      </View>
      <CompletedIcon />
    </View>
  );
}

export default function WorkerTaskCompletedScreen() {
  const { width } = useWindowDimensions();
  const { loading: authLoading, profile } = useAuth();
  const [tasks, setTasks] = useState<WorkerTaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadTasks = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const response = await apiRequest<{ tasks: WorkerTaskRecord[] }>('/api/worker/tasks?status=completed');
      setTasks(response.tasks);
    } catch (caught) {
      setTasks([]);
      setError(caught instanceof Error ? caught.message : 'Could not load completed tasks.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (profile) loadTasks(); }, [loadTasks, profile]);

  if (authLoading) return <View style={styles.center}><ActivityIndicator color={GREEN} size="large" /></View>;
  if (!profile) return <Redirect href="/login" />;

  const horizontalPadding = width < 360 ? 14 : 23;

  return (
    <SafeAreaView style={styles.safeArea}>
      <WorkerHeader />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
        refreshControl={<RefreshControl colors={[GREEN]} refreshing={refreshing} onRefresh={() => loadTasks(true)} />}>
        <Text style={styles.pageTitle}>Today’s Tasks</Text>
        <View style={styles.filters}>
          <Pressable onPress={() => router.replace('/WorkerTaskPending')} style={styles.filterButton}><Text style={styles.filterText}>Pending</Text></Pressable>
          <Pressable onPress={() => router.replace('/WorkerTaskActive')} style={styles.filterButton}><Text style={styles.filterText}>Active</Text></Pressable>
          <Pressable accessibilityState={{ selected: true }} style={[styles.filterButton, styles.filterButtonActive]}><Text style={[styles.filterText, styles.filterTextActive]}>Completed</Text></Pressable>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {loading ? (
          <ActivityIndicator color={GREEN} style={styles.loader} />
        ) : tasks.length ? (
          tasks.map((task) => <CompletedTaskCard key={task.id} task={task} />)
        ) : (
          <View style={styles.emptyState}><CompletedIcon /><Text style={styles.emptyTitle}>No completed tasks</Text><Text style={styles.emptyCopy}>Completed work will appear here.</Text></View>
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
  filters: { flexDirection: 'row', gap: 8, marginBottom: 29 },
  filterButton: { flex: 1, height: 25, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#d7dadd', elevation: 4, shadowColor: '#777', shadowOffset: { width: 0, height: 4 }, shadowOpacity: .17, shadowRadius: 6 },
  filterButtonActive: { backgroundColor: '#207b3c', borderColor: '#207b3c' },
  filterText: { color: '#1d1d1d', fontSize: 10, fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  errorText: { color: '#a83d36', fontSize: 11, marginBottom: 10 },
  loader: { marginTop: 50 },
  taskCard: { height: 61, borderRadius: 8, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 17, borderWidth: 1, borderColor: '#d8dadd', elevation: 4, shadowColor: '#777', shadowOffset: { width: 0, height: 5 }, shadowOpacity: .16, shadowRadius: 7 },
  taskIconBox: { width: 43, height: 43, backgroundColor: '#f1f5ee', alignItems: 'center', justifyContent: 'center' },
  taskIcon: { fontSize: 27 },
  taskCopy: { flex: 1, paddingHorizontal: 16 },
  taskCategory: { color: '#176b32', fontSize: 10, fontWeight: '700', marginBottom: 6 },
  taskDescription: { color: '#222', fontSize: 16 },
  completedIcon: { width: 18, height: 18, borderRadius: 10, backgroundColor: '#68c20c', alignItems: 'center', justifyContent: 'center' },
  completedCheck: { color: '#fff', fontSize: 13, lineHeight: 16, fontWeight: '900' },
  emptyState: { alignItems: 'center', paddingVertical: 65 },
  emptyTitle: { color: '#26643a', fontSize: 17, fontWeight: '800', marginTop: 12 },
  emptyCopy: { color: '#849086', fontSize: 12, marginTop: 6 },
});
