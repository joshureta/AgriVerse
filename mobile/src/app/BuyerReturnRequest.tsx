import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { BuyerHeader } from '@/components/buyer-header';
import { BuyerOrder, DisputeCategory, loadBuyerOrder, reportBuyerOrderDispute } from '@/lib/buyer-marketplace';
import { GREEN, styles } from '@/styles/buyer-order-tracking.styles';

const issues: { value: DisputeCategory; label: string; help: string }[] = [
  { value: 'damaged', label: 'Damaged', help: 'Bruised, crushed, or leaking' },
  { value: 'spoiled_rotten', label: 'Spoiled / rotten', help: 'Not fresh or safe to use' },
  { value: 'wrong_item', label: 'Wrong item', help: 'Different product or size' },
  { value: 'missing_item', label: 'Missing item', help: 'An item was not included' },
  { value: 'wrong_quantity', label: 'Wrong quantity', help: 'You received fewer items' },
];

type Resolution = 'refund' | 'replacement';
type Photo = { uri: string; base64: string; mime: string };

export default function BuyerReturnRequest() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [order, setOrder] = useState<BuyerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [category, setCategory] = useState<DisputeCategory | ''>('');
  const [resolution, setResolution] = useState<Resolution>('refund');
  const [itemId, setItemId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setError('No order was specified.');
      setLoading(false);
      return;
    }
    try {
      setOrder(await loadBuyerOrder(Number(id)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load this order.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const item = order?.items.find((candidate) => candidate.id === itemId);
  const canSubmit = Boolean(category && itemId && quantity && reason.trim() && photos.length);

  async function choosePhoto() {
    if (photos.length >= 6) return Alert.alert('Limit reached', 'You can attach up to 6 photos.');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') return setError('Photo gallery permission is required to add evidence.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, base64: true });
    if (!result.canceled && result.assets[0]?.base64) {
      const asset = result.assets[0];
      setPhotos((current) => [...current, { uri: asset.uri, base64: asset.base64 as string, mime: asset.mimeType || 'image/jpeg' }]);
    }
  }

  async function submit() {
    if (!order || !category || !itemId || !canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const resolutionPrefix = resolution === 'replacement'
        ? '[Requested Resolution: Replacement Fruit]\n'
        : '[Requested Resolution: Refund Only]\n';
      const itemsPrefix = item ? `[Affected Items: ${item.product_name} (${quantity} pcs)]\n\n` : '';
      const fullReason = `${resolutionPrefix}${itemsPrefix}${reason.trim()}`.slice(0, 1000);

      await reportBuyerOrderDispute(order.id, {
        category,
        itemId,
        affectedQuantity: Number(quantity),
        reason: fullReason,
        photos: photos.map((photo) => ({ data: photo.base64, mime: photo.mime })),
      });
      router.replace({ pathname: '/BuyerOrderTracking', params: { id: String(order.id) } });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not submit this report.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <BuyerHeader showBack />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.returnEyebrow}>RETURN / REFUND REQUEST</Text>
        <Text style={styles.returnTitle}>Report a delivery issue</Text>
        <Text style={styles.confirmationText}>
          Tell us what happened. We’ll review your report and arrange the appropriate resolution.
        </Text>

        {loading ? (
          <ActivityIndicator color={GREEN} style={{ marginTop: 40 }} />
        ) : error && !order ? (
          <Text style={styles.actionErrorText}>{error}</Text>
        ) : order ? (
          <View style={[styles.card, { marginTop: 16 }]}>
            <View style={styles.returnOrderSummary}>
              <View style={styles.itemIconBox}>
                <Image accessibilityIgnoresInvertColors source={require('@/assets/images/pineapple-product.png')} style={styles.itemImage} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailValue}>{order.order_number}</Text>
                <Text style={styles.itemMeta}>{order.items.map((entry) => `${entry.quantity} ${entry.product_name}`).join(', ')}</Text>
              </View>
              <Text style={styles.totalValue}>₱{Number(order.total_amount).toFixed(2)}</Text>
            </View>

            <View style={styles.disputeIntro}>
              <Text style={styles.disputeStep}>STEP 1 OF 4</Text>
              <Text style={styles.disputeIntroTitle}>What happened?</Text>
              <Text style={styles.disputeIntroText}>Choose the issue that best matches your delivery.</Text>
            </View>
            <View style={styles.returnIssueList}>
              {issues.map((issue) => (
                <Pressable
                  key={issue.value}
                  onPress={() => setCategory(issue.value)}
                  style={[styles.returnIssue, category === issue.value && styles.chipSelected]}>
                  <Text style={[styles.chipText, category === issue.value && styles.chipTextSelected]}>{issue.label}</Text>
                  <Text style={styles.chipHelpText}>{issue.help}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.disputeFieldLabel, { marginTop: 16 }]}>STEP 2 OF 4 — Preferred resolution</Text>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: resolution === 'refund' }}
              onPress={() => setResolution('refund')}
              style={[styles.resCard, resolution === 'refund' && styles.resCardSelected]}>
              <View style={[styles.resRadio, resolution === 'refund' && styles.resRadioSelected]}>
                {resolution === 'refund' ? <View style={styles.resRadioDot} /> : null}
              </View>
              <View style={styles.resBody}>
                <Text style={styles.resBodyTitle}>
                  Refund Only<Text style={styles.resBadge}>  Recommended</Text>
                </Text>
                <Text style={styles.resBodySub}>Refunded to your original payment method.</Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: resolution === 'replacement' }}
              onPress={() => setResolution('replacement')}
              style={[styles.resCard, resolution === 'replacement' && styles.resCardSelected]}>
              <View style={[styles.resRadio, resolution === 'replacement' && styles.resRadioSelected]}>
                {resolution === 'replacement' ? <View style={styles.resRadioDot} /> : null}
              </View>
              <View style={styles.resBody}>
                <Text style={styles.resBodyTitle}>Replacement Fruit</Text>
                <Text style={styles.resBodySub}>New pineapples scheduled on the next farm delivery route.</Text>
              </View>
            </Pressable>

            <Text style={styles.disputeFieldLabel}>STEP 3 — Affected item</Text>
            <View style={styles.chipRow}>
              {order.items.map((entry) => (
                <Pressable
                  key={entry.id}
                  onPress={() => { setItemId(entry.id); setQuantity(''); }}
                  style={[styles.chip, itemId === entry.id && styles.chipSelected]}>
                  <Text style={styles.chipText}>{entry.product_name} ({entry.quantity})</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              editable={Boolean(itemId)}
              keyboardType="number-pad"
              onChangeText={setQuantity}
              placeholder={item ? `Affected quantity (up to ${item.quantity})` : 'Select an item first'}
              placeholderTextColor="#9ca3af"
              style={[styles.quantityInput, { marginTop: 10 }]}
              value={quantity}
            />
            <Text style={styles.disputeFieldLabel}>Describe the issue</Text>
            <TextInput
              multiline
              maxLength={1000}
              onChangeText={setReason}
              placeholder="For example: two pineapples arrived bruised and leaking."
              placeholderTextColor="#9ca3af"
              style={styles.disputeInput}
              value={reason}
            />

            <Text style={styles.disputeFieldLabel}>STEP 4 — Photo evidence (required)</Text>
            <Pressable onPress={choosePhoto} style={styles.addPhotoButton}>
              <Text style={styles.addPhotoButtonText}>+ Add photo ({photos.length}/6)</Text>
            </Pressable>
            <Text style={styles.evidenceHelp}>Show the item, packaging, and any damage.</Text>
            {photos.length > 0 && (
              <View style={styles.photoRow}>
                {photos.map((photo) => (
                  <Image key={photo.uri} source={{ uri: photo.uri }} style={styles.photoThumb} />
                ))}
              </View>
            )}

            {error && <Text style={styles.actionErrorText}>{error}</Text>}

            <View style={styles.actionRow}>
              <Pressable disabled={!canSubmit || submitting} onPress={submit} style={[styles.dangerButton, (!canSubmit || submitting) && styles.buttonDisabled]}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.dangerButtonText}>Submit report</Text>}
              </Pressable>
              <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
