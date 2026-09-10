import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, Text, TextInput, View } from 'react-native';

import { BuyerHeader } from '@/components/buyer-header';
import { BuyerOrder, loadBuyerOrder, rateBuyerOrder } from '@/lib/buyer-marketplace';
import { GREEN, styles } from '@/styles/buyer-purchase-history.styles';

export default function BuyerRateOrder() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [order, setOrder] = useState<BuyerOrder | null>(null); const [rating, setRating] = useState(0); const [comment, setComment] = useState(''); const [loading, setLoading] = useState(true); const [submitted, setSubmitted] = useState(false); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState('');
  const load = useCallback(async () => { if (id) { try { setOrder(await loadBuyerOrder(Number(id))); } catch {} } setLoading(false); }, [id]);
  useEffect(() => { load(); }, [load]);
  async function submit() { if (!order || !rating) return; setSubmitting(true); setError(''); try { await rateBuyerOrder(order.id, rating, comment); setSubmitted(true); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not submit your rating.'); } finally { setSubmitting(false); } }
  return <SafeAreaView style={styles.safeArea}><BuyerHeader showBack /><View style={styles.ratingPage}>{loading ? <ActivityIndicator color={GREEN} /> : submitted ? <View style={styles.ratingSuccess}><Text style={styles.ratingSuccessMark}>✓</Text><Text style={styles.ratingTitle}>Thank you for your rating!</Text><Text style={styles.ratingCopy}>Your feedback helps our farm improve.</Text><Pressable onPress={() => router.replace('/BuyerPurchaseHistory')} style={styles.ratingSubmit}><Text style={styles.ratingSubmitText}>Back to purchases</Text></Pressable></View> : <><Text style={styles.ratingEyebrow}>ORDER {order?.order_number || ''}</Text><Text style={styles.ratingTitle}>Rate your purchase</Text><Text style={styles.ratingCopy}>How was your order of {order?.items.map((item) => item.product_name).join(', ')}?</Text><View style={styles.stars}>{[1, 2, 3, 4, 5].map((value) => <Pressable key={value} onPress={() => setRating(value)}><Text style={[styles.star, value <= rating && styles.starSelected]}>★</Text></Pressable>)}</View><TextInput multiline maxLength={500} onChangeText={setComment} placeholder="Share your experience (optional)" placeholderTextColor="#849187" style={styles.ratingInput} value={comment} />{error ? <Text style={styles.loadError}>{error}</Text> : null}<Pressable disabled={!rating || submitting} onPress={submit} style={[styles.ratingSubmit, (!rating || submitting) && styles.actionButtonDisabled]}>{submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.ratingSubmitText}>Submit rating</Text>}</Pressable></>}</View></SafeAreaView>;
}
