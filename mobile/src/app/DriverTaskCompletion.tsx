import { GREEN, styles } from '@/styles/driver-task-completion.styles';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import {
  DriverOrder,
  DriverOrdersResponse,
  formatDeliveryAddress,
  formatDeliveryWindow,
  formatPeso,
} from '@/lib/driver-deliveries';

function CameraSvg({ color = '#176D34', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

function GallerySvg({ color = '#FFFFFF', size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Rect
        height="18"
        rx="2"
        ry="2"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        width="18"
        x="3"
        y="3"
      />
      <Circle cx="8.5" cy="8.5" fill={color} r="1.5" />
      <Path
        d="M21 15L16 10L5 21"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </Svg>
  );
}

function parsePassedOrder(value?: string): DriverOrder | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed.id === 'number') return parsed as DriverOrder;
  } catch {
    // Ignore malformed/missing param and fall back to fetching.
  }
  return null;
}

export default function DriverTaskCompletionScreen() {
  const { orderId, order: orderParam } = useLocalSearchParams<{ orderId?: string; order?: string }>();
  const passedOrder = parsePassedOrder(orderParam);
  const { loading: authLoading, profile } = useAuth();
  const [order, setOrder] = useState<DriverOrder | null>(passedOrder);
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string>('image/jpeg');
  const [photoName, setPhotoName] = useState<string>('');
  const [loading, setLoading] = useState(!passedOrder);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Slide-up bottom sheet animations
  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.back();
    });
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 24,
        stiffness: 240,
        mass: 0.7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => subscription.remove();
  }, [handleClose]);

  const loadOrder = useCallback(async () => {
    if (!orderId || !/^\d+$/.test(orderId)) {
      setError('A valid delivery order is required.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await apiRequest<DriverOrdersResponse>('/api/driver/orders');
      const selectedOrder = (response.orders ?? []).find((item) => item.id === Number(orderId));
      if (!selectedOrder) throw new Error('This assigned delivery could not be found.');
      if (selectedOrder.delivery_assignment_status !== 'out_for_delivery') {
        throw new Error('This delivery is not ready to be completed.');
      }
      setOrder(selectedOrder);
    } catch (caught) {
      setOrder(null);
      setError(caught instanceof Error ? caught.message : 'Could not load this delivery.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    // Order data was already loaded on the active-deliveries screen and handed off
    // via params, so the sheet can render its content immediately instead of showing
    // a loading state and re-fetching what we already have.
    if (profile && !passedOrder) loadOrder();
  }, [loadOrder, profile, passedOrder]);

  async function handlePickImage() {
    setError('');
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setError('Photo gallery permission is required to select photos.');
        Alert.alert('Permission Denied', 'Please enable gallery access in your device settings.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPhotoUri(asset.uri);
        setPhotoBase64(asset.base64 || null);
        setPhotoMime(asset.mimeType || 'image/jpeg');
        setPhotoName(asset.fileName || `delivery-${order?.id || 'proof'}.jpg`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not select photo from gallery.');
    }
  }

  function handleRemovePhoto() {
    setPhotoUri(null);
    setPhotoBase64(null);
    setPhotoName('');
  }

  async function submitProof() {
    if (!order) return;
    if (!photoUri || !photoBase64) {
      setError('A photo of the delivered order is required as proof of delivery.');
      return;
    }
    if (notes.trim().length > 2000) {
      setError('Notes must not exceed 2000 characters.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await apiRequest(`/api/driver/orders/${order.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          image: `data:${photoMime};base64,${photoBase64}`,
          image_mime: photoMime,
          image_name: photoName || `delivery-${order.id}-proof.jpg`,
          notes: notes.trim() || null,
        }),
      });
      router.replace('/DriverTaskCompleted');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not complete this delivery.');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GREEN} size="large" />
      </View>
    );
  }
  if (!profile) return <Redirect href="/login" />;

  const vehicle = order?.vehicle
    ? `${order.vehicle.vehicle_name} · ${order.vehicle.plate_number}`
    : 'Vehicle not recorded';
  const deliveryWindow = order
    ? formatDeliveryWindow(order.delivery_scheduled_at, order.delivery_window_end_at)
    : '';

  return (
    <SafeAreaView style={styles.container}>
      {/* Dimmed backdrop - taps dismiss smoothly without heavy blur */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable onPress={handleClose} style={styles.backdropPressable} />
      </Animated.View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.flex}>
          {/* Spacer to push sheet to the bottom */}
          <Pressable onPress={handleClose} style={styles.flex} />

          {/* Slide-Up Bottom Sheet */}
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}>
            {loading ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator color={GREEN} />
                <Text style={styles.loadingText}>Loading delivery…</Text>
              </View>
            ) : order ? (
              <ScrollView
                bounces={false}
                contentContainerStyle={styles.sheetContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                {/* Header: Title & Close Button */}
                <View style={styles.sheetHeaderRow}>
                  <Text style={styles.sheetTitle}>Complete Delivery</Text>
                  <Pressable
                    accessibilityLabel="Close"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={handleClose}
                    style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}>
                    <Text style={styles.closeButtonText}>✕</Text>
                  </Pressable>
                </View>

                {/* Badges Row */}
                <View style={styles.badgesRow}>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>🚚 Out for Delivery</Text>
                  </View>
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderBadgeText}>{order.order_number}</Text>
                  </View>
                </View>

                {/* Consolidated Delivery Information Card */}
                <View style={styles.deliveryInfoCard}>
                  {/* Receiver & Contact */}
                  <View style={styles.infoRow}>
                    <View style={styles.infoColLeft}>
                      <Text style={styles.fieldKicker}>Receiver</Text>
                      <Text style={styles.receiverName}>{order.delivery_full_name || 'Not provided'}</Text>
                    </View>
                    <View style={styles.infoColRight}>
                      <Text style={styles.fieldKicker}>Phone</Text>
                      <Text style={styles.phoneNumber}>{order.delivery_mobile_number || 'N/A'}</Text>
                    </View>
                  </View>

                  {/* Drop-off Address */}
                  <View style={styles.addressDivider}>
                    <Text style={styles.fieldKicker}>Drop-off Location</Text>
                    <Text style={styles.addressText}>{formatDeliveryAddress(order)}</Text>
                  </View>

                  {/* Metadata Chips Row: Payment, Vehicle, Window */}
                  <View style={styles.chipsRow}>
                    <View style={styles.metaChip}>
                      <Text style={styles.metaChipText}>💳 {order.payment_method} · {formatPeso(order.total_amount)}</Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Text style={styles.metaChipText}>🚛 {vehicle}</Text>
                    </View>
                    {deliveryWindow ? (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>⏱️ {deliveryWindow}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Proof of Delivery Photo Section */}
                <View style={styles.photoSection}>
                  <View style={styles.photoHeaderRow}>
                    <Text style={styles.photoProofKicker}>Delivery Proof</Text>
                    <View style={styles.photoRequiredTag}>
                      <Text style={styles.photoRequiredText}>Photo Required</Text>
                    </View>
                  </View>

                  <View style={styles.photoProofContainer}>
                    {photoUri ? (
                      <View style={styles.photoImageWrapper}>
                        <Image source={{ uri: photoUri }} style={styles.photoImage} />
                        <View style={styles.photoAttachedBadge}>
                          <Text style={styles.photoAttachedBadgeText}>✓ Photo attached</Text>
                        </View>
                        <View style={styles.photoButtonsOverlay}>
                          <Pressable
                            accessibilityLabel="Change photo"
                            accessibilityRole="button"
                            onPress={handlePickImage}
                            style={({ pressed }) => [
                              styles.photoActionButton,
                              pressed && styles.photoActionButtonPressed,
                            ]}>
                            <Text style={styles.changeButtonText}>Change</Text>
                          </Pressable>
                          <Pressable
                            accessibilityLabel="Remove photo"
                            accessibilityRole="button"
                            onPress={handleRemovePhoto}
                            style={({ pressed }) => [
                              styles.photoActionButton,
                              pressed && styles.photoActionButtonPressed,
                            ]}>
                            <Text style={styles.removeButtonText}>Remove</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <Pressable
                        accessibilityLabel="Select photo proof from gallery"
                        accessibilityRole="button"
                        onPress={handlePickImage}
                        style={({ pressed }) => [
                          styles.photoEmptyDropzone,
                          pressed && styles.photoEmptyDropzonePressed,
                        ]}>
                        <View style={styles.photoEmptyIconCircle}>
                          <CameraSvg color={GREEN} size={20} />
                        </View>
                        <Text style={styles.photoEmptyPrompt}>
                          Select a photo showing the delivered parcel
                        </Text>
                        <View style={styles.photoEmptySelectButton}>
                          <GallerySvg color="#FFFFFF" size={13} />
                          <Text style={styles.photoEmptySelectButtonText}>
                            Choose Photo from Gallery
                          </Text>
                        </View>
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Delivery Notes */}
                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Notes (Optional)</Text>
                  <TextInput
                    accessibilityLabel="Delivery notes"
                    maxLength={2000}
                    multiline
                    onChangeText={setNotes}
                    placeholder="Any details about the drop-off (e.g. left with guard, gate)..."
                    placeholderTextColor="#94A3B8"
                    style={styles.notesInput}
                    textAlignVertical="top"
                    value={notes}
                  />
                </View>

                {/* Error Banner */}
                {error ? (
                  <Text accessibilityRole="alert" style={styles.errorText}>
                    {error}
                  </Text>
                ) : null}

                {/* Submit Action Button */}
                <Pressable
                  accessibilityRole="button"
                  disabled={submitting}
                  onPress={submitProof}
                  style={({ pressed }) => [
                    styles.submitButton,
                    (pressed || submitting) && styles.submitButtonPressed,
                  ]}>
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitText}>Submit Delivery Proof</Text>
                  )}
                </Pressable>
              </ScrollView>
            ) : (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={handleClose}>
                  <Text style={styles.backText}>Return to active deliveries</Text>
                </Pressable>
              </View>
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
