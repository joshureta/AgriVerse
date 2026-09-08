import { GREEN, styles } from '@/styles/worker-task-completion.styles';
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
import { canWorkCropTaskNow, CROP_WORK_HOURS_LABEL } from '@/lib/crop-work-hours';

type WorkerTask = {
  id: number;
  category: string;
  field: string;
  status: 'pending' | 'in_progress' | 'completed';
  description: string | null;
};

const categoryIcons: Record<string, string> = {
  Harvesting: '🍍',
  Monitoring: '🌱',
  Fertilizing: '🧪',
  Pruning: '✂️',
  Weeding: '🌿',
  Planting: '🌱',
  Watering: '💧',
};

function CameraSvg({ color = '#176D34', size = 22 }: { color?: string; size?: number }) {
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

function GallerySvg({ color = '#FFFFFF', size = 15 }: { color?: string; size?: number }) {
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

function parseHarvestCount(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

function parsePassedTask(value?: string): WorkerTask | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed.id === 'number') return parsed as WorkerTask;
  } catch {
    // Ignore malformed/missing param and fall back to fetching.
  }
  return null;
}

export default function WorkerTaskCompletionScreen() {
  const { taskId, task: taskParam } = useLocalSearchParams<{ taskId?: string; task?: string }>();
  const passedTask = parsePassedTask(taskParam);
  const { loading: authLoading, profile } = useAuth();
  const [task, setTask] = useState<WorkerTask | null>(passedTask);
  const [insights, setInsights] = useState('');

  // Harvest counts (Harvesting tasks only - 2x2 grid)
  const [smallCount, setSmallCount] = useState('');
  const [mediumCount, setMediumCount] = useState('');
  const [largeCount, setLargeCount] = useState('');
  const [damagedCount, setDamagedCount] = useState('');

  // Photo states
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string>('image/jpeg');
  const [photoName, setPhotoName] = useState<string>('');

  const [loading, setLoading] = useState(!passedTask);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Slide-up and Backdrop Fade Animations
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

  const loadTask = useCallback(async () => {
    if (!taskId || !/^\d+$/.test(taskId)) {
      setError('A valid task is required.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await apiRequest<{ task: WorkerTask }>(`/api/worker/tasks/${taskId}`);
      if (response.task.status !== 'in_progress') throw new Error('This task is no longer active.');
      setTask(response.task);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load this task.');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    // Task data was already loaded on the active-tasks screen and handed off via
    // params, so the sheet can render its content immediately instead of showing
    // a loading state and re-fetching what we already have.
    if (profile && !passedTask) loadTask();
  }, [loadTask, profile, passedTask]);

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
        setPhotoName(asset.fileName || `task-${task?.id || 'work'}-completion.jpg`);
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

  async function submitCompletion() {
    if (!task) return;
    const isHarvesting = task.category === 'Harvesting';
    if (!photoUri) {
      setError('A photo of the completed work is required as proof of completion.');
      return;
    }
    if (insights.trim().length > 2000) {
      setError('Insights must not exceed 2000 characters.');
      return;
    }

    let harvestFields: Record<string, number> = {};
    if (isHarvesting) {
      const small = parseHarvestCount(smallCount);
      const medium = parseHarvestCount(mediumCount);
      const large = parseHarvestCount(largeCount);
      const damaged = parseHarvestCount(damagedCount);
      if (small === null || medium === null || large === null || damaged === null) {
        setError('Enter Small, Medium, Large, and Damaged counts as whole numbers (0 or more).');
        return;
      }
      harvestFields = {
        harvest_small_count: small,
        harvest_medium_count: medium,
        harvest_large_count: large,
        harvest_damaged_count: damaged,
      };
    }

    setSubmitting(true);
    setError('');
    try {
      await apiRequest(`/api/worker/tasks/${task.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          completed_at: new Date().toISOString(),
          completion_notes: insights.trim() || null,
          image: photoBase64 ? `data:${photoMime};base64,${photoBase64}` : null,
          image_mime: photoMime,
          image_name: photoName || `${task.category} Proof Photo`,
          ...harvestFields,
        }),
      });
      router.replace('/WorkerTaskCompleted');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not complete this task.');
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

  const workAllowed = canWorkCropTaskNow();
  const isHarvesting = task?.category === 'Harvesting';

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
                <Text style={styles.loadingText}>Loading task…</Text>
              </View>
            ) : task ? (
              <ScrollView
                bounces={false}
                contentContainerStyle={styles.sheetContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                {/* Header: Title & Close Button */}
                <View style={styles.sheetHeaderRow}>
                  <Text style={styles.sheetTitle}>
                    {isHarvesting ? 'Submit Harvest' : 'Complete Task'}
                  </Text>
                  <Pressable
                    accessibilityLabel="Close"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={handleClose}
                    style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}>
                    <Text style={styles.closeButtonText}>✕</Text>
                  </Pressable>
                </View>

                {/* Category & Location Badges */}
                <View style={styles.categoryRow}>
                  <View style={[styles.categoryBadge, isHarvesting && styles.categoryBadgeHarvesting]}>
                    <Text style={[styles.categoryBadgeText, isHarvesting && styles.categoryBadgeTextHarvesting]}>
                      {categoryIcons[task.category] || '🌱'} {task.category}
                    </Text>
                  </View>
                  {task.field ? (
                    <View style={styles.fieldBadge}>
                      <Text style={styles.fieldBadgeText}>📍 {task.field}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Standard Task Objective Box (For Non-Harvesting Tasks) */}
                {!isHarvesting && (
                  <View style={styles.standardObjectiveBox}>
                    <Text style={styles.standardObjectiveLabel}>Task Objective</Text>
                    <Text style={styles.standardObjectiveText}>
                      {task.description || `${task.category} task in ${task.field}.`}
                    </Text>
                  </View>
                )}

                {/* 2x2 Harvest Counts Grid (Harvesting Tasks Only) */}
                {isHarvesting && (
                  <View style={styles.harvestGrid}>
                    {/* Row 1: Small & Medium */}
                    <View style={styles.harvestGridRow}>
                      <View style={styles.harvestGridItem}>
                        <Text style={styles.harvestItemLabel}>Small</Text>
                        <TextInput
                          accessibilityLabel="Small pineapple count"
                          keyboardType="number-pad"
                          maxLength={5}
                          onChangeText={setSmallCount}
                          placeholder="0"
                          placeholderTextColor="#94A3B8"
                          selectTextOnFocus
                          style={styles.harvestItemInput}
                          value={smallCount}
                        />
                      </View>
                      <View style={styles.harvestGridItem}>
                        <Text style={styles.harvestItemLabel}>Medium</Text>
                        <TextInput
                          accessibilityLabel="Medium pineapple count"
                          keyboardType="number-pad"
                          maxLength={5}
                          onChangeText={setMediumCount}
                          placeholder="0"
                          placeholderTextColor="#94A3B8"
                          selectTextOnFocus
                          style={styles.harvestItemInput}
                          value={mediumCount}
                        />
                      </View>
                    </View>

                    {/* Row 2: Large & Damaged */}
                    <View style={styles.harvestGridRow}>
                      <View style={styles.harvestGridItem}>
                        <Text style={styles.harvestItemLabel}>Large</Text>
                        <TextInput
                          accessibilityLabel="Large pineapple count"
                          keyboardType="number-pad"
                          maxLength={5}
                          onChangeText={setLargeCount}
                          placeholder="0"
                          placeholderTextColor="#94A3B8"
                          selectTextOnFocus
                          style={styles.harvestItemInput}
                          value={largeCount}
                        />
                      </View>
                      <View style={styles.harvestGridItem}>
                        <Text style={styles.harvestItemLabel}>Damaged</Text>
                        <TextInput
                          accessibilityLabel="Damaged pineapple count"
                          keyboardType="number-pad"
                          maxLength={5}
                          onChangeText={setDamagedCount}
                          placeholder="0"
                          placeholderTextColor="#94A3B8"
                          selectTextOnFocus
                          style={styles.harvestItemInput}
                          value={damagedCount}
                        />
                      </View>
                    </View>
                  </View>
                )}

                {/* Photo Proof Section */}
                <View style={styles.photoSection}>
                  <Text style={styles.photoProofKicker}>PHOTO PROOF</Text>
                  <View style={styles.photoProofContainer}>
                    {photoUri ? (
                      <View style={styles.photoImageWrapper}>
                        <Image source={{ uri: photoUri }} style={styles.photoImage} />
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
                          <CameraSvg color={GREEN} size={22} />
                        </View>
                        <Text style={styles.photoEmptyPrompt}>
                          Select a photo of the completed crop work
                        </Text>
                        <View style={styles.photoEmptySelectButton}>
                          <GallerySvg color="#FFFFFF" size={14} />
                          <Text style={styles.photoEmptySelectButtonText}>
                            Choose Photo from Gallery
                          </Text>
                        </View>
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Insights Section */}
                <View style={styles.insightsSection}>
                  <Text style={styles.insightsLabel}>Insights</Text>
                  <TextInput
                    accessibilityLabel="Completion insights"
                    maxLength={2000}
                    multiline
                    onChangeText={setInsights}
                    placeholder="Typed agronomic notes / added observations..."
                    placeholderTextColor="#94A3B8"
                    style={styles.insightsInput}
                    textAlignVertical="top"
                    value={insights}
                  />
                </View>

                {/* Errors */}
                {error ? (
                  <Text accessibilityRole="alert" style={styles.errorText}>
                    {error}
                  </Text>
                ) : null}
                {!workAllowed ? <Text style={styles.errorText}>{CROP_WORK_HOURS_LABEL}</Text> : null}

                {/* Submit Action Button */}
                <Pressable
                  accessibilityRole="button"
                  disabled={submitting || !workAllowed}
                  onPress={submitCompletion}
                  style={({ pressed }) => [
                    styles.submitButton,
                    (pressed || submitting || !workAllowed) && styles.submitButtonPressed,
                  ]}>
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitText}>
                      {!workAllowed
                        ? 'Work unavailable'
                        : isHarvesting
                        ? 'Submit for Approval'
                        : 'Complete Task'}
                    </Text>
                  )}
                </Pressable>
              </ScrollView>
            ) : (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={handleClose}>
                  <Text style={styles.backText}>Return to active tasks</Text>
                </Pressable>
              </View>
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
