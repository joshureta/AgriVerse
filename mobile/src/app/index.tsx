import { Redirect } from 'expo-router';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/auth-context';

export default function IndexScreen() {
  const { loading, profile } = useAuth();

  if (!loading) return <Redirect href={profile ? '/WorkerTask' : '/login'} />;

  return (
    <View style={styles.container}>
      <Image source={require('@/assets/images/agriverse-loading.png')} style={styles.logo} />
      <Text style={styles.name}>AgriVerse</Text>
      <ActivityIndicator color="#18753a" size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fbfcf4' },
  logo: { width: 190, height: 190, resizeMode: 'contain' },
  name: { color: '#146b34', fontSize: 30, fontWeight: '800', marginTop: -12, marginBottom: 28 },
});
