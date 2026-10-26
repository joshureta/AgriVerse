import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, PackageSearch, QrCode, XCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BuyerHeader } from '@/components/buyer-header';
import { BuyerOrder, createQrphCheckout, loadBuyerOrder, QrphCheckout } from '@/lib/buyer-marketplace';

const GREEN = '#2d8233';

export default function BuyerQrphPaymentScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [order, setOrder] = useState<BuyerOrder | null>(null);
  const [payment, setPayment] = useState<QrphCheckout | null>(null);
  const [status, setStatus] = useState<'loading' | 'pending' | 'paid' | 'failed' | 'error'>('loading');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    async function start() {
      setStatus('loading');
      setError('');
      try {
        if (!id || !Number.isSafeInteger(Number(id))) throw new Error('No order was specified.');
        const current = await loadBuyerOrder(Number(id));
        if (!active) return;
        setOrder(current);
        if (current.payment_method !== 'qrph') throw new Error('This order does not use QR Ph.');
        if (current.payment_status === 'paid') {
          setStatus('paid');
          return;
        }
        if (current.order_status === 'cancelled') throw new Error('This order has been cancelled.');
        const next = await createQrphCheckout(current.id);
        if (!active) return;
        setPayment(next);
        setStatus(next.status === 'paid' ? 'paid' : 'pending');
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'Could not start QR Ph payment.');
          setStatus('error');
        }
      }
    }
    start();
    return () => { active = false; };
  }, [id, attempt]);

  useEffect(() => {
    if (status !== 'pending' || !id) return;
    let active = true;
    const timer = setInterval(async () => {
      try {
        const current = await loadBuyerOrder(Number(id));
        if (!active) return;
        setOrder(current);
        if (current.payment_status === 'paid') setStatus('paid');
        else if (current.payment_status === 'failed') setStatus('failed');
        else if (current.order_status === 'cancelled') {
          setError('This order has been cancelled.');
          setStatus('error');
        }
      } catch {
        // A temporary network problem should not remove the payment instructions.
      }
    }, 3000);
    return () => { active = false; clearInterval(timer); };
  }, [id, status]);

  const imageUrl = payment?.image_url
    ? payment.image_url.startsWith('data:') ? payment.image_url : `data:image/png;base64,${payment.image_url}`
    : null;
  const viewOrder = () => {
    if (id) router.replace({ pathname: '/BuyerOrderTracking', params: { id } });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <BuyerHeader showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {status === 'loading' ? <>
            <View style={[styles.statusIcon, styles.statusPending]}><ActivityIndicator size="large" color={GREEN} /></View>
            <Text style={styles.title}>Preparing your payment…</Text>
            <Text style={styles.body}>We&apos;re getting the QR Ph payment ready for your order.</Text>
          </> : null}

          {status === 'pending' ? <>
            <View style={[styles.statusIcon, styles.statusPending]}><QrCode color={GREEN} size={44} /></View>
            <Text style={styles.title}>Complete Your QR Ph Payment</Text>
            <Text style={styles.body}>{payment?.test_mode ? `Use the PayMongo simulator to test payment for order ${order?.order_number}.` : `Pay for order ${order?.order_number} using BDO Pay or another QR Ph banking app.`}</Text>
            <View style={styles.summary}>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Order Number</Text><Text style={styles.summaryValue}>{order?.order_number}</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Amount to Pay</Text><Text style={styles.summaryValue}>₱{Number(order?.total_amount || 0).toFixed(2)}</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Payment Method</Text><Text style={styles.summaryValue}>QR Ph</Text></View>
            </View>
            {payment?.test_mode ? <View style={styles.paymentPanel}>
              <Text style={styles.panelTitle}>PayMongo test mode</Text>
              <Text style={styles.panelBody}>Use the test simulator to complete this payment. Do not scan a test QR with a real banking app.</Text>
              {payment.test_url ? <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={() => Linking.openURL(payment.test_url!)}>
                <Text style={styles.primaryButtonText}>Simulate Test Payment</Text>
              </Pressable> : <Text style={styles.panelBody}>The test payment link was not returned. Check this order in PayMongo&apos;s test dashboard.</Text>}
            </View> : imageUrl ? <View style={styles.paymentPanel}>
              <Image source={{ uri: imageUrl }} style={styles.qrImage} resizeMode="contain" accessibilityLabel="QR Ph code for this order" />
              <Text style={styles.panelBody}>Scan or upload this code in your banking app. It expires after about 30 minutes.</Text>
            </View> : <Text style={styles.body}>PayMongo is processing your payment. Please wait for confirmation.</Text>}
            <Text style={styles.body}>Your order remains pending until PayMongo confirms payment. This page checks automatically.</Text>
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => setAttempt((value) => value + 1)}><Text style={styles.secondaryButtonText}>Check or Renew QR</Text></Pressable>
              <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={viewOrder}><Text style={styles.secondaryButtonText}>View Order</Text></Pressable>
            </View>
          </> : null}

          {status === 'paid' ? <>
            <View style={[styles.statusIcon, styles.statusSuccess]}><CheckCircle2 color="#ffffff" size={46} /></View>
            <Text style={styles.title}>Payment Successful!</Text>
            <Text style={styles.body}>Your QR Ph payment for order {order?.order_number} has been confirmed. It&apos;s now being prepared.</Text>
            <View style={styles.summary}>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Order Number</Text><Text style={styles.summaryValue}>{order?.order_number}</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Amount Paid</Text><Text style={styles.summaryValue}>₱{Number(order?.total_amount || 0).toFixed(2)}</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Payment Method</Text><Text style={styles.summaryValue}>QR Ph</Text></View>
            </View>
            <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={viewOrder}><Text style={styles.primaryButtonText}>Track Your Order</Text></Pressable>
          </> : null}

          {status === 'failed' ? <>
            <View style={[styles.statusIcon, styles.statusFailed]}><XCircle color="#ffffff" size={46} /></View>
            <Text style={styles.title}>Payment Failed</Text>
            <Text style={styles.body}>The QR Ph payment for order {order?.order_number} expired or did not go through. Your order is still awaiting payment.</Text>
            <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={() => setAttempt((value) => value + 1)}><Text style={styles.primaryButtonText}>Retry Payment</Text></Pressable>
            <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={viewOrder}><Text style={styles.secondaryButtonText}>View Order</Text></Pressable>
          </> : null}

          {status === 'error' ? <>
            <View style={[styles.statusIcon, styles.statusFailed]}><PackageSearch color="#ffffff" size={44} /></View>
            <Text style={styles.title}>We Couldn&apos;t Load This Payment</Text>
            <Text style={styles.body}>{error}</Text>
            <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={() => setAttempt((value) => value + 1)}><Text style={styles.primaryButtonText}>Try Again</Text></Pressable>
            {id ? <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={viewOrder}><Text style={styles.secondaryButtonText}>View Order</Text></Pressable> : null}
          </> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fbfcf4' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 32 },
  card: { width: '100%', maxWidth: 640, alignSelf: 'center', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#edf0e5', borderRadius: 24, paddingHorizontal: 24, paddingVertical: 40, backgroundColor: '#ffffff', shadowColor: '#445339', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.09, shadowRadius: 25, elevation: 4 },
  statusIcon: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center', borderRadius: 42, marginBottom: 6 },
  statusPending: { backgroundColor: '#eef6ea' },
  statusSuccess: { backgroundColor: GREEN },
  statusFailed: { backgroundColor: '#c63b3b' },
  title: { color: '#12351b', fontSize: 25, fontWeight: '800', textAlign: 'center' },
  body: { maxWidth: 440, color: '#4e5b50', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  summary: { width: '100%', gap: 10, marginVertical: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#cad9c5', borderRadius: 14, padding: 18, backgroundColor: '#fbfdf9' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  summaryLabel: { color: '#657168', fontSize: 12 },
  summaryValue: { flexShrink: 1, color: '#12351b', fontSize: 13, fontWeight: '800', textAlign: 'right' },
  paymentPanel: { width: '100%', alignItems: 'center', gap: 10, marginVertical: 8, borderWidth: 1, borderColor: '#dce9d7', borderRadius: 14, padding: 18, backgroundColor: '#f8fbf6' },
  panelTitle: { color: '#216934', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  panelBody: { color: '#4e5b50', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  qrImage: { width: '100%', maxWidth: 260, aspectRatio: 1, borderWidth: 1, borderColor: '#d9e5d8', borderRadius: 10, backgroundColor: '#ffffff' },
  actions: { width: '100%', gap: 10, alignItems: 'center', marginTop: 6 },
  primaryButton: { minHeight: 46, minWidth: 180, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: GREEN, marginTop: 8 },
  primaryButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  secondaryButton: { minHeight: 46, minWidth: 180, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#bfcabc', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#ffffff' },
  secondaryButtonText: { color: '#2f4632', fontSize: 13, fontWeight: '800', textAlign: 'center' },
});
