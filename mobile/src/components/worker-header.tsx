import { Image, ImageBackground, Pressable, StyleSheet, View } from 'react-native';

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
        source={require('@/assets/images/agriverse-worker-logo.png')}
        style={styles.logo}
      />
      <Pressable accessibilityLabel="Notifications" accessibilityRole="button" hitSlop={12}>
        <BellIcon />
      </Pressable>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 86,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: { width: 55, height: 55, resizeMode: 'contain' },
  bell: { width: 28, height: 33, alignItems: 'center', justifyContent: 'center' },
  bellBody: {
    width: 20,
    height: 21,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: '#fff',
  },
  bellClapper: { width: 7, height: 4, marginTop: 2, borderRadius: 4, backgroundColor: '#fff' },
});
