import { StyleSheet } from 'react-native';

export const GREEN = '#176D34';
export const DARK_GREEN = '#10351D';
export const SAGE_BG = '#EDF5EB';
export const SAGE_BORDER = '#D8E5D5';
export const CARD_BORDER = '#E5EDE2';
export const TEXT_MUTED = '#637567';
export const ORANGE = '#E87A24';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: GREEN,
  },
  mainBodyContainer: {
    flex: 1,
    backgroundColor: '#F3F7F1',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 28,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  titleIcon: {
    fontSize: 20,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    color: DARK_GREEN,
    letterSpacing: -0.3,
  },

  loader: {
    marginTop: 18,
  },
  loadError: {
    color: '#a33d35',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 12,
  },
  notice: {
    fontSize: 12,
    fontWeight: '700',
    color: GREEN,
    backgroundColor: SAGE_BG,
    borderWidth: 1,
    borderColor: SAGE_BORDER,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },

  // Cart item card
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    shadowColor: '#0B2E16',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemIconBox: {
    width: 60,
    height: 60,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FAF5',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  itemImage: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  itemWeight: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
    fontWeight: '500',
  },

  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  qtyButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4EE',
    borderWidth: 1,
    borderColor: '#E2EBE0',
  },
  qtyButtonDisabled: {
    opacity: 0.35,
  },
  qtyButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: DARK_GREEN,
    lineHeight: 16,
  },
  qtyValue: {
    fontSize: 13,
    fontWeight: '800',
    color: DARK_GREEN,
    minWidth: 18,
    textAlign: 'center',
  },

  itemRight: {
    alignItems: 'flex-end',
    gap: 12,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: GREEN,
  },
  trashButton: {
    padding: 4,
  },
  trashIcon: {
    fontSize: 16,
  },

  // Remove all + total row
  utilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  removeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  removeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B4463A',
  },
  itemsTotalText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: DARK_GREEN,
  },

  // Add more pineapples
  addMoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginBottom: 16,
    shadowColor: '#0B2E16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  addMorePressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  addMoreIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SAGE_BG,
    borderWidth: 1,
    borderColor: SAGE_BORDER,
  },
  addMoreEmoji: {
    fontSize: 17,
  },
  addMoreTextBlock: {
    flex: 1,
    marginLeft: 12,
  },
  addMoreTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  addMoreSubtitle: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  addMoreChevron: {
    fontSize: 18,
    color: '#9AA79C',
    fontWeight: '800',
  },

  // Order summary
  summaryCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    shadowColor: '#0B2E16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#556658',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: DARK_GREEN,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#EDF2EC',
    marginVertical: 8,
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  summaryTotalValue: {
    fontSize: 17,
    fontWeight: '900',
    color: GREEN,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 44,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 14,
    color: TEXT_MUTED,
    fontWeight: '600',
  },

  // Check out button
  checkoutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 26,
    backgroundColor: GREEN,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutButtonDisabled: {
    backgroundColor: '#B5C4B2',
    shadowOpacity: 0,
    elevation: 0,
  },
  checkoutButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  checkoutButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.4,
  },
});
