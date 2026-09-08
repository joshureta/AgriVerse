import { styles } from '@/styles/worker-task-completed.styles';
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  UIManager,
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
  harvest_proof_image_url?: string | null;
  harvest_small_count?: number | null;
  harvest_medium_count?: number | null;
  harvest_large_count?: number | null;
  harvest_damaged_count?: number | null;
};

const GREEN = '#176d34';
function SearchIcon() { return <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"><Circle cx={11} cy={11} r={6.5} stroke="#64748B" strokeWidth={2} /><Path d="m16 16 4 4" stroke="#64748B" strokeWidth={2} strokeLinecap="round" /></Svg>; }

function CompletedTaskCard({ task }: { task: WorkerTaskRecord }) {
  const [expanded, setExpanded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const formattedTime = task.completed_at
    ? new Date(task.completed_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '11:30 AM';
  const isAwaitingApproval = task.status === 'awaiting_approval';
  const isHarvesting = task.category === 'Harvesting' || isAwaitingApproval;

  const statusIcon = isAwaitingApproval ? '⏳' : '✓';
  const statusText = isAwaitingApproval
    ? 'Harvesting • Awaiting Approval'
    : 'Completed';

  const hasHarvestCounts =
    isHarvesting &&
    (task.harvest_small_count != null ||
      task.harvest_medium_count != null ||
      task.harvest_large_count != null ||
      task.harvest_damaged_count != null);

  const toggleExpand = () => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  return (
    <View style={styles.taskCard}>
      {/* Tappable main card area */}
      <Pressable onPress={toggleExpand} style={styles.cardMainContent}>
        {/* Status-colored bold font and bigger icon */}
        <View style={styles.statusKickerRow}>
          <Text style={isAwaitingApproval ? styles.statusIconHarvesting : styles.statusIconCompleted}>
            {statusIcon}
          </Text>
          <Text style={isAwaitingApproval ? styles.statusKickerHarvesting : styles.statusKickerCompleted}>
            {statusText}
          </Text>
        </View>

        {/* Task Title */}
        <Text style={styles.taskTitle}>
          {task.category} - {task.description || `Completed task in ${task.field}`}
        </Text>

        {/* Option 1 Clean Typography (No icons) */}
        <View style={styles.taskMeta}>
          <Text style={styles.finishedText}>Finished at {formattedTime}</Text>
          <Text style={styles.fieldText}>Field: {task.field}</Text>
        </View>
      </Pressable>

      {/* Expandable Drawer ("see more" reveals Insights, Photo Proof, Harvest Counts) */}
      {expanded ? (
        <View style={styles.expandedDrawer}>
          {/* Harvest Counts (if applicable) */}
          {hasHarvestCounts ? (
            <View style={styles.countsGrid}>
              <View style={styles.countBox}>
                <Text style={styles.countBoxLabel}>Small</Text>
                <Text style={styles.countBoxValue}>{task.harvest_small_count ?? 0}</Text>
              </View>
              <View style={styles.countBox}>
                <Text style={styles.countBoxLabel}>Medium</Text>
                <Text style={styles.countBoxValue}>{task.harvest_medium_count ?? 0}</Text>
              </View>
              <View style={styles.countBox}>
                <Text style={styles.countBoxLabel}>Large</Text>
                <Text style={styles.countBoxValue}>{task.harvest_large_count ?? 0}</Text>
              </View>
              <View style={styles.countBox}>
                <Text style={styles.countBoxLabel}>Damaged</Text>
                <Text style={styles.countBoxValue}>{task.harvest_damaged_count ?? 0}</Text>
              </View>
            </View>
          ) : null}

          {/* Insights */}
          <View style={styles.insightsContainer}>
            <Text style={styles.sectionHeaderLabel}>Worker Insights</Text>
            {task.completion_notes?.trim() ? (
              <Text style={styles.insightsText}>{task.completion_notes.trim()}</Text>
            ) : (
              <Text style={styles.noInsightsText}>No additional insights logged for this task.</Text>
            )}
          </View>

          {/* Photo Proof */}
          <View style={styles.photoProofSection}>
            <Text style={styles.sectionHeaderLabel}>Photo Proof</Text>
            {task.harvest_proof_image_url ? (
              <Pressable onPress={() => setModalVisible(true)} style={styles.photoProofContainer}>
                <Image
                  source={{ uri: task.harvest_proof_image_url }}
                  style={styles.photoProofImage}
                  resizeMode="cover"
                />
                <View style={styles.photoProofOverlay}>
                  <Text style={styles.photoProofOverlayText}>Tap to view full</Text>
                </View>
              </Pressable>
            ) : (
              <View style={styles.noPhotoContainer}>
                <Text style={styles.noPhotoText}>No photo proof uploaded</Text>
              </View>
            )}
          </View>
        </View>
      ) : null}

      {/* Faded "see more" / "see less" Toggle Button */}
      <Pressable
        onPress={toggleExpand}
        style={({ pressed }) => [styles.seeMoreButton, pressed && styles.seeMoreButtonPressed]}>
        <Text style={styles.seeMoreText}>{expanded ? 'see less' : 'see more'}</Text>
        <Text style={styles.seeMoreChevron}>{expanded ? '⌃' : '⌄'}</Text>
      </Pressable>

      {/* Full-Screen Image Modal */}
      {task.harvest_proof_image_url ? (
        <Modal animationType="fade" onRequestClose={() => setModalVisible(false)} transparent visible={modalVisible}>
          <Pressable onPress={() => setModalVisible(false)} style={styles.modalBackdrop}>
            <Pressable onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>×</Text>
            </Pressable>
            <Image
              source={{ uri: task.harvest_proof_image_url }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          </Pressable>
        </Modal>
      ) : null}
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
