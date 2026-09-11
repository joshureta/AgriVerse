import { StyleSheet } from 'react-native';

export const GREEN = '#176D34';
export const DARK_GREEN = '#10351D';
export const SAGE_BG = '#EDF5EB';
export const SAGE_BORDER = '#D8E5D5';
export const CARD_BORDER = '#E5EDE2';
export const TEXT_MUTED = '#637567';

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

  titleText: {
    fontSize: 22,
    fontWeight: '800',
    color: DARK_GREEN,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  filterScroll: {
    marginHorizontal: -16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E9E1',
  },
  filterTabs: {
    gap: 0,
    paddingHorizontal: 0,
  },
  filterTab: {
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: GREEN,
  },
  filterTabText: {
    color: '#526255',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: GREEN,
    fontWeight: '800',
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

  orderCard: {
    padding: 16,
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
  orderCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  orderIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FAF5',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  orderImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  orderInfo: {
    flex: 1,
    marginLeft: 14,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  orderMeta: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  orderTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: GREEN,
    marginTop: 4,
  },
  deliveryNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 13,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#EEF9F5',
  },
  deliveryNoticeText: { color: '#287A57', fontSize: 12.5, fontWeight: '800' },
  deliveryNoticeArrow: { color: '#68A993', fontSize: 29, fontWeight: '300', lineHeight: 30 },
  orderActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 13 },
  actionButton: { minHeight: 40, minWidth: 116, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13, borderRadius: 9, borderWidth: 1, borderColor: '#AEBEB0', backgroundColor: '#FFFFFF' },
  actionButtonPrimary: { borderColor: '#BF654E' },
  actionButtonDanger: { borderColor: '#D79E9E' },
  actionButtonDisabled: { opacity: .55 },
  actionButtonText: { color: DARK_GREEN, fontSize: 12, fontWeight: '700' },
  actionButtonPrimaryText: { color: '#B2533D', fontSize: 12, fontWeight: '800' },
  actionButtonDangerText: { color: '#A23131', fontSize: 12, fontWeight: '800' },
  ratingPage: { flex: 1, padding: 24, backgroundColor: '#F3F7F1' },
  ratingEyebrow: { color: '#287642', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  ratingTitle: { marginTop: 7, color: DARK_GREEN, fontSize: 24, fontWeight: '800' },
  ratingCopy: { marginTop: 8, color: TEXT_MUTED, fontSize: 13, lineHeight: 19 },
  stars: { flexDirection: 'row', gap: 9, marginTop: 28 },
  star: { color: '#D6DED4', fontSize: 38 },
  starSelected: { color: '#E9A528' },
  ratingInput: { minHeight: 112, marginTop: 24, padding: 13, borderWidth: 1, borderColor: SAGE_BORDER, borderRadius: 12, backgroundColor: '#FFFFFF', color: DARK_GREEN, fontSize: 13, textAlignVertical: 'top' },
  ratingSubmit: { minHeight: 46, marginTop: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: GREEN },
  ratingSubmitText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  ratingSuccess: { alignItems: 'center', paddingTop: 80 },
  ratingSuccessMark: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', textAlign: 'center', lineHeight: 62, width: 62, height: 62, borderRadius: 31, backgroundColor: GREEN },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusBadgeDelivered: {
    backgroundColor: SAGE_BG,
    borderWidth: 1,
    borderColor: SAGE_BORDER,
  },
  statusBadgeTransit: {
    backgroundColor: '#FDF3E5',
    borderWidth: 1,
    borderColor: '#F7DCBA',
  },
  statusBadgeCancelled: {
    backgroundColor: '#FBE9E7',
    borderWidth: 1,
    borderColor: '#F5C6C2',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotDelivered: {
    backgroundColor: GREEN,
  },
  statusDotTransit: {
    backgroundColor: '#C97A2E',
  },
  statusDotCancelled: {
    backgroundColor: '#B13B3B',
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  statusTextDelivered: {
    color: GREEN,
  },
  statusTextTransit: {
    color: '#C97A2E',
  },
  statusTextCancelled: {
    color: '#B13B3B',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
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
});
