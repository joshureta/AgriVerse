import { styles } from '@/styles/driver-task-pending.styles';
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
const vehicleImage = require('@/assets/images/driver-equipment.png');

function CompletedIcon() {
  return <View style={styles.completedIcon}><Text style={styles.completedCheck}>✓</Text></View>;
}

function CompletedTaskCard({ task }: { task: WorkerTaskRecord }) {
  return (
    <View style={styles.taskCard}>
      <View style={styles.taskSummary}>
        <View style={styles.taskIconCircle}><Image source={vehicleImage} style={styles.taskIcon} /></View>
        <View style={styles.taskTitleArea}>
          <Text style={styles.taskCategory}>{task.category}</Text>
          <Text numberOfLines={1} style={styles.taskDescription}>{task.description || `${task.category} task`}</Text>
        </View>
        <CompletedIcon />
      </View>
    </View>
  );
}

export default function DriverTaskCompletedScreen() {
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
        <Text style={styles.sectionTitle}>Today’s Tasks</Text>
        <View style={styles.filters}>
          <Pressable onPress={() => router.replace('/DriverTaskPending')} style={styles.filterButton}><Text style={[styles.filterText, styles.completedFilterText]}>Pending</Text></Pressable>
          <Pressable onPress={() => router.replace('/DriverTaskActive')} style={styles.filterButton}><Text style={[styles.filterText, styles.completedFilterText]}>Active</Text></Pressable>
          <Pressable accessibilityState={{ selected: true }} style={[styles.filterButton, styles.filterButtonActive]}><Text style={[styles.filterText, styles.filterTextActive]}>Completed</Text></Pressable>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {loading ? (
          <ActivityIndicator color={GREEN} style={styles.loader} />
        ) : tasks.length ? (
          tasks.map((task) => <CompletedTaskCard key={task.id} task={task} />)
        ) : (
          <View style={styles.emptyBox}><CompletedIcon /><Text style={styles.emptyTitle}>No completed tasks</Text><Text style={styles.emptyText}>Completed work will appear here.</Text></View>
        )}
      </ScrollView>
      <WorkerBottomNavigation activeTab="tasks" />
    </SafeAreaView>
  );
}
