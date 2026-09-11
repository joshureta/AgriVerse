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
  markReadLink: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '800',
  },

  tabs: {
    flexDirection: 'row',
    height: 38,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: GREEN,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginBottom: 18,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  tabButtonActive: {
    backgroundColor: GREEN,
    borderRadius: 18,
    margin: -1,
  },
  tabText: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tabCount: {
    color: '#708074',
    fontSize: 11,
    fontWeight: '800',
  },
  tabCountActive: {
    color: '#EAF5EA',
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
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 11,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
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
    width: 38,
    height: 38,
    borderRadius: 11,
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
    fontSize: 13.5,
    fontWeight: '800',
    color: '#14251A',
    lineHeight: 18,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: GREEN,
    marginTop: 5,
  },
  cardText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#5B6B60',
    lineHeight: 17,
    marginTop: 3,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 7,
  },
  cardTime: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#8B9A8F',
  },
  actionChip: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    overflow: 'hidden',
  },

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
