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
    overflow: 'hidden',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#F3F7F1',
  },
  scrollContent: {
    paddingBottom: 28,
  },

  // ----------------------------------------------------
  // Hero Banner
  // ----------------------------------------------------
  heroWrapper: {
    height: 255,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroImage: {
    resizeMode: 'cover',
  },
  heroTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 32, 16, 0.48)',
  },
  heroContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroGreeting: {
    color: '#D8EBD4',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  heroName: {
    color: '#ffffff',
    fontSize: 25,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  heroTagline: {
    color: '#EAF4E7',
    fontSize: 13.5,
    marginTop: 6,
    lineHeight: 19,
    fontWeight: '500',
  },
  shopNowButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingLeft: 18,
    paddingRight: 14,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: GREEN,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  shopNowText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  shopNowArrowBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopNowArrow: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 14,
  },
  shopNowPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },

  // ----------------------------------------------------
  // Shared Section Card
  // ----------------------------------------------------
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    shadowColor: '#0B2E16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: DARK_GREEN,
    letterSpacing: -0.2,
  },
  sectionLink: {
    fontSize: 12.5,
    fontWeight: '700',
    color: GREEN,
  },

  // ----------------------------------------------------
  // Order Status Stepper
  // ----------------------------------------------------
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
  },
  stepColumn: {
    alignItems: 'center',
    width: 86,
  },
  stepConnector: {
    flex: 1,
    height: 2,
    marginTop: 16,
    borderStyle: 'dashed',
    borderTopWidth: 2,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleDone: {
    backgroundColor: GREEN,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  stepCircleCurrent: {
    backgroundColor: '#E1ECE0',
    borderWidth: 2,
    borderColor: GREEN,
  },
  stepCirclePending: {
    backgroundColor: '#EDF2EC',
  },
  stepCheck: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  stepIconDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#9AA79C',
  },
  stepIconDotCurrent: {
    backgroundColor: GREEN,
  },
  stepLabel: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '800',
    color: DARK_GREEN,
    textAlign: 'center',
    lineHeight: 14,
  },
  stepLabelPending: {
    color: '#8B9B8E',
    fontWeight: '600',
  },
  stepDate: {
    marginTop: 3,
    fontSize: 9.5,
    color: TEXT_MUTED,
    textAlign: 'center',
  },

  estimateStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    padding: 12,
    borderRadius: 14,
    backgroundColor: SAGE_BG,
    borderWidth: 1,
    borderColor: SAGE_BORDER,
  },
  estimateCalendar: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  estimateCalendarDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#ffffff',
    margin: 1.5,
  },
  estimateCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 14,
    justifyContent: 'space-between',
  },
  estimateLabel: {
    fontSize: 11,
    color: '#4E6A56',
    fontWeight: '600',
  },
  estimateDate: {
    fontSize: 13.5,
    color: DARK_GREEN,
    fontWeight: '800',
    marginTop: 1,
  },

  // ----------------------------------------------------
  // Shop Pineapples Product Cards
  // ----------------------------------------------------
  productsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 10,
  },
  productCard: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#FAFCF9',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    shadowColor: '#0B2E16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  productCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
    borderColor: GREEN,
  },
  productBadge: {
    alignSelf: 'flex-start',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GREEN,
    marginBottom: 4,
  },
  productBadgeText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '900',
  },
  productImage: {
    width: 60,
    height: 60,
    marginVertical: 4,
    resizeMode: 'contain',
  },
  productName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: DARK_GREEN,
    marginTop: 4,
    textAlign: 'center',
  },
  productWeight: {
    fontSize: 9.5,
    color: TEXT_MUTED,
    marginTop: 1,
    textAlign: 'center',
  },
  productPriceBadge: {
    marginTop: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: SAGE_BG,
  },
  productPrice: {
    fontSize: 11.5,
    fontWeight: '800',
    color: GREEN,
    textAlign: 'center',
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
    marginTop: 10,
    textAlign: 'center',
  },

  // ----------------------------------------------------
  // From Our Farm To You
  // ----------------------------------------------------
  farmCard: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  farmImage: {
    width: 105,
    height: 124,
    borderRadius: 14,
    resizeMode: 'cover',
  },
  farmTextBlock: {
    flex: 1,
  },
  farmHeading: {
    fontSize: 14.5,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  farmDescription: {
    fontSize: 11.5,
    color: '#556658',
    marginTop: 5,
    lineHeight: 16.5,
  },
  farmIconsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  farmIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SAGE_BG,
    borderWidth: 1,
    borderColor: SAGE_BORDER,
  },
});
