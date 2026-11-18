import { Clock3 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { isScheduledDateOverdue } from '@/lib/overdue-date';

type Props = { scheduledAt?: string | null; reasonCode?: string | null; reasonNotes?: string | null; taskId?: number; reasonSubmittedAt?: string | null };

export function ScheduledOverdueBadge({ scheduledAt, reasonCode, reasonNotes }: Props) {
  if (!isScheduledDateOverdue(scheduledAt)) return null;

  return (
    <View accessibilityRole="alert" style={styles.reminder}>
      <Clock3 color="#9A5D00" size={22} strokeWidth={2.2} />
      <Text style={styles.status}>OVERDUE</Text>
      <Text adjustsFontSizeToFit minimumFontScale={0.9} numberOfLines={1} style={styles.message}>
        {reasonCode ? `Reason: ${reasonNotes || 'Submitted'}` : 'Scheduled date has passed.'}
      </Text>
    </View>
  );
}

export const WorkerOverdueBadge = ScheduledOverdueBadge;

const styles = StyleSheet.create({
  reminder: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF8EA', borderColor: '#E9BF70', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, marginVertical: 8 },
  status: { color: '#8A5200', fontWeight: '900', fontSize: 14 },
  message: { flex: 1, color: '#77501D', fontWeight: '600', fontSize: 14 },
});
