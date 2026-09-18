import { SafeAreaView, View } from 'react-native';

import { BuyerHeader } from '@/components/buyer-header';
import { NotificationPanel } from '@/components/notification-panel';
import { styles } from '@/styles/notifications.styles';

export default function BuyerNotifications() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <BuyerHeader showBack />
      <View style={styles.mainBodyContainer}>
        <NotificationPanel />
      </View>
    </SafeAreaView>
  );
}
