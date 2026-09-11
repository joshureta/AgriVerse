import { GREEN, styles } from '@/styles/worker-completed-task-details.styles';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

type TaskStatus = 'pending' | 'in_progress' | 'awaiting_approval' | 'completed';

type WorkerTaskDetail = {
  id: number;
  category: string;
  field: string;
  priority?: string;
  status: TaskStatus;
  description: string | null;
  started_at?: string | null;
  completed_at: string | null;
  approved_at?: string | null;
  completion_notes: string | null;
  harvest_proof_image_url?: string | null;
  harvest_small_count?: number | null;
  harvest_medium_count?: number | null;
  harvest_large_count?: number | null;
  harvest_damaged_count?: number | null;
  estimated_duration_minutes?: number | null;
  schedule_start?: string | null;
  schedule?: {
    schedule_date?: string;
    start_time?: string;
    end_time?: string;
    location?: string;
  } | null;
};

const categoryThemeMap: Record<string, { bg: string; color: string; border: string }> = {
  Harvesting: { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  Monitoring: { bg: '#ECFDF5', color: '#166534', border: '#A7F3D0' },
  'Crop Inspection': { bg: '#ECFDF5', color: '#166534', border: '#A7F3D0' },
  Planting: { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  Irrigation: { bg: '#E0F2FE', color: '#0369A1', border: '#BAE6FD' },
  Fertilizer: { bg: '#ECFDF5', color: '#166534', border: '#A7F3D0' },
  Fertilizing: { bg: '#ECFDF5', color: '#166534', border: '#A7F3D0' },
  'Pests & Disease Control': { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
};

function BackIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="m15 18-6-6 6-6" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CheckIcon({ size = 14, color = '#166534' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6 9 17l-5-5" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CameraIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={13} r={3} stroke="#FFFFFF" strokeWidth={2} />
    </Svg>
  );
}

export default function WorkerCompletedTaskDetails() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { loading: authLoading, profile } = useAuth();
  const [task, setTask] = useState<WorkerTaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const loadTask = useCallback(async (refresh = false) => {
    if (!id) {
      setError('Task ID is missing.');
      setLoading(false);
      return;
    }
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const response = await apiRequest<{ task: WorkerTaskDetail }>(`/api/worker/tasks/${id}`);
      setTask(response.task);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load task details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    if (profile) loadTask();
  }, [loadTask, profile]);

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GREEN} size="large" />
      </View>
    );
  }
  if (!profile) return <Redirect href="/login" />;

  const isAwaitingApproval = task?.status === 'awaiting_approval';
  const theme = categoryThemeMap[task?.category || ''] || {
    bg: '#F1F5F9',
    color: '#475569',
    border: '#E2E8F0',
  };

  const hasHarvestCounts =
    task &&
    (task.category === 'Harvesting' ||
      task.harvest_small_count != null ||
      task.harvest_medium_count != null ||
      task.harvest_large_count != null ||
      task.harvest_damaged_count != null);

  const totalYield = hasHarvestCounts
    ? (task.harvest_small_count || 0) +
      (task.harvest_medium_count || 0) +
      (task.harvest_large_count || 0) +
      (task.harvest_damaged_count || 0)
    : 0;

  const goodYield = hasHarvestCounts
    ? (task.harvest_small_count || 0) +
      (task.harvest_medium_count || 0) +
      (task.harvest_large_count || 0)
    : 0;

  const qualityRate = totalYield > 0 ? ((goodYield / totalYield) * 100).toFixed(1) : '100.0';

  const formattedFinishTime = task?.completed_at
    ? new Date(task.completed_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '11:30 AM';

  const formattedStartTime = task?.started_at
    ? new Date(task.started_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : task?.schedule_start
    ? new Date(task.schedule_start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '08:30 AM';

  const formattedDuration = task?.estimated_duration_minutes
    ? `${task.estimated_duration_minutes} mins`
    : '45 mins';

  const rawField = task?.field?.trim() || 'Field';
  const cleanField = rawField.toLowerCase().startsWith('field') ? rawField : `Field ${rawField}`;
  const sectorName = rawField.replace(/^field\s*/i, '').trim() || rawField;

  const cleanTitle = task?.description
    ? task.description.toLowerCase().startsWith((task.category || '').toLowerCase())
      ? task.description
      : `${task.category} - ${task.description}`
    : `${task?.category || 'Task'} - ${cleanField}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Navigation Bar */}
      <View style={styles.headerBar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}>
          <BackIcon />
          <Text style={styles.backButtonText}>Completed Tasks</Text>
        </Pressable>

        <View
          style={[
            styles.headerStatusBadge,
            isAwaitingApproval && styles.headerStatusBadgeAwaiting,
          ]}>
          <Text
            style={[
              styles.headerStatusBadgeText,
              isAwaitingApproval && styles.headerStatusBadgeTextAwaiting,
            ]}>
            {isAwaitingApproval ? '⏳ Awaiting Approval' : '✓ Verified'}
          </Text>
        </View>
      </View>

      <View style={styles.mainBodyContainer}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={GREEN} size="large" />
            <Text style={{ marginTop: 12, color: '#64748B', fontSize: 13 }}>Loading task details...</Text>
          </View>
        ) : error || !task ? (
          <View style={styles.center}>
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error || 'Task not found'}</Text>
              <Pressable onPress={() => loadTask()}>
                <Text style={styles.retryText}>Tap to retry</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                colors={[GREEN]}
                onRefresh={() => loadTask(true)}
                refreshing={refreshing}
              />
            }>
            {/* 1. Hero Summary Card */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.badgesRow}>
                  <View
                    style={[
                      styles.categoryPill,
                      { backgroundColor: theme.bg, borderColor: theme.border },
                    ]}>
                    <Text style={[styles.categoryPillText, { color: theme.color }]}>
                      {task.category}
                    </Text>
                  </View>
                  <View style={styles.fieldPill}>
                    <Text style={styles.fieldPillText}>{cleanField}</Text>
                  </View>
                </View>

                <Text
                  style={isAwaitingApproval ? styles.statusTextAwaiting : styles.statusTextCompleted}>
                  {isAwaitingApproval ? 'Awaiting Approval' : 'Completed'}
                </Text>
              </View>

              <Text style={styles.taskTitle}>{cleanTitle}</Text>

              <Text style={styles.taskDesc}>
                Sector {sectorName}. Standard crop operating procedure.
              </Text>

              <View style={styles.metaRow}>
                <Text style={styles.metaItem}>
                  Finished: <Text style={styles.metaItemBold}>{formattedFinishTime}</Text>
                </Text>
                <Text style={styles.metaItem}>
                  Duration: <Text style={styles.metaItemBold}>{formattedDuration}</Text>
                </Text>
              </View>
            </View>

            {/* 2. Harvest Yield Breakdown (Conditional for Harvesting) */}
            {hasHarvestCounts ? (
              <View style={styles.card}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Harvest Yield Breakdown</Text>
                  <View style={styles.totalYieldBadge}>
                    <Text style={styles.totalYieldText}>Total: {totalYield} pcs</Text>
                  </View>
                </View>

                <View style={styles.countsGrid}>
                  <View style={styles.countBox}>
                    <Text style={styles.countBoxLabel}>Small Grade</Text>
                    <Text style={styles.countBoxValue}>{task.harvest_small_count ?? 0}</Text>
                    <Text style={styles.countBoxSub}>0.8kg – 1.1kg</Text>
                  </View>
                  <View style={styles.countBox}>
                    <Text style={styles.countBoxLabel}>Medium Grade</Text>
                    <Text style={styles.countBoxValue}>{task.harvest_medium_count ?? 0}</Text>
                    <Text style={styles.countBoxSub}>1.2kg – 1.6kg</Text>
                  </View>
                  <View style={styles.countBox}>
                    <Text style={styles.countBoxLabel}>Large Grade</Text>
                    <Text style={styles.countBoxValue}>{task.harvest_large_count ?? 0}</Text>
                    <Text style={styles.countBoxSub}>1.7kg+</Text>
                  </View>
                  <View style={[styles.countBox, styles.countBoxDamaged]}>
                    <Text style={[styles.countBoxLabel, styles.countBoxLabelDamaged]}>
                      Damaged / Rejected
                    </Text>
                    <Text style={[styles.countBoxValue, styles.countBoxValueDamaged]}>
                      {task.harvest_damaged_count ?? 0}
                    </Text>
                    <Text style={styles.countBoxSub}>Culled</Text>
                  </View>
                </View>

                <View style={styles.qualityBenchmark}>
                  <Text style={styles.qualityBenchmarkLabel}>Marketable Quality Rate</Text>
                  <Text style={styles.qualityBenchmarkVal}>{qualityRate}% Marketable</Text>
                </View>
              </View>
            ) : null}

            {/* 3. Task Specifications */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Task Specifications</Text>

              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Field Location:</Text>
                <Text style={styles.specValue}>{cleanField}</Text>
              </View>

              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Assigned Worker:</Text>
                <Text style={styles.specValue}>{profile.full_name}</Text>
              </View>

              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Start Time:</Text>
                <Text style={styles.specValue}>{formattedStartTime}</Text>
              </View>

              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Completed At:</Text>
                <Text style={styles.specValue}>{formattedFinishTime}</Text>
              </View>

              <View style={[styles.specRow, styles.specRowLast]}>
                <Text style={styles.specLabel}>Review Status:</Text>
                <Text
                  style={[
                    styles.specValue,
                    { color: isAwaitingApproval ? '#92400E' : '#166534' },
                  ]}>
                  {isAwaitingApproval ? 'Pending Approval' : 'Verified by Supervisor'}
                </Text>
              </View>
            </View>

            {/* 4. Worker Insights & Notes */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Worker Insights &amp; Notes</Text>
              <View style={styles.insightsBox}>
                {task.completion_notes?.trim() ? (
                  <Text style={styles.insightsText}>{task.completion_notes.trim()}</Text>
                ) : (
                  <Text style={styles.noInsightsText}>
                    No additional field insights logged for this task.
                  </Text>
                )}
              </View>
            </View>

            {/* 5. Photo Proof */}
            <View style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Photo Proof</Text>
                {task.harvest_proof_image_url ? (
                  <View style={styles.totalYieldBadge}>
                    <Text style={styles.totalYieldText}>1 Photo Attached</Text>
                  </View>
                ) : null}
              </View>

              {task.harvest_proof_image_url ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setModalVisible(true)}
                  style={styles.photoCard}>
                  <Image
                    source={{ uri: task.harvest_proof_image_url }}
                    style={styles.photoImage}
                    resizeMode="cover"
                  />
                  <View style={styles.photoOverlay}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <CameraIcon />
                      <Text style={styles.photoOverlayText}>{cleanField} Verification</Text>
                    </View>
                    <View style={styles.photoZoomBadge}>
                      <Text style={styles.photoZoomBadgeText}>Tap to Zoom</Text>
                    </View>
                  </View>
                </Pressable>
              ) : (
                <View style={styles.noPhotoBox}>
                  <Text style={styles.noPhotoText}>No photo proof uploaded for this task</Text>
                </View>
              )}
            </View>

            {/* 6. Task Timeline (Audit Trail) */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Task Timeline</Text>
              <View style={styles.timelineContainer}>
                {!isAwaitingApproval ? (
                  <View style={styles.timelineItem}>
                    <View style={styles.timelineDot} />
                    <Text style={styles.timelineTitle}>Task Approved &amp; Verified</Text>
                    <Text style={styles.timelineSub}>
                      {formattedFinishTime} · Verified by Farm Supervisor
                    </Text>
                  </View>
                ) : (
                  <View style={styles.timelineItem}>
                    <View style={[styles.timelineDot, styles.timelineDotPending]} />
                    <Text style={[styles.timelineTitle, { color: '#92400E' }]}>
                      Awaiting Supervisor Approval
                    </Text>
                    <Text style={styles.timelineSub}>
                      Submitted at {formattedFinishTime} · Pending review
                    </Text>
                  </View>
                )}

                <View style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <Text style={styles.timelineTitle}>Marked as Completed</Text>
                  <Text style={styles.timelineSub}>
                    {formattedFinishTime} · Notes &amp; proof submitted
                  </Text>
                </View>

                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: '#94A3B8' }]} />
                  <Text style={styles.timelineTitle}>Task Started</Text>
                  <Text style={styles.timelineSub}>
                    {formattedStartTime} · Worker started execution
                  </Text>
                </View>
              </View>
            </View>

            {/* Return Button */}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.returnButton}>
              <Text style={styles.returnButtonText}>Back to Completed Tasks</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>

      {/* Full-screen Photo Modal */}
      {task?.harvest_proof_image_url ? (
        <Modal
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
          transparent
          visible={modalVisible}>
          <View style={styles.modalBackdrop}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setModalVisible(false)}
              style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>
            <Image
              resizeMode="contain"
              source={{ uri: task.harvest_proof_image_url }}
              style={styles.modalImage}
            />
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}
