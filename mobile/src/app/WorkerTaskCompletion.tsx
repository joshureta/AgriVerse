import { styles } from '@/styles/worker-task-completion.styles';
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

import { useAuth } from '@/context/auth-context';
import { taskCompletionBlurTargetRef } from '@/components/task-completion-blur-target';
import { apiRequest } from '@/lib/api';

type WorkerTask = {
  id: number;
  category: string;
  field: string;
  status: 'pending' | 'in_progress' | 'completed';
  description: string | null;
};

const GREEN = '#176d34';

function formatCurrentTime() {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function parseFinishTime(value: string) {
  const match = value.trim().match(/^(1[0-2]|0?[1-9]):([0-5]\d)\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hour += 12;
  const date = new Date();
  date.setHours(hour, Number(match[2]), 0, 0);
  return date;
}

function ClockIcon() {
  return <View style={styles.clock}><View style={styles.clockHour} /><View style={styles.clockMinute} /></View>;
}

export default function WorkerTaskCompletionScreen() {
  const { width } = useWindowDimensions();
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const { loading: authLoading, profile } = useAuth();
  const [task, setTask] = useState<WorkerTask | null>(null);
  const [timeFinished, setTimeFinished] = useState(formatCurrentTime);
  const [insights, setInsights] = useState('');
  
  // Photo states (Gallery selection only)
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string>('image/jpeg');
  const [photoName, setPhotoName] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => { if (profile) loadTask(); }, [loadTask, profile]);

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
    const completedAt = parseFinishTime(timeFinished);
    if (!completedAt) {
      setError('Enter the finish time in the format 9:30 AM.');
      return;
    }
    if (!photoUri) {
      setError('A photo of the completed work is required as proof of completion.');
      return;
    }
    if (insights.trim().length > 2000) {
      setError('Insights must not exceed 2000 characters.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await apiRequest(`/api/worker/tasks/${task.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          completed_at: completedAt.toISOString(),
          completion_notes: insights.trim() || null,
          image: photoBase64 ? `data:${photoMime};base64,${photoBase64}` : null,
          image_mime: photoMime,
          image_name: photoName || `${task.category} Proof Photo`,
        }),
      });
      router.replace('/WorkerTaskCompleted');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not complete this task.');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) return <View style={styles.center}><ActivityIndicator color={GREEN} size="large" /></View>;
  if (!profile) return <Redirect href="/login" />;

  const pagePadding = width < 360 ? 14 : 25;

  return (
    <SafeAreaView style={styles.safeArea}>
      <BlurView
        blurTarget={taskCompletionBlurTargetRef}
        blurMethod="dimezisBlurViewSdk31Plus"
        blurReductionFactor={2}
        intensity={60}
        pointerEvents="none"
        style={styles.blurBackdrop}
        tint="extraLight"
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={[styles.page, { paddingHorizontal: pagePadding }]} keyboardShouldPersistTaps="handled">
          {loading ? (
            <View style={styles.loadingCard}><ActivityIndicator color={GREEN} /><Text style={styles.loadingText}>Loading task…</Text></View>
          ) : task ? (
            <View style={styles.formCard}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryIcon}><Text style={styles.categoryEmoji}>🌱</Text></View>
                <Text style={styles.categoryTitle}>{task.category}</Text>
              </View>

              <View style={styles.formBody}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Field</Text>
                  <Text style={styles.readonlyStrong}>{task.field}</Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Time Finished</Text>
                  <View style={styles.timeRow}>
                    <ClockIcon />
                    <TextInput
                      accessibilityLabel="Time finished"
                      autoCapitalize="characters"
                      maxLength={8}
                      onChangeText={setTimeFinished}
                      placeholder="9:30 AM"
                      placeholderTextColor="#8b928b"
                      selectTextOnFocus
                      style={styles.timeInput}
                      value={timeFinished}
                    />
                    <Text style={styles.chevron}>⌄</Text>
                  </View>
                </View>

                <View style={[styles.fieldGroup, styles.descriptionGroup]}>
                  <Text style={styles.label}>Description</Text>
                  <Text style={styles.description}>{task.description || 'No description provided.'}</Text>
                </View>

                {/* Proof of Work / Photo Inspection Group (Below Description) */}
                <View style={[styles.fieldGroup, styles.photoGroup]}>
                  <Text style={styles.label}>
                    Proof of Work <Text style={styles.photoRequiredBadge}>* (Photo Required)</Text>
                  </Text>

                  {!photoUri ? (
                    <View style={styles.photoUploadBox}>
                      <Text style={styles.photoUploadIcon}>📸</Text>
                      <Text style={styles.photoUploadPrompt}>
                        Select a photo of the completed crop work from your device
                      </Text>
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
                        <View style={styles.photoBadge}>
                          <Text style={styles.photoBadgeText}>✓ Photo attached</Text>
                        </View>
                        <View style={styles.photoActionsRow}>
                          <Pressable onPress={handlePickImage} style={styles.changePhotoButton}>
                            <Text style={styles.changePhotoText}>🖼️ Change Photo</Text>
                          </Pressable>
                          <Pressable onPress={handleRemovePhoto} style={styles.removePhotoButton}>
                            <Text style={styles.removePhotoText}>✕ Remove</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                <View style={[styles.fieldGroup, styles.insightsGroup]}>
                  <Text style={styles.label}>Insights (Optional)</Text>
                  <TextInput
                    accessibilityLabel="Completion insights"
                    maxLength={2000}
                    multiline
                    onChangeText={setInsights}
                    placeholder="Optional agronomic notes or observations..."
                    placeholderTextColor="#9ca3af"
                    style={styles.insightsInput}
                    textAlignVertical="top"
                    value={insights}
                  />
                </View>

                {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
                <Pressable
                  disabled={submitting}
                  onPress={submitCompletion}
                  style={({ pressed }) => [styles.submitButton, (pressed || submitting) && styles.submitButtonPressed]}>
                  {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitText}>Complete Task</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={() => router.replace('/WorkerTaskActive')}>
                <Text style={styles.backText}>Return to active tasks</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


