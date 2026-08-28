import { StyleSheet } from 'react-native';

export const GREEN = '#176D34';
export const DARK_GREEN = '#123A20';

export const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F8F2' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },

  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    marginBottom: 16,
    shadowColor: '#0B2E16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },

  // Order confirmed header
  confirmedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  confirmedCheckCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF4E7',
  },
  confirmedCheck: { color: GREEN, fontSize: 15, fontWeight: '900' },
  confirmedTitle: { fontSize: 15, fontWeight: '800', color: GREEN },
  confirmedSubtitle: { fontSize: 11, color: '#7C897E', marginTop: 1 },

  estimateStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#EAF4E7',
  },
  estimateCalendar: { width: 26, height: 26, borderRadius: 6, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  estimateCalendarDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#ffffff', margin: 1 },
  estimateCalendarGrid: { flexDirection: 'row', flexWrap: 'wrap', width: 14, justifyContent: 'space-between' },
  estimateLabel: { fontSize: 10.5, color: '#587160', fontWeight: '600' },
  estimateDate: { fontSize: 13, color: DARK_GREEN, fontWeight: '800', marginTop: 1 },

  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  itemIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F1E4',
  },
  itemImage: { width: 26, height: 26, resizeMode: 'contain' },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 12.5, fontWeight: '800', color: DARK_GREEN },
  itemMeta: { fontSize: 10.5, color: '#7C897E', marginTop: 2 },
  itemPrice: { fontSize: 11.5, fontWeight: '800', color: GREEN, marginLeft: 8 },

  divider: { height: 1, backgroundColor: '#EEF2EC', marginBottom: 12 },

  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  addressPin: { fontSize: 12, marginTop: 1 },
  addressText: { flex: 1, fontSize: 11, color: '#5E6B60', lineHeight: 16 },

  // Delivery progress
  sectionTitle: { fontSize: 14, fontWeight: '800', color: DARK_GREEN, marginBottom: 14 },

  routeRow: { flexDirection: 'row', alignItems: 'center' },
  routeLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 22,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#C7D3C4',
  },
  routePillFrom: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#EAF4E7',
  },
  routePillTo: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    backgroundColor: DARK_GREEN,
  },
  routePillLabel: { fontSize: 11.5, fontWeight: '800', color: DARK_GREEN },
  routePillLabelLight: { fontSize: 11.5, fontWeight: '800', color: '#ffffff' },
  routePillSub: { fontSize: 9.5, color: '#587160', marginTop: 2 },
  routePillSubLight: { fontSize: 9.5, color: '#D9E9D3', marginTop: 2 },
  routeTruckCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: GREEN,
    marginHorizontal: -8,
    zIndex: 1,
  },
  routeTruckIcon: { fontSize: 15 },

  stepperRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 22 },
  stepColumn: { alignItems: 'center', width: 78 },
  stepConnector: { flex: 1, height: 2, marginTop: 15, borderStyle: 'dashed', borderTopWidth: 2 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepCircleDone: { backgroundColor: GREEN },
  stepCirclePending: { backgroundColor: '#E1E7DE' },
  stepCheckText: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  stepIconText: { fontSize: 14 },
  stepLabel: { marginTop: 8, fontSize: 9.5, fontWeight: '800', color: DARK_GREEN, textAlign: 'center' },
  stepLabelPending: { color: '#8B968D' },
  stepDate: { marginTop: 3, fontSize: 8.5, color: '#7C897E', textAlign: 'center' },

  cancelledText: {
    marginTop: 18,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FBE9E7',
    color: '#a33d35',
    fontSize: 12,
    textAlign: 'center',
  },
});
