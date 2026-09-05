import { router } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { BuyerBottomNavigation } from '@/components/buyer-bottom-navigation';
import { BuyerHeader } from '@/components/buyer-header';
import { useAuth } from '@/context/auth-context';
import {
  DeliveryAddress,
  DeliveryAddressInput,
  ReconciledCartItem,
  createBuyerDeliveryAddress,
  createGcashCheckout,
  loadBuyerDeliveryAddresses,
  loadPineappleProducts,
  placeBuyerOrder,
  readBuyerCart,
  reconcileBuyerCart,
  reconciledToCartItems,
  saveDefaultBuyerDeliveryAddress,
  writeBuyerCart,
} from '@/lib/buyer-marketplace';
import { GREEN, TEXT_MUTED, styles } from '@/styles/buyer-checkout.styles';

const DELIVERY_FEE = 100;

const EMPTY_ADDRESS: DeliveryAddressInput = {
  full_name: '',
  mobile_number: '',
  country: '',
  region: '',
  province: '',
  city_municipality: '',
  barangay: '',
};

const ADDRESS_FIELDS: { key: keyof DeliveryAddressInput; label: string; placeholder: string; optional?: boolean }[] = [
  { key: 'full_name', label: 'Full Name', placeholder: 'Enter recipient name' },
  { key: 'mobile_number', label: 'Phone Number', placeholder: 'Enter mobile number' },
  { key: 'country', label: 'Country', placeholder: 'Enter country' },
  { key: 'region', label: 'Region', placeholder: 'Enter region' },
  { key: 'province', label: 'Province', placeholder: 'Enter province (optional)', optional: true },
  { key: 'city_municipality', label: 'City / Municipality', placeholder: 'Enter city or municipality' },
  { key: 'barangay', label: 'Barangay', placeholder: 'Enter barangay' },
];

function addressIsComplete(address: DeliveryAddressInput) {
  return (['full_name', 'mobile_number', 'country', 'region', 'city_municipality', 'barangay'] as const).every((field) =>
    String(address[field] || '').trim(),
  );
}

function MapPinIcon({ color = GREEN, size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s-7-4.35-7-10a7 7 0 1 1 14 0c0 5.65-7 10-7 10Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={11} r={2.5} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function UserIcon({ color = GREEN, size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={7} r={4} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function PhoneIcon({ color = TEXT_MUTED, size = 13 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PencilIcon({ color = GREEN, size = 13 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TruckIcon({ color = GREEN, size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
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

function PackageIcon({ color = GREEN, size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
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

function CashIcon({ color = GREEN, size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={2} y={6} width={20} height={12} rx={2} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={12} r={2.5} stroke={color} strokeWidth={2} />
      <Path d="M6 12h.01M18 12h.01" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CardIcon({ color = GREEN, size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={2} y={5} width={20} height={14} rx={2} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2 10h20" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 15h2M10 15h4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}


function LockIcon({ color = '#ffffff', size = 15 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={11} width={18} height={11} rx={2} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CloseIcon({ color = '#556658', size = 15 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6 6 18M6 6l12 12" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function StoreIcon({ color = GREEN, size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m2 7 4.42-4.42A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.41.59L22 7M2 7v13a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7M2 7h20M9 22v-8h6v8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const DELIVERY_METHODS = [
  { key: 'delivery', label: 'Standard Delivery', sub: 'Delivery service straight to your registered address.' },
  { key: 'pickup', label: 'On-site Pickup', sub: 'Collect your order directly from JToledo Trading Farm.' },
] as const;

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash on Delivery', sub: 'Pay with cash when your pineapples arrive.' },
  { key: 'bank', label: 'Bank Transfer', sub: 'Transfer directly to the JToledo bank account.' },
  { key: 'gcash', label: 'GCash', sub: 'Pay securely using your GCash mobile wallet.' },
] as const;

function OptionCard({
  methodKey,
  label,
  sub,
  active,
  onPress,
}: {
  methodKey: string;
  label: string;
  sub: string;
  active: boolean;
  onPress: () => void;
}) {
  const iconColor = active ? GREEN : '#445648';

  const renderIcon = () => {
    switch (methodKey) {
      case 'delivery':
        return <TruckIcon color={iconColor} size={20} />;
      case 'pickup':
        return <PackageIcon color={iconColor} size={20} />;
      case 'cash':
        return <CashIcon color={iconColor} size={20} />;
      case 'bank':
        return <CardIcon color={iconColor} size={20} />;
      case 'gcash':
        return (
          <View style={styles.gcashBadge}>
            <Text style={styles.gcashBadgeText}>G</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.optionCard, active && styles.optionCardActive, pressed && styles.optionCardPressed]}>
      {methodKey === 'gcash' ? (
        renderIcon()
      ) : (
        <View style={[styles.optionIconCircle, active && styles.optionIconCircleActive]}>{renderIcon()}</View>
      )}
      <View style={styles.optionTextBlock}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionSubLabel}>{sub}</Text>
      </View>
      <View style={[styles.radioOuter, active && styles.radioOuterActive]}>{active ? <View style={styles.radioInner} /> : null}</View>
    </Pressable>
  );
}

export default function BuyerCheckoutScreen() {
  const { profile } = useAuth();

  const [items, setItems] = useState<ReconciledCartItem[]>([]);
  const [cartLoading, setCartLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const [deliveryMethod, setDeliveryMethod] = useState<(typeof DELIVERY_METHODS)[number]['key']>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]['key']>('cash');
  const [notes, setNotes] = useState('');

  const [address, setAddress] = useState<DeliveryAddress | null>(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addressForm, setAddressForm] = useState<DeliveryAddressInput>(EMPTY_ADDRESS);
  const [savingAddress, setSavingAddress] = useState(false);

  const [placing, setPlacing] = useState(false);

  const loadCart = useCallback(async () => {
    setCartLoading(true);
    setError('');
    const savedItems = await readBuyerCart();
    if (savedItems.length === 0) {
      setItems([]);
      setCartLoading(false);
      return;
    }
    try {
      const products = await loadPineappleProducts();
      const reconciled = reconcileBuyerCart(savedItems, products);
      const changed =
        reconciled.length !== savedItems.length ||
        reconciled.some((item, index) => item.quantity !== Number(savedItems[index]?.quantity));
      setItems(reconciled);
      await writeBuyerCart(reconciledToCartItems(reconciled));
      if (changed) setNotice('Your order was updated to match the latest available stock.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load your cart.');
    } finally {
      setCartLoading(false);
    }
  }, []);

  const loadAddress = useCallback(async () => {
    try {
      const { addresses, defaultAddressId } = await loadBuyerDeliveryAddresses();
      setAddress(addresses.find((item) => item.id === defaultAddressId) || null);
    } catch {
      setAddress(null);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  useEffect(() => {
    if (profile) loadAddress();
  }, [profile, loadAddress]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = deliveryMethod === 'delivery' && items.length > 0 ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  const openAddressModal = useCallback(() => {
    setAddressForm(
      address
        ? {
            full_name: address.full_name,
            mobile_number: address.mobile_number,
            country: address.country,
            region: address.region,
            province: address.province,
            city_municipality: address.city_municipality,
            barangay: address.barangay,
          }
        : profile
          ? {
              full_name: profile.full_name || '',
              mobile_number: profile.mobile_number || '',
              country: profile.country || '',
              region: profile.region || '',
              province: profile.province || '',
              city_municipality: profile.city_municipality || '',
              barangay: profile.barangay || '',
            }
          : EMPTY_ADDRESS,
    );
    setError('');
    setAddressModalOpen(true);
  }, [address, profile]);

  const saveAddress = useCallback(async () => {
    if (!addressIsComplete(addressForm) || savingAddress) return;
    setSavingAddress(true);
    setError('');
    try {
      const saved = await createBuyerDeliveryAddress({ ...addressForm, label: 'Delivery address' });
      await saveDefaultBuyerDeliveryAddress(saved.id);
      setAddress(saved);
      setAddressModalOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this address.');
    } finally {
      setSavingAddress(false);
    }
  }, [addressForm, savingAddress]);

  const placeOrder = useCallback(async () => {
    if (items.length === 0 || placing) return;
    if (deliveryMethod === 'delivery' && !address) {
      setError('Add a delivery address before placing your order.');
      openAddressModal();
      return;
    }
    setPlacing(true);
    setError('');
    try {
      const order = await placeBuyerOrder({
        delivery_method: deliveryMethod,
        payment_method: paymentMethod,
        customer_note: notes,
        delivery_address:
          deliveryMethod === 'delivery' && address
            ? {
                full_name: address.full_name,
                mobile_number: address.mobile_number,
                country: address.country,
                region: address.region,
                province: address.province,
                city_municipality: address.city_municipality,
                barangay: address.barangay,
              }
            : null,
        items: items.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
      });
      await writeBuyerCart([]);

      if (paymentMethod === 'gcash') {
        try {
          const checkoutUrl = await createGcashCheckout(order.id);
          await openBrowserAsync(checkoutUrl);
        } catch (paymentError) {
          Alert.alert(
            'Order placed',
            `Your order was placed, but GCash checkout could not be started: ${paymentError instanceof Error ? paymentError.message : 'unknown error'}. You can retry payment from your order.`,
          );
        }
      }

      router.replace({ pathname: '/BuyerOrderTracking', params: { id: String(order.id) } });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not place your order.');
    } finally {
      setPlacing(false);
    }
  }, [items, placing, deliveryMethod, address, paymentMethod, notes, openAddressModal]);

  const fullAddress = address
    ? [address.barangay, address.city_municipality, address.province, address.region, address.country].filter(Boolean).join(', ')
    : '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <BuyerHeader showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.titleBlock}>
          <Text style={styles.titleText}>Delivery Information</Text>
          <Text style={styles.subtitleText}>Review your order, delivery details, and payment</Text>
        </View>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text style={styles.loadError}>{error}</Text> : null}

        {/* DELIVERY INFORMATION CARD */}
        <View style={styles.card}>
          <View style={styles.addressHeaderRow}>
            <View style={styles.deliveryTitleRow}>
              <MapPinIcon color={GREEN} size={16} />
              <Text style={styles.deliverySectionTitle}>
                {deliveryMethod === 'pickup' ? 'Pickup Location' : 'Delivery Information'}
              </Text>
            </View>
            {deliveryMethod === 'delivery' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={address ? 'Edit delivery address' : 'Add delivery address'}
                onPress={openAddressModal}
                hitSlop={8}>
                <Text style={styles.editLink}>{address ? 'Edit ›' : 'Add ›'}</Text>
              </Pressable>
            ) : null}
          </View>

          {deliveryMethod === 'pickup' ? (
            <View>
              <Text style={styles.deliveryName}>JToledo Trading Farm</Text>
              <Text style={styles.deliveryAddress}>Tagaytay City, Cavite</Text>
            </View>
          ) : address ? (
            <View>
              <Text style={styles.deliveryName}>{address.full_name}</Text>
              <Text style={styles.deliveryAddress}>{fullAddress}</Text>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add delivery address"
              onPress={openAddressModal}>
              <Text style={styles.deliveryEmptyText}>No delivery address added. Tap to add.</Text>
            </Pressable>
          )}
        </View>

        {/* ORDER SUMMARY */}
        <View style={styles.card}>
          <View style={styles.summaryHeaderRow}>
            <Text style={styles.summaryHeaderTitle}>Order Summary</Text>
            {itemCount > 0 ? (
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.cardDivider} />

          {cartLoading ? (
            <ActivityIndicator style={styles.loader} color={GREEN} />
          ) : items.length === 0 ? (
            <Text style={styles.emptyText}>Your cart is empty.</Text>
          ) : (
            items.map((item) => (
              <View key={item.product_id} style={styles.summaryItemRow}>
                <View style={styles.summaryItemIconBox}>
                  <Image accessibilityIgnoresInvertColors source={require('@/assets/images/pineapple-product.png')} style={styles.summaryItemImage} />
                </View>
                <View style={styles.summaryItemInfo}>
                  <Text style={styles.summaryItemName}>{item.size_name} Pineapple</Text>
                  <Text style={styles.summaryItemMeta}>
                    {item.weight} · Quantity: {item.quantity}
                  </Text>
                </View>
                <Text style={styles.summaryItemPrice}>₱{(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))
          )}
        </View>

        {/* DELIVERY METHOD */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Select Delivery Method</Text>
          {DELIVERY_METHODS.map((method) => (
            <OptionCard
              key={method.key}
              methodKey={method.key}
              label={method.label}
              sub={method.sub}
              active={deliveryMethod === method.key}
              onPress={() => setDeliveryMethod(method.key)}
            />
          ))}

          <View style={styles.notesLabelRow}>
            <PencilIcon color={GREEN} size={12} />
            <Text style={styles.notesLabel}>Order Instructions (Optional)</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            maxLength={1000}
            multiline
            placeholder="Add delivery notes, landmarks, or handling requests…"
            placeholderTextColor="#9AA79C"
          />
        </View>

        {/* PAYMENT METHOD */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Select Payment Method</Text>
          {PAYMENT_METHODS.map((method) => (
            <OptionCard
              key={method.key}
              methodKey={method.key}
              label={method.label}
              sub={method.sub}
              active={paymentMethod === method.key}
              onPress={() => setPaymentMethod(method.key)}
            />
          ))}

          {paymentMethod === 'bank' ? (
            <View style={styles.bankDetailsCard}>
              <View style={styles.bankDetailRow}>
                <Text style={styles.bankDetailLabel}>Account Name</Text>
                <Text style={styles.bankDetailValue}>Joseph Toledo</Text>
              </View>
              <View style={styles.bankDetailRow}>
                <Text style={styles.bankDetailLabel}>Bank Name</Text>
                <Text style={styles.bankDetailValue}>BDO</Text>
              </View>
              <View style={styles.bankDetailRow}>
                <Text style={styles.bankDetailLabel}>Account Number</Text>
                <Text style={styles.bankDetailValue}>J090037738346</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* COST BREAKDOWN */}
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({itemCount} items)</Text>
            <Text style={styles.summaryValue}>₱{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={[styles.summaryValue, deliveryMethod === 'pickup' && { color: GREEN, fontWeight: '800' }]}>
              {deliveryMethod === 'pickup' ? 'FREE (Pickup)' : `₱${deliveryFee.toFixed(2)}`}
            </Text>
          </View>
          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>₱{total.toFixed(2)}</Text>
          </View>
        </View>

        {/* PLACE ORDER ACTION BUTTON */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Place order"
          disabled={cartLoading || placing || items.length === 0}
          onPress={placeOrder}
          style={({ pressed }) => [
            styles.placeOrderButton,
            (cartLoading || placing || items.length === 0) && styles.placeOrderButtonDisabled,
            pressed && !(cartLoading || placing || items.length === 0) && styles.placeOrderButtonPressed,
            { marginTop: 4, marginBottom: 12 },
          ]}>
          <LockIcon color="#ffffff" size={15} />
          <Text style={styles.placeOrderButtonText}>{placing ? 'Placing order…' : 'Place Order'}</Text>
        </Pressable>
      </ScrollView>

      {/* ADDRESS MODAL */}
      <Modal visible={addressModalOpen} animationType="slide" transparent onRequestClose={() => setAddressModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandleBar} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Delivery Information</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={8}
                onPress={() => setAddressModalOpen(false)}
                style={styles.modalCloseButton}>
                <CloseIcon color="#556658" size={14} />
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>Enter recipient and address details for your order.</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {ADDRESS_FIELDS.map((field) => (
                <View key={field.key} style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>
                    {field.label}
                    {field.optional ? '' : ' *'}
                  </Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={addressForm[field.key]}
                    onChangeText={(value) => setAddressForm((current) => ({ ...current, [field.key]: value }))}
                    placeholder={field.placeholder}
                    placeholderTextColor="#9AA79C"
                  />
                </View>
              ))}
            </ScrollView>
            {error ? <Text style={styles.loadError}>{error}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                onPress={() => setAddressModalOpen(false)}
                style={styles.modalCancelButton}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save address"
                disabled={!addressIsComplete(addressForm) || savingAddress}
                onPress={saveAddress}
                style={[styles.modalSaveButton, (!addressIsComplete(addressForm) || savingAddress) && styles.modalSaveButtonDisabled]}>
                <Text style={styles.modalSaveText}>{savingAddress ? 'Saving…' : 'Save Address'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <BuyerBottomNavigation activeTab="cart" />
    </SafeAreaView>
  );
}
