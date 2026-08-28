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

  loader: { marginTop: 12 },
  loadError: {
    color: '#a33d35',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 12,
  },
  emptyText: {
    fontSize: 11.5,
    color: '#7C897E',
    textAlign: 'center',
    marginVertical: 8,
  },
  notice: {
    fontSize: 11.5,
    fontWeight: '700',
    color: GREEN,
    backgroundColor: '#EAF4E7',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },

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

  notesInput: {
    minHeight: 70,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E7DE',
    backgroundColor: '#ffffff',
    padding: 12,
    marginBottom: 16,
    fontSize: 12,
    color: DARK_GREEN,
    textAlignVertical: 'top',
  },

  bankDetailsCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F7FBF5',
    borderWidth: 1,
    borderColor: '#E1E7DE',
    marginTop: -2,
    marginBottom: 16,
  },
  bankDetailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  bankDetailLabel: { fontSize: 11, color: '#7C897E' },
  bankDetailValue: { fontSize: 12, fontWeight: '800', color: DARK_GREEN },

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
  summaryItemImage: { width: 28, height: 28, resizeMode: 'contain' },
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
  placeOrderButtonDisabled: { backgroundColor: '#E1C7A8' },
  placeOrderButtonPressed: { opacity: 0.88 },
  placeOrderButtonText: { fontSize: 14, fontWeight: '800', color: '#ffffff', letterSpacing: 0.3 },

  // Delivery address modal
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(10, 30, 15, 0.45)',
  },
  modalCard: {
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#ffffff',
    padding: 20,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: GREEN, marginBottom: 14 },
  fieldBlock: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: DARK_GREEN, marginBottom: 6 },
  fieldInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E1E7DE',
    backgroundColor: '#F7FBF5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12.5,
    color: DARK_GREEN,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalCancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E1E7DE',
  },
  modalCancelText: { fontSize: 13, fontWeight: '800', color: '#5E6B60' },
  modalSaveButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 24,
    backgroundColor: GREEN,
  },
  modalSaveButtonDisabled: { backgroundColor: '#B7C2B4' },
  modalSaveText: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
});
