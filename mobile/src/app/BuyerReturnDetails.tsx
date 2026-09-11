import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { BuyerHeader } from '@/components/buyer-header';
import { BuyerOrder, BuyerOrderItem, DisputeCategory, loadBuyerOrder } from '@/lib/buyer-marketplace';
import { GREEN, styles } from '@/styles/buyer-return-details.styles';

const CATEGORY_LABELS: Record<DisputeCategory, string> = {
  damaged: 'Damaged produce',
  spoiled_rotten: 'Spoiled / rotten produce',
  wrong_item: 'Wrong item received',
  missing_item: 'Missing item in delivery',
  wrong_quantity: 'Incorrect quantity delivered',
};

type AffectedItem = BuyerOrderItem & { affectedQty: number; subtotal: number };

function parseDisputeReason(raw: string | null) {
  if (!raw) return { resolutionLabel: 'Refund Only', itemsBreakdownText: '', description: '' };
  let resolutionLabel = 'Refund Only';
  let itemsBreakdownText = '';
  let description = raw;

  const resolutionMatch = raw.match(/\[Requested Resolution:\s*([^\]]+)\]/);
  if (resolutionMatch) {
    resolutionLabel = resolutionMatch[1].trim();
    description = description.replace(resolutionMatch[0], '').trim();
  }

  const itemsMatch = raw.match(/\[Affected Items:\s*([^\]]+)\]/);
  if (itemsMatch) {
    itemsBreakdownText = itemsMatch[1].trim();
    description = description.replace(itemsMatch[0], '').trim();
  }

  return { resolutionLabel, itemsBreakdownText, description };
}

function buildAffectedItems(order: BuyerOrder, itemsBreakdownText: string): AffectedItem[] {
  if (itemsBreakdownText) {
    const matched = order.items.filter((item) => itemsBreakdownText.includes(item.product_name));
    if (matched.length > 0) {
      return matched.map((item) => {
        const regex = new RegExp(`${item.product_name}\\s*\\((\\d+)\\s*pcs?\\)`, 'i');
        const match = itemsBreakdownText.match(regex);
        const qty = match ? Number(match[1]) : item.quantity;
        return { ...item, affectedQty: qty, subtotal: qty * (Number(item.unit_price) || 0) };
      });
    }
  }

  if (order.delivery_dispute_item_id) {
    const single = order.items.find((entry) => entry.id === order.delivery_dispute_item_id);
    if (single) {
      const qty = order.delivery_dispute_affected_quantity || single.quantity;
      return [{ ...single, affectedQty: qty, subtotal: qty * (Number(single.unit_price) || 0) }];
    }
  }

  return order.items.slice(0, 1).map((item) => ({
    ...item,
    affectedQty: order.delivery_dispute_affected_quantity || 1,
    subtotal: (order.delivery_dispute_affected_quantity || 1) * (Number(item.unit_price) || 0),
  }));
}

function formatDate(value: string | null) {
  if (!value) return 'Recently';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function BackIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke="#556658" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MessageIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        stroke="#ffffff"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function BuyerReturnDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [order, setOrder] = useState<BuyerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setError('No order was specified.');
      setLoading(false);
      return;
    }
    try {
      setOrder(await loadBuyerOrder(Number(id)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load this dispute.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const parsed = useMemo(() => parseDisputeReason(order?.delivery_dispute_reason ?? null), [order]);
  const affectedItems = useMemo(() => (order ? buildAffectedItems(order, parsed.itemsBreakdownText) : []), [order, parsed.itemsBreakdownText]);
  const totalRefund = useMemo(() => {
    if (order?.refund_amount != null) return Number(order.refund_amount);
    return affectedItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  }, [order, affectedItems]);
  const photos = order?.delivery_dispute_photo_urls || [];
  const isResolved = order?.delivery_dispute_status === 'resolved';

  return (
    <SafeAreaView style={styles.safeArea}>
      <BuyerHeader showBack />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backRow}>
          <BackIcon />
          <Text style={styles.backText}>Back to delivery tracking</Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator color={GREEN} style={{ marginTop: 40 }} />
        ) : error || !order ? (
          <Text style={styles.loadError}>{error || 'Dispute not found.'}</Text>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eyebrow}>DISPUTE &amp; CLAIM SUMMARY</Text>
                  <Text style={styles.title}>Return / Refund Details</Text>
                  <Text style={styles.meta}>
                    Order {order.order_number} · Submitted {formatDate(order.delivery_dispute_created_at)}
                  </Text>
                </View>
                <View style={[styles.statusPill, isResolved ? styles.statusPillResolved : styles.statusPillOpen]}>
                  <View style={[styles.statusDot, isResolved ? styles.statusDotResolved : styles.statusDotOpen]} />
                  <Text style={[styles.statusPillText, isResolved ? styles.statusPillTextResolved : styles.statusPillTextOpen]}>
                    {isResolved ? 'Resolved' : 'Under Review'}
                  </Text>
                </View>
              </View>

              <View style={[styles.stepsRow, { marginTop: 18 }]}>
                <View style={styles.step}>
                  <View style={[styles.stepDot, styles.stepDotDone]}>
                    <Text style={[styles.stepDotText, { color: '#fff' }]}>✓</Text>
                  </View>
                  <Text style={styles.stepLabel}>Report submitted</Text>
                </View>
                <View style={styles.step}>
                  <View style={[styles.stepDot, isResolved ? styles.stepDotDone : styles.stepDotPending]}>
                    <Text style={[styles.stepDotText, isResolved && { color: '#fff' }]}>{isResolved ? '✓' : '2'}</Text>
                  </View>
                  <Text style={[styles.stepLabel, !isResolved && styles.stepLabelPending]}>Return decision</Text>
                </View>
                <View style={styles.step}>
                  <View style={[styles.stepDot, isResolved ? styles.stepDotDone : styles.stepDotPending]}>
                    <Text style={[styles.stepDotText, isResolved && { color: '#fff' }]}>{isResolved ? '✓' : '3'}</Text>
                  </View>
                  <Text style={[styles.stepLabel, !isResolved && styles.stepLabelPending]}>Refund completed</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Affected Produce</Text>
                <Text style={styles.sectionSub}>{CATEGORY_LABELS[order.delivery_dispute_category as DisputeCategory] || 'Damaged produce'}</Text>
              </View>

              {affectedItems.map((item, index) => (
                <View key={item.id} style={[styles.itemRow, index === 0 && styles.itemRowFirst]}>
                  <View style={styles.itemIconBox}>
                    <Image accessibilityIgnoresInvertColors source={require('@/assets/images/pineapple-product.png')} style={styles.itemImage} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.product_name}</Text>
                    <Text style={styles.itemMeta}>
                      {item.affectedQty} pcs affected · ₱{Number(item.unit_price || 0).toFixed(2)} each
                    </Text>
                  </View>
                  <Text style={styles.itemSubtotal}>₱{Number(item.subtotal || 0).toFixed(2)}</Text>
                </View>
              ))}

              <View style={styles.claimTotalRow}>
                <View>
                  <Text style={styles.claimLabel}>Requested Resolution</Text>
                  <Text style={styles.claimValue}>{parsed.resolutionLabel}</Text>
                </View>
                <View>
                  <Text style={[styles.claimLabel, { textAlign: 'right' }]}>Total Claim</Text>
                  <Text style={styles.claimValueRight}>₱{totalRefund.toFixed(2)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.advisory}>
              <Text style={{ fontSize: 16 }}>🛡️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.advisoryTitle}>Important notice</Text>
                <Text style={styles.advisoryText}>
                  Please keep the affected produce and delivery packaging intact until customer support completes the review.
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Submitted Evidence</Text>
                <Text style={styles.sectionSub}>{photos.length} photo{photos.length === 1 ? '' : 's'}</Text>
              </View>

              {photos.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
                  {photos.map((url, index) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`View photo evidence ${index + 1}`}
                      key={url || index}
                      onPress={() => setActivePhoto(url)}
                      style={{ position: 'relative' }}>
                      <Image source={{ uri: url }} style={styles.photoThumb} />
                      <View style={styles.photoThumbZoom}>
                        <Text style={styles.photoThumbZoomText}>⤢</Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.emptyPhotosText}>No photos were submitted with this dispute.</Text>
              )}

              <View style={styles.descriptionWrap}>
                <Text style={styles.descriptionLabel}>Buyer Description</Text>
                <Text style={styles.descriptionQuote}>{parsed.description || 'No additional note was provided.'}</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/BuyerMessages')}
                style={styles.contactButton}>
                <MessageIcon />
                <Text style={styles.contactButtonText}>Contact Support</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
                <Text style={styles.backButtonText}>Back to tracking</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      <Modal animationType="fade" onRequestClose={() => setActivePhoto(null)} transparent visible={Boolean(activePhoto)}>
        <Pressable onPress={() => setActivePhoto(null)} style={styles.lightboxBackdrop}>
          <Pressable onPress={() => setActivePhoto(null)} style={styles.lightboxClose}>
            <Text style={styles.lightboxCloseText}>×</Text>
          </Pressable>
          {activePhoto ? <Image resizeMode="contain" source={{ uri: activePhoto }} style={styles.lightboxImage} /> : null}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
