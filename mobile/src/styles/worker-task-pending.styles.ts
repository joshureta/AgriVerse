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
    flexGrow: 1,
    paddingTop: 20,
    paddingBottom: 110,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#134B24',
    fontSize: 26,
    fontWeight: '800',
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

  // Modern Icon-Free Pending Task Card
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 10,
  },
  taskCardExpanded: {
    borderColor: '#CBD5E1',
  },

  // Top header row of the task card
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  categoryPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  priorityPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
  },
  priorityPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Task Title and Subtitle
  taskTitle: {
    color: '#0F172A',
    fontSize: 15.5,
    fontWeight: '800',
    lineHeight: 21,
  },
  taskMetaSubtitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },

  // Collapsible Instructions Section
  toggleDetailsButton: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    marginTop: 2,
  },
  toggleDetailsText: {
    color: '#94A3B8',
    fontSize: 11.5,
    fontWeight: '700',
  },
  detailsSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 6,
    marginTop: 2,
  },
  detailLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 17,
  },

  // Start Task Button
  startButton: {
    height: 46,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  startButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  startButtonTextWrap: {
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0,
  },
  startButtonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },

  completedBanner: {
    alignSelf: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 10,
  },
  completedText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '800',
  },

  // States
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  retry: {
    color: '#B91C1C',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 6,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    gap: 10,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    color: GREEN,
    fontSize: 28,
    fontWeight: '900',
  },
  emptyTitle: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
