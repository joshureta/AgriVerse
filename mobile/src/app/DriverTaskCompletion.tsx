import { styles } from '@/styles/driver-task-completion.styles';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
import { taskCompletionBlurTargetRef } from '@/components/task-completion-blur-target';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import { DriverOrder, DriverOrdersResponse, formatDeliveryAddress, formatDeliveryWindow, formatPeso } from '@/lib/driver-deliveries';

const GREEN = '#176d34';
const vehicleImage = require('@/assets/images/driver-equipment.png');

function ConfirmationField({ label, value }: { label: string; value: string }) {
  return <View style={styles.fieldGroup}><Text style={styles.label}>{label}</Text><Text style={styles.readonlyStrong}>{value}</Text></View>;
}

export default function DriverTaskCompletionScreen() {
  const { width } = useWindowDimensions();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const { loading: authLoading, profile } = useAuth();
  const [order, setOrder] = useState<DriverOrder | null>(null);
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string>('image/jpeg');
  const [photoName, setPhotoName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadOrder = useCallback(async () => {
    if (!orderId || !/^\d+$/.test(orderId)) { setError('A valid delivery order is required.'); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const response = await apiRequest<DriverOrdersResponse>('/api/driver/orders');
      const selectedOrder = (response.orders ?? []).find((item) => item.id === Number(orderId));
      if (!selectedOrder) throw new Error('This assigned delivery could not be found.');
      if (selectedOrder.delivery_assignment_status !== 'out_for_delivery') throw new Error('This delivery is not ready to be completed.');
      setOrder(selectedOrder);
    } catch (caught) {
      setOrder(null);
      setError(caught instanceof Error ? caught.message : 'Could not load this delivery.');
    } finally { setLoading(false); }
  }, [orderId]);

  useEffect(() => { if (profile) loadOrder(); }, [loadOrder, profile]);

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
    setSubmitting(true); setError('');
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
    } finally { setSubmitting(false); }
  }

  if (authLoading) return <View style={styles.center}><ActivityIndicator color={GREEN} size="large" /></View>;
  if (!profile) return <Redirect href="/login" />;
  const pagePadding = width < 360 ? 14 : 25;
  const vehicle = order?.vehicle ? `${order.vehicle.vehicle_name} · ${order.vehicle.plate_number}` : 'Not recorded';

  return <SafeAreaView style={styles.safeArea}>
    <BlurView blurTarget={taskCompletionBlurTargetRef} blurMethod="dimezisBlurViewSdk31Plus" blurReductionFactor={2} intensity={60} pointerEvents="none" style={styles.blurBackdrop} tint="extraLight" />
    <WorkerHeader />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.page, { paddingHorizontal: pagePadding }]} keyboardShouldPersistTaps="handled">
        {loading ? <View style={styles.loadingCard}><ActivityIndicator color={GREEN} /><Text style={styles.loadingText}>Loading delivery…</Text></View> : order ? (
          <View style={styles.formCard}>
            <View style={styles.categoryHeader}><View style={styles.categoryIcon}><Image source={vehicleImage} style={styles.categoryImage} /></View><View><Text style={styles.categoryTitle}>Complete Delivery</Text><Text style={styles.categorySubtitle}>{order.order_number}</Text></View></View>
            <View style={styles.formBody}>
              <Text style={styles.confirmationText}>Take a photo showing the order was delivered. This marks the order delivered, releases the vehicle, and lets the customer confirm receipt.</Text>
              <ConfirmationField label="RECEIVER" value={order.delivery_full_name || 'Not provided'} />
              <ConfirmationField label="CONTACT NUMBER" value={order.delivery_mobile_number || 'Not provided'} />
              <ConfirmationField label="DELIVERY LOCATION" value={formatDeliveryAddress(order)} />
              <ConfirmationField label="DELIVERY WINDOW" value={formatDeliveryWindow(order.delivery_scheduled_at, order.delivery_window_end_at)} />
              <ConfirmationField label="PAYMENT" value={`${order.payment_method} · ${formatPeso(order.total_amount)}`} />
              <ConfirmationField label="VEHICLE" value={vehicle} />

              <View style={[styles.fieldGroup, styles.photoGroup]}>
                <Text style={styles.label}>
                  Delivery Proof <Text style={styles.photoRequiredBadge}>* (Photo Required)</Text>
                </Text>
                {!photoUri ? (
                  <View style={styles.photoUploadBox}>
                    <Text style={styles.photoUploadIcon}>📸</Text>
                    <Text style={styles.photoUploadPrompt}>Select a photo showing the order was delivered</Text>
                    <Pressable onPress={handlePickImage} style={styles.choosePhotoButton}>
                      <Text style={styles.choosePhotoButtonText}>🖼️ Choose Photo from Gallery</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View>
                    <View style={styles.photoPreviewContainer}>
                      <Image source={{ uri: photoUri }} style={styles.photoPreviewImage} />
                    </View>
                    <View style={styles.photoBadgeRow}>
                      <View style={styles.photoBadge}><Text style={styles.photoBadgeText}>✓ Photo attached</Text></View>
                      <View style={styles.photoActionsRow}>
                        <Pressable onPress={handlePickImage} style={styles.changePhotoButton}><Text style={styles.changePhotoText}>🖼️ Change Photo</Text></Pressable>
                        <Pressable onPress={handleRemovePhoto} style={styles.removePhotoButton}><Text style={styles.removePhotoText}>✕ Remove</Text></Pressable>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              <View style={[styles.fieldGroup, styles.notesGroup]}>
                <Text style={styles.label}>Notes (Optional)</Text>
                <TextInput
                  accessibilityLabel="Delivery notes"
                  maxLength={2000}
                  multiline
                  onChangeText={setNotes}
                  placeholder="Any details about the drop-off..."
                  placeholderTextColor="#9ca3af"
                  style={styles.notesInput}
                  textAlignVertical="top"
                  value={notes}
                />
              </View>

              {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
              <View style={styles.actions}>
                <Pressable disabled={submitting} onPress={() => router.replace('/DriverTaskActive')} style={styles.cancelButton}><Text style={styles.cancelText}>Back</Text></Pressable>
                <Pressable disabled={submitting} onPress={submitProof} style={({ pressed }) => [styles.submitButton, (pressed || submitting) && styles.submitButtonPressed]}>
                  {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitText}>Submit Delivery Proof</Text>}
                </Pressable>
              </View>
            </View>
          </View>
        ) : <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => router.replace('/DriverTaskActive')}><Text style={styles.backText}>Return to active deliveries</Text></Pressable></View>}
      </ScrollView>
    </KeyboardAvoidingView>
    <WorkerBottomNavigation activeTab="tasks" />
  </SafeAreaView>;
}
