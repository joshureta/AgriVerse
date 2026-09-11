import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { BuyerOrder, CancelReasonCategory, cancelBuyerOrder } from '@/lib/buyer-marketplace';
import { styles } from '@/styles/buyer-cancel-order-modal.styles';

const CANCEL_REASONS: { value: CancelReasonCategory; label: string }[] = [
  { value: 'changed_mind', label: 'I changed my mind' },
  { value: 'mistake', label: 'I ordered by mistake' },
  { value: 'price', label: 'Found a better price elsewhere' },
  { value: 'slow', label: 'Delivery is taking too long' },
  { value: 'other', label: 'Other' },
];

function CloseIcon({ color = '#556658', size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6 6 18M6 6l12 12" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
      {selected ? <View style={styles.radioInner} /> : null}
    </View>
  );
}

export function BuyerCancelOrderModal({
  order,
  onClose,
  onCancelled,
}: {
  order: BuyerOrder | null;
  onClose: () => void;
  onCancelled: (order: BuyerOrder) => void;
}) {
  const [reason, setReason] = useState<CancelReasonCategory | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handleClose() {
    if (submitting) return;
    setReason(null);
    setNote('');
    setError('');
    onClose();
  }

  async function handleConfirm() {
    if (!order || !reason) return;
    if (reason === 'other' && !note.trim()) {
      setError('Tell us what happened.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const updated = await cancelBuyerOrder(order.id, { category: reason, note });
      setReason(null);
      setNote('');
      onCancelled(updated);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not cancel this order.');
    } finally {
      setSubmitting(false);
    }
  }

  const willRefundGcash = order?.payment_method === 'gcash' && order?.payment_status === 'paid';

  return (
    <Modal animationType="slide" onRequestClose={handleClose} transparent visible={Boolean(order)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHandleBar} />
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Cancel this order?</Text>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              hitSlop={8}
              onPress={handleClose}
              style={styles.modalCloseButton}>
              <CloseIcon />
            </Pressable>
          </View>
          <Text style={styles.modalSubtitle}>
            This can&apos;t be undone. The farm will be notified right away and stock will be released back to the
            shop.
          </Text>

          {order ? (
            <View style={styles.orderSummary}>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderSummaryNumber}>{order.order_number}</Text>
                <Text numberOfLines={1} style={styles.orderSummaryItems}>
                  {order.items.map((item) => `${item.quantity} ${item.product_name}`).join(', ')}
                </Text>
              </View>
              <Text style={styles.orderSummaryTotal}>₱{Number(order.total_amount || 0).toFixed(2)}</Text>
            </View>
          ) : null}

          <Text style={styles.reasonsLabel}>Tell us why (helps us improve)</Text>
          {CANCEL_REASONS.map((option) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: reason === option.value }}
              key={option.value}
              onPress={() => setReason(option.value)}
              style={styles.reasonRow}>
              <RadioDot selected={reason === option.value} />
              <Text style={styles.reasonText}>{option.label}</Text>
            </Pressable>
          ))}
          {reason === 'other' ? (
            <TextInput
              multiline
              numberOfLines={3}
              onChangeText={setNote}
              placeholder="What happened?"
              placeholderTextColor="#8B9B8E"
              style={styles.noteInput}
              value={note}
            />
          ) : null}

          {willRefundGcash ? (
            <View style={styles.refundNote}>
              <Text style={styles.refundNoteText}>
                Paid via GCash — ₱{Number(order?.total_amount || 0).toFixed(2)} will be refunded to your GCash
                account.
              </Text>
            </View>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.modalActions}>
            <Pressable
              disabled={submitting}
              onPress={handleClose}
              style={[styles.keepButton, submitting && styles.buttonDisabled]}>
              <Text style={styles.keepButtonText}>Keep order</Text>
            </Pressable>
            <Pressable
              disabled={!reason || submitting}
              onPress={handleConfirm}
              style={[styles.confirmButton, (!reason || submitting) && styles.buttonDisabled]}>
              {submitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>Yes, cancel order</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
