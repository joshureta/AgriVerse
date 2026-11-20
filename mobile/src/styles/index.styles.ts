import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fbfcf4' },
  logo: { width: 190, height: 190, resizeMode: 'contain' },
  name: { color: '#146b34', fontSize: 30, fontWeight: '800', marginTop: -12, marginBottom: 28 },
  error: { color: '#526157', fontSize: 16, textAlign: 'center', marginHorizontal: 28, marginBottom: 20 },
  retryButton: { backgroundColor: '#18753a', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 14 },
  retryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

