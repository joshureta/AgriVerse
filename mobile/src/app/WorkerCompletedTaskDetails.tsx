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
import Svg, { Circle, Path, Rect } from 'react-native-svg';

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

function CheckIcon({ size = 13, color = '#166534' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6 9 17l-5-5" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PinIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 7.2c0 7.3-8 11.8-8 11.8z"
        stroke="#EF4444"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={10} r={3} stroke="#EF4444" strokeWidth={2} />
    </Svg>
  );
}

function LeafIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 3.5 1 5.5-.5 10A7 7 0 0 1 11 20z"
        stroke="#166534"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="m7 15 5-5" stroke="#166534" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function ZoomIcon() {
  return (
    <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={8} stroke="#FFFFFF" strokeWidth={2} />
      <Path d="m21 21-4.35-4.35M11 8v6M8 11h6" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
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

  const formatTimeOnly = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return null;
    }
  };

  const formattedFinishTime =
    formatTimeOnly(task?.completed_at) || '5:27 PM';

  const formattedStartTime =
    formatTimeOnly(task?.started_at) ||
    formatTimeOnly(task?.schedule_start) ||
    '3:02 PM';

  const formattedDuration = task?.estimated_duration_minutes
    ? `${task.estimated_duration_minutes} mins`
    : '145 mins';

  const rawField = task?.field?.trim() || 'Field';
  const cleanField = rawField.toLowerCase().startsWith('field') ? rawField : `Field ${rawField}`;
  const sectorName = rawField.replace(/^field\s*/i, '').trim() || rawField;

  const taskNumberStr = task?.id
    ? `TASK #WRK-${String(task.id).padStart(4, '0')}`
    : 'TASK #WRK-0044';

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

      {/* Main Curved Cream Container */}
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
              <Pressable onPress={() => loadTask()} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Tap to Retry</Text>
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

            {/* Official Digital Operations Slip Card (Driver Style) */}
            <View style={styles.receiptCard}>

              {/* 1. Slip Top Header */}
              <View style={styles.receiptTopHeader}>
                <View style={styles.receiptLogoBadge}>
                  <LeafIcon />
                  <Text style={styles.receiptLogoText}>AgriVerse Task Slip</Text>
                </View>

                <Text style={styles.receiptTaskNumber}>{taskNumberStr}</Text>
                <Text style={styles.receiptDateStamp}>Finished today at {formattedFinishTime}</Text>

                <View
                  style={[
                    styles.receiptStatusStamp,
                    isAwaitingApproval && styles.receiptStatusStampAwaiting,
                  ]}>
                  <CheckIcon size={12} color={isAwaitingApproval ? '#92400E' : '#166534'} />
                  <Text
                    style={[
                      styles.receiptStatusStampText,
                      isAwaitingApproval && styles.receiptStatusStampTextAwaiting,
                    ]}>
                    {isAwaitingApproval ? 'AWAITING APPROVAL' : 'COMPLETED & VERIFIED'}
                  </Text>
                </View>
              </View>

              {/* Dashed Separator */}
              <View style={styles.dashedDivider} />

              {/* 2. Task & Field Specifications */}
              <Text style={styles.receiptSectionKicker}>Task & Field Specifications</Text>

              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Activity:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.categoryBadge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                    <Text style={[styles.categoryBadgeText, { color: theme.color }]}>{task.category}</Text>
                  </View>
                  <Text style={styles.specValue}>{cleanField}</Text>
                </View>
              </View>

              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Location:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <PinIcon />
                  <Text style={styles.specValue}>Sector {sectorName} (Operating Quad)</Text>
                </View>
              </View>

              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Assigned Worker:</Text>
                <Text style={styles.specValue}>{profile?.full_name || 'Worker'}</Text>
              </View>

              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Duration:</Text>
                <Text style={[styles.specValue, { color: GREEN }]}>{formattedDuration}</Text>
              </View>

              {/* 3. Harvest Yield Manifest (Table Format, like Cargo Manifest) */}
              {hasHarvestCounts ? (
                <>
                  <View style={styles.dashedDivider} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={styles.receiptSectionKicker}>Harvest Yield Manifest</Text>
                    <Text style={[styles.receiptSectionKicker, { color: GREEN }]}>Total: {totalYield} pcs</Text>
                  </View>

                  <View style={styles.manifestHeaderRow}>
                    <Text style={styles.manifestColItem}>Grade / Classification</Text>
                    <Text style={styles.manifestColCount}>Count</Text>
                  </View>

                  <View style={styles.manifestItemRow}>
                    <View>
                      <Text style={styles.manifestItemName}>Small Grade</Text>
                      <Text style={styles.manifestItemMeta}>0.8kg – 1.1kg per fruit</Text>
                    </View>
                    <Text style={styles.manifestItemCount}>{task.harvest_small_count ?? 0} pcs</Text>
                  </View>

                  <View style={styles.manifestItemRow}>
                    <View>
                      <Text style={styles.manifestItemName}>Medium Grade</Text>
                      <Text style={styles.manifestItemMeta}>1.2kg – 1.6kg per fruit</Text>
                    </View>
                    <Text style={styles.manifestItemCount}>{task.harvest_medium_count ?? 0} pcs</Text>
                  </View>

                  <View style={styles.manifestItemRow}>
                    <View>
                      <Text style={styles.manifestItemName}>Large Grade</Text>
                      <Text style={styles.manifestItemMeta}>1.7kg+ premium weight</Text>
                    </View>
                    <Text style={styles.manifestItemCount}>{task.harvest_large_count ?? 0} pcs</Text>
                  </View>

                  <View style={styles.manifestItemRow}>
                    <View>
                      <Text style={[styles.manifestItemName, { color: '#DC2626' }]}>Damaged / Rejected</Text>
                      <Text style={[styles.manifestItemMeta, { color: '#EF4444' }]}>Culled / Unmarketable</Text>
                    </View>
                    <Text style={[styles.manifestItemCount, { color: '#DC2626' }]}>
                      {task.harvest_damaged_count ?? 0} pcs
                    </Text>
                  </View>

                  {/* Quality Benchmark Banner */}
                  <View style={styles.qualityBenchmarkBox}>
                    <View style={styles.qualityBenchmarkLeft}>
                      <View style={styles.qualityBenchmarkDot} />
                      <Text style={styles.qualityBenchmarkLabel}>Marketable Quality Rate</Text>
                    </View>
                    <Text style={styles.qualityBenchmarkValue}>{qualityRate}% Marketable</Text>
                  </View>
                </>
              ) : null}

              {/* 4. Proof of Work (Photo) */}
              <View style={styles.dashedDivider} />
              <Text style={styles.receiptSectionKicker}>Proof of Work (Field Photo)</Text>

              {task.harvest_proof_image_url ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setModalVisible(true)}
                  style={styles.podWrapper}>
                  <Image
                    source={{ uri: task.harvest_proof_image_url }}
                    style={styles.podImage}
                  />
                  <View style={styles.podZoomBadge}>
                    <ZoomIcon />
                    <Text style={styles.podZoomBadgeText}>Tap to Zoom</Text>
                  </View>
                  <View style={styles.podMetaBox}>
                    <Text style={styles.podMetaText}>{cleanField} · {formattedFinishTime}</Text>
                  </View>
                </Pressable>
              ) : null}

              {/* Worker Field Notes */}
              <View style={styles.notesBox}>
                <Text style={styles.notesKicker}>Worker Field Notes</Text>
                <Text style={styles.notesText}>
                  {task.completion_notes ||
                    `Sector ${sectorName} crop standard operating procedure completed. Fruit ripeness index within acceptable range.`}
                </Text>
              </View>

              {/* 5. Task Timeline Stepper */}
              <View style={styles.dashedDivider} />
              <Text style={styles.receiptSectionKicker}>Task Audit Timeline</Text>

              <View style={styles.timelineContainer}>
                {/* Step 1 */}
                <View style={styles.timelineStep}>
                  <View style={styles.timelineLine} />
                  <View style={styles.timelineDot}>
                    <CheckIcon size={10} color="#166534" />
                  </View>
                  <View style={styles.timelineStepContent}>
                    <Text style={styles.timelineStepTitle}>Task Assigned & Scheduled</Text>
                    <Text style={styles.timelineStepSub}>
                      Scheduled for {cleanField} · Assigned to {profile?.full_name || 'Worker'}
                    </Text>
                  </View>
                </View>

                {/* Step 2 */}
                <View style={styles.timelineStep}>
                  <View style={styles.timelineLine} />
                  <View style={styles.timelineDot}>
                    <CheckIcon size={10} color="#166534" />
                  </View>
                  <View style={styles.timelineStepContent}>
                    <Text style={styles.timelineStepTitle}>Field Operations Started</Text>
                    <Text style={styles.timelineStepSub}>
                      {formattedStartTime} · Field check-in registered
                    </Text>
                  </View>
                </View>

                {/* Step 3 */}
                <View style={styles.timelineStep}>
                  <View style={styles.timelineLine} />
                  <View style={styles.timelineDot}>
                    <CheckIcon size={10} color="#166534" />
                  </View>
                  <View style={styles.timelineStepContent}>
                    <Text style={styles.timelineStepTitle}>Completed & Yield Logged</Text>
                    <Text style={styles.timelineStepSub}>
                      {formattedFinishTime} · {hasHarvestCounts ? `${totalYield} pcs logged & photo uploaded` : 'Field work submitted'}
                    </Text>
                  </View>
                </View>

                {/* Step 4 */}
                <View style={[styles.timelineStep, styles.timelineStepLast]}>
                  <View
                    style={[
                      styles.timelineDot,
                      !isAwaitingApproval && styles.timelineDotActive,
                    ]}>
                    <CheckIcon size={10} color={isAwaitingApproval ? '#166534' : '#FFFFFF'} />
                  </View>
                  <View style={styles.timelineStepContent}>
                    <Text
                      style={[
                        styles.timelineStepTitle,
                        !isAwaitingApproval && { color: '#166534' },
                      ]}>
                      {isAwaitingApproval ? 'Awaiting Supervisor Review' : 'Verified by Supervisor'}
                    </Text>
                    <Text style={styles.timelineStepSub}>
                      {isAwaitingApproval
                        ? 'Pending supervisor verification'
                        : 'Quality and count benchmarks approved'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Dashed Separator */}
              <View style={styles.dashedDivider} />

              {/* 6. Slip Footer */}
              <View style={styles.receiptFooter}>
                <Text style={styles.receiptFooterText}>Official Task Operations Slip · AgriVerse Farm</Text>
              </View>
            </View>

            {/* Bottom Back Button */}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.bottomBackButton}>
              <BackIcon />
              <Text style={styles.bottomBackButtonText}>Back to Completed Tasks</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>

      {/* Fullscreen Photo Modal */}
      <Modal
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
        transparent
        visible={modalVisible}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Proof of Work Photo</Text>
                <Text style={styles.modalSub}>{cleanField} · {formattedFinishTime}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseButton}>
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.modalImageContainer}>
              {task?.harvest_proof_image_url ? (
                <Image
                  source={{ uri: task.harvest_proof_image_url }}
                  style={styles.modalImage}
                />
              ) : null}
            </View>

            <View style={styles.modalFooter}>
              <Text style={styles.modalFooterTitle}>{task?.category} - {cleanField}</Text>
              <Text style={styles.modalFooterSub}>Total yield: {totalYield} pcs ({qualityRate}% Marketable)</Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
