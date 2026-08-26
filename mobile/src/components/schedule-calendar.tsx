import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { styles } from '@/styles/components/schedule-calendar.styles';
import { formatClockTime, formatWeekRangeLabel, formatWeekdayLabel, isSameDay, weekDays } from '@/lib/calendar';

/**
 * A calendar entry, already normalized from whatever the caller's real data
 * source is (assigned farm tasks, assigned delivery orders, ...). Screens
 * build these from existing API responses — this component only lays them
 * out, it never fetches or invents data.
 */
export type ScheduleEvent = {
  id: string;
  start: Date;
  end: Date | null;
  title: string;
  subtitle: string;
};

const PALETTE = [
  { background: '#DCEDC8', text: '#2E5339' },
  { background: '#FFE0B2', text: '#7A4A12' },
  { background: '#B2DFDB', text: '#1F5C55' },
  { background: '#F8E1A1', text: '#6B5900' },
  { background: '#D7CCE8', text: '#4A3B6B' },
  { background: '#BBDEFB', text: '#1D4E77' },
] as const;

function colorForEvent(key: string) {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function EventCard({ event }: { event: ScheduleEvent }) {
  const palette = colorForEvent(`${event.title}-${event.id}`);
  return (
    <View style={[styles.eventCard, { backgroundColor: palette.background }]}>
      <Text style={[styles.eventTime, { color: palette.text }]}>{formatClockTime(event.start)}</Text>
      <View style={styles.eventBody}>
        <Text numberOfLines={2} style={[styles.eventTitle, { color: palette.text }]}>{event.title}</Text>
        <Text numberOfLines={2} style={[styles.eventSubtitle, { color: palette.text }]}>{event.subtitle}</Text>
      </View>
      {event.end ? <Text style={[styles.eventTime, { color: palette.text }]}>{formatClockTime(event.end)}</Text> : null}
    </View>
  );
}

export function ScheduleCalendar({
  weekStart,
  today,
  events,
  onPrevWeek,
  onNextWeek,
  onToday,
  selectedDate,
  onSelectDate,
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

  return (
    <View>
      <View style={styles.weekNav}>
        <Pressable accessibilityLabel="Previous week" accessibilityRole="button" hitSlop={10} onPress={onPrevWeek} style={styles.navButton}>
          <Text style={styles.navArrow}>‹</Text>
        </Pressable>
        <Pressable accessibilityLabel="Jump to current week" accessibilityRole="button" onPress={onToday} style={styles.weekLabelWrap}>
          <Text style={styles.weekLabel}>{formatWeekRangeLabel(weekStart)}</Text>
        </Pressable>
        <Pressable accessibilityLabel="Next week" accessibilityRole="button" hitSlop={10} onPress={onNextWeek} style={styles.navButton}>
          <Text style={styles.navArrow}>›</Text>
        </Pressable>
      </View>

      <View style={styles.gridCard}>
        <ScrollView contentContainerStyle={styles.gridContent} horizontal showsHorizontalScrollIndicator={false}>
          {days.map((day, index) => {
            const isToday = isSameDay(day, today);
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
            const dayEvents = eventsByDay[index];
            return (
              <View key={day.toISOString()} style={styles.dayColumn}>
                <Pressable
                  accessibilityLabel={`Select ${formatWeekdayLabel(day)} ${day.getDate()}`}
                  accessibilityRole="button"
                  onPress={() => onSelectDate(day)}
                  style={[styles.dayHeader, isToday && styles.dayHeaderToday, !isToday && isSelected && styles.dayHeaderSelected]}>
                  <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>{formatWeekdayLabel(day)}</Text>
                  <Text style={[styles.dayNumber, isToday && styles.dayNumberToday]}>{day.getDate()}</Text>
                </Pressable>
                <View style={styles.dayEvents}>
                  {dayEvents.map((event) => <EventCard event={event} key={event.id} />)}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}
