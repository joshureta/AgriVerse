import { styles } from '@/styles/worker-task-completed.styles';
import { Redirect, router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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

function ChevronRightIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="m9 18 6-6-6-6" stroke="#94A3B8" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MonitoringIcon({ size = 22, color = '#166534' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={10.5} cy={10.5} r={6.5} stroke={color} strokeWidth={2} />
      <Path d="m15.5 15.5 5 5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M10.5 7.5a3 3 0 0 0-3 3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function IrrigationIcon({ size = 22, color = '#0284C7' }: { size?: number; color?: string }) {
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

function HarvestingIcon({ size = 22, color = '#B45309' }: { size?: number; color?: string }) {
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

function PlantingIcon({ size = 22, color = '#15803D' }: { size?: number; color?: string }) {
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
        d="M12 13c3-6 9-4 9 1-5 1-8-1-9-1z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M5 22h14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function FertilizingIcon({ size = 22, color = '#166534' }: { size?: number; color?: string }) {
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

function PestControlIcon({ size = 22, color = '#B91C1C' }: { size?: number; color?: string }) {
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

function DefaultTaskIcon({ size = 22, color = '#166534' }: { size?: number; color?: string }) {
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
  squircleBg: string;
  iconColor: string;
  pillBg: string;
  pillColor: string;
  pillBorder: string;
  IconComponent: React.ComponentType<{ size?: number; color?: string }>;
};

const categoryConfig: Record<string, CategoryTheme> = {
  Monitoring: {
    squircleBg: '#E8F5E9',
    iconColor: '#166534',
    pillBg: '#DCFCE7',
    pillColor: '#166534',
    pillBorder: '#BBF7D0',
    IconComponent: MonitoringIcon,
  },
  'Crop Inspection': {
    squircleBg: '#E8F5E9',
    iconColor: '#166534',
    pillBg: '#DCFCE7',
    pillColor: '#166534',
    pillBorder: '#BBF7D0',
    IconComponent: MonitoringIcon,
  },
  Irrigation: {
    squircleBg: '#E0F2FE',
    iconColor: '#0284C7',
    pillBg: '#E0F2FE',
    pillColor: '#0369A1',
    pillBorder: '#BAE6FD',
    IconComponent: IrrigationIcon,
  },
  Harvesting: {
    squircleBg: '#FEF3C7',
    iconColor: '#B45309',
    pillBg: '#FEF3C7',
    pillColor: '#92400E',
    pillBorder: '#FDE68A',
    IconComponent: HarvestingIcon,
  },
  Planting: {
    squircleBg: '#DCFCE7',
    iconColor: '#15803D',
    pillBg: '#F0FDF4',
    pillColor: '#15803D',
    pillBorder: '#BBF7D0',
    IconComponent: PlantingIcon,
  },
  Fertilizer: {
    squircleBg: '#ECFDF5',
    iconColor: '#166534',
    pillBg: '#ECFDF5',
    pillColor: '#166534',
    pillBorder: '#A7F3D0',
    IconComponent: FertilizingIcon,
  },
  Fertilizing: {
    squircleBg: '#ECFDF5',
    iconColor: '#166534',
    pillBg: '#ECFDF5',
    pillColor: '#166534',
    pillBorder: '#A7F3D0',
    IconComponent: FertilizingIcon,
  },
  'Pests & Disease Control': {
    squircleBg: '#FEE2E2',
    iconColor: '#B91C1C',
    pillBg: '#FEF2F2',
    pillColor: '#B91C1C',
    pillBorder: '#FECACA',
    IconComponent: PestControlIcon,
  },
};

const defaultCategoryConfig: CategoryTheme = {
  squircleBg: '#E8F5E9',
  iconColor: '#166534',
  pillBg: '#F3F7F3',
  pillColor: '#166534',
  pillBorder: '#DCE8DE',
  IconComponent: DefaultTaskIcon,
};

function CompletedTaskCard({ task }: { task: WorkerTaskRecord }) {
  const formattedTime = task.completed_at
    ? new Date(task.completed_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '11:30 AM';
  const isAwaitingApproval = task.status === 'awaiting_approval';
  const config = categoryConfig[task.category] || defaultCategoryConfig;
  const Icon = config.IconComponent;

  const fieldName = task.field?.trim() || 'Field';
  const cleanField = fieldName.toLowerCase().startsWith('field') ? fieldName : `Field ${fieldName}`;

  // Clean task title without duplicate category prefix
  const cleanTitle = task.description
    ? task.description.toLowerCase().startsWith((task.category || '').toLowerCase())
      ? task.description
      : `${task.category} - ${task.description}`
    : `${task.category} - ${cleanField}`;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/WorkerCompletedTaskDetails', params: { id: String(task.id) } })}
      style={({ pressed }) => [
        styles.taskCard,
        pressed && { opacity: 0.9, transform: [{ scale: 0.995 }] },
      ]}>
      <View style={styles.cardRow}>
        {/* Left: Squircle Category Icon Badge */}
        <View style={[styles.categorySquircle, { backgroundColor: config.squircleBg }]}>
          <Icon size={24} color={config.iconColor} />
        </View>

        {/* Right Content Column: Badges, Title, Subtitle beside the icon */}
        <View style={styles.cardContentColumn}>
          {/* Top Header Row with Semantic Category Pill & Status Badge */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.badgesLeft}>
              <View style={[styles.categoryPill, { backgroundColor: config.pillBg, borderColor: config.pillBorder }]}>
                <Text style={[styles.categoryPillText, { color: config.pillColor }]}>{task.category}</Text>
              </View>
              <View style={[styles.statusPill, isAwaitingApproval ? styles.statusPillAwaiting : styles.statusPillCompleted]}>
                <Text style={isAwaitingApproval ? styles.statusPillTextAwaiting : styles.statusPillTextCompleted}>
                  {isAwaitingApproval ? '⏳ Awaiting Approval' : '✓ Completed'}
                </Text>
              </View>
            </View>
          </View>

          {/* Task Title */}
          <Text numberOfLines={1} style={styles.taskTitle}>{cleanTitle}</Text>

          {/* Modern Meta Subtitle */}
          <Text numberOfLines={1} style={styles.taskMetaSubtitle}>
            {cleanField} · Finished at {formattedTime}
          </Text>
        </View>

        {/* Right Chevron Arrow */}
        <View style={styles.chevronWrapper}>
          <ChevronRightIcon />
        </View>
      </View>
    </Pressable>
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
