import { StyleSheet } from 'react-native';

export const GREEN = '#176D34';
export const DARK_GREEN = '#123A20';

export const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F8F2' },
  scrollContent: { paddingBottom: 24 },

  // Hero
  heroWrapper: { height: 250, justifyContent: 'flex-end' },
  heroImage: { resizeMode: 'cover' },
  heroTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 40, 20, 0.42)',
  },
  heroContent: { paddingHorizontal: 20, paddingBottom: 22 },
  heroGreeting: { color: '#EAF4E7', fontSize: 14, fontWeight: '600' },
  heroName: { color: '#ffffff', fontSize: 24, fontWeight: '800', marginTop: 2 },
  heroTagline: { color: '#EAF4E7', fontSize: 13, marginTop: 6, lineHeight: 18 },
  shopNowButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: GREEN,
  },
  shopNowText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  shopNowArrow: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  shopNowPressed: { opacity: 0.85 },

  // Shared section card
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#0B2E16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: DARK_GREEN },
  sectionLink: { fontSize: 12, fontWeight: '700', color: GREEN },

  // Order status stepper
  stepperRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 22 },
  stepColumn: { alignItems: 'center', width: 84 },
  stepConnector: { flex: 1, height: 2, marginTop: 15, borderStyle: 'dashed', borderTopWidth: 2 },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleDone: { backgroundColor: GREEN },
  stepCircleCurrent: { backgroundColor: '#E1E7DE' },
  stepCirclePending: { backgroundColor: '#E1E7DE' },
  stepCheck: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  stepIconDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#9AA79C' },
  stepLabel: { marginTop: 8, fontSize: 10.5, fontWeight: '800', color: DARK_GREEN, textAlign: 'center' },
  stepLabelPending: { color: '#8B968D' },
  stepDate: { marginTop: 3, fontSize: 9.5, color: '#7C897E', textAlign: 'center' },

  estimateStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#EAF4E7',
  },
  estimateCalendar: { width: 26, height: 26, borderRadius: 6, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  estimateCalendarDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#ffffff', margin: 1 },
  estimateCalendarGrid: { flexDirection: 'row', flexWrap: 'wrap', width: 14, justifyContent: 'space-between' },
  estimateLabel: { fontSize: 10.5, color: '#587160', fontWeight: '600' },
  estimateDate: { fontSize: 13, color: DARK_GREEN, fontWeight: '800', marginTop: 1 },

  // Shop Pineapples
  productsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 10 },
  productCard: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#F7FAF5',
    borderWidth: 1,
    borderColor: '#E7EFE4',
  },
  productBadge: {
    alignSelf: 'flex-start',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GREEN,
    marginBottom: 6,
  },
  productBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },
  productImage: { width: 56, height: 56, marginVertical: 4, resizeMode: 'contain' },
  productName: { fontSize: 12, fontWeight: '800', color: DARK_GREEN, marginTop: 4 },
  productWeight: { fontSize: 9.5, color: '#7C897E', marginTop: 1 },
  productPrice: { fontSize: 12, fontWeight: '800', color: GREEN, marginTop: 5 },

  loader: { marginTop: 18 },
  loadError: {
    color: '#a33d35',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 12,
  },
  emptyText: {
    fontSize: 11.5,
    color: '#7C897E',
    marginTop: 10,
  },

  // From our farm to you
  farmCard: { flexDirection: 'row', gap: 12 },
  farmImage: { width: 110, height: 128, borderRadius: 12, resizeMode: 'cover' },
  farmTextBlock: { flex: 1 },
  farmHeading: { fontSize: 14, fontWeight: '800', color: GREEN },
  farmDescription: { fontSize: 11, color: '#5E6B60', marginTop: 6, lineHeight: 16 },
  farmIconsRow: { flexDirection: 'row', gap: 14, marginTop: 12 },
  farmIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF4E7',
  },
});
