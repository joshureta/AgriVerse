import { styles } from '@/styles/index.styles';
import { Redirect } from 'expo-router';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';

import { useAuth } from '@/context/auth-context';
import { postAuthenticationRoute } from '@/lib/mobile-routing';

export default function IndexScreen() {
  const { loading, profile, restoreError, restoreSession } = useAuth();

  if (!loading && restoreError) {
    return (
      <View style={styles.container}>
        <Text accessibilityRole="alert" style={styles.error}>{restoreError}</Text>
        <Pressable accessibilityRole="button" onPress={() => void restoreSession()} style={styles.retryButton}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!loading) {
    if (!profile) return <Redirect href="/welcome" />;

    return (
      <Redirect href={postAuthenticationRoute(profile)} />
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
