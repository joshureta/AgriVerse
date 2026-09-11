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
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useAuth } from '@/context/auth-context';
import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
import { apiRequest } from '@/lib/api';
import { canWorkCropTaskNow, CROP_WORK_HOURS_LABEL } from '@/lib/crop-work-hours';
import { styles as deliveryStyles } from '@/styles/driver-task-pending.styles';

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

function SearchIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={6.5} stroke="#64748B" strokeWidth={2} />
      <Path d="m16 16 4 4" stroke="#64748B" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// Clean semantic color palettes for category pills (No emojis)
const categoryThemes: Record<string, { bg: string; color: string; border: string }> = {
  Harvesting: { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  Monitoring: { bg: '#ECFDF5', color: '#166534', border: '#A7F3D0' },
  'Crop Inspection': { bg: '#ECFDF5', color: '#166534', border: '#A7F3D0' },
  Planting: { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  Irrigation: { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  Fertilizer: { bg: '#ECFDF5', color: '#166534', border: '#A7F3D0' },
  Fertilizing: { bg: '#ECFDF5', color: '#166534', border: '#A7F3D0' },
  'Pests & Disease Control': { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
};

const priorityThemes: Record<string, { bg: string; color: string; border: string; label: string }> = {
  high: { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', label: 'High Priority' },
  medium: { bg: '#F1F5F9', color: '#475569', border: '#E2E8F0', label: 'Medium Priority' },
  low: { bg: '#ECFDF5', color: '#166534', border: '#A7F3D0', label: 'Low Priority' },
};

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
  const categoryTheme = categoryThemes[task.category] || { bg: '#F1F5F9', color: '#475569', border: '#E2E8F0' };
  const priorityTheme = priorityThemes[priorityKey] || priorityThemes.medium;
  const duration = task.estimated_duration_minutes || 45;
  const scheduledTime = new Date(task.schedule_start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <View style={[styles.taskCard, expanded && styles.taskCardExpanded]}>
      {/* Top Header Row: Semantic Badges & Duration (Zero Icons) */}
      <View style={styles.cardHeaderRow}>
        <View style={styles.badgesLeft}>
          <View style={[styles.categoryPill, { backgroundColor: categoryTheme.bg, borderColor: categoryTheme.border }]}>
            <Text style={[styles.categoryPillText, { color: categoryTheme.color }]}>
              {task.category}
            </Text>
          </View>
          <View style={[styles.priorityPill, { backgroundColor: priorityTheme.bg, borderColor: priorityTheme.border }]}>
            <Text style={[styles.priorityPillText, { color: priorityTheme.color }]}>
              {priorityTheme.label}
            </Text>
          </View>
        </View>

        <Text style={styles.durationText}>{duration} MINS</Text>
      </View>

      {/* Task Title & Field / Schedule Subtitle */}
      <View>
        <Text style={styles.taskTitle}>
          {task.description || `${task.category} in Field ${task.field}`}
        </Text>
        <Text style={styles.taskMetaSubtitle}>
          Field {task.field} · Scheduled for {scheduledTime}
        </Text>
      </View>

      {/* Collapsible Instructions Details */}
      {expanded ? (
        <View style={styles.detailsSection}>
          <Text style={styles.detailLabel}>TASK INSTRUCTIONS</Text>
          <Text style={styles.detailValue}>
            {task.description || 'Follow standard operating procedure for this sector.'}
          </Text>
          <Text style={styles.detailValue}>
            Field location: Sector {task.field}
          </Text>
        </View>
      ) : null}

      {/* Toggle Instructions Link */}
      <Pressable onPress={onExpand} style={styles.toggleDetailsButton}>
        <Text style={styles.toggleDetailsText}>
          {expanded ? 'Hide Instructions ▴' : 'View Instructions ▾'}
        </Text>
      </Pressable>

      {/* Start Task Action CTA */}
      {task.status !== 'completed' ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy || !workAllowed}
          onPress={() => onStatusChange(nextStatus)}
          style={({ pressed }) => [
            styles.startButton,
            (!workAllowed || busy) && styles.startButtonDisabled,
            pressed && styles.startButtonPressed,
          ]}>
          {busy ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : workAllowed ? (
            <Text style={styles.startButtonText}>Start Task</Text>
          ) : (
            <Text style={[styles.startButtonText, styles.startButtonTextWrap]}>
              {CROP_WORK_HOURS_LABEL}
            </Text>
          )}
        </Pressable>
      ) : (
        <View style={styles.completedBanner}>
          <Text style={styles.completedText}>Task completed</Text>
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const visibleTasks = tasks
    .filter((task) => task.status === filter)
    .filter((task) => `${task.category} ${task.field} ${task.description || ''}`.toLowerCase().includes(searchQuery.trim().toLowerCase()));
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
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#176D34" size="large" />
      </View>
    );
  }
  if (!profile) return <Redirect href="/login" />;
  const horizontalPadding = width < 360 ? 14 : 18;

  return (
    <SafeAreaView style={styles.safeArea}>
      <WorkerHeader logoPosition="left" logoSize={48} logoSource={require('@/assets/images/driver-dashboard-emblem.png')} />

      <View style={styles.mainBodyContainer}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
          refreshControl={<RefreshControl colors={['#176D34']} onRefresh={() => loadTasks(true)} refreshing={refreshing} />}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.sectionTitle}>My Tasks</Text>
            </View>
          </View>

          <View style={deliveryStyles.deliveryToolbar}>
            <View style={deliveryStyles.deliverySearch}>
              <SearchIcon />
              <TextInput
                accessibilityLabel="Search tasks"
                onChangeText={setSearchQuery}
                placeholder="Search tasks"
                placeholderTextColor="#94A3B8"
                style={deliveryStyles.deliverySearchInput}
                value={searchQuery}
              />
            </View>
          </View>
          <View style={deliveryStyles.deliveryStatusTabs}>
            {[
              { label: 'Pending', route: '/WorkerTaskPending' },
              { label: 'Active', route: '/WorkerTaskActive' },
              { label: 'Completed', route: '/WorkerTaskCompleted' },
            ].map((tab) => {
              const active = tab.label === 'Pending';
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  key={tab.label}
                  onPress={() => router.replace(tab.route as any)}
                  style={[deliveryStyles.deliveryStatusTab, active && deliveryStyles.deliveryStatusTabActive]}>
                  <Text style={[deliveryStyles.deliveryStatusTabText, active && deliveryStyles.deliveryStatusTabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {error ? (
            <Pressable onPress={() => loadTasks()} style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Text style={styles.retry}>Tap to retry</Text>
            </Pressable>
          ) : null}

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#176D34" />
              <Text style={styles.loadingText}>Loading assigned tasks...</Text>
            </View>
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
              <Text style={styles.emptyTitle}>
                No {filters.find((item) => item.value === filter)?.label.toLowerCase()} tasks
              </Text>
              <Text style={styles.emptyText}>Pull down to check for newly assigned work.</Text>
            </View>
          )}
        </ScrollView>
      </View>

      <WorkerBottomNavigation activeTab="tasks" />
    </SafeAreaView>
  );
}
