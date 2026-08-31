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
    textAlign: 'center',
    marginBottom: 18,
    letterSpacing: -0.3,
  },

  card: {
    padding: 22,
    borderRadius: 22,
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

  avatarWrap: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: GREEN,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarHead: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    marginTop: 20,
  },
  avatarBody: {
    width: 68,
    height: 42,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    backgroundColor: '#ffffff',
    marginTop: 6,
  },
  avatarBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SAGE_BG,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarBadgeEmoji: {
    fontSize: 18,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  infoIcon: {
    fontSize: 16,
    width: 20,
    textAlign: 'center',
    marginTop: 1,
  },
  infoNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  infoText: {
    fontSize: 13,
    color: '#47564A',
    lineHeight: 18.5,
  },

  purchasesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginBottom: 20,
    shadowColor: '#0B2E16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  purchasesPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  purchasesIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SAGE_BG,
    borderWidth: 1,
    borderColor: SAGE_BORDER,
  },
  purchasesEmoji: {
    fontSize: 18,
  },
  purchasesTextBlock: {
    flex: 1,
    marginLeft: 12,
  },
  purchasesTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  purchasesSubtitle: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  purchasesChevron: {
    fontSize: 18,
    color: '#9AA79C',
    fontWeight: '800',
  },

  editButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 26,
    backgroundColor: GREEN,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  editButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.4,
  },
  signOutButton: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
});
