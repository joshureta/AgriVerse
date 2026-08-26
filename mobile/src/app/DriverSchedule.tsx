import { styles } from '@/styles/driver-schedule.styles';
import { Redirect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SafeAreaView, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { ScheduleCalendar, type ScheduleEvent } from '@/components/schedule-calendar';
import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import { addDays, startOfWeek } from '@/lib/calendar';
import { DriverOrder, DriverOrdersResponse, formatDeliveryAddress } from '@/lib/driver-deliveries';

const GREEN = '#134B24';

function orderToEvent(order: DriverOrder): ScheduleEvent | null {
  if (!order.delivery_scheduled_at) return null;
  return {
    id: `order-${order.id}`,
    start: new Date(order.delivery_scheduled_at),
    end: order.delivery_window_end_at ? new Date(order.delivery_window_end_at) : null,
    title: order.order_number ? `Order ${order.order_number}` : 'Delivery',
    subtitle: formatDeliveryAddress(order),
  };
}

export default function DriverScheduleScreen() {
  const { width } = useWindowDimensions();
  const { loading: authLoading, profile } = useAuth();
  const [orders, setOrders] = useState<DriverOrder[]>([]);
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
      const response = await apiRequest<DriverOrdersResponse>('/api/driver/orders');
      setOrders(response.orders ?? []);
    } catch (caught) {
      setOrders([]);
      setError(caught instanceof Error ? caught.message : 'Could not load your schedule.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (profile) loadSchedule(); }, [loadSchedule, profile]);

  const events = useMemo(
    () => orders.map(orderToEvent).filter((event): event is ScheduleEvent => event !== null),
    [orders],
  );
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
          <Text style={styles.subtitle}>Your assigned deliveries this week</Text>
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
            <Text style={styles.emptyTitle}>No deliveries scheduled</Text>
            <Text style={styles.emptyText}>Pull down to check for newly assigned orders.</Text>
          </View>
        )}
      </ScrollView>

      <WorkerBottomNavigation activeTab="schedule" />
    </SafeAreaView>
  );
}
