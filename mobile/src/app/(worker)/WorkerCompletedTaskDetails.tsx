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
import { INSPECTION_QUESTIONS, suppliesSummary, supplyKindFor, type InspectionDetails, type TaskSupplyFields } from '@/lib/task-supplies';

type TaskStatus = 'pending' | 'in_progress' | 'awaiting_approval' | 'completed';
type TimelineEvent = { title: string; dateTime: string; icon: 'start' | 'completed' | 'approved' };

type WorkerTaskDetail = TaskSupplyFields & {
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
  completion_proof_image_url?: string | null;
  harvest_small_count?: number | null;
  harvest_medium_count?: number | null;
  harvest_large_count?: number | null;
  harvest_damaged_count?: number | null;
  estimated_duration_minutes?: number | null;
  schedule_start?: string | null;
  details?: Partial<InspectionDetails> | null;
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

function TimelineEventIcon({ type, color }: { type: TimelineEvent['icon']; color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      {type === 'start' ? (
        <Path d="m9 6 9 6-9 6V6Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      ) : type === 'completed' ? (
        <Path d="M5 21V4h13l-2.5 4L18 12H5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <Path d="m5 12 5 5L19 7" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      )}
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
    if (refresh) setRefreshing(true);
    else setLoading(true);
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

  const harvestCounts = [task?.harvest_small_count, task?.harvest_medium_count, task?.harvest_large_count, task?.harvest_damaged_count];
  const hasHarvestCounts = harvestCounts.every((count) => count != null);
  const showHarvestSection = task?.category === 'Harvesting' || harvestCounts.some((count) => count != null);
  const totalYield = hasHarvestCounts ? harvestCounts.reduce((sum, count) => sum + Number(count), 0) : null;
  const goodYield = hasHarvestCounts ? harvestCounts.slice(0, 3).reduce((sum, count) => sum + Number(count), 0) : null;
  const qualityRate = totalYield && goodYield != null ? ((goodYield / totalYield) * 100).toFixed(1) : null;

  const formatRecordedDateTime = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    }).format(date);
  };

  const completedAt = formatRecordedDateTime(task?.completed_at);
  const startedAt = formatRecordedDateTime(task?.started_at);
  const approvedAt = formatRecordedDateTime(task?.approved_at);
  const startMs = task?.started_at ? Date.parse(task.started_at) : NaN;
  const finishMs = task?.completed_at ? Date.parse(task.completed_at) : NaN;
  const workedSeconds = Number.isFinite(startMs) && Number.isFinite(finishMs) && finishMs >= startMs
    ? Math.floor((finishMs - startMs) / 1000) : null;
  const workedDuration = workedSeconds == null ? null
    : `${Math.floor(workedSeconds / 3600)}h ${Math.floor((workedSeconds % 3600) / 60)}m ${workedSeconds % 60}s`;
  const fieldName = task?.field?.trim() || 'Field not recorded';
  const location = task?.schedule?.location?.trim() || fieldName;
  const taskNumberStr = task ? `TASK #WRK-${String(task.id).padStart(4, '0')}` : '';
  const inventoryUsed = task ? suppliesSummary(task) : null;
  const usesInventory = task ? Boolean(supplyKindFor(task.category, task.activity_type)) : false;
  const proofImageUrl = task?.harvest_proof_image_url || task?.completion_proof_image_url;
  const inspectionAnswers = INSPECTION_QUESTIONS.filter((question) => task?.details?.[question.key]);
  const timelineEvents = [
    startedAt && { title: 'Work started', dateTime: startedAt, icon: 'start' as const },
    completedAt && { title: 'Work completed', dateTime: completedAt, icon: 'completed' as const },
    approvedAt && { title: 'Approved', dateTime: approvedAt, icon: 'approved' as const },
  ].filter((event): event is TimelineEvent => Boolean(event));

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
            {isAwaitingApproval ? 'Awaiting Approval' : 'Completed'}
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
                <Text style={styles.receiptDateStamp}>
                  {completedAt ? `Completed ${completedAt}` : 'Completion time not recorded'}
                </Text>

                <View
                  style={[
                    styles.receiptStatusStamp,
                    isAwaitingApproval && styles.receiptStatusStampAwaiting,
                  ]}>
                  <Text
                    style={[
                      styles.receiptStatusStampText,
                      isAwaitingApproval && styles.receiptStatusStampTextAwaiting,
                    ]}>
                    {isAwaitingApproval ? 'AWAITING APPROVAL' : 'COMPLETED'}
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
                  <Text style={styles.specValue}>{fieldName}</Text>
                </View>
              </View>

              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Location:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <PinIcon />
                  <Text style={styles.specValue}>{location}</Text>
                </View>
              </View>

              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Assigned Worker:</Text>
                <Text style={styles.specValue}>{profile.full_name || 'Name not recorded'}</Text>
              </View>

              {workedDuration ? (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Time worked:</Text>
                  <Text style={[styles.specValue, { color: GREEN }]}>{workedDuration}</Text>
                </View>
              ) : null}

              {usesInventory || inventoryUsed ? (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Inventory used:</Text>
                  <Text style={styles.specValue}>{inventoryUsed || 'No inventory use recorded'}</Text>
                </View>
              ) : null}

              {/* 3. Harvest Yield Manifest (Table Format, like Cargo Manifest) */}
              {showHarvestSection ? (
                <>
                  <View style={styles.dashedDivider} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={styles.receiptSectionKicker}>Harvest Yield Manifest</Text>
                    {totalYield != null ? (
                      <Text style={[styles.receiptSectionKicker, { color: GREEN }]}>Total: {totalYield} pcs</Text>
                    ) : null}
                  </View>
                  {hasHarvestCounts ? (
                    <>
                      <View style={styles.manifestHeaderRow}>
                        <Text style={styles.manifestColItem}>Grade / Classification</Text>
                        <Text style={styles.manifestColCount}>Count</Text>
                      </View>
                      {([
                        ['Small Grade', task.harvest_small_count],
                        ['Medium Grade', task.harvest_medium_count],
                        ['Large Grade', task.harvest_large_count],
                        ['Damaged / Rejected', task.harvest_damaged_count],
                      ] as const).map(([label, count]) => (
                        <View key={label} style={styles.manifestItemRow}>
                          <Text style={styles.manifestItemName}>{label}</Text>
                          <Text style={styles.manifestItemCount}>{count} pcs</Text>
                        </View>
                      ))}
                      {qualityRate != null ? (
                        <View style={styles.qualityBenchmarkBox}>
                          <View style={styles.qualityBenchmarkLeft}>
                            <View style={styles.qualityBenchmarkDot} />
                            <Text style={styles.qualityBenchmarkLabel}>Marketable Quality Rate</Text>
                          </View>
                          <Text style={styles.qualityBenchmarkValue}>{qualityRate}% Marketable</Text>
                        </View>
                      ) : null}
                    </>
                  ) : (
                    <Text style={styles.specValue}>Harvest counts not recorded</Text>
                  )}
                </>
              ) : null}

              {/* 4. Proof of Work (Photo) */}
              <View style={styles.dashedDivider} />
              <Text style={styles.receiptSectionKicker}>Proof of Work (Field Photo)</Text>

              {proofImageUrl ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setModalVisible(true)}
                  style={styles.podWrapper}>
                  <Image
                    source={{ uri: proofImageUrl }}
                    style={styles.podImage}
                  />
                  <View style={styles.podZoomBadge}>
                    <ZoomIcon />
                    <Text style={styles.podZoomBadgeText}>Tap to Zoom</Text>
                  </View>
                  <View style={styles.podMetaBox}>
                    <Text style={styles.podMetaText}>{fieldName}{completedAt ? ` · ${completedAt}` : ''}</Text>
                  </View>
                </Pressable>
              ) : <Text style={styles.specValue}>No field photo recorded</Text>}

              {/* Worker Field Notes */}
              <View style={styles.notesBox}>
                <Text style={styles.notesKicker}>Worker Field Notes</Text>
                <Text style={styles.notesText}>
                  {task.completion_notes?.trim() || 'No notes provided by worker.'}
                </Text>
              </View>

              {inspectionAnswers.length > 0 ? (
                <>
                  <View style={styles.dashedDivider} />
                  <Text style={styles.receiptSectionKicker}>Inspection Details</Text>
                  {inspectionAnswers.map((question) => (
                    <View key={question.key} style={styles.specRow}>
                      <Text style={styles.specLabel}>{question.label}:</Text>
                      <Text style={styles.specValue}>{task.details?.[question.key]}</Text>
                    </View>
                  ))}
                </>
              ) : null}

              {timelineEvents.length > 0 ? (
                <>
                  <View style={styles.dashedDivider} />
                  <Text style={styles.receiptSectionKicker}>Task Timeline</Text>
                  <View style={styles.timelineContainer}>
                    {timelineEvents.map((event, index) => (
                      <View key={event.title} style={[styles.timelineStep, index === timelineEvents.length - 1 && styles.timelineStepLast]}>
                        {index < timelineEvents.length - 1 ? <View style={styles.timelineLine} /> : null}
                        <View style={[styles.timelineDot, event.icon === 'approved' && styles.timelineDotApproved]}>
                          <TimelineEventIcon type={event.icon} color={event.icon === 'approved' ? '#FFFFFF' : '#166534'} />
                        </View>
                        <View style={styles.timelineStepContent}>
                          <Text style={styles.timelineStepTitle}>{event.title}</Text>
                          <Text style={styles.timelineStepSub}>{event.dateTime}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}

              {/* Dashed Separator */}
              <View style={styles.dashedDivider} />

              {/* 6. Slip Footer */}
              <View style={styles.receiptFooter}>
                <Text style={styles.receiptFooterText}>Official Task Operations Slip · AgriVerse Farm</Text>
              </View>
            </View>

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
                <Text style={styles.modalSub}>{fieldName}{completedAt ? ` · ${completedAt}` : ''}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseButton}>
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.modalImageContainer}>
              {proofImageUrl ? (
                <Image
                  source={{ uri: proofImageUrl }}
                  style={styles.modalImage}
                />
              ) : null}
            </View>

            <View style={styles.modalFooter}>
              <Text style={styles.modalFooterTitle}>{task?.category} - {fieldName}</Text>
              {totalYield != null ? (
                <Text style={styles.modalFooterSub}>Total yield: {totalYield} pcs{qualityRate != null ? ` (${qualityRate}% marketable)` : ''}</Text>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
