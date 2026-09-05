import { StyleSheet } from 'react-native';

export const GREEN = '#176D34';
export const DARK_GREEN = '#10351D';
export const SAGE_BG = '#EDF5EB';
export const SAGE_BORDER = '#D8E5D5';
export const CARD_BORDER = '#E3EBE4';
export const TEXT_MUTED = '#637567';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F7F1',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },

  card: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    shadowColor: '#0B2E16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: DARK_GREEN,
    letterSpacing: -0.2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#EAF5EA',
    borderWidth: 1,
    borderColor: '#CDE5CF',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: GREEN,
  },

  // Vertical route layout
  verticalRouteBox: {
    backgroundColor: '#F6FAF6',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DCECDC',
    marginBottom: 16,
  },
  routeItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  originIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  destinationIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  verticalConnectorLine: {
    width: 2,
    height: 20,
    backgroundColor: 'rgba(23, 109, 52, 0.25)',
    marginLeft: 13,
    marginVertical: 4,
  },
  routeItemContent: {
    flex: 1,
  },
  routeItemHeader: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#4E6A56',
    letterSpacing: 0.6,
  },
  routeItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: DARK_GREEN,
    marginTop: 1,
  },
  routeItemSubtitle: {
    fontSize: 11,
    color: '#5E7464',
    marginTop: 1,
    lineHeight: 15,
  },

  // Stepper with continuous connecting track line
  stepperContainer: {
    position: 'relative',
    marginTop: 8,
    marginBottom: 4,
  },
  stepperLineBackground: {
    position: 'absolute',
    top: 18,
    left: '12%',
    right: '12%',
    height: 2,
    flexDirection: 'row',
    zIndex: 0,
  },
  stepperLineSegment: {
    flex: 1,
    height: 2,
  },
  stepperLineSegmentDone: {
    backgroundColor: GREEN,
  },
  stepperLineSegmentPending: {
    backgroundColor: '#D6DED4',
  },
  stepperNodesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 1,
  },
  stepColumn: {
    alignItems: 'center',
    width: 76,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  stepCircleDone: {
    backgroundColor: GREEN,
    borderColor: GREEN,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  stepCircleCurrent: {
    backgroundColor: '#EAF5EA',
    borderWidth: 2,
    borderColor: GREEN,
  },
  stepCirclePending: {
    backgroundColor: '#F1F5F0',
    borderWidth: 1,
    borderColor: '#D4DFD2',
  },
  stepLabel: {
    marginTop: 8,
    fontSize: 10,
    fontWeight: '800',
    color: DARK_GREEN,
    textAlign: 'center',
  },
  stepLabelPending: {
    color: '#8B9B8E',
    fontWeight: '600',
  },
  stepDate: {
    marginTop: 2,
    fontSize: 8.5,
    color: TEXT_MUTED,
    textAlign: 'center',
  },

  // Order Details card rows
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAF7',
    borderWidth: 1,
    borderColor: '#E9EFE8',
    marginBottom: 8,
    gap: 12,
  },
  detailIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EAF5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#4E6A56',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: DARK_GREEN,
    marginTop: 1,
  },

  // Order Items card
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#F0F4F0',
  },
  countBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#556658',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  itemRowBorderTop: {
    borderTopWidth: 1,
    borderTopColor: '#F0F4F0',
  },
  itemIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBEA',
    borderWidth: 1,
    borderColor: '#F6E5A8',
  },
  itemImage: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  itemMeta: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: DARK_GREEN,
    marginLeft: 8,
  },

  // Financial summary inside items card
  financialSummary: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EDF2EC',
    gap: 6,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11.5,
    color: TEXT_MUTED,
  },
  summaryValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: DARK_GREEN,
  },
  totalLine: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2EBE0',
    borderStyle: 'dashed',
    marginTop: 2,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '900',
    color: GREEN,
  },

  cancelledText: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FBE9E7',
    color: '#a33d35',
    fontSize: 12,
    textAlign: 'center',
  },

  // Delivery proof photo
  proofImage: {
    width: '100%',
    height: 190,
    borderRadius: 14,
    marginTop: 12,
    backgroundColor: SAGE_BG,
  },
  proofNote: {
    marginTop: 10,
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 17,
  },

  // Confirm receipt / dispute
  confirmationText: {
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 17,
    marginTop: 6,
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  primaryButton: {
    flexGrow: 1,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 12.5, fontWeight: '800' },
  secondaryButton: {
    flexGrow: 1,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: SAGE_BG,
    borderWidth: 1,
    borderColor: SAGE_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonText: { color: DARK_GREEN, fontSize: 12.5, fontWeight: '800' },
  dangerButton: {
    flexGrow: 1,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: '#B23A32',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  dangerButtonText: { color: '#ffffff', fontSize: 12.5, fontWeight: '800' },
  buttonDisabled: { opacity: 0.55 },
  disputeInput: {
    marginTop: 12,
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SAGE_BORDER,
    backgroundColor: '#F7FAF5',
    color: DARK_GREEN,
    fontSize: 12.5,
    padding: 12,
    textAlignVertical: 'top',
  },
  pendingReviewCard: {
    backgroundColor: '#FFFBEA',
    borderColor: '#F0E2B8',
  },
  pendingReviewTitle: { color: '#8A6A12', fontSize: 13.5, fontWeight: '800' },
  actionErrorText: {
    marginTop: 8,
    color: '#a33d35',
    fontSize: 11.5,
  },
});
