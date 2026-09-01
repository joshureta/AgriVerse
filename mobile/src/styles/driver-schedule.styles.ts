import { StyleSheet } from 'react-native';

export const GREEN = '#176D34';
export const BG_COLOR = '#F8FAEF';

export const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: GREEN },
  mainBodyContainer: {
    flex: 1,
    backgroundColor: BG_COLOR,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG_COLOR },
  content: { paddingTop: 20, paddingBottom: 110, flexGrow: 1 },
  titleBlock: { marginBottom: 18 },
  title: { color: '#134B24', fontSize: 26, fontWeight: '800' },
  subtitle: { color: '#3D6346', fontSize: 13, fontWeight: '500', marginTop: 4 },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { color: '#DC2626', fontSize: 12, lineHeight: 17 },
  retry: { color: '#B91C1C', fontSize: 11, fontWeight: '800', marginTop: 4 },
  loadingBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, gap: 10 },
  loadingText: { color: '#64748B', fontSize: 12 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, paddingHorizontal: 20 },
  emptyIcon: { color: GREEN, fontSize: 34, fontWeight: '900' },
  emptyTitle: { color: '#1E293B', fontSize: 16, fontWeight: '800', marginTop: 8 },
  emptyText: { color: '#64748B', fontSize: 12, textAlign: 'center', marginTop: 5 },
});

