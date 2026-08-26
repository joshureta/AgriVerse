import { StyleSheet } from 'react-native';

const DARK_GREEN = '#134B24';

export const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9F9F4' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9F9F4' },
  content: { paddingTop: 18, paddingBottom: 100, flexGrow: 1 },
  titleBlock: { marginBottom: 18 },
  title: { color: DARK_GREEN, fontSize: 26, fontWeight: '800' },
  subtitle: { color: '#3D6346', fontSize: 12, fontWeight: '500', marginTop: 4 },
  errorBox: { backgroundColor: '#fff0ef', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#f0ceca' },
  errorText: { color: '#ad2d2d', fontSize: 12, lineHeight: 17 },
  retry: { color: '#7b2727', fontSize: 11, fontWeight: '800', marginTop: 4 },
  loadingBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, gap: 10 },
  loadingText: { color: '#6a796c', fontSize: 12 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, paddingHorizontal: 20 },
  emptyIcon: { color: '#77a33d', fontSize: 34, fontWeight: '900' },
  emptyTitle: { color: '#2b5d36', fontSize: 16, fontWeight: '800', marginTop: 8 },
  emptyText: { color: '#7b887c', fontSize: 12, textAlign: 'center', marginTop: 5 },
});
