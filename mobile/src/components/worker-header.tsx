import { Image, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { styles } from '@/styles/components/worker-header.styles';

function BellIcon() {
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
      <View style={styles.badge}>
        <Text style={styles.badgeText}>!</Text>
      </View>
    </View>
  );
}

export function WorkerHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.zone} />

      <View style={[styles.zone, styles.zoneCenter]}>
        <Image
          accessibilityLabel="Toledo Trading"
          source={require('@/assets/images/toledo-trading-logo.png')}
          style={styles.logo}
        />
      </View>

      <View style={[styles.zone, styles.zoneEnd]}>
        <Pressable accessibilityLabel="Notifications" accessibilityRole="button" hitSlop={12}>
          <BellIcon />
        </Pressable>
      </View>
    </View>
  );
}
