import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { usePathname } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

type Incident = {
  id: number;
  task_id?: number | null;
  order_id?: number | null;
  label: string;
  scheduled_at: string;
  original_status: string;
  reason_code?: string | null;
  reason_submitted_at: string | null;
  recovered_at: string | null;
  new_scheduled_at: string | null;
  classification: string;
};

type ReasonOption = {
  code: string;
  label: string;
  sublabel: string;
  icon: string;
};

const DRIVER_REASONS: ReasonOption[] = [
  { code: 'vehicle_breakdown', label: 'Vehicle breakdown', sublabel: 'Engine trouble, flat tire, mechanical fault', icon: '🚗' },
  { code: 'traffic_road_closure', label: 'Traffic / road closure', sublabel: 'Heavy congestion, road construction, detour', icon: '🚧' },
  { code: 'customer_unavailable', label: 'Customer unavailable', sublabel: 'Buyer unreachable at delivery drop-off point', icon: '👤' },
  { code: 'weather', label: 'Severe weather', sublabel: 'Heavy rains, flooding, zero visibility', icon: '🌧️' },
  { code: 'supplies_unavailable', label: 'Cargo / warehouse delay', sublabel: 'Produce crates not packed or ready for pickup', icon: '📦' },
  { code: 'illness_emergency', label: 'Driver illness / emergency', sublabel: 'Medical issue or family emergency', icon: '🩺' },
  { code: 'other', label: 'Other operational delay', sublabel: 'Any other unforeseen delivery situation', icon: '📋' },
];

const WORKER_REASONS: ReasonOption[] = [
  { code: 'supplies_unavailable', label: 'Supplies / tools unavailable', sublabel: 'Seeds, fertilizer, PPE, or tools not ready', icon: '📦' },
  { code: 'weather', label: 'Inclement weather', sublabel: 'Heavy rainfall, lightning storm, extreme heat', icon: '🌧️' },
  { code: 'traffic_road_closure', label: 'Field flooded / inaccessible', sublabel: 'Field sector waterlogged or access path blocked', icon: '🚧' },
  { code: 'illness_emergency', label: 'Worker illness / emergency', sublabel: 'Personal injury, medical or family emergency', icon: '🩺' },
  { code: 'vehicle_breakdown', label: 'Machinery / tool failure', sublabel: 'Tractor, irrigation pump, or field equipment failure', icon: '🚜' },
  { code: 'other', label: 'Other operational delay', sublabel: 'Any other unforeseen agricultural delay', icon: '📋' },
];

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

let openModalHandler: ((target?: { taskId?: number; orderId?: number; incidentId?: number }) => void) | null = null;

export function openOverdueRecovery(target?: { taskId?: number; orderId?: number; incidentId?: number }) {
  if (openModalHandler) {
    openModalHandler(target);
  }
}

/**
 * Step 1: Modern Overdue Badge & Banner for Tasks / Deliveries
 */
export function OverdueBadge({
  scheduledAt,
  taskId,
  orderId,
}: {
  scheduledAt?: string | null;
  taskId?: number;
  orderId?: number;
}) {
  if (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) return null;

  const isOverdue = dayFormat.format(new Date(scheduledAt)) < dayFormat.format(new Date());
  if (!isOverdue) return null;

  const dateText = new Date(scheduledAt).toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Overdue work. Tap to submit delay reason"
      onPress={() => openOverdueRecovery({ taskId, orderId })}
      style={({ pressed }) => [s.badgeContainer, pressed && s.badgePressed]}
    >
      <View style={s.badgeHeaderRow}>
        <View style={s.badgePill}>
          <View style={s.badgeDot} />
          <Text style={s.badgePillText}>OVERDUE</Text>
        </View>
        <Text style={s.badgeDateText}>Scheduled: {dateText} (Manila)</Text>
      </View>

      <View style={s.badgePromptRow}>
        <Text style={s.badgePromptIcon}>⚠</Text>
        <Text style={s.badgePromptText}>Delay reason required to unlock next jobs</Text>
        <Text style={s.badgeArrow}>→</Text>
      </View>
    </Pressable>
  );
}

export type OperationsRecoveryContextValue = {
  incidents: Incident[];
  activeCount: number;
  missingCount: number;
  openRecovery: (target?: { taskId?: number; orderId?: number; incidentId?: number }) => void;
  refresh: () => Promise<void>;
};

const OperationsRecoveryContext = createContext<OperationsRecoveryContextValue>({
  incidents: [],
  activeCount: 0,
  missingCount: 0,
  openRecovery: (target) => openOverdueRecovery(target),
  refresh: async () => {},
});

export function useOperationsRecovery() {
  return useContext(OperationsRecoveryContext);
}

/**
 * Root Overdue Recovery Coordinator Provider & Modal Host
 */
export function OperationsRecoveryProvider({ children }: { children?: React.ReactNode }) {
  const { profile } = useAuth();
  const path = usePathname();
  const enabled =
    profile?.role === 'farm_worker' &&
    ['driver', 'crop_management_worker'].includes(profile.worker_category || '') &&
    !!profile.onboarding_completed_at;

  const isDriver = profile?.worker_category === 'driver';
  const roleReasons = isDriver ? DRIVER_REASONS : WORKER_REASONS;

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [attachedImageName, setAttachedImageName] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  const generation = useRef(0);
  const invalidate = useCallback(() => {
    generation.current++;
  }, []);

  const load = useCallback(async () => {
    if (!enabled) return;
    const current = ++generation.current;
    try {
      const data = await apiRequest<{ incidents: Incident[] }>('/api/operations/mine');
      if (current !== generation.current) return;
      setIncidents(data.incidents || []);
      setError('');
    } catch (caught) {
      if (current === generation.current) {
        setError(caught instanceof Error ? caught.message : 'Unable to load overdue work.');
      }
    }
  }, [enabled]);

  // Bind global opener
  useEffect(() => {
    openModalHandler = (target) => {
      setOpen(true);
      setError('');
      setSuccessToast('');
      load();

      if (target) {
        if (target.incidentId) {
          const match = incidents.find((i) => i.id === target.incidentId);
          if (match) setSelected(match);
        } else if (target.taskId) {
          const match = incidents.find((i) => i.task_id === target.taskId);
          if (match) setSelected(match);
        } else if (target.orderId) {
          const match = incidents.find((i) => i.order_id === target.orderId);
          if (match) setSelected(match);
        }
      }
    };
    return () => {
      openModalHandler = null;
    };
  }, [incidents, load]);

  useEffect(() => {
    const initial = setTimeout(() => {
      setIncidents([]);
      setOpen(false);
      setSelected(null);
      load();
    }, 0);
    if (!enabled)
      return () => {
        clearTimeout(initial);
        invalidate();
      };
    const timer = setInterval(load, 30000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') load();
    });
    return () => {
      invalidate();
      clearTimeout(initial);
      clearInterval(timer);
      listener.remove();
    };
  }, [enabled, invalidate, load, profile?.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (enabled) load();
    }, 0);
    return () => clearTimeout(timer);
  }, [enabled, path, load]);

  const missing = incidents.filter((item) => !item.reason_submitted_at);
  const active = incidents.filter((item) => !item.recovered_at || !item.reason_submitted_at);

  const openRecovery = useCallback((target?: { taskId?: number; orderId?: number; incidentId?: number }) => {
    setOpen(true);
    setError('');
    setSuccessToast('');
    load();

    if (target) {
      if (target.incidentId) {
        const match = incidents.find((i) => i.id === target.incidentId);
        if (match) setSelected(match);
      } else if (target.taskId) {
        const match = incidents.find((i) => i.task_id === target.taskId);
        if (match) setSelected(match);
      } else if (target.orderId) {
        const match = incidents.find((i) => i.order_id === target.orderId);
        if (match) setSelected(match);
      }
    }
  }, [incidents, load]);

  const contextValue = useMemo<OperationsRecoveryContextValue>(
    () => ({
      incidents,
      activeCount: active.length,
      missingCount: missing.length,
      openRecovery,
      refresh: load,
    }),
    [incidents, active.length, missing.length, openRecovery, load]
  );

  if (!enabled) return <>{children}</>;

  async function pickEvidence() {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        const name = file.fileName || `evidence_${Date.now()}.jpg`;
        setAttachedImageName(name);
      }
    } catch {
      // Image picker canceled or unsupported in environment
    }
  }

  function handleSelectIncident(item: Incident) {
    setSelected(item);
    setReason(item.reason_code || '');
    setNotes('');
    setAttachedImageName(null);
    setError('');
  }

  async function submit() {
    if (!selected || busy) return;
    setBusy(true);
    setError('');

    let finalNotes = notes.trim();
    if (attachedImageName) {
      finalNotes += `\n[Photo evidence attached: ${attachedImageName}]`;
    }

    try {
      await apiRequest(`/api/operations/${selected.id}/reason`, {
        method: 'POST',
        body: JSON.stringify({ reason_code: reason, notes: finalNotes }),
      });
      setSuccessToast('✓ Reason recorded! Dispatch and management have been notified.');
      setTimeout(() => {
        setSelected(null);
        setReason('');
        setNotes('');
        setAttachedImageName(null);
        setSuccessToast('');
      }, 1400);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to submit delay reason.');
    } finally {
      setBusy(false);
    }
  }

  const isFormValid = !!reason && notes.trim().length >= 5 && notes.trim().length <= 2000;

  return (
    <OperationsRecoveryContext.Provider value={contextValue}>
      {children}

      {/* Step 2 Bottom Sheet Modal */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!busy) {
            setOpen(false);
            setSelected(null);
          }
        }}
      >
        <View style={s.modalOverlay}>
          <SafeAreaView style={s.bottomSheetContainer}>
            {/* Top Drag Indicator */}
            <View style={s.sheetHandleBar} />

            {/* Header */}
            <View style={s.sheetHeader}>
              <View style={s.sheetHeaderLeft}>
                {selected ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Back to overdue list"
                    disabled={busy}
                    onPress={() => {
                      setSelected(null);
                      setError('');
                    }}
                    style={s.backButton}
                  >
                    <Text style={s.backButtonText}>←</Text>
                  </Pressable>
                ) : null}
                <View>
                  <Text style={s.sheetBrandTitle}>
                    Agri<Text style={s.sheetBrandGreen}>Verse</Text>
                  </Text>
                  <Text style={s.sheetSubTitle}>
                    {selected ? 'Step 2 · Required Delay Reason' : 'Overdue Work & Recovery'}
                  </Text>
                </View>
              </View>

              <View style={s.sheetHeaderRight}>
                <View style={s.roleBadge}>
                  <Text style={s.roleBadgeText}>{isDriver ? 'Driver' : 'Worker'}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close dialog"
                  disabled={busy}
                  onPress={() => {
                    setOpen(false);
                    setSelected(null);
                  }}
                  style={s.closeCircleBtn}
                >
                  <Text style={s.closeCircleBtnText}>✕</Text>
                </Pressable>
              </View>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {error ? (
                <View style={s.errorAlert}>
                  <Text style={s.errorAlertText}>⚠ {error}</Text>
                </View>
              ) : null}

              {successToast ? (
                <View style={s.successAlert}>
                  <Text style={s.successAlertText}>{successToast}</Text>
                </View>
              ) : null}

              {selected ? (
                /* Stage 2 Delay Reason Submission View */
                <View style={s.formWrapper}>
                  {/* Context Capsule */}
                  <View style={s.contextCard}>
                    <View style={s.contextIconSquircle}>
                      <Text style={s.contextIconEmoji}>{selected.order_id ? '🚚' : '🌱'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={s.contextTitleRow}>
                        <Text style={s.contextLabelText} numberOfLines={1}>
                          {selected.label}
                        </Text>
                        <View style={s.miniOverduePill}>
                          <Text style={s.miniOverduePillText}>OVERDUE</Text>
                        </View>
                      </View>
                      <Text style={s.contextMetaText}>
                        Scheduled:{' '}
                        {new Date(selected.scheduled_at).toLocaleDateString('en-PH', {
                          timeZone: 'Asia/Manila',
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        · Original status: {selected.original_status}
                      </Text>
                    </View>
                  </View>

                  {/* Form Prompt */}
                  <View style={s.promptBlock}>
                    <Text style={s.promptTitle}>
                      {selected.order_id
                        ? 'Why was this delivery delayed?'
                        : 'Why was this task delayed?'}
                    </Text>
                    <Text style={s.promptSub}>
                      Select the primary reason. This will be reported directly to management.
                    </Text>
                  </View>

                  {/* Radio Option Tiles */}
                  <View style={s.reasonsList}>
                    {roleReasons.map((item) => {
                      const isChosen = reason === item.code;
                      return (
                        <Pressable
                          key={item.code}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: isChosen }}
                          disabled={busy}
                          onPress={() => setReason(item.code)}
                          style={[s.reasonTile, isChosen && s.reasonTileChosen]}
                        >
                          <View style={s.reasonTileIconBox}>
                            <Text style={s.reasonTileEmoji}>{item.icon}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[s.reasonTileTitle, isChosen && s.reasonTileTitleChosen]}>
                              {item.label}
                            </Text>
                            <Text style={s.reasonTileSub} numberOfLines={1}>
                              {item.sublabel}
                            </Text>
                          </View>
                          <View style={[s.radioOuter, isChosen && s.radioOuterChosen]}>
                            {isChosen ? <View style={s.radioInner} /> : null}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Notes & Explanation */}
                  <View style={s.inputSection}>
                    <View style={s.inputLabelRow}>
                      <Text style={s.inputLabel}>
                        Explanation Notes <Text style={{ color: '#DC2626' }}>*</Text>
                      </Text>
                      <Text style={s.charCounter}>{notes.trim().length} / 2000 (min 5)</Text>
                    </View>
                    <TextInput
                      accessibilityLabel="Delay explanation"
                      multiline
                      maxLength={2000}
                      editable={!busy}
                      placeholder="Please explain what happened in detail..."
                      placeholderTextColor="#94A3B8"
                      value={notes}
                      onChangeText={setNotes}
                      style={s.textArea}
                    />
                  </View>

                  {/* Evidence Attachment Box */}
                  <View style={s.evidenceBox}>
                    <View style={s.evidenceLeft}>
                      <Text style={s.evidenceIcon}>📎</Text>
                      <View>
                        <Text style={s.evidenceTitle}>Attach Photo / Evidence (Optional)</Text>
                        <Text style={s.evidenceSub}>
                          {attachedImageName ? attachedImageName : 'Repair receipts, tire photo, flooded path'}
                        </Text>
                      </View>
                    </View>
                    {attachedImageName ? (
                      <Pressable
                        onPress={() => setAttachedImageName(null)}
                        style={s.evidenceClearBtn}
                      >
                        <Text style={s.evidenceClearText}>Remove</Text>
                      </Pressable>
                    ) : (
                      <Pressable onPress={pickEvidence} style={s.evidenceUploadBtn}>
                        <Text style={s.evidenceUploadText}>Browse</Text>
                      </Pressable>
                    )}
                  </View>

                  {/* Operational Guard Card */}
                  <View style={s.guardNotice}>
                    <Text style={s.guardNoticeIcon}>ⓘ</Text>
                    <Text style={s.guardNoticeText}>
                      Reason required before closing this task or starting another job. Original
                      deadline is retained in operational audit history.
                    </Text>
                  </View>

                  {/* Submit CTA */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Submit delay reason"
                    disabled={!isFormValid || busy}
                    onPress={submit}
                    style={[s.submitBtn, (!isFormValid || busy) && s.submitBtnDisabled]}
                  >
                    {busy ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={s.submitBtnText}>Submit Reason & Notify Dispatch →</Text>
                    )}
                  </Pressable>
                </View>
              ) : (
                /* Overdue Incident Queue Overview */
                <View style={s.queueWrapper}>
                  <Text style={s.queueHeaderTitle}>Active Overdue Work</Text>
                  <Text style={s.queueHeaderSub}>
                    Unfinished items past Philippine midnight cutoff.
                  </Text>

                  {active.length === 0 ? (
                    <View style={s.emptyState}>
                      <Text style={s.emptyStateIcon}>✓</Text>
                      <Text style={s.emptyStateTitle}>All caught up!</Text>
                      <Text style={s.emptyStateSub}>No outstanding overdue work or delay reasons needed.</Text>
                    </View>
                  ) : null}

                  {active.map((item) => {
                    const needsReason = !item.reason_submitted_at;
                    return (
                      <View key={item.id} style={s.incidentCard}>
                        <View style={s.incidentCardHeader}>
                          <View style={s.contextIconSquircle}>
                            <Text style={s.contextIconEmoji}>{item.order_id ? '🚚' : '🌱'}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.incidentCardTitle}>{item.label}</Text>
                            <Text style={s.incidentCardMeta}>
                              Scheduled:{' '}
                              {new Date(item.scheduled_at).toLocaleDateString('en-PH', {
                                timeZone: 'Asia/Manila',
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              · {item.original_status}
                            </Text>
                          </View>
                          <View style={s.miniOverduePill}>
                            <Text style={s.miniOverduePillText}>OVERDUE</Text>
                          </View>
                        </View>

                        {/* Status Strip */}
                        <View style={s.incidentStatusStrip}>
                          {item.recovered_at ? (
                            <Text style={s.incidentStatusRecovered}>
                              ✓ Recovery confirmed {item.new_scheduled_at ? `· New: ${new Date(item.new_scheduled_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' })}` : ''}
                            </Text>
                          ) : (
                            <Text style={s.incidentStatusPending}>
                              ⏳ Admin notified · Recovery pending confirmation
                            </Text>
                          )}
                        </View>

                        {needsReason ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Submit delay reason"
                            onPress={() => handleSelectIncident(item)}
                            style={s.incidentActionBtn}
                          >
                            <Text style={s.incidentActionBtnText}>Submit Delay Reason →</Text>
                          </Pressable>
                        ) : (
                          <View style={s.reasonSubmittedPill}>
                            <Text style={s.reasonSubmittedText}>
                              Reason submitted · {item.classification === 'pending' ? 'Awaiting review' : item.classification}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </OperationsRecoveryContext.Provider>
  );
}

export const OperationsRecovery = OperationsRecoveryProvider;

/**
 * Option 1: Top In-Feed Alert Banner
 * Scrolls naturally with the feed, notifying farm workers and drivers
 * without obstructing "Start Task" buttons or the bottom tab bar.
 */
export function OverdueAlertBanner({ style }: { style?: StyleProp<ViewStyle> }) {
  const { activeCount, missingCount, openRecovery } = useOperationsRecovery();
  const { profile } = useAuth();
  if (activeCount === 0) return null;

  const isDriver = profile?.worker_category === 'driver';
  const entityName = isDriver
    ? activeCount === 1
      ? 'Delivery'
      : 'Deliveries'
    : activeCount === 1
      ? 'Task'
      : 'Tasks';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${activeCount} overdue ${entityName.toLowerCase()} flagged. Tap to review.`}
      style={({ pressed }) => [s.inFeedBanner, pressed && s.inFeedBannerPressed, style]}
      onPress={() => openRecovery()}
    >
      <View style={s.inFeedBannerLeft}>
        <View style={s.inFeedBannerIconBox}>
          <Text style={s.inFeedBannerIcon}>⚠</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.inFeedBannerTitle}>
            {activeCount} Overdue {entityName} Flagged
          </Text>
          <Text style={s.inFeedBannerSub}>
            {missingCount > 0
              ? 'Submit delay reason to continue work'
              : 'Recovery confirmation pending'}
          </Text>
        </View>
      </View>
      <View style={s.inFeedBannerActionPill}>
        <Text style={s.inFeedBannerActionText}>Review →</Text>
      </View>
    </Pressable>
  );
}

/**
 * Modern Buyer Recovery Update Component for Buyer Order Tracking
 */
export function BuyerRecoveryUpdate({
  orderId,
  order: propOrder,
}: {
  orderId: number;
  order?: {
    id: number;
    order_number?: string | null;
    order_status: string;
    delivery_scheduled_at?: string | null;
    delivery_window_end_at?: string | null;
    delivered_at?: string | null;
    delivery_incident?: {
      id: number;
      detected_at: string;
      recovered_at: string | null;
      new_scheduled_at: string | null;
      buyer_requested_date: string | null;
    } | null;
  } | null;
}) {
  type Update = {
    id: number;
    recovered_at: string | null;
    buyer_requested_date: string | null;
    new_scheduled_at?: string | null;
  };
  const [data, setData] = useState<{
    update: Update | null;
    order: {
      delivery_scheduled_at: string | null;
      delivery_window_end_at: string | null;
      order_status: string;
      order_number?: string | null;
      delivered_at?: string | null;
    };
  } | null>(null);
  const [date, setDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await apiRequest(`/api/operations/orders/${orderId}`));
    } catch {
      setMessage('Delivery recovery updates could not be loaded.');
    }
  }, [orderId]);

  useEffect(() => {
    const initial = setTimeout(load, 0);
    const timer = setInterval(load, 30000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [load]);

  async function requestDate() {
    setBusy(true);
    setMessage('');
    try {
      await apiRequest(`/api/operations/orders/${orderId}/request-date`, {
        method: 'POST',
        body: JSON.stringify({ date }),
      });
      setMessage('Request sent. Dispatch will review your preferred date.');
      setShowDatePicker(false);
      await load();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Unable to request date change.');
    } finally {
      setBusy(false);
    }
  }

  function contactSupport() {
    Linking.openURL('tel:+639171234567').catch(() => {
      setMessage('Customer support: +63 917 123 4567 (Mon-Sat 7am-6pm)');
    });
  }

  const currentOrder = propOrder || data?.order;
  const currentIncident = data?.update || propOrder?.delivery_incident;

  const isDelayed = useMemo(() => {
    if (currentIncident) return true;
    if (!currentOrder || currentOrder.order_status === 'cancelled') return false;
    if (currentOrder.delivery_scheduled_at) {
      if (currentOrder.delivered_at) {
        return (
          new Date(currentOrder.delivered_at).getTime() -
            new Date(currentOrder.delivery_scheduled_at).getTime() >
          12 * 60 * 60 * 1000
        );
      }
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
      const schedDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(
        new Date(currentOrder.delivery_scheduled_at)
      );
      return schedDate < today;
    }
    return false;
  }, [currentIncident, currentOrder]);

  const isDelivered = ['delivered', 'completed'].includes(currentOrder?.order_status || '');

  const dateWindowText = useMemo(() => {
    const schedAt =
      currentIncident?.new_scheduled_at || currentOrder?.delivery_scheduled_at;
    if (!schedAt) return null;
    const start = new Date(schedAt);
    const dayStr = start.toLocaleDateString('en-PH', {
      timeZone: 'Asia/Manila',
      day: 'numeric',
      month: 'short',
    });
    const startTimeStr = start.toLocaleTimeString('en-PH', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      minute: '2-digit',
    });
    const endTimeStr = currentOrder?.delivery_window_end_at
      ? new Date(currentOrder.delivery_window_end_at).toLocaleTimeString('en-PH', {
          timeZone: 'Asia/Manila',
          hour: 'numeric',
          minute: '2-digit',
        })
      : '';
    return endTimeStr ? `${dayStr} · ${startTimeStr}–${endTimeStr}` : `${dayStr} · ${startTimeStr}`;
  }, [currentIncident, currentOrder]);

  if (!isDelayed && !currentIncident) return message ? <Text style={s.buyerMessage}>{message}</Text> : null;

  return (
    <View style={s.buyerCardModern}>
      {/* Top Delivery Icon Badge */}
      <View style={s.buyerIconBadge}>
        <Text style={s.buyerIconText}>🚚</Text>
      </View>

      {/* Heading & Order Number */}
      <View style={s.buyerHeadingBox}>
        <Text style={s.buyerTitle}>We&apos;re sorry your delivery was delayed.</Text>
        <Text style={s.buyerOrderNumber}>Order #{currentOrder?.order_number || orderId}</Text>
      </View>

      {/* Status Pill: New Schedule Confirmed vs Rescheduling in progress */}
      <View
        style={
          currentIncident?.recovered_at || isDelivered
            ? s.buyerConfirmedPill
            : s.buyerPendingPill
        }
      >
        <Text
          style={
            currentIncident?.recovered_at || isDelivered
              ? s.buyerConfirmedPillText
              : s.buyerPendingPillText
          }
        >
          {currentIncident?.recovered_at
            ? '✓ New schedule confirmed'
            : isDelivered
              ? '✓ Delivered (Late Delivery Record)'
              : '⏱ Schedule adjustment in progress'}
        </Text>
      </View>

      {/* Date & Time Window */}
      {dateWindowText ? (
        <View style={s.buyerTimeWindowRow}>
          <Text style={s.buyerCalendarIcon}>📅</Text>
          <Text style={s.buyerTimeWindowText}>{dateWindowText}</Text>
        </View>
      ) : currentOrder?.delivery_scheduled_at ? (
        <View style={s.buyerTimeWindowRow}>
          <Text style={s.buyerCalendarIcon}>📅</Text>
          <Text style={s.buyerTimeWindowText}>
            Scheduled:{' '}
            {new Date(currentOrder.delivery_scheduled_at).toLocaleDateString('en-PH', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
      ) : null}

      {/* Action Buttons: Request another date & Contact support */}
      <View style={s.buyerActionsGroup}>
        {!isDelivered && (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [s.buyerPrimaryActionBtn, pressed && s.buyerBtnPressed]}
            onPress={() => setShowDatePicker((prev) => !prev)}
          >
            <Text style={s.buyerPrimaryActionText}>
              {showDatePicker ? 'Close Date Picker' : 'Request another date'}
            </Text>
          </Pressable>
        )}

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            isDelivered ? s.buyerPrimaryActionBtn : s.buyerSecondaryActionBtn,
            pressed && s.buyerBtnPressed,
          ]}
          onPress={contactSupport}
        >
          <Text
            style={
              isDelivered ? s.buyerPrimaryActionText : s.buyerSecondaryActionText
            }
          >
            🎧 Contact support
          </Text>
        </Pressable>
      </View>

      {/* Expandable Date Picker Form */}
      {!isDelivered && showDatePicker && (
        <View style={s.buyerDateFormBox}>
          {currentIncident?.buyer_requested_date ? (
            <Text style={s.buyerRequestedDate}>
              Current requested date: {currentIncident.buyer_requested_date} (Pending confirmation)
            </Text>
          ) : null}
          <TextInput
            accessibilityLabel="Preferred delivery date, YYYY-MM-DD"
            placeholder="Suggest date: YYYY-MM-DD"
            placeholderTextColor="#94A3B8"
            value={date}
            onChangeText={setDate}
            style={s.buyerDateInput}
            maxLength={10}
          />
          <Pressable
            accessibilityRole="button"
            disabled={busy || !/^\d{4}-\d{2}-\d{2}$/.test(date)}
            style={[
              s.buyerDateSubmitBtn,
              (busy || !/^\d{4}-\d{2}-\d{2}$/.test(date)) && s.buyerDateSubmitDisabled,
            ]}
            onPress={requestDate}
          >
            <Text style={s.buyerDateSubmitText}>
              {busy ? 'Sending request…' : 'Submit Preferred Date'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Driver Notification Strip */}
      <View style={s.buyerDriverStrip}>
        <Text style={s.buyerDriverIcon}>🚚</Text>
        <Text style={s.buyerDriverText}>Assigned driver notified</Text>
      </View>

      {/* Policy / Notice Subtitle */}
      <Text style={s.buyerFooterNotice}>
        ⓘ Notify after confirmed ETA; send delay notice earlier if ETA is unknown.
      </Text>

      {message ? <Text style={s.buyerMessage}>{message}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  /* Step 1 Task Card Badge Styles */
  badgeContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    gap: 6,
  },
  badgePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  badgeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F87171',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  badgePillText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badgeDateText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  badgePromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  badgePromptIcon: {
    color: '#D97706',
    fontSize: 12,
  },
  badgePromptText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeArrow: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '800',
  },

  /* Floating Amber Banner */
  floatingBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 94,
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 99,
  },
  floatingBannerPressed: {
    opacity: 0.9,
  },
  floatingBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  floatingBannerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBannerIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  floatingBannerTitle: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '800',
  },
  floatingBannerSub: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '500',
  },
  floatingBannerActionPill: {
    backgroundColor: '#166534',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  floatingBannerActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  /* Option 1: In-Feed Alert Banner */
  inFeedBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  inFeedBannerPressed: {
    opacity: 0.88,
    backgroundColor: '#FEF3C7',
  },
  inFeedBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  inFeedBannerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inFeedBannerIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  inFeedBannerTitle: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 17,
  },
  inFeedBannerSub: {
    color: '#B45309',
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 2,
  },
  inFeedBannerActionPill: {
    backgroundColor: '#166534',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  inFeedBannerActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  /* Modal & Bottom Sheet */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    backgroundColor: '#F8FAEF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '94%',
    overflow: 'hidden',
  },
  sheetHandleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
  },
  sheetBrandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#134B24',
    letterSpacing: -0.5,
  },
  sheetBrandGreen: {
    color: '#16A34A',
  },
  sheetSubTitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  sheetHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '800',
  },
  closeCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeCircleBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
    gap: 14,
  },

  /* Alerts */
  errorAlert: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
  },
  errorAlertText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  successAlert: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 12,
    padding: 12,
  },
  successAlertText: {
    color: '#14532D',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

  /* Form Section */
  formWrapper: {
    gap: 14,
  },
  contextCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contextIconSquircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextIconEmoji: {
    fontSize: 20,
  },
  contextTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  contextLabelText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    flex: 1,
  },
  miniOverduePill: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniOverduePillText: {
    color: '#DC2626',
    fontSize: 9,
    fontWeight: '900',
  },
  contextMetaText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  /* Prompt */
  promptBlock: {
    gap: 3,
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#134B24',
  },
  promptSub: {
    fontSize: 12,
    color: '#64748B',
  },

  /* Reason Tiles */
  reasonsList: {
    gap: 8,
  },
  reasonTile: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reasonTileChosen: {
    backgroundColor: '#F0FDF4',
    borderColor: '#166534',
    borderWidth: 2,
  },
  reasonTileIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonTileEmoji: {
    fontSize: 16,
  },
  reasonTileTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  reasonTileTitleChosen: {
    color: '#14532D',
  },
  reasonTileSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterChosen: {
    borderColor: '#166534',
    backgroundColor: '#166534',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },

  /* Input Section */
  inputSection: {
    gap: 6,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  charCounter: {
    fontSize: 10,
    color: '#64748B',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: '#1E293B',
    minHeight: 80,
    textAlignVertical: 'top',
  },

  /* Evidence Box */
  evidenceBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  evidenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  evidenceIcon: {
    fontSize: 16,
  },
  evidenceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  evidenceSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  evidenceUploadBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  evidenceUploadText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  evidenceClearBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  evidenceClearText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },

  /* Guard Notice */
  guardNotice: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  guardNoticeIcon: {
    color: '#D97706',
    fontSize: 14,
    fontWeight: '900',
  },
  guardNoticeText: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    flex: 1,
  },

  /* Submit CTA */
  submitBtn: {
    backgroundColor: '#166534',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.5,
    backgroundColor: '#94A3B8',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  /* Queue Overview */
  queueWrapper: {
    gap: 12,
  },
  queueHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#134B24',
  },
  queueHeaderSub: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyStateIcon: {
    fontSize: 28,
    color: '#16A34A',
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  emptyStateSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  incidentCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  incidentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  incidentCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  incidentCardMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  incidentStatusStrip: {
    paddingVertical: 4,
  },
  incidentStatusRecovered: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '700',
  },
  incidentStatusPending: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '600',
  },
  incidentActionBtn: {
    backgroundColor: '#166534',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  incidentActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  reasonSubmittedPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 8,
  },
  reasonSubmittedText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    textAlign: 'center',
  },

  /* Step 5: Modern Buyer Card Styles */
  buyerCardModern: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    marginVertical: 12,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  buyerIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyerIconText: {
    fontSize: 24,
  },
  buyerHeadingBox: {
    alignItems: 'center',
    gap: 3,
  },
  buyerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  buyerOrderNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  buyerConfirmedPill: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
  },
  buyerConfirmedPillText: {
    color: '#15803D',
    fontSize: 12.5,
    fontWeight: '800',
  },
  buyerPendingPill: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
  },
  buyerPendingPillText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '700',
  },
  buyerTimeWindowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  buyerCalendarIcon: {
    fontSize: 16,
  },
  buyerTimeWindowText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#14532D',
  },
  buyerActionsGroup: {
    width: '100%',
    gap: 8,
    marginTop: 2,
  },
  buyerPrimaryActionBtn: {
    backgroundColor: '#166534',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyerPrimaryActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  buyerSecondaryActionBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyerSecondaryActionText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  buyerBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  buyerDateFormBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  buyerDateInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1E293B',
  },
  buyerDateSubmitBtn: {
    backgroundColor: '#166534',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buyerDateSubmitDisabled: {
    opacity: 0.5,
    backgroundColor: '#94A3B8',
  },
  buyerDateSubmitText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  buyerDriverStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    width: '100%',
  },
  buyerDriverIcon: {
    fontSize: 14,
  },
  buyerDriverText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '700',
  },
  buyerFooterNotice: {
    fontSize: 10.5,
    color: '#64748B',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 14,
  },
  buyerRequestedDate: {
    fontSize: 11,
    color: '#0369A1',
    fontWeight: '600',
    marginBottom: 4,
  },
  buyerMessage: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
  },
});
