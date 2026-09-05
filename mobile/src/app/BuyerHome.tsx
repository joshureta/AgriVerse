import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ImageBackground, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

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

function PackingIcon({ color }: { color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="m3.3 7 8.7 5 8.7-5M12 22V12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TransitTruckIcon({ color }: { color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 18H9M19 18h2a1 1 0 0 0 1-1v-5.5a1.5 1.5 0 0 0-.44-1.06L18.5 7.38A1.5 1.5 0 0 0 17.44 7H14v11h1"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={7} cy={18} r={2} stroke={color} strokeWidth={2} />
      <Circle cx={17} cy={18} r={2} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function DeliveredBadgeIcon({ color }: { color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="m9 11 3 3L22 4"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function StepCircle({ state, stepKey }: { state: 'done' | 'current' | 'pending'; stepKey: string }) {
  const iconColor = state === 'done' ? '#ffffff' : state === 'current' ? GREEN : '#8B9B8E';

  const renderIcon = () => {
    switch (stepKey) {
      case 'confirmed':
        return <PackingIcon color={iconColor} />;
      case 'transit':
        return <TransitTruckIcon color={iconColor} />;
      case 'delivered':
        return <DeliveredBadgeIcon color={iconColor} />;
      default:
        return null;
    }
  };

  return (
    <View
      style={[
        styles.stepCircle,
        state === 'done' && styles.stepCircleDone,
        state === 'current' && styles.stepCircleCurrent,
        state === 'pending' && styles.stepCirclePending,
      ]}>
      {renderIcon()}
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
              <StepCircle state={state} stepKey={step.key} />
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
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path
          d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
          stroke="#ffffff"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"
          stroke="#ffffff"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
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
      <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
        <Path
          d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"
          stroke={GREEN}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"
          stroke={GREEN}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

function DeliveryBadge() {
  return (
    <View style={styles.farmIconCircle}>
      <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
        <Path
          d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"
          stroke={GREEN}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M15 18H9M19 18h2a1 1 0 0 0 1-1v-5.5a1.5 1.5 0 0 0-.44-1.06L18.5 7.38A1.5 1.5 0 0 0 17.44 7H14v11h1"
          stroke={GREEN}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={7} cy={18} r={2} stroke={GREEN} strokeWidth={2} />
        <Circle cx={17} cy={18} r={2} stroke={GREEN} strokeWidth={2} />
      </Svg>
    </View>
  );
}

function QualityBadge() {
  return (
    <View style={styles.farmIconCircle}>
      <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={8} r={6} stroke={GREEN} strokeWidth={2} />
        <Path
          d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"
          stroke={GREEN}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

function TrustedBadge() {
  return (
    <View style={styles.farmIconCircle}>
      <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
        <Path
          d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
          stroke={GREEN}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
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

      <View style={styles.mainBodyContainer}>
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
      </View>

      <BuyerBottomNavigation activeTab="home" />
    </SafeAreaView>
  );
}
