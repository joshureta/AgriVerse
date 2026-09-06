import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { styles } from '@/styles/components/schedule-calendar.styles';
import { formatClockTime, formatWeekRangeLabel, formatWeekdayLabel, isSameDay, weekDays } from '@/lib/calendar';

export type ScheduleEvent = {
  id: string;
  start: Date;
  end: Date | null;
  title: string;
  subtitle: string;
};

function dayHeading(day: Date, today: Date) {
  const label = day.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  return isSameDay(day, today) ? `Today, ${label}` : label;
}

function DeliveryRow({ event }: { event: ScheduleEvent }) {
  return (
    <View style={styles.deliveryRow}>
      <View style={styles.deliveryTimeline} />
      <View style={styles.deliveryContent}>
        <View style={styles.deliveryTimeBlock}>
          <Text style={styles.deliveryTime}>{formatClockTime(event.start)}</Text>
          {event.end ? <Text style={styles.deliveryEndTime}>– {formatClockTime(event.end)}</Text> : null}
        </View>
        <View style={styles.deliveryDetails}>
          <Text numberOfLines={1} style={styles.deliveryTitle}>{event.title}</Text>
          <Text numberOfLines={2} style={styles.deliverySubtitle}>{event.subtitle}</Text>
        </View>
      </View>
    </View>
  );
}

export function ScheduleCalendar({
  weekStart, today, events, onPrevWeek, onNextWeek, onToday, selectedDate, onSelectDate,
}: {
  weekStart: Date;
  today: Date;
  events: ScheduleEvent[];
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}) {
  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const eventsByDay = useMemo(
    () => days.map((day) => events.filter((event) => isSameDay(event.start, day)).sort((a, b) => a.start.getTime() - b.start.getTime())),
    [days, events],
  );
  const activeDay = selectedDate && days.some((day) => isSameDay(day, selectedDate))
    ? selectedDate
    : days.find((day) => isSameDay(day, today)) ?? days[0];
  const activeDayIndex = days.findIndex((day) => isSameDay(day, activeDay));
  const activeDayEvents = eventsByDay[activeDayIndex] ?? [];

  return (
    <View>
      <View style={styles.weekNav}>
        <Pressable accessibilityLabel="Previous week" accessibilityRole="button" hitSlop={10} onPress={onPrevWeek} style={styles.navButton}><Text style={styles.navArrow}>‹</Text></Pressable>
        <Pressable accessibilityLabel="Jump to current week" accessibilityRole="button" onPress={onToday} style={styles.weekLabelWrap}><Text style={styles.weekLabel}>{formatWeekRangeLabel(weekStart)}</Text></Pressable>
        <Pressable accessibilityLabel="Next week" accessibilityRole="button" hitSlop={10} onPress={onNextWeek} style={styles.navButton}><Text style={styles.navArrow}>›</Text></Pressable>
      </View>

      <View style={styles.weekStrip}>
        {days.map((day) => {
          const active = isSameDay(day, activeDay);
          return (
            <Pressable accessibilityLabel={`Select ${formatWeekdayLabel(day)} ${day.getDate()}`} accessibilityRole="button" key={day.toISOString()} onPress={() => onSelectDate(day)} style={[styles.dayHeader, active && styles.dayHeaderActive]}>
              <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>{formatWeekdayLabel(day).slice(0, 3)}</Text>
              <Text style={[styles.dayNumber, active && styles.dayNumberActive]}>{day.getDate()}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.scheduleList}>
        {activeDayEvents.length ? (
          <View style={styles.dayGroup}>
            <Text style={[styles.dayGroupTitle, isSameDay(activeDay, today) && styles.dayGroupTitleToday]}>{dayHeading(activeDay, today)}</Text>
            <View style={styles.dayGroupRows}>{activeDayEvents.map((event) => <DeliveryRow event={event} key={event.id} />)}</View>
          </View>
        ) : (
          <View style={styles.weekEmpty}>
            <Text style={styles.weekEmptyText}>No deliveries are scheduled for this date.</Text>
          </View>
        )}
      </View>
    </View>
  );
}
