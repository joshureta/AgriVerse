import { StyleSheet } from 'react-native';

export const GREEN = '#176D34';
export const DARK_GREEN = '#123A20';
export const ORANGE = '#F2994A';

export const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F8F2' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  titleIcon: { fontSize: 18 },
  titleText: { fontSize: 18, fontWeight: '800', color: DARK_GREEN },

  // Cart item card
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    marginBottom: 12,
    shadowColor: '#0B2E16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  itemIconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F1E4',
  },
  itemEmoji: { fontSize: 30 },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 13.5, fontWeight: '800', color: DARK_GREEN },
  itemWeight: { fontSize: 11, color: '#7C897E', marginTop: 2 },

  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  qtyButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4EE',
  },
  qtyButtonDisabled: { opacity: 0.4 },
  qtyButtonText: { fontSize: 14, fontWeight: '800', color: DARK_GREEN },
  qtyValue: { fontSize: 13, fontWeight: '800', color: DARK_GREEN, minWidth: 16, textAlign: 'center' },

  itemRight: { alignItems: 'flex-end', gap: 10 },
  itemPrice: { fontSize: 13.5, fontWeight: '800', color: GREEN },
  trashButton: { padding: 2 },
  trashIcon: { fontSize: 16 },

  // Remove all + total row
  utilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  removeAllButton: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  removeAllText: { fontSize: 12, fontWeight: '700', color: '#B4463A' },
  itemsTotalText: { fontSize: 13, fontWeight: '800', color: DARK_GREEN },

  // Add more pineapples
  addMoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E7EFE4',
    marginBottom: 16,
  },
  addMorePressed: { opacity: 0.85 },
  addMoreIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF4E7',
  },
  addMoreEmoji: { fontSize: 16 },
  addMoreTextBlock: { flex: 1, marginLeft: 12 },
  addMoreTitle: { fontSize: 12.5, fontWeight: '800', color: DARK_GREEN },
  addMoreSubtitle: { fontSize: 10.5, color: '#7C897E', marginTop: 2 },
  addMoreChevron: { fontSize: 16, color: '#9AA79C', fontWeight: '800' },

  // Order summary
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    marginBottom: 20,
    shadowColor: '#0B2E16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 12.5, color: '#5E6B60' },
  summaryValue: { fontSize: 12.5, fontWeight: '700', color: DARK_GREEN },
  summaryDivider: { height: 1, backgroundColor: '#EEF2EC', marginVertical: 6 },
  summaryTotalLabel: { fontSize: 14, fontWeight: '800', color: DARK_GREEN },
  summaryTotalValue: { fontSize: 16, fontWeight: '900', color: GREEN },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyEmoji: { fontSize: 44 },
  emptyText: { fontSize: 13, color: '#7C897E', fontWeight: '600' },

  // Check out button
  checkoutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 26,
    backgroundColor: ORANGE,
  },
  checkoutButtonDisabled: { backgroundColor: '#E1C7A8' },
  checkoutButtonPressed: { opacity: 0.88 },
  checkoutButtonText: { fontSize: 14, fontWeight: '800', color: '#ffffff', letterSpacing: 0.3 },
});
