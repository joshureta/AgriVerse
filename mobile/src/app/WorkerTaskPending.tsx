import { styles } from '@/styles/worker-task-pending.styles';
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
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useAuth } from '@/context/auth-context';
import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
import { apiRequest } from '@/lib/api';
import { taskCategoryIconSource } from '@/lib/task-category-icons';
import { TaskSuppliesSheet } from '@/components/task-supplies-sheet';
import { canWorkCropTaskNow, CROP_WORK_HOURS_LABEL } from '@/lib/crop-work-hours';
import { activityLabel, supplyKindFor, type ActivityType } from '@/lib/task-supplies';
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
  activity_type?: ActivityType | null;
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

function MonitoringIcon({ size = 18, color = '#166534' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={10.5} cy={10.5} r={6.5} stroke={color} strokeWidth={2} />
      <Path d="m15.5 15.5 5 5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M10.5 7.5a3 3 0 0 0-3 3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function IrrigationIcon({ size = 18, color = '#0284C7' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9 15a3 3 0 0 0 3 3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function HarvestingIcon({ size = 18, color = '#B45309' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9h18l-2 11H5L3 9z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M7 9V6a5 5 0 0 1 10 0v3" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M10 14h4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function PlantingIcon({ size = 18, color = '#15803D' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22v-9" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path
        d="M12 13c-3-6-9-4-9 1 5 1 8-1 9-1z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 13c3-6 9-4 9 1-5 1-8-1 9-1z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M5 22h14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function FertilizingIcon({ size = 18, color = '#166534' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 3.5 1 5.5-.5 10A7 7 0 0 1 11 20z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="m7 15 5-5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function PestControlIcon({ size = 18, color = '#B91C1C' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="m9 12 2 2 4-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function DefaultTaskIcon({ size = 18, color = '#166534' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 3.5 1 5.5-.5 10A7 7 0 0 1 11 20z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type CategoryTheme = {
  bg: string;
  border: string;
  iconColor: string;
  pillBg: string;
  pillColor: string;
  pillBorder: string;
  IconComponent: React.ComponentType<{ size?: number; color?: string }>;
};

const categoryConfig: Record<string, CategoryTheme> = {
  Monitoring: {
    bg: '#E8F5E9',
    border: '#BBF7D0',
    iconColor: '#166534',
    pillBg: '#DCFCE7',
    pillColor: '#166534',
    pillBorder: '#BBF7D0',
    IconComponent: MonitoringIcon,
  },
  'Crop Inspection': {
    bg: '#E8F5E9',
    border: '#BBF7D0',
    iconColor: '#166534',
    pillBg: '#DCFCE7',
    pillColor: '#166534',
    pillBorder: '#BBF7D0',
    IconComponent: MonitoringIcon,
  },
  Irrigation: {
    bg: '#E0F2FE',
    border: '#BAE6FD',
    iconColor: '#0284C7',
    pillBg: '#E0F2FE',
    pillColor: '#0369A1',
    pillBorder: '#BAE6FD',
    IconComponent: IrrigationIcon,
  },
  Harvesting: {
    bg: '#FEF3C7',
    border: '#FDE68A',
    iconColor: '#B45309',
    pillBg: '#FEF3C7',
    pillColor: '#92400E',
    pillBorder: '#FDE68A',
    IconComponent: HarvestingIcon,
  },
  Planting: {
    bg: '#DCFCE7',
    border: '#BBF7D0',
    iconColor: '#15803D',
    pillBg: '#F0FDF4',
    pillColor: '#15803D',
    pillBorder: '#BBF7D0',
    IconComponent: PlantingIcon,
  },
  Fertilizer: {
    bg: '#ECFDF5',
    border: '#A7F3D0',
    iconColor: '#166534',
    pillBg: '#ECFDF5',
    pillColor: '#166534',
    pillBorder: '#A7F3D0',
    IconComponent: FertilizingIcon,
  },
  Fertilizing: {
    bg: '#ECFDF5',
    border: '#A7F3D0',
    iconColor: '#166534',
    pillBg: '#ECFDF5',
    pillColor: '#166534',
    pillBorder: '#A7F3D0',
    IconComponent: FertilizingIcon,
  },
  'Pests & Disease Control': {
    bg: '#FEF2F2',
    border: '#FECACA',
    iconColor: '#B91C1C',
    pillBg: '#FEF2F2',
    pillColor: '#B91C1C',
    pillBorder: '#FECACA',
    IconComponent: PestControlIcon,
  },
};

const defaultCategoryTheme: CategoryTheme = {
  bg: '#DCFCE7',
  border: '#BBF7D0',
  iconColor: '#166534',
  pillBg: '#DCFCE7',
  pillColor: '#166534',
  pillBorder: '#BBF7D0',
  IconComponent: DefaultTaskIcon,
};

const priorityThemes: Record<string, { bg: string; color: string; border: string; label: string }> = {
  high: { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', label: 'High Priority' },
  medium: { bg: '#F1F5F9', color: '#475569', border: '#E2E8F0', label: 'Medium Priority' },
  low: { bg: '#ECFDF5', color: '#166534', border: '#A7F3D0', label: 'Low Priority' },
};

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d={expanded ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
        stroke="#176D34"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function getTaskInstructions(task: WorkerTaskRecord, cleanField: string): string {
  const desc = task.description?.trim();
  const title = `${task.category} - ${cleanField}`.toLowerCase();
  const rawField = (task.field || '').trim().toLowerCase();

  // If description exists and has distinct content (not just repeating category/title/field):
  if (
    desc &&
    desc.toLowerCase() !== title &&
    desc.toLowerCase() !== (task.category || '').toLowerCase() &&
    desc.toLowerCase() !== cleanField.toLowerCase() &&
    desc.toLowerCase() !== rawField &&
    desc.toLowerCase() !== `${task.category} - ${rawField}`
  ) {
    return desc;
  }

  // Meaningful standard SOP guidance per category
  switch (task.category) {
    case 'Irrigation':
      return `Inspect drip lines and irrigation valves. Ensure even water distribution across ${cleanField}.`;
    case 'Harvesting':
      return `Harvest mature pineapples meeting size and quality standards. Handle with care to prevent bruising.`;
    case 'Monitoring':
    case 'Crop Inspection':
      return `Inspect crop rows for pest activity, leaf discoloration, and soil moisture levels in ${cleanField}.`;
    case 'Planting':
      return `Ensure proper spacing and depth for crown seedlings. Irrigate immediately after planting.`;
    case 'Fertilizer':
    case 'Fertilizing':
      return `Apply recommended fertilizer dosage evenly along plant base per schedule in ${cleanField}.`;
    case 'Pests & Disease Control':
      return `Apply designated organic treatment wearing required PPE. Record any severe infestation spots.`;
    default:
      return `Follow standard operating procedures and farm safety guidelines for ${cleanField}.`;
  }
}

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
  const config = categoryConfig[task.category] || defaultCategoryTheme;
  const priorityTheme = priorityThemes[priorityKey] || priorityThemes.medium;
  const duration = task.estimated_duration_minutes || 45;
  const scheduledTime = new Date(task.schedule_start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  // Field & sector sanitization (fixes "Field Field C" and "Sector Field C" duplication)
  const rawField = task.field?.trim() || 'Field';
  const cleanField = rawField.toLowerCase().startsWith('field') ? rawField : `Field ${rawField}`;
  const cleanSector = rawField.replace(/^field\s*/i, '').trim() || rawField;

  // Title sanitization (no duplicate category prefix)
  const cleanTitle = task.description
    ? task.description.toLowerCase().startsWith((task.category || '').toLowerCase())
      ? task.description
      : `${task.category} - ${task.description}`
    : `${task.category} - ${cleanField}`;

  const instructions = getTaskInstructions(task, cleanField);

  return (
    <View style={[styles.taskCard, expanded && styles.taskCardExpanded]}>
      {/* Header Row: Category Squircle Icon, Title, Field + Priority Pill & Top-Right Dropdown Button (Driver Style) */}
      <View style={styles.pendingCardHeader}>
        <View style={[styles.categorySquircle, { backgroundColor: config.bg, borderColor: config.border }]}>
          <Image source={taskCategoryIconSource(task.category)} style={{ width: 36, height: 36, resizeMode: 'contain' }} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={styles.taskTitle}>
            {cleanTitle}
          </Text>
          <View style={styles.headerSubtitleRow}>
            <Text numberOfLines={1} style={styles.taskMetaSubtitle}>
              {cleanField}
            </Text>
            <View style={[styles.priorityPill, { backgroundColor: priorityTheme.bg, borderColor: priorityTheme.border }]}>
              <Text style={[styles.priorityPillText, { color: priorityTheme.color }]}>
                {priorityTheme.label}
              </Text>
            </View>
            {activityLabel(task.activity_type) ? (
              <View style={[styles.priorityPill, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }]}>
                <Text style={[styles.priorityPillText, { color: '#0369A1' }]}>{activityLabel(task.activity_type)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Hide details' : 'Show details'}
          onPress={onExpand}
          style={({ pressed }) => [styles.topRightDropdownBtn, pressed && styles.topRightDropdownBtnActive]}>
          <ChevronIcon expanded={expanded} />
        </Pressable>
      </View>

      {/* Driver Meta Rows (Clean non-redundant metadata) */}
      <View style={styles.metaTextContainer}>
        <View style={styles.metaTextRow}>
          <Text style={styles.metaTextLabel}>Time:</Text>
          <Text style={styles.metaTextValue}>Scheduled for {scheduledTime}</Text>
        </View>
        <View style={styles.metaTextRow}>
          <Text style={styles.metaTextLabel}>Est. Duration:</Text>
          <Text style={[styles.metaTextValue, styles.metaTextValueHighlighted]}>
            {duration} mins (Allocated)
          </Text>
        </View>
      </View>

      {/* Collapsible Details Section (Driver pendingDetailsBox Style) */}
      {expanded ? (
        <View style={styles.pendingDetailsBox}>
          <View style={styles.pendingDetailRow}>
            <Text style={styles.pendingDetailLabel}>Instructions:</Text>
            <Text style={styles.pendingDetailValue}>{instructions}</Text>
          </View>
          <View style={styles.pendingDetailRow}>
            <Text style={styles.pendingDetailLabel}>Location:</Text>
            <Text style={styles.pendingDetailValue}>Sector {cleanSector}</Text>
          </View>
        </View>
      ) : null}

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
  const [suppliesTask, setSuppliesTask] = useState<WorkerTaskRecord | null>(null);
  const [suppliesError, setSuppliesError] = useState('');

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

  // Fertilization and Pest & Disease Action take supplies from inventory, so Start opens the picker first.
  function handleStatusChange(task: WorkerTaskRecord, status: TaskStatus) {
    if (status === 'in_progress' && supplyKindFor(task.category, task.activity_type)) {
      setSuppliesError('');
      setSuppliesTask(task);
      return;
    }
    updateTaskStatus(task, status);
  }

  async function updateTaskStatus(task: WorkerTaskRecord, status: TaskStatus, supplies?: { itemId: number; quantity: number }) {
    setBusyId(task.id);
    setError('');
    setSuppliesError('');
    try {
      const result = await apiRequest<{ task: WorkerTaskRecord }>(`/api/worker/tasks/${task.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, ...(supplies ? { inventory_item_id: supplies.itemId, quantity: supplies.quantity } : {}) }),
      });
      setSuppliesTask(null);
      setTasks((current) => current.filter((item) => item.id !== task.id));
      setSummary((current) => ({ ...current, pending: Math.max(0, current.pending - 1), active: current.active + 1 }));
      if (result.task.status === 'in_progress') router.replace('/WorkerTaskActive');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not update this task.';
      if (supplies) setSuppliesError(message);
      else setError(message);
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
                onStatusChange={(status) => handleStatusChange(task, status)}
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

      {suppliesTask && supplyKindFor(suppliesTask.category, suppliesTask.activity_type) ? (
        <TaskSuppliesSheet
          error={suppliesError}
          kind={supplyKindFor(suppliesTask.category, suppliesTask.activity_type)!}
          onCancel={() => setSuppliesTask(null)}
          onConfirm={(itemId, quantity) => updateTaskStatus(suppliesTask, 'in_progress', { itemId, quantity })}
          submitting={busyId === suppliesTask.id}
          title={`${suppliesTask.category} · ${suppliesTask.field}`}
          visible
        />
      ) : null}

      <WorkerBottomNavigation activeTab="tasks" />
    </SafeAreaView>
  );
}
