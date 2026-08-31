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

  // Active Task Card Shell
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },

  // Top Area: Active label on left, IN-PROGRESS badge on right
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    zIndex: 2,
  },
  activeLabel: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '800',
  },
  inProgressBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  inProgressText: {
    color: '#92400E',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Radar Pulse Background Effect
  radarContainer: {
    position: 'absolute',
    top: 2,
    right: 6,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    opacity: 0.85,
  },
  radarOuterRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  radarMidRing: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  radarInnerCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(34, 197, 94, 0.45)',
  },

  // Main Task Title
  taskTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
    marginBottom: 12,
    zIndex: 2,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
  },

  // Details section
  detailsList: {
    gap: 8,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  detailLabel: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '500',
    width: 90,
  },
  detailValue: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },

  // Mark as Completed Button
  completeButton: {
    height: 46,
    backgroundColor: GREEN,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  completeCheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeCheckIcon: {
    color: GREEN,
    fontSize: 11,
    fontWeight: '900',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  buttonPressed: {
    opacity: 0.85,
    backgroundColor: GREEN_DARK,
    transform: [{ scale: 0.99 }],
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


