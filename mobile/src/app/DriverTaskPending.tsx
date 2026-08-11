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

import { useAuth } from '@/context/auth-context';
import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
import { apiRequest } from '@/lib/api';

type TaskStatus = 'pending' | 'in_progress' | 'completed';
type WorkerTaskRecord = {
  id: number;
  order_id?: number | string;
  category: string;
  field: string;
  priority: 'high' | 'medium' | 'low';
  status: TaskStatus;
  schedule_start: string;
  estimated_duration_minutes: number;
  description: string | null;
  receiver_name?: string | null;
  contact_number?: string | null;
  delivery_location?: string | null;
  vehicle_name?: string | null;
};
type TaskSummary = { pending: number; active: number; completed: number; total: number };

const filters: { label: string; value: TaskStatus }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Active', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
];

const vehicleImage = require('@/assets/images/driver-equipment.png');

function DetailField({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.detailBox}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function VehicleField({ value }: { value?: string | null }) {
  return (
    <View style={[styles.detailBox, styles.vehicleField]}>
      <Text style={styles.detailLabel}>Select Vehicle</Text>
      <View style={styles.vehicleSelect}>
        <Text numberOfLines={1} style={styles.vehicleValue}>{value || ''}</Text>
        <View style={styles.chevron} />
      </View>
    </View>
  );
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
          <Image source={vehicleImage} style={styles.taskIcon} />
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
          <DetailField label="Order ID" value={task.order_id || task.id} />
          <DetailField label="Receiver Name" value={task.receiver_name || 'Not provided'} />
          <DetailField label="Contact Number" value={task.contact_number || 'Not provided'} />
          <DetailField label="Delivery Location" value={task.delivery_location || task.field || 'Not provided'} />
          <VehicleField value={task.vehicle_name} />
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

export default function DriverTaskPending() {
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
      if (result.task.status === 'in_progress') router.replace('/DriverTaskActive');
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
                if (item.value === 'in_progress') router.push('/DriverTaskActive');
                else if (item.value === 'completed') router.push('/DriverTaskCompleted');
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
