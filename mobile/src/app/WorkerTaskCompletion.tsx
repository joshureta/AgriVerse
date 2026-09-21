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
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import { taskCategoryIconSource } from '@/lib/task-category-icons';
import { canWorkCropTaskNow, CROP_WORK_HOURS_LABEL } from '@/lib/crop-work-hours';
import {
  collectsInspection,
  INSPECTION_QUESTIONS,
  suppliesSummary,
  type InspectionDetails,
  type TaskSupplyFields,
} from '@/lib/task-supplies';

type WorkerTask = TaskSupplyFields & {
  id: number;
  category: string;
  field: string;
  status: 'pending' | 'in_progress' | 'completed';
  description: string | null;
  schedule_start?: string | null;
  started_at?: string | null;
  estimated_duration_minutes?: number | null;
};

function PinSvg({ color = '#DC2626', size = 12 }: { color?: string; size?: number }) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={10} r={3} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function MonitoringIcon({ size = 13, color = '#166534' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={10.5} cy={10.5} r={6.5} stroke={color} strokeWidth={2} />
      <Path d="m15.5 15.5 5 5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M10.5 7.5a3 3 0 0 0-3 3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function IrrigationIcon({ size = 13, color = '#0284C7' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9 15a3 3 0 0 0 3 3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function HarvestingIcon({ size = 13, color = '#B45309' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9h18l-2 11H5L3 9z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M7 9V6a5 5 0 0 1 10 0v3" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M10 14h4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function PlantingIcon({ size = 13, color = '#15803D' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22v-9" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path
        d="M12 13c-3-6-9-4-9 1 5 1 8-1 9-1z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 13c3-6 9-4 9 1-5 1-8-1-9-1z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M5 22h14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function FertilizingIcon({ size = 13, color = '#166534' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 3.5 1 5.5-.5 10A7 7 0 0 1 11 20z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="m7 15 5-5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function PestControlIcon({ size = 13, color = '#B91C1C' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="m9 12 2 2 4-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function DefaultTaskIcon({ size = 13, color = '#166534' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 3.5 1 5.5-.5 10A7 7 0 0 1 11 20z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type CategoryTheme = {
  bg: string;
  border: string;
  iconColor: string;
  textColor: string;
  IconComponent: React.ComponentType<{ size?: number; color?: string }>;
};

const categoryConfig: Record<string, CategoryTheme> = {
  Monitoring: {
    bg: '#E8F5E9',
    border: '#BBF7D0',
    iconColor: '#166534',
    textColor: '#166534',
    IconComponent: MonitoringIcon,
  },
  'Crop Inspection': {
    bg: '#E8F5E9',
    border: '#BBF7D0',
    iconColor: '#166534',
    textColor: '#166534',
    IconComponent: MonitoringIcon,
  },
  Irrigation: {
    bg: '#E0F2FE',
    border: '#BAE6FD',
    iconColor: '#0284C7',
    textColor: '#0369A1',
    IconComponent: IrrigationIcon,
  },
  Harvesting: {
    bg: '#FEF3C7',
    border: '#FDE68A',
    iconColor: '#B45309',
    textColor: '#92400E',
    IconComponent: HarvestingIcon,
  },
  Planting: {
    bg: '#DCFCE7',
    border: '#BBF7D0',
    iconColor: '#15803D',
    textColor: '#15803D',
    IconComponent: PlantingIcon,
  },
  Fertilizer: {
    bg: '#ECFDF5',
    border: '#A7F3D0',
    iconColor: '#166534',
    textColor: '#166534',
    IconComponent: FertilizingIcon,
  },
  Fertilizing: {
    bg: '#ECFDF5',
    border: '#A7F3D0',
    iconColor: '#166534',
    textColor: '#166534',
    IconComponent: FertilizingIcon,
  },
  'Pests & Disease Control': {
    bg: '#FEF2F2',
    border: '#FECACA',
    iconColor: '#B91C1C',
    textColor: '#B91C1C',
    IconComponent: PestControlIcon,
  },
};

const defaultCategoryTheme: CategoryTheme = {
  bg: '#DCFCE7',
  border: '#BBF7D0',
  iconColor: '#166534',
  textColor: '#166534',
  IconComponent: DefaultTaskIcon,
};

function formatStartTime(startedAt?: string | null, scheduleStart?: string | null) {
  const timeStr = startedAt || scheduleStart;
  if (!timeStr) return '08:30 AM';
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return '08:30 AM';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '08:30 AM';
  }
}

function formatDuration(startedAt?: string | null, estimatedMinutes?: number | null) {
  if (startedAt) {
    try {
      const diff = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
      const hrs = String(Math.floor(diff / 3600)).padStart(2, '0');
      const mins = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
      const secs = String(diff % 60).padStart(2, '0');
      return `${hrs}:${mins}:${secs}`;
    } catch {
      // fallback
    }
  }
  if (estimatedMinutes) {
    return `${estimatedMinutes} mins`;
  }
  return '01:24:18';
}

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
  const [inspection, setInspection] = useState<Partial<InspectionDetails>>({});

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
        allowsEditing: false,
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
    const needsInspection = collectsInspection(task.category, task.activity_type);
    if (needsInspection && INSPECTION_QUESTIONS.some((question) => !inspection[question.key])) {
      setError('Answer every inspection question before completing the task.');
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
          ...(needsInspection ? { details: inspection } : {}),
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
                    {isHarvesting ? 'Submit Harvest' : 'Submit Task'}
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

                {/* Badges Row: Category, Task ID & Field Badges (Driver Style) */}
                {(() => {
                  const config = categoryConfig[task.category] || defaultCategoryTheme;
                  const rawField = task.field?.trim() || 'Field';
                  const cleanField = rawField.toLowerCase().startsWith('field') ? rawField : `Field ${rawField}`;
                  const scheduleTime = formatStartTime(task.started_at, task.schedule_start);
                  const durationText = formatDuration(task.started_at, task.estimated_duration_minutes);

                  return (
                    <>
                      <View style={styles.categoryRow}>
                        <View style={[styles.categoryBadge, { backgroundColor: config.bg, borderColor: config.border }]}>
                          <Image source={taskCategoryIconSource(task.category)} style={{ width: 20, height: 20, resizeMode: 'contain' }} />
                          <Text style={[styles.categoryBadgeText, { color: config.textColor }]}>
                            {task.category}
                          </Text>
                        </View>
                        <View style={styles.taskIdBadge}>
                          <Text style={styles.taskIdBadgeText}>Task #{task.id}</Text>
                        </View>
                        <View style={styles.fieldBadge}>
                          <PinSvg size={12} color="#DC2626" />
                          <Text style={styles.fieldBadgeText}>{cleanField}</Text>
                        </View>
                      </View>

                      {/* Consolidated Task Information Card (Driver deliveryInfoCard Style) */}
                      <View style={styles.taskInfoCard}>
                        <View style={styles.infoCol}>
                          <Text style={styles.infoKicker}>FIELD</Text>
                          <Text style={styles.infoValue}>{cleanField}</Text>
                        </View>
                        <View style={styles.infoDividerCol}>
                          <Text style={styles.infoKicker}>SCHEDULE</Text>
                          <Text style={styles.infoValue}>{scheduleTime}</Text>
                        </View>
                        <View style={styles.infoDividerCol}>
                          <Text style={styles.infoKicker}>DURATION</Text>
                          <Text style={[styles.infoValue, styles.infoValueHighlighted]}>{durationText}</Text>
                        </View>
                      </View>
                    </>
                  );
                })()}

                {/* Standard Task Objective Box (For Non-Harvesting Tasks) */}
                {!isHarvesting && (
                  <View style={styles.standardObjectiveBox}>
                    <Text style={styles.standardObjectiveLabel}>Task Objective</Text>
                    <Text style={styles.standardObjectiveText}>
                      {task.description || `${task.category} task in ${task.field}.`}
                    </Text>
                  </View>
                )}

                {/* Supplies taken when the task was started (Fertilization, Pest & Disease Action) */}
                {suppliesSummary(task) ? (
                  <View style={extra.suppliesBox}>
                    <Text style={extra.label}>Supplies taken</Text>
                    <Text style={extra.suppliesText}>{suppliesSummary(task)}</Text>
                  </View>
                ) : null}

                {/* Inspection questions (Monitoring, Pest & Disease Inspection) */}
                {collectsInspection(task.category, task.activity_type) ? (
                  <View style={extra.section}>
                    {INSPECTION_QUESTIONS.map((question) => (
                      <View key={question.key} style={extra.question}>
                        <Text style={extra.label}>{question.label}</Text>
                        <View style={extra.chips}>
                          {question.options.map((option) => {
                            const selected = inspection[question.key] === option;
                            return (
                              <Pressable
                                accessibilityRole="button"
                                accessibilityState={{ selected }}
                                key={option}
                                onPress={() => setInspection((current) => ({ ...current, [question.key]: option }))}
                                style={[extra.chip, selected && extra.chipSelected]}>
                                <Text style={[extra.chipText, selected && extra.chipTextSelected]}>{option}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Structured Harvest Counts Grid (Harvesting Tasks Only) */}
                {isHarvesting && (
                  <View style={styles.harvestSection}>
                    <View style={styles.harvestHeaderRow}>
                      <Text style={styles.harvestKicker}>HARVEST YIELD COUNTS</Text>
                      <Text style={styles.harvestHint}>Enter harvested quantities</Text>
                    </View>

                    <View style={styles.harvestGrid}>
                      {/* Row 1: Small & Medium */}
                      <View style={styles.harvestGridRow}>
                        <View style={styles.harvestGridCard}>
                          <Text style={styles.harvestCardLabel}>Small</Text>
                          <TextInput
                            accessibilityLabel="Small pineapple count"
                            keyboardType="number-pad"
                            maxLength={5}
                            onChangeText={setSmallCount}
                            placeholder="0"
                            placeholderTextColor="#94A3B8"
                            selectTextOnFocus
                            style={styles.harvestCardInput}
                            value={smallCount}
                          />
                        </View>
                        <View style={styles.harvestGridCard}>
                          <Text style={styles.harvestCardLabel}>Medium</Text>
                          <TextInput
                            accessibilityLabel="Medium pineapple count"
                            keyboardType="number-pad"
                            maxLength={5}
                            onChangeText={setMediumCount}
                            placeholder="0"
                            placeholderTextColor="#94A3B8"
                            selectTextOnFocus
                            style={styles.harvestCardInput}
                            value={mediumCount}
                          />
                        </View>
                      </View>

                      {/* Row 2: Large & Damaged */}
                      <View style={styles.harvestGridRow}>
                        <View style={styles.harvestGridCard}>
                          <Text style={styles.harvestCardLabel}>Large</Text>
                          <TextInput
                            accessibilityLabel="Large pineapple count"
                            keyboardType="number-pad"
                            maxLength={5}
                            onChangeText={setLargeCount}
                            placeholder="0"
                            placeholderTextColor="#94A3B8"
                            selectTextOnFocus
                            style={styles.harvestCardInput}
                            value={largeCount}
                          />
                        </View>
                        <View style={[styles.harvestGridCard, styles.harvestGridCardDamaged]}>
                          <Text style={[styles.harvestCardLabel, styles.harvestCardLabelDamaged]}>Damaged</Text>
                          <TextInput
                            accessibilityLabel="Damaged pineapple count"
                            keyboardType="number-pad"
                            maxLength={5}
                            onChangeText={setDamagedCount}
                            placeholder="0"
                            placeholderTextColor="#94A3B8"
                            selectTextOnFocus
                            style={[styles.harvestCardInput, styles.harvestCardInputDamaged]}
                            value={damagedCount}
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {/* Photo Proof Section (Driver Style) */}
                <View style={styles.photoSection}>
                  <View style={styles.photoHeaderRow}>
                    <Text style={styles.photoProofKicker}>PHOTO PROOF</Text>
                    <View style={styles.photoRequiredTag}>
                      <Text style={styles.photoRequiredText}>Photo Required</Text>
                    </View>
                  </View>

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
                  <Text style={styles.insightsLabel}>Field Insights (Optional)</Text>
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
                    <>
                      <View style={styles.checkCircleBadge}>
                        <Text style={styles.checkCircleIcon}>✓</Text>
                      </View>
                      <Text style={styles.submitText}>
                        {!workAllowed
                          ? 'Work unavailable'
                          : 'Submit for Approval'}
                      </Text>
                    </>
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

const extra = StyleSheet.create({
  label: { marginBottom: 6, color: '#64748B', fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  suppliesBox: { marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  suppliesText: { color: '#0F172A', fontSize: 14, fontWeight: '700' },
  section: { marginTop: 14 },
  question: { marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF' },
  chipSelected: { borderColor: '#176D34', backgroundColor: '#E8F5E9' },
  chipText: { color: '#475569', fontSize: 13, fontWeight: '600' },
  chipTextSelected: { color: '#166534', fontWeight: '800' },
});
