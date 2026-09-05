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
    paddingTop: 16,
    paddingBottom: 28,
  },

  loader: {
    marginTop: 24,
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
    marginBottom: 14,
  },

  // Section Card
  sectionCard: {
    borderRadius: 20,
    backgroundColor: '#ffffff',
    padding: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginBottom: 14,
    shadowColor: '#0B2E16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4EE',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: DARK_GREEN,
    letterSpacing: -0.2,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FDF2F0',
  },
  clearAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B4463A',
  },

  // Cart item row
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  itemRowBorderTop: {
    borderTopWidth: 1,
    borderTopColor: '#F0F4F0',
  },
  itemIconBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBEA',
    borderWidth: 1,
    borderColor: '#F6E5A8',
  },
  itemImage: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  itemWeight: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
    fontWeight: '500',
  },
  trashButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FDF2F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  itemPrice: {
    fontSize: 13.5,
    fontWeight: '800',
    color: GREEN,
  },

  // Quantity controls
  qtyControlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F7F1',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#DCECDC',
  },
  qtyButton: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 1,
    elevation: 1,
  },
  qtyButtonDisabled: {
    opacity: 0.35,
  },
  qtyValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: DARK_GREEN,
    minWidth: 24,
    textAlign: 'center',
  },

  // Add more pineapples link card
  addMoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginBottom: 14,
    shadowColor: '#0B2E16',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  addMorePressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  addMoreIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SAGE_BG,
    borderWidth: 1,
    borderColor: SAGE_BORDER,
  },
  addMoreTextBlock: {
    flex: 1,
    marginLeft: 12,
  },
  addMoreTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  addMoreSubtitle: {
    fontSize: 10.5,
    color: TEXT_MUTED,
    marginTop: 1,
  },
  addMoreChevron: {
    fontSize: 18,
    color: '#9AA79C',
    fontWeight: '800',
  },

  // Order summary card
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12.5,
    color: '#556658',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: DARK_GREEN,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#EDF2EC',
    borderStyle: 'dashed',
    marginVertical: 6,
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: GREEN,
  },

  // Check out button
  checkoutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: GREEN,
    marginTop: 8,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
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
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.4,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: GREEN,
    marginTop: 9,
  },
  addMoreButtonPressed: {
    backgroundColor: '#F3F8F4',
    transform: [{ scale: 0.98 }],
  },
  addMoreButtonText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: GREEN,
    letterSpacing: 0.3,
    marginLeft: 6,
  },

  // Empty state card
  emptyStateCard: {
    alignItems: 'center',
    paddingVertical: 44,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginVertical: 12,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EAF5EA',
    borderWidth: 2,
    borderColor: '#CDE5CF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  emptySubtitle: {
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  emptyBrowseButton: {
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: GREEN,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyBrowseButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});
