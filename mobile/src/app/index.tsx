import { styles } from '@/styles/index.styles';
import { Redirect } from 'expo-router';
import { ActivityIndicator, Image, Text, View } from 'react-native';

import { useAuth } from '@/context/auth-context';

export default function IndexScreen() {
  const { loading, profile } = useAuth();

  if (!loading) {
    if (!profile) return <Redirect href="/login" />;

    return (
      <Redirect
        href={
          profile.worker_category === 'driver'
            ? '/DriverTaskDashboard'
            : '/WorkerTaskPending'
        }
      />
    );
  }

  return (
    <View style={styles.container}>
      <Image source={require('@/assets/images/agriverse-loading.png')} style={styles.logo} />
      <Text style={styles.name}>AgriVerse</Text>
      <ActivityIndicator color="#18753a" size="large" />
    </View>
  );
}
