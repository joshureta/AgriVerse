import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { apiRequest } from '@/lib/api';

const GREEN = '#176D34';

type DisputeOrder = {
  id: number;
  order_number: string;
  delivery_full_name: string;
  delivery_dispute_reason: string;
  delivery_dispute_category: string;
  delivery_dispute_response: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  damaged: 'Damaged',
  wrong_item: 'Wrong item',
  missing_item: 'Missing item',
  spoiled_rotten: 'Spoiled / Rotten',
  wrong_quantity: 'Wrong quantity',
};

export default function DriverDisputeResponseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<DisputeOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const loadDispute = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest<{ orders: DisputeOrder[] }>('/api/driver/orders/disputes');
      const match = (result.orders || []).find((item) => String(item.id) === String(id));
      if (!match) {
        setError('This dispute is no longer waiting for a response.');
        setOrder(null);
      } else {
        setOrder(match);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load this dispute.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDispute();
  }, [loadDispute]);

  async function handleSubmit() {
    if (!order || !response.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await apiRequest(`/api/driver/orders/${order.id}/dispute-response`, {
        method: 'POST',
        body: JSON.stringify({ response: response.trim() }),
      });
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send your response.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator color={GREEN} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (sent) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <View style={styles.sentBadge}>
            <Text style={styles.sentBadgeText}>✓</Text>
          </View>
          <Text style={styles.sentTitle}>Response Sent</Text>
          <Text style={styles.sentBody}>The admin will factor this into the review. No further action needed from you.</Text>
          <Pressable onPress={() => router.back()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Back to Deliveries</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>{order ? `Dispute · ${order.order_number}` : 'Dispute'}</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {order && (
          <>
            <View style={styles.reportCard}>
              <Text style={styles.reportLabel}>Buyer's Report</Text>
              <Text style={styles.reportCategory}>{CATEGORY_LABELS[order.delivery_dispute_category] || order.delivery_dispute_category}</Text>
              <Text style={styles.reportBody}>{order.delivery_dispute_reason}</Text>
            </View>

            <Text style={styles.fieldLabel}>What happened on your end?</Text>
            <TextInput
              multiline
              maxLength={2000}
              onChangeText={setResponse}
              placeholder="Describe what you picked up and delivered…"
              placeholderTextColor="#9ca3af"
              style={styles.textarea}
              value={response}
            />

            <Text style={styles.helpText}>
              Your response goes to the admin reviewing this dispute — it isn't sent to the buyer directly, and there's no back-and-forth needed.
            </Text>

            <Pressable
              disabled={submitting || !response.trim()}
              onPress={handleSubmit}
              style={[styles.primaryButton, (submitting || !response.trim()) && styles.buttonDisabled]}>
              {submitting ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.primaryButtonText}>Send My Response</Text>}
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAEF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  content: { padding: 20, paddingBottom: 40 },
  backLink: { marginBottom: 10 },
  backLinkText: { color: GREEN, fontSize: 13, fontWeight: '700' },
  title: { color: '#10351D', fontSize: 18, fontWeight: '800', marginBottom: 16 },
  errorText: { color: '#a33d35', fontSize: 12.5, marginBottom: 12 },
  reportCard: {
    backgroundColor: '#FDF1D2',
    borderWidth: 1,
    borderColor: '#F0E2B8',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  reportLabel: { color: '#8A6A12', fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  reportCategory: { color: '#5c470d', fontSize: 13.5, fontWeight: '800', marginTop: 6 },
  reportBody: { color: '#7a611c', fontSize: 12.5, marginTop: 4, lineHeight: 18 },
  fieldLabel: { color: '#2c5330', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  textarea: {
    minHeight: 110,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C8D9C3',
    backgroundColor: '#F7FAF5',
    color: '#10351D',
    fontSize: 12.5,
    padding: 12,
    textAlignVertical: 'top',
  },
  helpText: { color: '#5a695d', fontSize: 11, lineHeight: 16, marginTop: 10, marginBottom: 18 },
  primaryButton: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 13.5, fontWeight: '800' },
  buttonDisabled: { opacity: 0.55 },
  sentBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EAF2E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  sentBadgeText: { color: GREEN, fontSize: 26, fontWeight: '800' },
  sentTitle: { color: '#10351D', fontSize: 16, fontWeight: '800' },
  sentBody: { color: '#5a695d', fontSize: 12.5, textAlign: 'center', marginTop: 8, marginBottom: 22, lineHeight: 18 },
});
