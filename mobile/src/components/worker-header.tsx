import { useEffect, useRef, useState } from 'react';
import { Image, ImageSourcePropType, Pressable, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { NotificationToast } from '@/components/notification-toast';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import { styles } from '@/styles/components/worker-header.styles';

const POLL_INTERVAL_MS = 20000;

type NotificationSummary = { id: number; title: string; body: string };

function getInitials(name?: string | null) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U';
}

function BellIcon({ unread }: { unread: boolean }) {
  return (
    <View style={styles.bellWrapper}>
      <View style={styles.bellOutline}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path
            d="M10.268 21a2 2 0 0 0 3.464 0"
            stroke="#ffffff"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .738-1.674C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"
            stroke="#ffffff"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      {unread ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>!</Text>
        </View>
      ) : null}
    </View>
  );
}

export function WorkerHeader({
  extendUnderStatusBar = false,
  height,
  transparent = false,
  overlay = false,
  logoSource = require('@/assets/images/toledo-trading-logo.png'),
  logoSize,
  logoPosition = 'center',
  blurred = false,
}: {
  extendUnderStatusBar?: boolean;
  height?: number;
  transparent?: boolean;
  overlay?: boolean;
  logoSource?: ImageSourcePropType;
  logoSize?: number;
  logoPosition?: 'left' | 'center';
  blurred?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);

  const [toastQueue, setToastQueue] = useState<NotificationSummary[]>([]);
  const [currentToast, setCurrentToast] = useState<NotificationSummary | null>(null);
  const lastSeenIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;

    async function poll(isFirst: boolean) {
      try {
        const result = await apiRequest<{ notifications: NotificationSummary[]; unread_count: number }>('/api/notifications');
        if (cancelled) return;
        setHasUnread((result.unread_count || 0) > 0);
        const list = result.notifications || [];
        const maxId = list.reduce((max, item) => Math.max(max, item.id), 0);
        if (isFirst) {
          lastSeenIdRef.current = maxId;
          return;
        }
        const seenId = lastSeenIdRef.current ?? 0;
        const fresh = list.filter((item) => item.id > seenId).sort((a, b) => a.id - b.id);
        if (fresh.length) {
          setToastQueue((queue) => [...queue, ...fresh]);
          lastSeenIdRef.current = maxId;
        }
      } catch {}
    }

    poll(true);
    const interval = setInterval(() => poll(false), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [profile]);

  useEffect(() => {
    if (!currentToast && toastQueue.length > 0) {
      setCurrentToast(toastQueue[0]);
      setToastQueue((queue) => queue.slice(1));
    }
  }, [currentToast, toastQueue]);

  return (
    <>
    <View style={[
      styles.headerWrap,
      extendUnderStatusBar && { paddingTop: insets.top },
      transparent && styles.transparent,
      overlay && styles.overlay,
    ]}>
      {blurred ? <BlurView intensity={55} tint="dark" style={styles.blurBackground} /> : null}
      {blurred ? <View pointerEvents="none" style={styles.blurTint} /> : null}
      <View style={[styles.header, height ? { height } : undefined, transparent && styles.transparent]}>
        <View style={styles.zone}>
          {logoPosition === 'left' ? (
            <Image
              accessibilityLabel="Toledo Trading"
              source={logoSource}
              style={[styles.logo, logoSize ? { width: logoSize, height: logoSize } : undefined]}
            />
          ) : null}
        </View>

        <View style={[styles.zone, styles.zoneCenter]}>
          {logoPosition === 'center' ? (
            <Image
              accessibilityLabel="Toledo Trading"
              source={logoSource}
              style={[styles.logo, logoSize ? { width: logoSize, height: logoSize } : undefined]}
            />
          ) : null}
        </View>

        <View style={[styles.zone, styles.zoneEnd]}>
          <Pressable
            accessibilityLabel="Notifications"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => router.push('/Notifications')}
          >
            <BellIcon unread={hasUnread} />
          </Pressable>
          <View
            accessible
            accessibilityLabel={`${profile?.full_name || 'User'} profile`}
            style={styles.profileAvatar}
          >
            <Text style={styles.profileAvatarText}>{getInitials(profile?.full_name)}</Text>
          </View>
        </View>
      </View>
    </View>

    <NotificationToast
      insetsTop={insets.top}
      item={currentToast}
      onHide={() => setCurrentToast(null)}
      onPress={() => {
        setCurrentToast(null);
        router.push('/Notifications');
      }}
    />
    </>
  );
}
