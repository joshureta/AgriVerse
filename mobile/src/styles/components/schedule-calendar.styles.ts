import { StyleSheet } from 'react-native';

const DARK_GREEN = '#134B24';
const GREEN = '#176D34';

export const styles = StyleSheet.create({
  weekNav: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  navButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE8DE' },
  navArrow: { color: DARK_GREEN, fontSize: 24, fontWeight: '700', lineHeight: 27 },
  weekLabelWrap: { flex: 1, alignItems: 'center' },
  weekLabel: { color: DARK_GREEN, fontSize: 14, fontWeight: '800' },
  weekStrip: { flexDirection: 'row', justifyContent: 'space-between', padding: 8, marginHorizontal: -2, marginBottom: 18, borderRadius: 16, backgroundColor: '#EAF3E8' },
  dayHeader: { width: '13.2%', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12 },
  dayHeaderActive: { backgroundColor: GREEN },
  dayLabel: { color: '#637766', fontSize: 10, fontWeight: '700' },
  dayLabelActive: { color: '#FFFFFF' },
  dayNumber: { color: DARK_GREEN, fontSize: 16, fontWeight: '800', marginTop: 4 },
  dayNumberActive: { color: '#FFFFFF' },
  scheduleList: { gap: 14 },
  dayGroup: { padding: 16, borderWidth: 1, borderColor: '#E0EAE1', borderRadius: 16, backgroundColor: '#FFFFFF' },
  dayGroupTitle: { color: '#2D3A30', fontSize: 16, fontWeight: '800', marginBottom: 12 },
  dayGroupTitleToday: { color: GREEN },
  dayGroupRows: { gap: 2 },
  deliveryRow: { flexDirection: 'row', minHeight: 58 },
  deliveryTimeline: { width: 3, marginRight: 12, borderRadius: 2, backgroundColor: '#61A773' },
  deliveryContent: { flex: 1, flexDirection: 'row', paddingVertical: 8 },
  deliveryTimeBlock: { width: 88, paddingRight: 8 },
  deliveryTime: { color: DARK_GREEN, fontSize: 12, fontWeight: '800' },
  deliveryEndTime: { color: '#6A7B6E', fontSize: 11, fontWeight: '600', marginTop: 3 },
  deliveryDetails: { flex: 1 },
  deliveryTitle: { color: '#203324', fontSize: 13, fontWeight: '800' },
  deliverySubtitle: { color: '#637766', fontSize: 11, lineHeight: 16, marginTop: 3 },
  weekEmpty: { alignItems: 'center', paddingVertical: 26 },
  weekEmptyText: { color: '#637766', fontSize: 12, fontWeight: '600' },
});
