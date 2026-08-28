import { SafeAreaView, ScrollView, Text, View } from 'react-native';

import { BuyerBottomNavigation } from '@/components/buyer-bottom-navigation';
import { BuyerHeader } from '@/components/buyer-header';
import { styles } from '@/styles/buyer-order-tracking.styles';

// Preview-only mock data — mirrors the order placed on the checkout screen. No backend wiring yet.
const ORDER = {
  buyerName: 'Juan Dela Cruz',
  estimatedDelivery: '9 April',
  address: '123 Market Street, Manila City, Metro Manila, Philippines',
  from: { city: 'Tagaytay City', label: 'Toledo Trading Farm' },
  to: { city: 'Manila City', label: 'Delivery Address' },
  stage: 1, // 0 = Order Confirmed & Packing, 1 = In Transit, 2 = Delivered
  confirmedDate: 'April 6, 2025',
};

const ORDER_ITEMS = [
  { key: 'S', name: 'Pineapple', weight: '400g - 600g', size: 'Small' },
  { key: 'M', name: 'Pineapple', weight: '700g - 900g', size: 'Medium' },
];

const STEPS: { key: string; label: string; icon: string; date?: string }[] = [
  { key: 'confirmed', label: 'Order Confirmed & Packing', icon: '📋', date: ORDER.confirmedDate },
  { key: 'transit', label: 'In Transit', icon: '🚚' },
  { key: 'delivered', label: 'Delivered', icon: '✓' },
];

function StepCircle({ state, icon }: { state: 'done' | 'current' | 'pending'; icon: string }) {
  if (state === 'done') {
    return (
      <View style={[styles.stepCircle, styles.stepCircleDone]}>
        <Text style={styles.stepCheckText}>✓</Text>
      </View>
    );
  }
  return (
    <View style={[styles.stepCircle, styles.stepCirclePending]}>
      <Text style={styles.stepIconText}>{icon}</Text>
    </View>
  );
}

function DeliveryStepper({ stage }: { stage: number }) {
  return (
    <View style={styles.stepperRow}>
      {STEPS.map((step, index) => {
        const state: 'done' | 'current' | 'pending' = index < stage ? 'done' : index === stage ? 'current' : 'pending';
        return (
          <View key={step.key} style={{ flexDirection: 'row', alignItems: 'flex-start', flex: index < STEPS.length - 1 ? 1 : undefined }}>
            <View style={styles.stepColumn}>
              <StepCircle state={state} icon={step.icon} />
              <Text style={[styles.stepLabel, state !== 'done' && styles.stepLabelPending]}>{step.label}</Text>
              {step.date ? <Text style={styles.stepDate}>{step.date}</Text> : null}
            </View>
            {index < STEPS.length - 1 ? (
              <View style={[styles.stepConnector, { borderTopColor: index < stage ? '#176D34' : '#D6DED4' }]} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function CalendarBadge() {
  return (
    <View style={styles.estimateCalendar}>
      <View style={styles.estimateCalendarGrid}>
        {[0, 1, 2, 3].map((dot) => (
          <View key={dot} style={styles.estimateCalendarDot} />
        ))}
      </View>
    </View>
  );
}

export default function BuyerOrderTrackingScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <BuyerHeader />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Progress</Text>

          <View style={styles.routeRow}>
            <View style={styles.routeLine} />
            <View style={styles.routePillFrom}>
              <Text style={styles.routePillLabel}>{ORDER.from.city}</Text>
              <Text style={styles.routePillSub}>{ORDER.from.label}</Text>
            </View>
            <View style={styles.routeTruckCircle}>
              <Text style={styles.routeTruckIcon}>🚚</Text>
            </View>
            <View style={styles.routePillTo}>
              <Text style={styles.routePillLabelLight}>{ORDER.to.city}</Text>
              <Text style={styles.routePillSubLight}>{ORDER.to.label}</Text>
            </View>
          </View>

          <DeliveryStepper stage={ORDER.stage} />
        </View>

        <View style={styles.card}>
          <View style={styles.confirmedRow}>
            <View style={styles.confirmedCheckCircle}>
              <Text style={styles.confirmedCheck}>✓</Text>
            </View>
            <View>
              <Text style={styles.confirmedTitle}>Order Confirmed</Text>
              <Text style={styles.confirmedSubtitle}>Delivery to {ORDER.buyerName}</Text>
            </View>
          </View>

          <View style={styles.estimateStrip}>
            <CalendarBadge />
            <View>
              <Text style={styles.estimateLabel}>Estimated delivery on</Text>
              <Text style={styles.estimateDate}>{ORDER.estimatedDelivery}</Text>
            </View>
          </View>

          {ORDER_ITEMS.map((item) => (
            <View key={item.key} style={styles.itemRow}>
              <View style={styles.itemIconBox}>
                <Text style={styles.itemEmoji}>🍍</Text>
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>
                  {item.weight} · Size: {item.size}
                </Text>
              </View>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.addressRow}>
            <Text style={styles.addressPin}>📍</Text>
            <Text style={styles.addressText}>{ORDER.address}</Text>
          </View>
        </View>
      </ScrollView>

      <BuyerBottomNavigation activeTab="account" />
    </SafeAreaView>
  );
}
