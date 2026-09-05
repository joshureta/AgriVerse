import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useAuth } from '@/context/auth-context';
import { loadBuyerUnreadCount } from '@/lib/buyer-messages';
import { styles } from '@/styles/components/buyer-header.styles';

const UNREAD_POLL_INTERVAL_MS = 20000;

function BackIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke="#ffffff"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChatIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"
        stroke="#ffffff"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 12h.01M12 12h.01M16 12h.01"
        stroke="#ffffff"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BellIcon({ hasNotice }: { hasNotice?: boolean }) {
  return (
    <View style={styles.bell}>
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
      {hasNotice ? <View style={styles.bellDot} /> : null}
    </View>
  );
}

function HeaderIcons({ hasNotice }: { hasNotice?: boolean }) {
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;

    async function fetchUnreadCount() {
      try {
        const count = await loadBuyerUnreadCount();
        if (!cancelled) setUnreadCount(count);
      } catch {
        // Badge just won't refresh this cycle.
      }
    }

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, UNREAD_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [profile]);

  return (
    <View style={styles.actions}>
      <Pressable
        accessibilityLabel={unreadCount > 0 ? `Messages (${unreadCount} unread)` : 'Messages'}
        accessibilityRole="button"
        hitSlop={12}
        onPress={() => router.push('/BuyerMessages' as never)}
        style={styles.chat}>
        <ChatIcon />
        {unreadCount > 0 && (
          <View style={styles.chatBadge}>
            <Text style={styles.chatBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </Pressable>
      <Pressable accessibilityLabel="Notifications" accessibilityRole="button" hitSlop={12}>
        <BellIcon hasNotice={hasNotice} />
      </Pressable>
    </View>
  );
}

export function BuyerHeader({ hasNotice = true, showBack = false }: { hasNotice?: boolean; showBack?: boolean }) {
  return (
    <View style={styles.header}>
      <View style={styles.zone}>
        {showBack ? (
          <Pressable accessibilityLabel="Go back" accessibilityRole="button" hitSlop={10} onPress={() => router.back()}>
            <BackIcon />
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.zone, styles.zoneCenter]}>
        <Image
          accessibilityLabel="Toledo Trading"
          source={require('@/assets/images/toledo-trading-logo.png')}
          style={styles.logo}
        />
      </View>

      <View style={[styles.zone, styles.zoneEnd]}>
        <HeaderIcons hasNotice={hasNotice} />
      </View>
    </View>
  );
}
