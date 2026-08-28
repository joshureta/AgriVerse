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

  titleText: {
    fontSize: 22,
    fontWeight: '800',
    color: DARK_GREEN,
    marginBottom: 16,
    letterSpacing: -0.3,
  },

  loader: {
    marginTop: 18,
  },
  loadError: {
    color: '#a33d35',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 12,
  },

  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    shadowColor: '#0B2E16',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orderCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  orderIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FAF5',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  orderImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  orderInfo: {
    flex: 1,
    marginLeft: 14,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  orderMeta: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  orderTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: GREEN,
    marginTop: 4,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusBadgeDelivered: {
    backgroundColor: SAGE_BG,
    borderWidth: 1,
    borderColor: SAGE_BORDER,
  },
  statusBadgeTransit: {
    backgroundColor: '#FDF3E5',
    borderWidth: 1,
    borderColor: '#F7DCBA',
  },
  statusBadgeCancelled: {
    backgroundColor: '#FBE9E7',
    borderWidth: 1,
    borderColor: '#F5C6C2',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotDelivered: {
    backgroundColor: GREEN,
  },
  statusDotTransit: {
    backgroundColor: '#C97A2E',
  },
  statusDotCancelled: {
    backgroundColor: '#B13B3B',
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  statusTextDelivered: {
    color: GREEN,
  },
  statusTextTransit: {
    color: '#C97A2E',
  },
  statusTextCancelled: {
    color: '#B13B3B',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 14,
    color: TEXT_MUTED,
    fontWeight: '600',
  },
});
