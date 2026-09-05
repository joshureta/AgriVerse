import { Image, ImageSourcePropType, Pressable, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

  return (
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
          <Pressable accessibilityLabel="Notifications" accessibilityRole="button" hitSlop={12}>
            <BellIcon />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
