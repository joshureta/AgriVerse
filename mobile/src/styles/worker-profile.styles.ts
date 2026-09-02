import { StyleSheet } from 'react-native';

const GREEN = '#176D34';
const DARK_GREEN = '#10351D';
const SAGE_BG = '#EDF5EB';
const CARD_BORDER = '#E5EDE2';
const PAGE_BACKGROUND = '#F8FAEF';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: GREEN,
  },
  mainBodyContainer: {
    flex: 1,
    overflow: 'hidden',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: PAGE_BACKGROUND,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PAGE_BACKGROUND,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 20,
    paddingBottom: 28,
  },
  screenTitle: {
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
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 12,
    paddingVertical: 15,
    borderRadius: 26,
    backgroundColor: GREEN,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  logoutButtonDisabled: {
    opacity: 0.65,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.4,
  },
});
