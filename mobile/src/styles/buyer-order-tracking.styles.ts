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
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 28,
  },

  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    shadowColor: '#0B2E16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  // Order confirmed header
  confirmedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  confirmedCheckCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SAGE_BG,
    borderWidth: 1,
    borderColor: SAGE_BORDER,
  },
  confirmedCheck: {
    color: GREEN,
    fontSize: 16,
    fontWeight: '900',
  },
  confirmedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  confirmedSubtitle: {
    fontSize: 11.5,
    color: TEXT_MUTED,
    marginTop: 2,
  },

  estimateStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    marginBottom: 16,
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

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FAF5',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  itemImage: {
    width: 32,
    height: 32,
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
    color: GREEN,
    marginLeft: 8,
  },

  divider: {
    height: 1,
    backgroundColor: '#EDF2EC',
    marginVertical: 12,
  },

  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  addressPin: {
    fontSize: 14,
    marginTop: 1,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: '#556658',
    lineHeight: 17,
  },

  // Delivery progress
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: DARK_GREEN,
    marginBottom: 16,
  },

  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 24,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#C7D3C4',
  },
  routePillFrom: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: SAGE_BG,
    borderWidth: 1,
    borderColor: SAGE_BORDER,
  },
  routePillTo: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: DARK_GREEN,
  },
  routePillLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  routePillLabelLight: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  routePillSub: {
    fontSize: 10,
    color: '#4E6A56',
    marginTop: 2,
  },
  routePillSubLight: {
    fontSize: 10,
    color: '#D9E9D3',
    marginTop: 2,
  },
  routeTruckCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: GREEN,
    marginHorizontal: -8,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeTruckIcon: {
    fontSize: 16,
  },

  stepperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 24,
  },
  stepColumn: {
    alignItems: 'center',
    width: 80,
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
  stepCirclePending: {
    backgroundColor: '#EDF2EC',
  },
  stepCheckText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  stepIconText: {
    fontSize: 14,
  },
  stepLabel: {
    marginTop: 8,
    fontSize: 10.5,
    fontWeight: '800',
    color: DARK_GREEN,
    textAlign: 'center',
  },
  stepLabelPending: {
    color: '#8B9B8E',
    fontWeight: '600',
  },
  stepDate: {
    marginTop: 3,
    fontSize: 9,
    color: TEXT_MUTED,
    textAlign: 'center',
  },

  cancelledText: {
    marginTop: 18,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FBE9E7',
    color: '#a33d35',
    fontSize: 12,
    textAlign: 'center',
  },
});
