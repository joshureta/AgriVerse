import { StyleSheet } from 'react-native';

export const GREEN = '#176D34';
export const DARK_GREEN = '#10351D';
export const SAGE_BG = '#EDF5EB';
export const SAGE_BORDER = '#D8E5D5';
export const CARD_BORDER = '#E5EDE2';
export const TEXT_MUTED = '#637567';
export const ORANGE = '#E87A24';
export const GCASH_BLUE = '#0072BC';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F7F1',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 28,
  },

  titleBlock: {
    marginBottom: 16,
  },
  titleText: {
    fontSize: 22,
    fontWeight: '800',
    color: DARK_GREEN,
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 4,
    lineHeight: 17,
  },

  loader: {
    marginTop: 12,
  },
  loadError: {
    color: '#a33d35',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 12,
  },
  emptyText: {
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginVertical: 8,
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

  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    shadowColor: '#0B2E16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  // Address card
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GREEN,
  },
  avatarEmoji: {
    fontSize: 18,
  },
  addressTextBlock: {
    flex: 1,
    marginLeft: 12,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressName: {
    fontSize: 14,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  editLink: {
    fontSize: 12,
    fontWeight: '750' as never,
    color: GREEN,
  },
  addressText: {
    fontSize: 12,
    color: '#556658',
    marginTop: 4,
    lineHeight: 17,
  },

  // Section label above a group of option cards
  sectionLabel: {
    fontSize: 13.5,
    fontWeight: '800',
    color: DARK_GREEN,
    marginBottom: 10,
    letterSpacing: 0.2,
  },

  // Delivery / payment option cards
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: CARD_BORDER,
    marginBottom: 10,
  },
  optionCardActive: {
    borderColor: GREEN,
    backgroundColor: '#F3FAF0',
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  optionCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  optionIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SAGE_BG,
    borderWidth: 1,
    borderColor: SAGE_BORDER,
  },
  optionIconText: {
    fontSize: 18,
  },
  gcashBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GCASH_BLUE,
  },
  gcashBadgeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  optionTextBlock: {
    flex: 1,
    marginLeft: 12,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  optionSubLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
    lineHeight: 15,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#C7D3C4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: GREEN,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GREEN,
  },

  notesInput: {
    minHeight: 74,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: '#ffffff',
    padding: 12,
    marginBottom: 16,
    fontSize: 12.5,
    color: DARK_GREEN,
    textAlignVertical: 'top',
  },

  bankDetailsCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F7FAF5',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginTop: -2,
    marginBottom: 16,
  },
  bankDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bankDetailLabel: {
    fontSize: 11.5,
    color: TEXT_MUTED,
  },
  bankDetailValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: DARK_GREEN,
  },

  // Order summary
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  summaryHeaderIcon: {
    fontSize: 16,
  },
  summaryHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: DARK_GREEN,
  },

  summaryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryItemIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FAF5',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  summaryItemImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  summaryItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  summaryItemName: {
    fontSize: 13,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  summaryItemMeta: {
    fontSize: 10.5,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  summaryItemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: GREEN,
    marginLeft: 8,
  },

  summaryDivider: {
    height: 1,
    backgroundColor: '#EDF2EC',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 12.5,
    color: '#556658',
  },
  summaryValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: DARK_GREEN,
  },

  summaryTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    padding: 12,
    borderRadius: 14,
    backgroundColor: SAGE_BG,
    borderWidth: 1,
    borderColor: SAGE_BORDER,
  },
  summaryTotalLabel: {
    fontSize: 14.5,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  summaryTotalValue: {
    fontSize: 17,
    fontWeight: '900',
    color: GREEN,
  },

  placeOrderButton: {
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
  placeOrderButtonDisabled: {
    backgroundColor: '#B5C4B2',
    shadowOpacity: 0,
    elevation: 0,
  },
  placeOrderButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  placeOrderButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.4,
  },

  // Delivery address modal
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(9, 32, 16, 0.52)',
  },
  modalCard: {
    maxHeight: '85%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#ffffff',
    padding: 22,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: DARK_GREEN,
    marginBottom: 16,
  },
  fieldBlock: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: DARK_GREEN,
    marginBottom: 6,
  },
  fieldInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: '#FAFCF9',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13,
    color: DARK_GREEN,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: CARD_BORDER,
    backgroundColor: '#FAFCF9',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#556658',
  },
  modalSaveButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 24,
    backgroundColor: GREEN,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  modalSaveButtonDisabled: {
    backgroundColor: '#B5C4B2',
    shadowOpacity: 0,
    elevation: 0,
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});
