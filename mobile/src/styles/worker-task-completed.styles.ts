import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fbfbf4' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fbfbf4' },
  content: { paddingTop: 17, paddingBottom: 105, flexGrow: 1 },
  pageTitle: { color: '#176b32', fontSize: 28, lineHeight: 36, fontWeight: '800', marginBottom: 19 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 29 },
  filterButton: { flex: 1, height: 25, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#d7dadd', elevation: 4, shadowColor: '#777', shadowOffset: { width: 0, height: 4 }, shadowOpacity: .17, shadowRadius: 6 },
  filterButtonActive: { backgroundColor: '#207b3c', borderColor: '#207b3c' },
  filterText: { color: '#1d1d1d', fontSize: 10, fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  errorText: { color: '#a83d36', fontSize: 11, marginBottom: 10 },
  loader: { marginTop: 50 },
  taskCard: { height: 61, borderRadius: 8, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 17, borderWidth: 1, borderColor: '#d8dadd', elevation: 4, shadowColor: '#777', shadowOffset: { width: 0, height: 5 }, shadowOpacity: .16, shadowRadius: 7 },
  taskIconBox: { width: 43, height: 43, backgroundColor: '#f1f5ee', alignItems: 'center', justifyContent: 'center' },
  taskIcon: { fontSize: 27 },
  taskCopy: { flex: 1, paddingHorizontal: 16 },
  taskCategory: { color: '#176b32', fontSize: 10, fontWeight: '700', marginBottom: 6 },
  taskDescription: { color: '#222', fontSize: 16 },
  completedIcon: { width: 18, height: 18, borderRadius: 10, backgroundColor: '#68c20c', alignItems: 'center', justifyContent: 'center' },
  completedCheck: { color: '#fff', fontSize: 13, lineHeight: 16, fontWeight: '900' },
  emptyState: { alignItems: 'center', paddingVertical: 65 },
  emptyTitle: { color: '#26643a', fontSize: 17, fontWeight: '800', marginTop: 12 },
  emptyCopy: { color: '#849086', fontSize: 12, marginTop: 6 },
});

