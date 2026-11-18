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
  reason_notes?: string | null;
  can_continue?: boolean | null;
  reason_submitted_at: string | null;
  recovered_at: string | null;
  recovery_action?: string | null;
  new_scheduled_at: string | null;
  classification: string;
};

const needsPostCompletionReason = (item: Incident) =>
  item.task_id != null && item.recovery_action === 'completed' && !item.reason_submitted_at;

type ReasonOption = {
  code: string;
  label: string;
};

const DRIVER_REASONS: ReasonOption[] = [
  { code: 'vehicle_breakdown', label: 'Vehicle breakdown' },
  { code: 'traffic_road_closure', label: 'Traffic or road closure' },
  { code: 'customer_unavailable', label: 'Customer unavailable' },
  { code: 'weather', label: 'Severe weather' },
  { code: 'supplies_unavailable', label: 'Cargo or warehouse delay' },
  { code: 'illness_emergency', label: 'Illness or emergency' },
  { code: 'other', label: 'Other' },
];

const WORKER_REASONS: ReasonOption[] = [
  { code: 'supplies_unavailable', label: 'Supplies or tools unavailable' },
  { code: 'weather', label: 'Severe weather' },
  { code: 'traffic_road_closure', label: 'Field inaccessible' },
  { code: 'illness_emergency', label: 'Illness or emergency' },
  { code: 'vehicle_breakdown', label: 'Machinery or tool failure' },
  { code: 'other', label: 'Other' },
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

export function OverdueBadge({
  scheduledAt,
  taskId,
  orderId,
}: {
  scheduledAt?: string | null;
  taskId?: number;
  orderId?: number;
}) {
  const { incidents } = useOperationsRecovery();
  if (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) return null;

  const isOverdue = dayFormat.format(new Date(scheduledAt)) < dayFormat.format(new Date());
  if (!isOverdue) return null;

  const dateText = new Date(scheduledAt).toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
  });
  const submitted = incidents.find((item) => !item.recovered_at && item.reason_submitted_at &&
    (taskId != null ? item.task_id === taskId : item.order_id === orderId));
  const reasonLabel = (taskId != null ? WORKER_REASONS : DRIVER_REASONS).find((item) => item.code === submitted?.reason_code)?.label;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={submitted ? 'Overdue work. Delay reason submitted' : 'Overdue work. Tap to submit delay reason'}
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

      <Text numberOfLines={2} style={s.badgePromptText}>{submitted ? `Reason: ${reasonLabel || 'Submitted'}${submitted.reason_notes ? ` — ${submitted.reason_notes}` : ''}` : 'Tap to submit a delay reason'}</Text>
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

export function OperationsRecoveryProvider({ children }: { children?: React.ReactNode }) {
  const { profile } = useAuth();
  const path = usePathname();
  const enabled =
    profile?.role === 'farm_worker' &&
    profile.worker_category === 'driver' &&
    !!profile.onboarding_completed_at;

  const isDriver = profile?.worker_category === 'driver';
  const roleReasons = isDriver ? DRIVER_REASONS : WORKER_REASONS;

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [canContinue, setCanContinue] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  const generation = useRef(0);
  const requestedTarget = useRef<{ taskId?: number; orderId?: number; incidentId?: number } | null>(null);
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
      if (requestedTarget.current) {
        const target = requestedTarget.current;
        const match = (data.incidents || []).find((item) =>
          target.incidentId === item.id ||
          target.taskId === item.task_id ||
          target.orderId === item.order_id
        );
        if (match && !match.reason_submitted_at && (!match.recovered_at || needsPostCompletionReason(match))) {
          setSelected(match);
          setReason(match.reason_code || '');
          setNotes('');
          setCanContinue(needsPostCompletionReason(match) ? true : null);
        }
        requestedTarget.current = null;
      }
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
      setSelected(null);
      requestedTarget.current = target || null;
      load();
    };
    return () => {
      openModalHandler = null;
    };
  }, [load]);

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

  const active = incidents.filter((item) => !item.recovered_at || needsPostCompletionReason(item));
  const missing = active.filter((item) => !item.reason_submitted_at);

  const openRecovery = useCallback((target?: { taskId?: number; orderId?: number; incidentId?: number }) => {
    setOpen(true);
    setError('');
    setSuccessToast('');
    setSelected(null);
    requestedTarget.current = target || null;
    load();
  }, [load]);

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

  function handleSelectIncident(item: Incident) {
    requestedTarget.current = null;
    setSelected(item);
    setReason(item.reason_code || '');
    setNotes('');
    setCanContinue(needsPostCompletionReason(item) ? true : null);
    setError('');
  }

  async function submit() {
    if (!selected || busy) return;
    setBusy(true);
    setError('');

    try {
      await apiRequest(`/api/operations/${selected.id}/reason`, {
        method: 'POST',
        body: JSON.stringify({ reason_code: reason, notes: notes.trim(), can_continue: needsPostCompletionReason(selected) ? true : canContinue }),
      });
      setSelected(null);
      setReason('');
      setNotes('');
      setCanContinue(null);
      setSuccessToast('Delay reason submitted. The admin has been notified.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to submit delay reason.');
    } finally {
      setBusy(false);
    }
  }

  const isFormValid = !!reason && notes.trim().length >= 5 && notes.trim().length <= 2000 && (selected != null && needsPostCompletionReason(selected) || canContinue !== null);

  return (
    <OperationsRecoveryContext.Provider value={contextValue}>
      {children}

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
            <View style={s.sheetHandleBar} />
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
                <Text style={s.sheetBrandTitle}>{selected ? 'Delay reason' : 'Overdue work'}</Text>
              </View>

              <View style={s.sheetHeaderRight}>
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
                  <Text style={s.closeCircleBtnText}>×</Text>
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
                  <Text style={s.errorAlertText}>{error}</Text>
                </View>
              ) : null}

              {successToast ? (
                <View style={s.successAlert}>
                  <Text style={s.successAlertText}>{successToast}</Text>
                </View>
              ) : null}

              {selected ? (
                <View style={s.formWrapper}>
                  <View style={s.contextCard}>
                    <View style={s.contextContent}>
                      <View style={s.contextTitleRow}>
                        <Text style={s.contextLabelText} numberOfLines={1}>
                          {selected.label}
                        </Text>
                        <View style={s.miniOverduePill}>
                          <Text style={s.miniOverduePillText}>OVERDUE</Text>
                        </View>
                      </View>
                      <Text style={s.contextMetaText}>
                        Scheduled{' '}
                        {new Date(selected.scheduled_at).toLocaleDateString('en-PH', {
                          timeZone: 'Asia/Manila',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>

                  <View style={s.promptBlock}>
                    <Text style={s.promptTitle}>
                      {selected.order_id
                        ? 'Why was this delivery delayed?'
                        : 'Why was this task delayed?'}
                    </Text>
                    <Text style={s.promptSub}>Choose a reason and explain what happened.</Text>
                  </View>

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
                          <Text style={[s.reasonTileTitle, isChosen && s.reasonTileTitleChosen]}>
                            {item.label}
                          </Text>
                          <View style={[s.radioOuter, isChosen && s.radioOuterChosen]}>
                            {isChosen ? <View style={s.radioInner} /> : null}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={s.inputSection}>
                    <View style={s.inputLabelRow}>
                      <Text style={s.inputLabel}>Explanation</Text>
                      <Text style={s.charCounter}>{notes.length}/2000</Text>
                    </View>
                    <TextInput
                      accessibilityLabel="Delay explanation"
                      multiline
                      maxLength={2000}
                      editable={!busy}
                      placeholder="Explain the delay (at least 5 characters)"
                      placeholderTextColor="#94A3B8"
                      value={notes}
                      onChangeText={setNotes}
                      style={s.textArea}
                    />
                  </View>

                  {!needsPostCompletionReason(selected) && <View style={s.inputSection}>
                    <Text style={s.inputLabel}>
                      Can you still complete this {selected.order_id ? 'delivery' : 'task'}?
                    </Text>
                    <View style={s.reasonsList}>
                      {[
                        { value: true, label: 'Yes, I can continue' },
                        { value: false, label: 'No, I cannot continue' },
                      ].map((option) => (
                        <Pressable
                          key={option.label}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: canContinue === option.value }}
                          disabled={busy}
                          onPress={() => setCanContinue(option.value)}
                          style={[s.reasonTile, canContinue === option.value && s.reasonTileChosen]}
                        >
                          <Text style={[s.reasonTileTitle, canContinue === option.value && s.reasonTileTitleChosen]}>{option.label}</Text>
                          <View style={[s.radioOuter, canContinue === option.value && s.radioOuterChosen]}>
                            {canContinue === option.value ? <View style={s.radioInner} /> : null}
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  </View>}

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
                      <Text style={s.submitBtnText}>Submit delay reason</Text>
                    )}
                  </Pressable>
                </View>
              ) : (
                <View style={s.queueWrapper}>
                  {active.length === 0 ? (
                    <View style={s.emptyState}>
                      <Text style={s.emptyStateTitle}>No overdue work</Text>
                    </View>
                  ) : null}

                  {active.map((item) => {
                    const needsReason = !item.reason_submitted_at;
                    return (
                      <View key={item.id} style={s.incidentCard}>
                        <View style={s.incidentCardHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.incidentCardTitle}>{item.label}</Text>
                            <Text style={s.incidentCardMeta}>
                              Scheduled{' '}
                              {new Date(item.scheduled_at).toLocaleDateString('en-PH', {
                                timeZone: 'Asia/Manila',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </Text>
                          </View>
                          <View style={s.miniOverduePill}>
                            <Text style={s.miniOverduePillText}>{item.recovered_at ? 'SUBMITTED' : 'OVERDUE'}</Text>
                          </View>
                        </View>

                        {needsReason ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Submit delay reason"
                            onPress={() => handleSelectIncident(item)}
                            style={s.incidentActionBtn}
                          >
                            <Text style={s.incidentActionBtnText}>Submit delay reason</Text>
                          </Pressable>
                        ) : (
                          <Text style={s.reasonSubmittedText}>
                            {item.classification === 'pending'
                              ? `Reason submitted for admin review${item.can_continue === false ? ' · Cannot continue' : ''}`
                              : `Admin review: ${item.classification}`}
                          </Text>
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
        <Text style={s.inFeedBannerTitle}>{activeCount} overdue {entityName.toLowerCase()}</Text>
        <Text style={s.inFeedBannerSub}>
          {missingCount > 0 ? 'Submit a delay reason' : 'Admin review in progress'}
        </Text>
      </View>
      <Text style={s.inFeedBannerActionText}>View</Text>
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
  badgeContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E8DB',
    borderLeftWidth: 3,
    borderLeftColor: '#C74732',
    borderRadius: 12,
    padding: 12,
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
    backgroundColor: '#FFF1EC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F2D0C6',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C74732',
  },
  badgePillText: {
    color: '#B93224',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badgeDateText: {
    color: '#607263',
    fontSize: 11,
    fontWeight: '600',
  },
  badgePromptText: {
    color: '#176D34',
    fontSize: 12,
    fontWeight: '600',
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

  inFeedBanner: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E8DB',
    borderLeftWidth: 3,
    borderLeftColor: '#C74732',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  inFeedBannerPressed: {
    opacity: 0.88,
    backgroundColor: '#F8FAEF',
  },
  inFeedBannerLeft: {
    flex: 1,
    paddingRight: 8,
  },
  inFeedBannerTitle: {
    color: '#213B27',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 17,
  },
  inFeedBannerSub: {
    color: '#607263',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  inFeedBannerActionText: {
    color: '#176D34',
    fontSize: 12,
    fontWeight: '700',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 36, 23, 0.48)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    backgroundColor: '#F8FAEF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '94%',
    overflow: 'hidden',
  },
  sheetHandleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD8CA',
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
    borderBottomColor: '#E0E8DB',
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
    backgroundColor: '#F2F6EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#315638',
  },
  sheetBrandTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#134B24',
    letterSpacing: -0.5,
  },
  sheetHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F6EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeCircleBtnText: {
    fontSize: 20,
    fontWeight: '400',
    color: '#315638',
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
    backgroundColor: '#EAF6E8',
    borderWidth: 1,
    borderColor: '#C7E1C2',
    borderRadius: 12,
    padding: 12,
  },
  successAlertText: {
    color: '#14532D',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'left',
  },

  formWrapper: {
    gap: 14,
  },
  contextCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E8DB',
    borderRadius: 12,
    padding: 14,
  },
  contextContent: {
    gap: 5,
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
    color: '#213B27',
    flex: 1,
  },
  miniOverduePill: {
    backgroundColor: '#FFF1EC',
    borderWidth: 1,
    borderColor: '#F2D0C6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniOverduePillText: {
    color: '#B93224',
    fontSize: 9,
    fontWeight: '900',
  },
  contextMetaText: {
    fontSize: 11,
    color: '#607263',
    marginTop: 2,
  },

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

  reasonsList: {
    gap: 6,
  },
  reasonTile: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E8DB',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reasonTileChosen: {
    backgroundColor: '#F2F8EF',
    borderColor: '#176D34',
  },
  reasonTileTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#213B27',
  },
  reasonTileTitleChosen: {
    color: '#14532D',
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
    color: '#213B27',
  },
  charCounter: {
    fontSize: 10,
    color: '#607263',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4DFD0',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#213B27',
    minHeight: 80,
    textAlignVertical: 'top',
  },

  submitBtn: {
    backgroundColor: '#176D34',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
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

  queueWrapper: {
    gap: 12,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E8DB',
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#213B27',
  },
  incidentCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E8DB',
    borderRadius: 12,
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
    color: '#213B27',
  },
  incidentCardMeta: {
    fontSize: 11,
    color: '#607263',
    marginTop: 1,
  },
  incidentActionBtn: {
    backgroundColor: '#176D34',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  incidentActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  reasonSubmittedText: {
    fontSize: 12,
    color: '#607263',
    fontWeight: '600',
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
