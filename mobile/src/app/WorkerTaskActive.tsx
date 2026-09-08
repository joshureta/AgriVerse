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
  harvest_rejection_reason?: string | null;
};

const GREEN = '#176d34';
function SearchIcon() { return <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"><Circle cx={11} cy={11} r={6.5} stroke="#64748B" strokeWidth={2} /><Path d="m16 16 4 4" stroke="#64748B" strokeWidth={2} strokeLinecap="round" /></Svg>; }
const taskIcons: Record<string, string> = {
  Planting: '🌱',
  Fertilizing: '🌿',
  Fertilizer: '🌿',
  'Pests & Disease Control': '🔎',
  'Crop Inspection': '🔎',
  Irrigation: '💧',
  Harvesting: '🍍',
};

function ActiveTaskCard({
  onComplete,
  task,
}: {
  onComplete: () => void;
  task: WorkerTaskRecord;
}) {
  return (
    <View style={styles.taskCard}>
      {/* Radar pulse background decoration */}
      <View style={styles.radarContainer} pointerEvents="none">
        <View style={styles.radarOuterRing} />
        <View style={styles.radarMidRing} />
        <View style={styles.radarInnerCircle} />
      </View>

      {/* Top Header Row */}
      <View style={styles.topRow}>
        <Text style={styles.activeLabel}>Active</Text>
        <View style={styles.inProgressBadge}>
          <Text style={styles.inProgressText}>IN-PROGRESS</Text>
        </View>
      </View>

      {/* Task Title */}
      <Text style={styles.taskTitle}>
        {task.category} - {task.description || `Active task in ${task.field}`}
      </Text>

      {task.harvest_rejection_reason ? (
        <View style={styles.rejectionBanner}>
          <Text style={styles.rejectionBannerTitle}>⚠ Sent back for changes</Text>
          <Text style={styles.rejectionBannerText}>{task.harvest_rejection_reason}</Text>
        </View>
      ) : null}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Details List */}
      <View style={styles.detailsList}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Field:</Text>
          <Text style={styles.detailValue}>{task.field}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Duration:</Text>
          <Text style={styles.detailValue}>01:24:18</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Start time:</Text>
          <Text style={styles.detailValue}>08:30 AM</Text>
        </View>
      </View>

      {/* Action Button */}
      <Pressable
        onPress={onComplete}
        style={({ pressed }) => [styles.completeButton, pressed && styles.buttonPressed]}>
        <View style={styles.completeCheckCircle}>
          <Text style={styles.completeCheckIcon}>✓</Text>
        </View>
        <Text style={styles.completeButtonText}>Mark as Completed</Text>
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
