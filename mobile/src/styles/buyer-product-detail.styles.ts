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
    backgroundColor: '#F3F7F1',
  },
  scrollContent: {
    paddingBottom: 24,
  },

  hero: {
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FAF5',
  },
  heroImage: {
    width: 280,
    height: 280,
    resizeMode: 'contain',
  },

  sheet: {
    marginTop: -24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 24,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    shadowColor: '#0B2E16',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
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
  emptyText: {
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginVertical: 12,
  },
  cartNotice: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '700',
    color: GREEN,
    backgroundColor: SAGE_BG,
    borderWidth: 1,
    borderColor: SAGE_BORDER,
    borderRadius: 12,
    padding: 12,
    textAlign: 'center',
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 24,
    fontWeight: '800',
    color: DARK_GREEN,
    letterSpacing: -0.3,
  },
  weightRange: {
    fontSize: 13,
    fontWeight: '700',
    color: GREEN,
    backgroundColor: SAGE_BG,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 12.5,
    color: TEXT_MUTED,
    marginTop: 4,
    fontWeight: '500',
  },

  sizeLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: DARK_GREEN,
    marginTop: 20,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  sizeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sizePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: CARD_BORDER,
    backgroundColor: '#FAFCF9',
  },
  sizePillActive: {
    borderColor: GREEN,
    backgroundColor: '#F3FAF0',
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  sizePillTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT_MUTED,
  },
  sizePillTitleActive: {
    color: GREEN,
  },
  sizePillSubtitle: {
    fontSize: 10,
    color: '#8A9C8E',
    marginTop: 2,
    fontWeight: '600',
  },
  sizePillSubtitleActive: {
    color: GREEN,
  },
  sizePillUnderline: {
    marginTop: 6,
    height: 2.5,
    width: '40%',
    borderRadius: 1.5,
    backgroundColor: 'transparent',
  },
  sizePillUnderlineActive: {
    backgroundColor: GREEN,
  },

  descriptionHeading: {
    fontSize: 14.5,
    fontWeight: '800',
    color: DARK_GREEN,
    marginTop: 22,
  },
  descriptionText: {
    fontSize: 12.5,
    color: '#556658',
    lineHeight: 18.5,
    marginTop: 8,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 22,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#EDF2EC',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F4F8F2',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  quantityButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: DARK_GREEN,
    lineHeight: 18,
  },
  quantityValue: {
    fontSize: 14,
    fontWeight: '800',
    color: DARK_GREEN,
    minWidth: 18,
    textAlign: 'center',
  },

  priceBlock: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 10,
    color: TEXT_MUTED,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '900',
    color: GREEN,
    marginTop: 1,
  },

  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 24,
    backgroundColor: GREEN,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  addToCartText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  addToCartPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  addToCartDisabled: {
    backgroundColor: '#B5C4B2',
    shadowOpacity: 0,
    elevation: 0,
  },

  // Customer reviews section
  reviewsSection: {
    marginTop: 34,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2ECE3',
  },
  reviewsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewsTitleGroup: {
    flex: 1,
  },
  reviewsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  reviewsCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    backgroundColor: '#EDF4EE',
  },
  reviewsCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: GREEN,
  },
  reviewsSubtitle: {
    fontSize: 10.5,
    color: '#6A7D6F',
    marginTop: 2,
    fontWeight: '500',
  },
  arrowButton: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowButtonPressed: {
    opacity: 0.6,
  },

  // Rating scoreboard
  scoreboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF7',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E1ECE2',
    padding: 12,
    marginBottom: 12,
  },
  scoreColumn: {
    alignItems: 'center',
    paddingRight: 14,
    borderRightWidth: 1,
    borderRightColor: '#E3EBE4',
    minWidth: 80,
  },
  scoreBig: {
    fontSize: 22,
    fontWeight: '900',
    color: GREEN,
  },
  scoreStarsRow: {
    flexDirection: 'row',
    gap: 2,
    marginVertical: 2,
  },
  scoreCountText: {
    fontSize: 9.5,
    color: '#6A7D6F',
    fontWeight: '600',
  },
  scoreBreakdown: {
    flex: 1,
    paddingLeft: 12,
    gap: 4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#556658',
    width: 18,
    textAlign: 'right',
  },
  barTrack: {
    flex: 1,
    height: 5,
    backgroundColor: '#E5EDE7',
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 2.5,
  },
  barValue: {
    fontSize: 9.5,
    color: '#8A9C8E',
    width: 14,
    textAlign: 'right',
    fontWeight: '600',
  },

  // Review card
  reviewCard: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FAFCF9',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E4F2E7',
    borderWidth: 1,
    borderColor: '#C3DFCA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  reviewerDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  reviewerName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  verifiedBadge: {
    backgroundColor: '#EBF6EE',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '700',
    color: GREEN,
  },
  reviewSubInfo: {
    fontSize: 10,
    color: '#8A9C8E',
    marginTop: 1,
    fontWeight: '500',
  },
  reviewStarsRow: {
    flexDirection: 'row',
    gap: 1.5,
  },
  reviewComment: {
    fontSize: 11.5,
    color: '#4A5B4D',
    lineHeight: 16.5,
  },
});
