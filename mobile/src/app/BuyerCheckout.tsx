import { router } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';

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
import { GREEN, styles } from '@/styles/buyer-checkout.styles';

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

const DELIVERY_METHODS = [
  { key: 'delivery', icon: '🚚', label: 'Standard Delivery', sub: 'Delivery service straight to your registered address.' },
  { key: 'pickup', icon: '📦', label: 'On-site Pickup', sub: 'Collect your order directly from JToledo Trading.' },
] as const;

const PAYMENT_METHODS = [
  { key: 'cash', icon: '💵', label: 'Cash on Delivery', sub: 'Pay with cash when your pineapples arrive.' },
  { key: 'bank', icon: '💳', label: 'Bank Transfer', sub: 'Transfer directly to the JToledo bank account.' },
  { key: 'gcash', icon: 'G', label: 'GCash', sub: 'Pay securely using your GCash mobile wallet.' },
] as const;

function OptionCard({
  icon,
  label,
  sub,
  active,
  onPress,
}: {
  icon: string;
  label: string;
  sub: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.optionCard, active && styles.optionCardActive, pressed && styles.optionCardPressed]}>
      {icon === 'G' ? (
        <View style={styles.gcashBadge}>
          <Text style={styles.gcashBadgeText}>G</Text>
        </View>
      ) : (
        <View style={styles.optionIconCircle}>
          <Text style={styles.optionIconText}>{icon}</Text>
        </View>
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

  const addressLocality = address ? [address.barangay, address.city_municipality].filter(Boolean).join(', ') : '';
  const addressRegion = address ? [address.province, address.region, address.country].filter(Boolean).join(', ') : '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <BuyerHeader showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.titleBlock}>
          <Text style={styles.titleText}>Delivery Information</Text>
          <Text style={styles.subtitleText}>Fill up the form, choose a payment method, and place your order.</Text>
        </View>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text style={styles.loadError}>{error}</Text> : null}

        <View style={styles.card}>
          <View style={styles.addressRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarEmoji}>👤</Text>
            </View>
            <View style={styles.addressTextBlock}>
              <View style={styles.addressHeaderRow}>
                <Text style={styles.addressName}>{address ? address.full_name : 'Delivery Information'}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Edit delivery address" onPress={openAddressModal}>
                  <Text style={styles.editLink}>{address ? 'Edit ›' : 'Add ›'}</Text>
                </Pressable>
              </View>
              {address ? (
                <Text style={styles.addressText}>
                  {addressLocality}
                  {'\n'}
                  {addressRegion}
                  {'\n'}
                  {address.mobile_number}
                </Text>
              ) : (
                <Text style={styles.addressText}>No delivery information has been added.</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.summaryHeaderRow}>
            <Text style={styles.summaryHeaderIcon}>📋</Text>
            <Text style={styles.summaryHeaderTitle}>Order Summary</Text>
          </View>

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
                <Text style={styles.summaryItemPrice}>PHP {(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))
          )}

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({itemCount} items)</Text>
            <Text style={styles.summaryValue}>PHP {subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>PHP {deliveryFee.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>PHP {total.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Select Delivery Method</Text>
        {DELIVERY_METHODS.map((method) => (
          <OptionCard
            key={method.key}
            icon={method.icon}
            label={method.label}
            sub={method.sub}
            active={deliveryMethod === method.key}
            onPress={() => setDeliveryMethod(method.key)}
          />
        ))}

        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          maxLength={1000}
          multiline
          placeholder="Delivery instructions or order notes (optional)"
          placeholderTextColor="#9AA79C"
        />

        <Text style={styles.sectionLabel}>Select Payment Method</Text>
        {PAYMENT_METHODS.map((method) => (
          <OptionCard
            key={method.key}
            icon={method.icon}
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Place order now"
          disabled={cartLoading || placing || items.length === 0}
          onPress={placeOrder}
          style={({ pressed }) => [
            styles.placeOrderButton,
            (cartLoading || placing || items.length === 0) && styles.placeOrderButtonDisabled,
            pressed && !(cartLoading || placing || items.length === 0) && styles.placeOrderButtonPressed,
            { marginTop: 6 },
          ]}>
          <Text style={styles.placeOrderButtonText}>{placing ? 'Placing order…' : 'Place Order Now'}</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={addressModalOpen} animationType="slide" transparent onRequestClose={() => setAddressModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delivery Information</Text>
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
