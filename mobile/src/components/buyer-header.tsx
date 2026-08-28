import { router } from 'expo-router';
import { Image, Pressable, Text, View } from 'react-native';

import { styles } from '@/styles/components/buyer-header.styles';

function BackIcon() {
  return (
    <View style={styles.backButton}>
      <View style={styles.backChevron} />
    </View>
  );
}

function ChatIcon() {
  return (
    <View style={styles.chat}>
      <View style={styles.chatBubble} />
    </View>
  );
}

function BellIcon({ hasNotice }: { hasNotice?: boolean }) {
  return (
    <View style={styles.bell}>
      <View style={styles.bellBody} />
      <View style={styles.bellClapper} />
      {hasNotice ? <View style={styles.bellDot} /> : null}
    </View>
  );
}

const HeaderIcons = ({ hasNotice }: { hasNotice?: boolean }) => (
  <View style={styles.actions}>
    <Pressable accessibilityLabel="Messages" accessibilityRole="button" hitSlop={12}>
      <ChatIcon />
    </Pressable>
    <Pressable accessibilityLabel="Notifications" accessibilityRole="button" hitSlop={12}>
      <BellIcon hasNotice={hasNotice} />
    </Pressable>
  </View>
);

export function BuyerHeader({ hasNotice = true, showBack = false }: { hasNotice?: boolean; showBack?: boolean }) {
  if (showBack) {
    return (
      <View style={styles.header}>
        <View style={styles.zone}>
          <Pressable accessibilityLabel="Go back" accessibilityRole="button" hitSlop={10} onPress={() => router.back()}>
            <BackIcon />
          </Pressable>
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

  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <Image
          accessibilityLabel="Toledo Trading"
          source={require('@/assets/images/toledo-trading-logo.png')}
          style={styles.logo}
        />
      </View>

      <HeaderIcons hasNotice={hasNotice} />
    </View>
  );
}
