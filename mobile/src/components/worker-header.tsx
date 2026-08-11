import { Image, ImageBackground, Pressable, View } from 'react-native';

import { styles } from '@/styles/components/worker-header.styles';

function BellIcon() {
  return (
    <View style={styles.bell}>
      <View style={styles.bellBody} />
      <View style={styles.bellClapper} />
    </View>
  );
}

export function WorkerHeader() {
  return (
    <ImageBackground
      source={require('@/assets/images/worker-header-gradient.png')}
      resizeMode="stretch"
      style={styles.header}>
      <Image
        accessibilityLabel="AgriVerse"
        source={require('@/assets/images/agriverse-drone-logo.png')}
        style={styles.logo}
      />
      <Pressable accessibilityLabel="Notifications" accessibilityRole="button" hitSlop={12}>
        <BellIcon />
      </Pressable>
    </ImageBackground>
  );
}
