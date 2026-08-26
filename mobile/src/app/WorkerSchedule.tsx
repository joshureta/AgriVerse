import { styles } from '@/styles/worker-schedule.styles';
import { Redirect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SafeAreaView, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { ScheduleCalendar, type ScheduleEvent } from '@/components/schedule-calendar';
import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import { addDays, startOfWeek } from '@/lib/calendar';

// Same task shape the API already returns to WorkerTaskDashboard/WorkerTaskPending
// (see backend/routes/worker-tasks.js `serializeTask`) — this screen just also
// reads the `schedule` object that was already being sent but not yet consumed
// by the mobile app.
type TaskStatus = 'pending' | 'in_progress' | 'completed';
type WorkerScheduleTask = {
  id: number;
  category: string;
  field: string;
  status: TaskStatus;
  description: string | null;
  schedule_start: string;
  estimated_duration_minutes: number | null;
  schedule?: { schedule_date: string; end_time: string | null } | null;
};

const GREEN = '#134B24';

function taskToEvent(task: WorkerScheduleTask): ScheduleEvent {
  const start = new Date(task.schedule_start);
  let end: Date | null = null;
  if (task.schedule?.schedule_date && task.schedule?.end_time) {
    end = new Date(`${task.schedule.schedule_date}T${String(task.schedule.end_time).slice(0, 8)}+08:00`);
  } else if (task.estimated_duration_minutes) {
    end = new Date(start.getTime() + task.estimated_duration_minutes * 60000);
  }
  return {
    id: `task-${task.id}`,
    start,
    end,
    title: task.category,
    subtitle: task.description || task.field,
  };
}

export default function WorkerScheduleScreen() {
  const { width } = useWindowDimensions();
  const { loading: authLoading, profile } = useAuth();
  const [tasks, setTasks] = useState<WorkerScheduleTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const today = useMemo(() => new Date(), []);

  const loadSchedule = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const response = await apiRequest<{ tasks: WorkerScheduleTask[] }>('/api/worker/tasks');
      setTasks(response.tasks ?? []);
    } catch (caught) {
      setTasks([]);
      setError(caught instanceof Error ? caught.message : 'Could not load your schedule.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (profile) loadSchedule(); }, [loadSchedule, profile]);

  const events = useMemo(() => tasks.map(taskToEvent), [tasks]);
  const horizontalPadding = width < 360 ? 14 : 18;

  if (authLoading) return <View style={styles.center}><ActivityIndicator color={GREEN} size="large" /></View>;
  if (!profile) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <WorkerHeader />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
        refreshControl={<RefreshControl colors={[GREEN]} onRefresh={() => loadSchedule(true)} refreshing={refreshing} />}
        showsVerticalScrollIndicator={false}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>My Schedule</Text>
          <Text style={styles.subtitle}>Your assigned farm tasks this week</Text>
        </View>

        {error ? (
          <Pressable onPress={() => loadSchedule()} style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retry}>Tap to retry</Text>
          </Pressable>
        ) : null}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={GREEN} />
            <Text style={styles.loadingText}>Loading your schedule...</Text>
          </View>
        ) : events.length > 0 ? (
          <ScheduleCalendar
            events={events}
            onNextWeek={() => setWeekStart((current) => addDays(current, 7))}
            onPrevWeek={() => setWeekStart((current) => addDays(current, -7))}
            onSelectDate={setSelectedDate}
            onToday={() => setWeekStart(startOfWeek(new Date()))}
            selectedDate={selectedDate}
            today={today}
            weekStart={weekStart}
          />
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>✓</Text>
            <Text style={styles.emptyTitle}>No tasks scheduled</Text>
            <Text style={styles.emptyText}>Pull down to check for newly assigned work.</Text>
          </View>
        )}
      </ScrollView>

      <WorkerBottomNavigation activeTab="schedule" />
    </SafeAreaView>
  );
}
