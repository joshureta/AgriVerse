import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NotificationPanel } from '@/components/notification-panel';
import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
import { useAuth } from '@/context/auth-context';
import { styles } from '@/styles/notifications.styles';

export default function Notifications() {
  const { loading, profile } = useAuth();

  if (loading) return <SafeAreaView style={styles.safeArea} />;
  if (!profile) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <WorkerHeader logoPosition="left" logoSize={48} logoSource={require('@/assets/images/driver-dashboard-emblem.png')} />

      <View style={styles.mainBodyContainer}>
        <NotificationPanel />
      </View>

      <WorkerBottomNavigation />
    </SafeAreaView>
  );
}
