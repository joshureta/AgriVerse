import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import { styles } from '@/styles/notifications.styles';

type NotificationType =
  | 'task_assigned' | 'task_starting_soon' | 'harvest_approved' | 'harvest_rejected'
  | 'task_reassigned' | 'admin_broadcast' | 'weather_alert'
  | 'delivery_assigned' | 'delivery_window_approaching' | 'order_cancelled'
  | 'dispute_opened' | 'cod_confirmed' | 'rating_received' | 'order_status_updated';

type NotificationRecord = {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  entity_type: 'task' | 'order' | null;
  entity_id: number | null;
  read_at: string | null;
  created_at: string;
};

const TYPE_META: Record<NotificationType, { tone: 'green' | 'amber' | 'red' | 'info'; icon: 'task' | 'clock' | 'check' | 'x' | 'swap' | 'megaphone' | 'cloud' | 'package' | 'alertTriangle' | 'cash' | 'star' }> = {
  task_assigned: { tone: 'green', icon: 'task' },
  task_starting_soon: { tone: 'amber', icon: 'clock' },
  harvest_approved: { tone: 'green', icon: 'check' },
  harvest_rejected: { tone: 'red', icon: 'x' },
  task_reassigned: { tone: 'info', icon: 'swap' },
  admin_broadcast: { tone: 'info', icon: 'megaphone' },
  weather_alert: { tone: 'amber', icon: 'cloud' },
  delivery_assigned: { tone: 'green', icon: 'package' },
  delivery_window_approaching: { tone: 'amber', icon: 'clock' },
  order_cancelled: { tone: 'red', icon: 'x' },
  dispute_opened: { tone: 'red', icon: 'alertTriangle' },
  cod_confirmed: { tone: 'green', icon: 'cash' },
  rating_received: { tone: 'info', icon: 'star' },
  order_status_updated: { tone: 'green', icon: 'package' },
};

const TONE_STYLES = {
  green: { circle: styles.iconGreen, stroke: '#166534' },
  amber: { circle: styles.iconAmber, stroke: '#92400E' },
  red: { circle: styles.iconRed, stroke: '#991B1B' },
  info: { circle: styles.iconInfo, stroke: '#075985' },
} as const;

function NotificationIcon({ type }: { type: NotificationType }) {
  const meta = TYPE_META[type];
  const tone = TONE_STYLES[meta.tone];
  const c = tone.stroke;

  return (
    <View style={[styles.iconCircle, tone.circle]}>
      <Svg width={19} height={19} viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        {meta.icon === 'task' ? (
          <>
            <Rect x={5} y={4} width={10} height={13} rx={1.5} />
            <Path d="M8 4V3a2 2 0 0 1 4 0v1" />
            <Path d="M7.5 9.2h5M7.5 12.2h5" />
          </>
        ) : meta.icon === 'clock' ? (
          <>
            <Circle cx={10} cy={10} r={7} />
            <Path d="M10 6v4l3 2" />
          </>
        ) : meta.icon === 'check' ? (
          <Path d="M5 10.5 8.5 14 15 6" strokeWidth={1.9} />
        ) : meta.icon === 'x' ? (
          <Path d="M6 6 14 14M14 6 6 14" strokeWidth={1.9} />
        ) : meta.icon === 'swap' ? (
          <>
            <Path d="M4 8a6 6 0 0 1 10-3.5L16 6" />
            <Path d="M16 6V3M16 6h-3" />
            <Path d="M16 12a6 6 0 0 1-10 3.5L4 14" />
            <Path d="M4 14v3M4 14h3" />
          </>
        ) : meta.icon === 'megaphone' ? (
          <Path d="M3 9v2a1 1 0 0 0 1 1h1l1.5 4h2L7 12h1l7 3V5L8 8H4a1 1 0 0 0-1 1Z" />
        ) : meta.icon === 'cloud' ? (
          <Path d="M6 15h8a3 3 0 0 0 .5-5.95A4.5 4.5 0 0 0 6.1 8.5 3 3 0 0 0 6 15Z" />
        ) : meta.icon === 'package' ? (
          <>
            <Path d="M10 3 3 6.5V13.5L10 17L17 13.5V6.5Z" />
            <Path d="M3 6.5 10 10l7-3.5M10 10v7" />
          </>
        ) : meta.icon === 'alertTriangle' ? (
          <>
            <Path d="M10 3.5 17.5 16h-15Z" />
            <Path d="M10 8.5v3.2" />
            <Circle cx={10} cy={14} r={0.7} fill={c} stroke="none" />
          </>
        ) : meta.icon === 'cash' ? (
          <>
            <Rect x={3} y={6} width={14} height={9} rx={1.5} />
            <Circle cx={10} cy={10.5} r={2} />
          </>
        ) : (
          <Path d="M10 3.2 12 8l5.3.5-4 3.5 1.2 5.2L10 14.6l-4.5 2.6 1.2-5.2-4-3.5L8 8Z" strokeWidth={1.5} />
        )}
      </Svg>
    </View>
  );
}

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24 && date.toDateString() === now.toDateString()) return `${diffHr}h ago`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
}

function NotificationCard({
  notification,
  onPress,
}: {
  notification: NotificationRecord;
  onPress: () => void;
}) {
  const unread = !notification.read_at;
  const urgent = notification.type === 'dispute_opened' && unread;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, unread && styles.cardUnread, urgent && styles.cardUrgent]}
    >
      <NotificationIcon type={notification.type} />
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardTitle}>{notification.title}</Text>
          {unread ? <View style={styles.unreadDot} /> : null}
        </View>
        <Text numberOfLines={2} style={styles.cardText}>{notification.body}</Text>
        <View style={styles.cardMetaRow}>
          <Text style={styles.cardTime}>{formatTime(notification.created_at)}</Text>
          {urgent ? <Text style={styles.actionChip}>Action needed</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

export function NotificationPanel({
  onUnreadCountChange,
  maxListHeight,
}: {
  onUnreadCountChange?: (count: number) => void;
  maxListHeight?: number;
}) {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const result = await apiRequest<{ notifications: NotificationRecord[]; unread_count: number }>('/api/notifications');
      setNotifications(result.notifications || []);
      setUnreadCount(result.unread_count || 0);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (profile) load();
  }, [load, profile]);

  useEffect(() => {
    onUnreadCountChange?.(unreadCount);
  }, [unreadCount, onUnreadCountChange]);

  async function markRead(notification: NotificationRecord) {
    if (notification.read_at) return;
    setNotifications((current) => current.map((item) => (
      item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item
    )));
    setUnreadCount((current) => Math.max(0, current - 1));
    try {
      await apiRequest(`/api/notifications/${notification.id}/read`, { method: 'PATCH' });
    } catch {
      load();
    }
  }

  async function markAllRead() {
    if (!unreadCount) return;
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at || readAt })));
    setUnreadCount(0);
    try {
      await apiRequest('/api/notifications/read-all', { method: 'POST' });
    } catch {
      load();
    }
  }

  const newGroup = notifications.filter((item) => !item.read_at);
  const earlierGroup = notifications.filter((item) => item.read_at);

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <Pressable onPress={markAllRead}>
            <Text style={styles.markReadLink}>Mark all read</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        style={[{ flex: 1 }, maxListHeight ? { maxHeight: maxListHeight } : null]}
        contentContainerStyle={styles.panelList}
        refreshControl={<RefreshControl colors={['#237c31']} onRefresh={() => load(true)} refreshing={refreshing} />}
      >
        {error ? (
          <Pressable onPress={() => load()} style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retry}>Tap to retry</Text>
          </Pressable>
        ) : loading ? (
          <View style={styles.loadingBox}><ActivityIndicator color="#237c31" /><Text style={styles.loadingText}>Loading notifications...</Text></View>
        ) : notifications.length ? (
          <>
            {newGroup.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>New</Text>
                {newGroup.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} onPress={() => markRead(notification)} />
                ))}
              </>
            ) : null}
            {earlierGroup.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>Earlier</Text>
                {earlierGroup.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} onPress={() => markRead(notification)} />
                ))}
              </>
            ) : null}
          </>
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>✓</Text>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyText}>You'll see task, delivery, and order updates here.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
