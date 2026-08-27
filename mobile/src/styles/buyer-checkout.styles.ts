import { StyleSheet } from 'react-native';

export const GREEN = '#176D34';
export const DARK_GREEN = '#123A20';
export const ORANGE = '#F2994A';

export const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F8F2' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },

  titleText: { fontSize: 18, fontWeight: '800', color: DARK_GREEN, marginBottom: 14 },

  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    marginBottom: 14,
    shadowColor: '#0B2E16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardTitle: { fontSize: 13.5, fontWeight: '800', color: DARK_GREEN },
  cardLink: { fontSize: 11.5, fontWeight: '700', color: GREEN },

  addressName: { fontSize: 12.5, fontWeight: '700', color: DARK_GREEN },
  addressText: { fontSize: 11.5, color: '#5E6B60', marginTop: 3, lineHeight: 16 },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEF2EC',
  },
  optionRowFirst: { borderTopWidth: 0, paddingTop: 0 },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#C7D3C4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: { borderColor: GREEN },
  radioInner: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: GREEN },
  optionTextBlock: { flex: 1, marginLeft: 10 },
  optionLabel: { fontSize: 12.5, fontWeight: '700', color: DARK_GREEN },
  optionSubLabel: { fontSize: 10.5, color: '#7C897E', marginTop: 1 },

  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 12.5, color: '#5E6B60' },
  summaryValue: { fontSize: 12.5, fontWeight: '700', color: DARK_GREEN },
  summaryDivider: { height: 1, backgroundColor: '#EEF2EC', marginVertical: 6 },
  summaryTotalLabel: { fontSize: 14, fontWeight: '800', color: DARK_GREEN },
  summaryTotalValue: { fontSize: 16, fontWeight: '900', color: GREEN },

  placeOrderButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 26,
    backgroundColor: ORANGE,
  },
  placeOrderButtonPressed: { opacity: 0.88 },
  placeOrderButtonText: { fontSize: 14, fontWeight: '800', color: '#ffffff', letterSpacing: 0.3 },
});
