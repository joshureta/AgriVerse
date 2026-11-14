import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const dateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function AssignmentDateList<T>({ items, assignedAt, renderItem }: {
  items: T[];
  assignedAt: (item: T) => string | null | undefined;
  renderItem: (item: T) => ReactNode;
}) {
  const groups = new Map<string, { date: Date | null; items: T[] }>();
  for (const item of items) {
    const value = assignedAt(item);
    const parsed = value ? new Date(value) : null;
    const date = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
    const key = date ? dateFormat.format(date) : '';
    const group = groups.get(key) ?? { date, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  const today = dateFormat.format(new Date());
  return <View>{[...groups.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([key, group], index) => (
    <View key={key} style={[styles.group, index > 0 && styles.groupDivider]}>
      <View accessibilityLabel={group.date ? `Assigned ${group.date.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'full' })}` : 'Assignment date unavailable'} style={styles.date}>
        <Text style={[styles.weekday, key === today && styles.todayText]}>{group.date ? group.date.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short' }) : 'Date'}</Text>
        <View style={[styles.day, key === today && styles.today]}>
          <Text style={[styles.dayText, key === today && styles.todayText]}>{group.date ? group.date.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', day: 'numeric' }) : '—'}</Text>
        </View>
      </View>
      <View style={styles.tasks}>{group.items.map((item, itemIndex) => <View key={itemIndex} style={itemIndex > 0 && styles.taskDivider}>{renderItem(item)}</View>)}</View>
    </View>
  ))}</View>;
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', gap: 10, paddingVertical: 14 },
  groupDivider: { borderTopWidth: 1, borderTopColor: '#A8ADA5' },
  date: { width: 40, alignItems: 'center', paddingTop: 8 },
  weekday: { fontSize: 14, fontWeight: '600', color: '#484E49' },
  day: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  dayText: { fontSize: 20, fontWeight: '600', color: '#484E49' },
  today: { borderWidth: 1.5, borderColor: '#166534', borderRadius: 18 },
  todayText: { color: '#166534' },
  tasks: { flex: 1, minWidth: 0, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: '#D6D9D2', paddingLeft: 10 },
  taskDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#D6D9D2', paddingTop: 10 },
});
