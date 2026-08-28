import { StyleSheet } from 'react-native';

export const GREEN = '#176D34';
export const DARK_GREEN = '#123A20';

export const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F8F2' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },

  titleText: { fontSize: 18, fontWeight: '800', color: DARK_GREEN, marginBottom: 14 },

  loader: { marginTop: 18 },
  loadError: {
    color: '#a33d35',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 12,
  },

  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    marginBottom: 12,
    shadowColor: '#0B2E16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  orderCardPressed: { opacity: 0.85 },
  orderIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F1E4',
  },
  orderImage: { width: 26, height: 26, resizeMode: 'contain' },
  orderInfo: { flex: 1, marginLeft: 12 },
  orderId: { fontSize: 12.5, fontWeight: '800', color: DARK_GREEN },
  orderMeta: { fontSize: 10.5, color: '#7C897E', marginTop: 2 },
  orderTotal: { fontSize: 11.5, fontWeight: '700', color: GREEN, marginTop: 2 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusBadgeDelivered: { backgroundColor: '#EAF4E7' },
  statusBadgeTransit: { backgroundColor: '#FDF1E3' },
  statusBadgeCancelled: { backgroundColor: '#FBE9E7' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotDelivered: { backgroundColor: GREEN },
  statusDotTransit: { backgroundColor: '#C97A2E' },
  statusDotCancelled: { backgroundColor: '#B13B3B' },
  statusText: { fontSize: 9.5, fontWeight: '800' },
  statusTextDelivered: { color: GREEN },
  statusTextTransit: { color: '#C97A2E' },
  statusTextCancelled: { color: '#B13B3B' },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyEmoji: { fontSize: 44 },
  emptyText: { fontSize: 13, color: '#7C897E', fontWeight: '600' },
});
