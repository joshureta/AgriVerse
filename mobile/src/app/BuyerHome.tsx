import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ImageBackground, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { BuyerBottomNavigation } from '@/components/buyer-bottom-navigation';
import { BuyerHeader } from '@/components/buyer-header';
import { useAuth } from '@/context/auth-context';
import { BuyerOrder, PineappleProduct, loadBuyerOrders, loadPineappleProducts } from '@/lib/buyer-marketplace';
import { GREEN, styles } from '@/styles/buyer-home.styles';

const ACTIVE_ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready_for_delivery', 'out_for_delivery'];

function formatDate(value: string | null) {
  if (!value) return 'Pending';
  return new Intl.DateTimeFormat('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

// 0 = Order Confirmed & Packing, 1 = In Transit, 2 = Delivered
function orderStage(status: BuyerOrder['order_status']) {
  if (status === 'delivered') return 2;
  if (status === 'out_for_delivery') return 1;
  return 0;
}

function sizeBadge(sizeName: string) {
  return sizeName.trim().charAt(0).toUpperCase() || '?';
}

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
      <View style={[styles.stepIconDot, state === 'current' && styles.stepIconDotCurrent]} />
    </View>
  );
}

function OrderStatusStepper({ stage, confirmedDate }: { stage: number; confirmedDate: string }) {
  const steps: { key: string; label: string; date?: string }[] = [
    { key: 'confirmed', label: 'Order Confirmed & Packing', date: confirmedDate },
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

function ProductCard({ product }: { product: PineappleProduct }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${product.name}`}
      onPress={() => router.push({ pathname: '/BuyerProductDetail', params: { id: String(product.id) } })}
      style={({ pressed }) => [styles.productCard, pressed && styles.productCardPressed]}>
      <View style={styles.productBadge}>
        <Text style={styles.productBadgeText}>{sizeBadge(product.size_name)}</Text>
      </View>
      <Image accessibilityIgnoresInvertColors source={require('@/assets/images/pineapple-product.png')} style={styles.productImage} />
      <Text style={styles.productName}>{product.size_name}</Text>
      <Text style={styles.productWeight}>{product.weight}</Text>
      <View style={styles.productPriceBadge}>
        <Text style={styles.productPrice}>₱{product.price.toFixed(2)}</Text>
      </View>
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

  const [products, setProducts] = useState<PineappleProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');

  const [activeOrder, setActiveOrder] = useState<BuyerOrder | null>(null);
  const [orderLoading, setOrderLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError('');
    try {
      setProducts(await loadPineappleProducts());
    } catch (caught) {
      setProducts([]);
      setProductsError(caught instanceof Error ? caught.message : 'Could not load pineapples.');
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const loadCurrentOrder = useCallback(async () => {
    setOrderLoading(true);
    try {
      const orders = await loadBuyerOrders();
      setActiveOrder(orders.find((order) => ACTIVE_ORDER_STATUSES.includes(order.order_status)) || null);
    } catch {
      setActiveOrder(null);
    } finally {
      setOrderLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!profile) return;
    loadProducts();
    loadCurrentOrder();
  }, [profile, loadProducts, loadCurrentOrder]);

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
              <View style={styles.shopNowArrowBadge}>
                <Text style={styles.shopNowArrow}>→</Text>
              </View>
            </Pressable>
          </View>
        </ImageBackground>

        {/* Current Order Status */}
        {orderLoading ? (
          <View style={styles.sectionCard}>
            <ActivityIndicator style={styles.loader} color={GREEN} />
          </View>
        ) : activeOrder ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Current Order Status</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View order details"
                onPress={() => router.push({ pathname: '/BuyerOrderTracking', params: { id: String(activeOrder.id) } })}>
                <Text style={styles.sectionLink}>View Details →</Text>
              </Pressable>
            </View>

            <OrderStatusStepper stage={orderStage(activeOrder.order_status)} confirmedDate={formatDate(activeOrder.confirmed_at)} />

            <View style={styles.estimateStrip}>
              <CalendarBadge />
              <View>
                <Text style={styles.estimateLabel}>Estimated delivery on</Text>
                <Text style={styles.estimateDate}>{formatDate(activeOrder.estimated_delivery_at)}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Shop Pineapples */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Shop Pineapples</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="View all pineapples" onPress={() => router.push('/BuyerProductDetail' as never)}>
              <Text style={styles.sectionLink}>View All →</Text>
            </Pressable>
          </View>

          {productsLoading ? (
            <ActivityIndicator style={styles.loader} color={GREEN} />
          ) : productsError ? (
            <Text style={styles.loadError}>{productsError}</Text>
          ) : products.length === 0 ? (
            <Text style={styles.emptyText}>No pineapples available right now.</Text>
          ) : (
            <View style={styles.productsRow}>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </View>
          )}
        </View>

        {/* From our farm to you */}
        <View style={styles.sectionCard}>
          <View style={styles.farmCard}>
            <Image
              accessibilityLabel="Our pineapple farm"
              source={require('@/assets/images/pineapple-farm-story.png')}
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
