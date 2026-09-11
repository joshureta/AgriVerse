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

  // Completed Task Card (Modern typography & semantic pills with squircle icon)
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categorySquircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardContentColumn: {
    flex: 1,
    minWidth: 0,
  },
  chevronWrapper: {
    paddingLeft: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  badgesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusPillCompleted: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusPillAwaiting: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  statusPillTextCompleted: {
    color: '#166534',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statusPillTextAwaiting: {
    color: '#92400E',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cardMainContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  statusKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 6,
  },
  statusIconCompleted: {
    color: '#176D34',
    fontSize: 18,
    fontWeight: '900',
  },
  statusIconHarvesting: {
    color: '#D97706',
    fontSize: 17,
    fontWeight: '900',
  },
  statusKickerCompleted: {
    color: '#176D34',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  statusKickerHarvesting: {
    color: '#D97706',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  taskTitle: {
    color: '#0F172A',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    marginBottom: 3,
  },
  taskMetaSubtitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  taskMeta: {
    marginTop: 8,
    gap: 3,
  },
  finishedText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },
  fieldText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
  },

  // "see more" / "see less" Toggle Button
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  seeMoreButtonPressed: {
    backgroundColor: '#F8FAFC',
  },
  seeMoreText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  seeMoreChevron: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },

  // Expandable Drawer Container
  expandedDrawer: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },

  // Harvest counts (if applicable)
  countsGrid: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  countBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  countBoxLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  countBoxValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 1,
  },

  // Insights Section
  insightsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 11,
    marginTop: 8,
  },
  sectionHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  insightsText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#334155',
    fontWeight: '500',
  },
  noInsightsText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#94A3B8',
  },

  // Photo Proof Section
  photoProofSection: {
    marginTop: 2,
  },
  photoProofContainer: {
    width: '100%',
    height: 160,
    borderRadius: 11,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
    marginTop: 4,
    position: 'relative',
  },
  photoProofImage: {
    width: '100%',
    height: '100%',
  },
  photoProofOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  photoProofOverlayText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  noPhotoContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  noPhotoText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },

  // Full Screen Photo Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  modalImage: {
    width: '92%',
    height: '75%',
    borderRadius: 12,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: 20,
  },
  checkCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EAF4D9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  checkCheck: {
    color: GREEN,
    fontSize: 22,
    fontWeight: '900',
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


