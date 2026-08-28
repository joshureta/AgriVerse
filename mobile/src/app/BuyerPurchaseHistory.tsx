import { router } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { BuyerBottomNavigation } from '@/components/buyer-bottom-navigation';
import { BuyerHeader } from '@/components/buyer-header';
import { styles } from '@/styles/buyer-purchase-history.styles';

// Preview-only mock data — no backend wiring yet.
const ORDERS = [
  { id: 'ORD-2025-005', date: 'April 22, 2025', items: '10 Small, 5 Medium', total: 900, status: 'transit' as const },
  { id: 'ORD-2025-004', date: 'April 15, 2025', items: '8 Medium', total: 640, status: 'delivered' as const },
  { id: 'ORD-2025-002', date: 'April 6, 2025', items: '6 Small, 3 Large', total: 660, status: 'delivered' as const },
  { id: 'ORD-2025-001', date: 'April 1, 2025', items: '13 Small, 5 Large', total: 1250, status: 'delivered' as const },
];

function StatusBadge({ status }: { status: 'delivered' | 'transit' }) {
  const isDelivered = status === 'delivered';
  return (
    <View style={[styles.statusBadge, isDelivered ? styles.statusBadgeDelivered : styles.statusBadgeTransit]}>
      <View style={[styles.statusDot, isDelivered ? styles.statusDotDelivered : styles.statusDotTransit]} />
      <Text style={[styles.statusText, isDelivered ? styles.statusTextDelivered : styles.statusTextTransit]}>
        {isDelivered ? 'Delivered' : 'In Transit'}
      </Text>
    </View>
  );
}

export default function BuyerPurchaseHistoryScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <BuyerHeader showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.titleText}>My Purchases</Text>

        {ORDERS.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🧾</Text>
            <Text style={styles.emptyText}>You have no past orders yet.</Text>
          </View>
        ) : (
          ORDERS.map((order) => (
            <Pressable
              key={order.id}
              accessibilityRole="button"
              accessibilityLabel={`View order ${order.id}`}
              onPress={() => router.push('/BuyerOrderTracking' as never)}
              style={({ pressed }) => [styles.orderCard, pressed && styles.orderCardPressed]}>
              <View style={styles.orderIconBox}>
                <Text style={styles.orderEmoji}>🍍</Text>
              </View>
              <View style={styles.orderInfo}>
                <Text style={styles.orderId}>Order #{order.id}</Text>
                <Text style={styles.orderMeta}>
                  {order.date} · {order.items}
                </Text>
                <Text style={styles.orderTotal}>PHP {order.total.toFixed(2)}</Text>
              </View>
              <StatusBadge status={order.status} />
            </Pressable>
          ))
        )}
      </ScrollView>

      <BuyerBottomNavigation activeTab="account" />
    </SafeAreaView>
  );
}
