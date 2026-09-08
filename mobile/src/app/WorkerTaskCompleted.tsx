import { styles } from '@/styles/worker-task-completed.styles';
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
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import { styles as deliveryStyles } from '@/styles/driver-task-pending.styles';
import Svg, { Circle, Path } from 'react-native-svg';

type WorkerTaskRecord = {
  id: number;
  category: string;
  field: string;
  status: 'pending' | 'in_progress' | 'awaiting_approval' | 'completed';
  description: string | null;
  completed_at: string | null;
  completion_notes: string | null;
};

const GREEN = '#176d34';
function SearchIcon() { return <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"><Circle cx={11} cy={11} r={6.5} stroke="#64748B" strokeWidth={2} /><Path d="m16 16 4 4" stroke="#64748B" strokeWidth={2} strokeLinecap="round" /></Svg>; }
const taskIcons: Record<string, string> = {
  Planting: '🌱',
  Irrigation: '💧',
  Fertilizer: '🌿',
  Fertilizing: '🌿',
  'Crop Inspection': '🔎',
  'Pests & Disease Control': '🔎',
  Harvesting: '🍍',
};

function CompletedTaskCard({ task }: { task: WorkerTaskRecord }) {
  const formattedTime = task.completed_at
    ? new Date(task.completed_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '11:30 AM';
  const isAwaitingApproval = task.status === 'awaiting_approval';

  return (
    <View style={styles.taskCard}>
      {/* Top Header Banner (Mint Green Tint, or amber while awaiting admin approval) */}
      <View style={[styles.taskHeaderBanner, isAwaitingApproval && styles.taskHeaderBannerPending]}>
        <View style={[styles.checkCircle, isAwaitingApproval && styles.checkCirclePending]}>
          <Text style={[styles.checkCheck, isAwaitingApproval && styles.checkCheckPending]}>
            {isAwaitingApproval ? '⏳' : '✓'}
          </Text>
        </View>
        <Text style={styles.taskBannerTitle}>
          {task.category} - {task.description || `Completed task in ${task.field}`}
        </Text>
      </View>

      {isAwaitingApproval && (
        <View style={styles.awaitingApprovalPill}>
          <Text style={styles.awaitingApprovalPillText}>Awaiting Approval</Text>
        </View>
      )}

      {/* Card Body */}
      <View style={styles.taskBody}>
        {/* Finished time row */}
        <View style={styles.infoRow}>
          <Text style={styles.clockIcon}>🕒</Text>
          <Text style={styles.finishedText}>Finished at {formattedTime}</Text>
        </View>

        {/* Photo proof row */}
        <View style={styles.infoRow}>
          <View style={styles.photoProofThumbnail}>
            <Text style={styles.photoProofFallback}>🖼️</Text>
          </View>
          <Text style={styles.photoProofText}>Photo proof</Text>
        </View>

        {/* Field location row */}
        <View style={styles.infoRow}>
          <Text style={styles.pinIcon}>📍</Text>
          <Text style={styles.fieldText}>Field: {task.field}</Text>
        </View>
      </View>
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
  const [searchQuery, setSearchQuery] = useState('');

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
  const filteredTasks = tasks.filter((task) => `${task.category} ${task.field} ${task.description || ''}`.toLowerCase().includes(searchQuery.trim().toLowerCase()));

  return (
    <SafeAreaView style={styles.safeArea}>
      <WorkerHeader logoPosition="left" logoSize={48} logoSource={require('@/assets/images/driver-dashboard-emblem.png')} />

      <View style={styles.mainBodyContainer}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
          refreshControl={<RefreshControl colors={[GREEN]} refreshing={refreshing} onRefresh={() => loadTasks(true)} />}>
          <Text style={styles.pageTitle}>My Tasks</Text>
          <View style={deliveryStyles.deliveryToolbar}><View style={deliveryStyles.deliverySearch}><SearchIcon /><TextInput accessibilityLabel="Search tasks" onChangeText={setSearchQuery} placeholder="Search tasks" placeholderTextColor="#94A3B8" style={deliveryStyles.deliverySearchInput} value={searchQuery} /></View></View>
          <View style={deliveryStyles.deliveryStatusTabs}>{[{ label: 'Pending', route: '/WorkerTaskPending' }, { label: 'Active', route: '/WorkerTaskActive' }, { label: 'Completed', route: '/WorkerTaskCompleted' }].map((tab) => { const active = tab.label === 'Completed'; return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} key={tab.label} onPress={() => router.replace(tab.route as any)} style={[deliveryStyles.deliveryStatusTab, active && deliveryStyles.deliveryStatusTabActive]}><Text style={[deliveryStyles.deliveryStatusTabText, active && deliveryStyles.deliveryStatusTabTextActive]}>{tab.label}</Text></Pressable>; })}</View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {loading ? (
            <ActivityIndicator color={GREEN} style={styles.loader} />
          ) : filteredTasks.length ? (
            filteredTasks.map((task) => <CompletedTaskCard key={task.id} task={task} />)
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.checkCircle}>
                <Text style={styles.checkCheck}>✓</Text>
              </View>
              <Text style={styles.emptyTitle}>No completed tasks</Text>
              <Text style={styles.emptyCopy}>Completed work will appear here.</Text>
            </View>
          )}
        </ScrollView>
      </View>

      <WorkerBottomNavigation activeTab="tasks" />
    </SafeAreaView>
  );
}
