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
  upcomingCountBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GREEN,
  },
  upcomingCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  upcomingSectionTitle: {
    color: '#134B24',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
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
  pendingCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 4,
  },
  categorySquircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRightDropdownBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRightDropdownBtnActive: {
    backgroundColor: '#E2E8F0',
  },
  taskTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 3,
  },
  taskMetaSubtitle: {
    color: '#64748B',
    fontSize: 12.5,
    fontWeight: '600',
  },

  // Driver Meta Rows
  metaTextContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 2,
    marginBottom: 2,
    gap: 5,
  },
  metaTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaTextLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
    width: 82,
    lineHeight: 18,
  },
  metaTextValue: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
  },
  metaTextValueHighlighted: {
    color: GREEN,
    fontWeight: '800',
  },

  // Collapsible Instructions Section (Driver pendingDetailsBox Style)
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
  pendingDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
    marginTop: 4,
    marginBottom: 2,
  },
  pendingDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  pendingDetailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    width: 82,
    lineHeight: 18,
  },
  pendingDetailValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 18,
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
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    overflow: 'hidden',
    backgroundColor: '#FFF9F8',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1D1CE',
    shadowColor: '#7F1D1D',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  errorBoxPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.992 }],
  },
  errorAccent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
    backgroundColor: '#C93C48',
  },
  errorIconShell: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDE8E7',
    borderWidth: 1,
    borderColor: '#F7CECB',
  },
  errorContent: {
    flex: 1,
    minWidth: 0,
  },
  errorEyebrow: {
    color: '#A23A43',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  errorTitle: {
    color: '#641E26',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  errorText: {
    color: '#71454A',
    fontSize: 11.5,
    lineHeight: 17.5,
    fontWeight: '500',
    marginTop: 4,
  },
  errorRetryAction: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 11,
    marginTop: 11,
    backgroundColor: '#FCE4E2',
  },
  errorRetryText: {
    color: '#9F1D2A',
    fontSize: 10.5,
    fontWeight: '800',
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
