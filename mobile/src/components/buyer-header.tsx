import { Image, Pressable, Text, View } from 'react-native';

import { styles } from '@/styles/components/buyer-header.styles';

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

export function BuyerHeader({ hasNotice = true }: { hasNotice?: boolean }) {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <Image
          accessibilityLabel="Toledo Trading"
          source={require('@/assets/images/toledo-trading-logo.png')}
          style={styles.logo}
        />
        <Text style={styles.brandName}>TOLEDO TRADING</Text>
      </View>

      <View style={styles.actions}>
        <Pressable accessibilityLabel="Messages" accessibilityRole="button" hitSlop={12}>
          <ChatIcon />
        </Pressable>
        <Pressable accessibilityLabel="Notifications" accessibilityRole="button" hitSlop={12}>
          <BellIcon hasNotice={hasNotice} />
        </Pressable>
      </View>
    </View>
  );
}
