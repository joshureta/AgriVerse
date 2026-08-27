import { StyleSheet } from 'react-native';

export const GREEN = '#176D34';
export const DARK_GREEN = '#123A20';
export const ORANGE = '#F2994A';
export const GCASH_BLUE = '#0072BC';

export const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F8F2' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },

  titleBlock: { marginBottom: 16 },
  titleText: { fontSize: 20, fontWeight: '800', color: GREEN },
  subtitleText: { fontSize: 11.5, color: '#7C897E', marginTop: 4, lineHeight: 16 },

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

  // Address card
  addressRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GREEN,
  },
  avatarEmoji: { fontSize: 17 },
  addressTextBlock: { flex: 1, marginLeft: 12 },
  addressHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addressName: { fontSize: 13.5, fontWeight: '800', color: DARK_GREEN },
  editLink: { fontSize: 11.5, fontWeight: '700', color: GREEN },
  addressText: { fontSize: 11.5, color: '#5E6B60', marginTop: 4, lineHeight: 16 },

  // Section label above a group of option cards
  sectionLabel: { fontSize: 13, fontWeight: '800', color: DARK_GREEN, marginBottom: 10 },

  // Delivery / payment option cards
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#E7EFE4',
    marginBottom: 10,
  },
  optionCardActive: { borderColor: GREEN, backgroundColor: '#F7FBF5' },
  optionCardPressed: { opacity: 0.85 },
  optionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF4E7',
  },
  optionIconText: { fontSize: 18 },
  gcashBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GCASH_BLUE,
  },
  gcashBadgeText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  optionTextBlock: { flex: 1, marginLeft: 12 },
  optionLabel: { fontSize: 12.5, fontWeight: '800', color: DARK_GREEN },
  optionSubLabel: { fontSize: 10.5, color: '#7C897E', marginTop: 2 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#C7D3C4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: { borderColor: GREEN },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: GREEN },

  // Order summary
  summaryHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  summaryHeaderIcon: { fontSize: 15 },
  summaryHeaderTitle: { fontSize: 13.5, fontWeight: '800', color: DARK_GREEN },

  summaryItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  summaryItemIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F1E4',
  },
  summaryItemEmoji: { fontSize: 24 },
  summaryItemInfo: { flex: 1, marginLeft: 12 },
  summaryItemName: { fontSize: 12.5, fontWeight: '800', color: DARK_GREEN },
  summaryItemMeta: { fontSize: 10.5, color: '#7C897E', marginTop: 2 },
  summaryItemPrice: { fontSize: 12.5, fontWeight: '800', color: GREEN },

  summaryDivider: { height: 1, backgroundColor: '#EEF2EC', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 12, color: '#5E6B60' },
  summaryValue: { fontSize: 12, fontWeight: '700', color: DARK_GREEN },

  summaryTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#EAF4E7',
  },
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
