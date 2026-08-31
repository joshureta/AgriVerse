import { StyleSheet } from 'react-native';

export const GREEN = '#176D34';
export const GREEN_DARK = '#125829';
export const BG_COLOR = '#F8FAEF';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: GREEN,
  },
  mainBodyContainer: {
    flex: 1,
    backgroundColor: BG_COLOR,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG_COLOR,
  },
  content: {
    paddingTop: 20,
    paddingBottom: 110,
    flexGrow: 1,
  },
  pageTitle: {
    color: '#111827',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 14,
  },

  // Segmented 3-tab pill container
  filters: {
    flexDirection: 'row',
    height: 38,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: GREEN,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginBottom: 20,
  },
  filterButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  filterButtonLast: {
    borderRightWidth: 0,
  },
  filterButtonActive: {
    backgroundColor: GREEN,
    borderRadius: 18,
    margin: -1,
  },
  filterText: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  errorText: {
    color: '#DC2626',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    marginBottom: 10,
  },
  loader: {
    marginTop: 40,
  },

  // Completed Task Card
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },

  // Top Header Banner (Mint Green Tint)
  taskHeaderBanner: {
    backgroundColor: '#D6E8D6',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  checkCheck: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  taskBannerTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    flex: 1,
  },

  // Card Body
  taskBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clockIcon: {
    fontSize: 16,
    color: '#374151',
  },
  finishedText: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '600',
  },
  photoProofThumbnail: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#263228',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoProofImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoProofFallback: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  photoProofText: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '500',
  },
  pinIcon: {
    fontSize: 16,
    color: '#4B5563',
  },
  fieldText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: 20,
  },
  emptyCheck: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EAF4D9',
    alignItems: 'center',
    justifyContent: 'center',
    color: GREEN,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 56,
    textAlign: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  emptyTitle: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyCopy: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});


