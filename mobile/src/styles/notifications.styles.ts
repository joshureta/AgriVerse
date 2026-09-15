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
  panel: {
    flex: 1,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 20,
    marginBottom: 14,
  },
  panelTitle: {
    color: '#134B24',
    fontSize: 26,
    fontWeight: '800',
  },
  panelList: {
    paddingHorizontal: 18,
    paddingBottom: 110,
  },
  markReadLink: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '800',
  },

  sectionLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#7C8F81',
    marginBottom: 8,
    marginTop: 4,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardUnread: {
    backgroundColor: BG_COLOR,
    borderColor: '#D7E8D2',
  },
  cardUrgent: {
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGreen: { backgroundColor: '#DCFCE7' },
  iconAmber: { backgroundColor: '#FEF3C7' },
  iconRed: { backgroundColor: '#FEE2E2' },
  iconInfo: { backgroundColor: '#E0F2FE' },

  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#14251A',
    lineHeight: 17,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GREEN,
    marginTop: 5,
  },
  cardText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#5B6B60',
    lineHeight: 16,
    marginTop: 2,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 5,
  },
  cardTime: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8B9A8F',
  },
  actionChip: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    overflow: 'hidden',
  },

  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
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
    paddingVertical: 40,
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
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    color: GREEN,
    fontSize: 24,
    fontWeight: '900',
  },
  emptyTitle: {
    color: '#1E293B',
    fontSize: 14,
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
