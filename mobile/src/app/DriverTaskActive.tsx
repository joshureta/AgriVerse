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
import { TaskCompletionBlurTarget } from '@/components/task-completion-blur-target';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

type TaskStatus = 'pending' | 'in_progress' | 'completed';
type WorkerTaskRecord = {
  id: number;
  order_id?: number | string;
  category: string;
  field: string;
  priority: 'high' | 'medium' | 'low';
  status: TaskStatus;
  description: string | null;
  receiver_name?: string | null;
  contact_number?: string | null;
  delivery_location?: string | null;
  vehicle_name?: string | null;
};

const GREEN = '#176d34';
const vehicleImage = require('@/assets/images/driver-equipment.png');

function DetailField({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.detailBox}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function FilterTabs() {
  return (
    <View style={styles.filters}>
      <Pressable onPress={() => router.replace('/DriverTaskPending')} style={styles.filterButton}>
        <Text style={styles.filterText}>Pending</Text>
      </Pressable>
      <Pressable accessibilityState={{ selected: true }} style={[styles.filterButton, styles.filterButtonActive]}>
        <Text style={[styles.filterText, styles.filterTextActive]}>Active</Text>
      </Pressable>
      <Pressable onPress={() => router.replace('/DriverTaskCompleted')} style={styles.filterButton}>
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
    <View style={[styles.taskCard, expanded && styles.taskCardExpanded]}>
      <Pressable onPress={onToggle} style={styles.taskSummary}>
        <View style={styles.taskIconCircle}><Image source={vehicleImage} style={styles.taskIcon} /></View>
        <View style={styles.taskTitleArea}>
          <Text style={styles.taskCategory}>{task.category}</Text>
          <Text numberOfLines={1} style={styles.taskDescription}>{task.description || `${task.category} task`}</Text>
        </View>
        <View style={styles.priority}><Text style={styles.priorityText}>{task.priority}</Text></View>
      </Pressable>

      {expanded ? (
        <View style={styles.details}>
          <DetailField label="Order ID" value={task.order_id || task.id} />
          <DetailField label="Receiver Name" value={task.receiver_name || 'Not provided'} />
          <DetailField label="Contact Number" value={task.contact_number || 'Not provided'} />
          <DetailField label="Delivery Location" value={task.delivery_location || task.field || 'Not provided'} />
          <DetailField label="Vehicle Used" value={task.vehicle_name || 'Not provided'} />
          <Pressable onPress={onComplete} style={({ pressed }) => [styles.startButton, pressed && styles.buttonPressed]}>
            <Text style={styles.startButtonText}>Mark as Completed</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function DriverTaskActiveScreen() {
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
    <TaskCompletionBlurTarget>
      <SafeAreaView style={styles.safeArea}>
      <WorkerHeader />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
        refreshControl={<RefreshControl colors={[GREEN]} refreshing={refreshing} onRefresh={() => loadTasks(true)} />}>
        <Text style={styles.sectionTitle}>Today’s Tasks</Text>
        <FilterTabs />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {loading ? (
          <ActivityIndicator color={GREEN} style={styles.loader} />
        ) : tasks.length ? (
          tasks.map((task) => (
            <ActiveTaskCard
              expanded={expandedId === task.id}
              key={task.id}
              onComplete={() => router.push({ pathname: '/DriverTaskCompletion', params: { taskId: String(task.id) } })}
              onToggle={() => setExpandedId((current) => current === task.id ? null : task.id)}
              task={task}
            />
          ))
        ) : (
          <View style={styles.emptyBox}><Text style={styles.emptyIcon}>✓</Text><Text style={styles.emptyTitle}>No active tasks</Text><Text style={styles.emptyText}>Start a pending task to see it here.</Text></View>
        )}
      </ScrollView>
      <WorkerBottomNavigation activeTab="tasks" />
      </SafeAreaView>
    </TaskCompletionBlurTarget>
  );
}
