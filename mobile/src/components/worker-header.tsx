import { Pressable, Text, View } from 'react-native';

import { styles } from '@/styles/components/worker-header.styles';

function BellIcon() {
  return (
    <View style={styles.bellWrapper}>
      <View style={styles.bellOutline}>
        <View style={styles.bellBody} />
        <View style={styles.bellClapper} />
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
      <View style={styles.brandRow}>
        <Text style={styles.brandIcon}>🌱</Text>
        <Text style={styles.brandTitle}>AgriVerse</Text>
      </View>
      <Pressable accessibilityLabel="Notifications" accessibilityRole="button" hitSlop={12}>
        <BellIcon />
      </Pressable>
    </View>
  );
}
