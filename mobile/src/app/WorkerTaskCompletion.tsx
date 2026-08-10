import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { useAuth } from '@/context/auth-context';
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

  async function submitCompletion() {
    if (!task) return;
    const completedAt = parseFinishTime(timeFinished);
    if (!completedAt) {
      setError('Enter the finish time in the format 9:30 AM.');
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

                <View style={[styles.fieldGroup, styles.insightsGroup]}>
                  <Text style={styles.label}>Insights (Optional)</Text>
                  <TextInput
                    accessibilityLabel="Completion insights"
                    maxLength={2000}
                    multiline
                    onChangeText={setInsights}
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
                  {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitText}>Complete Task</Text>}
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={() => router.replace('/WorkerTaskActive')}><Text style={styles.backText}>Return to active tasks</Text></Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#d9d9d9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d9d9d9' },
  page: { flexGrow: 1, justifyContent: 'center', paddingVertical: 18 },
  formCard: { width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 0, overflow: 'hidden' },
  categoryHeader: { height: 59, backgroundColor: '#2f7f2d', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17 },
  categoryIcon: { width: 35, height: 35, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  categoryEmoji: { fontSize: 23 },
  categoryTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginLeft: 14 },
  formBody: { paddingHorizontal: 11, paddingTop: 9, paddingBottom: 30 },
  fieldGroup: { borderWidth: 1, borderColor: '#ededed', minHeight: 65, paddingHorizontal: 23, paddingTop: 7, marginBottom: 7 },
  label: { color: '#176b32', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  readonlyStrong: { color: '#111', fontSize: 15, fontWeight: '700', marginTop: 10, marginLeft: 10 },
  timeRow: { height: 35, flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  clock: { width: 21, height: 21, borderRadius: 11, borderWidth: 1.5, borderColor: '#69807a', marginHorizontal: 9 },
  clockHour: { position: 'absolute', width: 1.5, height: 6, backgroundColor: '#69807a', top: 4, left: 9 },
  clockMinute: { position: 'absolute', width: 6, height: 1.5, backgroundColor: '#69807a', top: 10, left: 9, transform: [{ rotate: '30deg' }] },
  timeInput: { width: 187, height: 29, borderWidth: 1, borderColor: '#ededed', color: '#111', fontSize: 14, fontWeight: '700', paddingHorizontal: 22, paddingVertical: 3 },
  chevron: { color: '#18703a', fontSize: 22, marginLeft: -27, marginTop: -4 },
  descriptionGroup: { minHeight: 91 },
  description: { color: '#111', fontSize: 15, lineHeight: 21, fontWeight: '700', marginTop: 18, marginLeft: 17 },
  insightsGroup: { minHeight: 101, paddingBottom: 7 },
  insightsInput: { flex: 1, minHeight: 65, color: '#171717', fontSize: 14, padding: 4 },
  errorText: { color: '#aa322d', fontSize: 11, lineHeight: 16, marginHorizontal: 4, marginBottom: 8 },
  submitButton: { minWidth: 111, height: 27, paddingHorizontal: 18, borderRadius: 4, backgroundColor: '#21783a', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 10, elevation: 5, shadowColor: '#555', shadowOffset: { width: 0, height: 4 }, shadowOpacity: .3, shadowRadius: 5 },
  submitButtonPressed: { opacity: .7 },
  submitText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  loadingCard: { alignItems: 'center', gap: 10, backgroundColor: '#fff', padding: 40 },
  loadingText: { color: '#617064', fontSize: 12 },
  errorCard: { backgroundColor: '#fff', borderRadius: 8, padding: 24, alignItems: 'center' },
  backText: { color: GREEN, fontSize: 12, fontWeight: '800', marginTop: 10 },
});
