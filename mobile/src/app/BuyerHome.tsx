import { router } from 'expo-router';
import { Image, ImageBackground, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { BuyerBottomNavigation } from '@/components/buyer-bottom-navigation';
import { BuyerHeader } from '@/components/buyer-header';
import { useAuth } from '@/context/auth-context';
import { GREEN, styles } from '@/styles/buyer-home.styles';

// Preview-only mock data — no backend wiring yet. Every value here (order
// status, dates, products, farm copy) is a static placeholder.
const MOCK_ORDER = {
  stage: 1, // 0 = Order Confirmed & Packing, 1 = In Transit, 2 = Delivered
  confirmedDate: 'April 6, 2025',
  estimatedDelivery: '9 April',
};

const MOCK_PRODUCTS = [
  { size: 'S', name: 'Small', weight: '400g - 600g', price: 'PHP 50.00' },
  { size: 'M', name: 'Medium', weight: '700g - 900g', price: 'PHP 80.00' },
  { size: 'L', name: 'Large', weight: '1kg - 1.3kg', price: 'PHP 120.00' },
];

function CheckIcon() {
  return <Text style={styles.stepCheck}>✓</Text>;
}

function StepCircle({ state }: { state: 'done' | 'current' | 'pending' }) {
  if (state === 'done') {
    return (
      <View style={[styles.stepCircle, styles.stepCircleDone]}>
        <CheckIcon />
      </View>
    );
  }
  return (
    <View style={[styles.stepCircle, state === 'current' ? styles.stepCircleCurrent : styles.stepCirclePending]}>
      <View style={styles.stepIconDot} />
    </View>
  );
}

function OrderStatusStepper({ stage }: { stage: number }) {
  const steps: { key: string; label: string; date?: string }[] = [
    { key: 'confirmed', label: 'Order Confirmed & Packing', date: MOCK_ORDER.confirmedDate },
    { key: 'transit', label: 'In Transit' },
    { key: 'delivered', label: 'Delivered' },
  ];

  return (
    <View style={styles.stepperRow}>
      {steps.map((step, index) => {
        const state = index < stage ? 'done' : index === stage ? 'current' : 'pending';
        return (
          <View key={step.key} style={{ flexDirection: 'row', alignItems: 'flex-start', flex: index < steps.length - 1 ? 1 : undefined }}>
            <View style={styles.stepColumn}>
              <StepCircle state={state} />
              <Text style={[styles.stepLabel, state === 'pending' && styles.stepLabelPending]}>{step.label}</Text>
              {step.date ? <Text style={styles.stepDate}>{step.date}</Text> : null}
            </View>
            {index < steps.length - 1 ? (
              <View style={[styles.stepConnector, { borderTopColor: index < stage ? GREEN : '#D6DED4' }]} />
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

function ProductCard({ size, name, weight, price }: { size: string; name: string; weight: string; price: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${name} pineapple`}
      onPress={() => router.push('/BuyerProductDetail' as never)}
      style={styles.productCard}>
      <View style={styles.productBadge}>
        <Text style={styles.productBadgeText}>{size}</Text>
      </View>
      <Text style={styles.productEmoji}>🍍</Text>
      <Text style={styles.productName}>{name}</Text>
      <Text style={styles.productWeight}>{weight}</Text>
      <Text style={styles.productPrice}>{price}</Text>
    </Pressable>
  );
}

function LeafBadge() {
  return (
    <View style={styles.farmIconCircle}>
      <Text style={{ fontSize: 13 }}>🌿</Text>
    </View>
  );
}

function DeliveryBadge() {
  return (
    <View style={styles.farmIconCircle}>
      <Text style={{ fontSize: 13 }}>🚚</Text>
    </View>
  );
}

function QualityBadge() {
  return (
    <View style={styles.farmIconCircle}>
      <Text style={{ fontSize: 13 }}>🏅</Text>
    </View>
  );
}

function TrustedBadge() {
  return (
    <View style={styles.farmIconCircle}>
      <Text style={{ fontSize: 13 }}>🤝</Text>
    </View>
  );
}

export default function BuyerHomeScreen() {
  const { profile } = useAuth();
  const displayName = profile?.full_name || 'Juan Dela Cruz';
  const firstHour = new Date().getHours();
  const greeting = firstHour < 12 ? 'Good morning' : firstHour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={styles.safeArea}>
      <BuyerHeader />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <ImageBackground
          source={require('@/assets/images/welcome-pineapple-farm.png')}
          style={styles.heroWrapper}
          imageStyle={styles.heroImage}>
          <View style={styles.heroTint} />
          <View style={styles.heroContent}>
            <Text style={styles.heroGreeting}>{greeting},</Text>
            <Text style={styles.heroName}>{displayName}!</Text>
            <Text style={styles.heroTagline}>Fresh pineapples,{'\n'}delivered to your door.</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Shop now"
              onPress={() => router.push('/BuyerProductDetail' as never)}
              style={({ pressed }) => [styles.shopNowButton, pressed && styles.shopNowPressed]}>
              <Text style={styles.shopNowText}>SHOP NOW</Text>
              <Text style={styles.shopNowArrow}>→</Text>
            </Pressable>
          </View>
        </ImageBackground>

        {/* Current Order Status */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Current Order Status</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="View order details">
              <Text style={styles.sectionLink}>View Details →</Text>
            </Pressable>
          </View>

          <OrderStatusStepper stage={MOCK_ORDER.stage} />

          <View style={styles.estimateStrip}>
            <CalendarBadge />
            <View>
              <Text style={styles.estimateLabel}>Estimated delivery on</Text>
              <Text style={styles.estimateDate}>{MOCK_ORDER.estimatedDelivery}</Text>
            </View>
          </View>
        </View>

        {/* Shop Pineapples */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Shop Pineapples</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="View all pineapples">
              <Text style={styles.sectionLink}>View All →</Text>
            </Pressable>
          </View>

          <View style={styles.productsRow}>
            {MOCK_PRODUCTS.map((product) => (
              <ProductCard key={product.size} {...product} />
            ))}
          </View>
        </View>

        {/* From our farm to you */}
        <View style={styles.sectionCard}>
          <View style={styles.farmCard}>
            <Image
              accessibilityLabel="Our pineapple farm"
              source={require('@/assets/images/worker-crop-farmer-hero.png')}
              style={styles.farmImage}
            />
            <View style={styles.farmTextBlock}>
              <Text style={styles.farmHeading}>From Our Farm To You</Text>
              <Text style={styles.farmDescription}>
                Grown with care using sustainable farming practices. We ensure every pineapple is fresh, nutritious, and packed with natural goodness.
              </Text>
              <View style={styles.farmIconsRow}>
                <LeafBadge />
                <DeliveryBadge />
                <QualityBadge />
                <TrustedBadge />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <BuyerBottomNavigation activeTab="home" />
    </SafeAreaView>
  );
}
