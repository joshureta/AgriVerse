import { Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { describeUpcoming } from '@/lib/upcoming-schedule';
import { styles } from '@/styles/components/upcoming-card.styles';

export type UpcomingBadge = { label: string; background: string; color: string; border: string };

function LockIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={11} width={14} height={9} rx={2} stroke="#334155" strokeWidth={2.2} />
      <Path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="#334155" strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

export function UpcomingCard({
  scheduledAt,
  title,
  subtitle,
  badge,
}: {
  scheduledAt: string | null | undefined;
  title: string;
  subtitle: string;
  badge?: UpcomingBadge;
}) {
  const when = scheduledAt ? describeUpcoming(scheduledAt) : null;

  return (
    <View style={styles.card}>
      <View style={styles.tile}>
        <Text style={styles.tileMonth}>{when?.month ?? '—'}</Text>
        <View style={styles.tileBody}>
          <Text style={styles.tileDay}>{when?.day ?? '—'}</Text>
          <Text style={styles.tileWeekday}>{when?.weekday ?? ''}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.title}>{title}</Text>
            {badge ? (
              <View style={[styles.badge, { backgroundColor: badge.background, borderColor: badge.border }]}>
                <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            ) : null}
          </View>
          <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.strip}>
          <View style={styles.opens}>
            <LockIcon />
            <Text style={styles.opensText}>{when ? `Opens ${when.time}` : 'Date pending'}</Text>
          </View>
          {when ? <Text style={styles.countdown}>{when.countdown}</Text> : null}
        </View>
      </View>
    </View>
  );
}
