import { StyleSheet } from 'react-native';

export const GREEN = '#176D34';
export const DARK_GREEN = '#123A20';
export const ORANGE = '#F2994A';

export const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F8F2' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },

  titleText: { fontSize: 22, fontWeight: '800', color: GREEN, textAlign: 'center', marginBottom: 18 },

  card: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    marginBottom: 16,
    shadowColor: '#0B2E16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },

  avatarWrap: { alignSelf: 'center', marginBottom: 22 },
  avatarCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: GREEN,
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarHead: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffffff', marginTop: 22 },
  avatarBody: { width: 66, height: 40, borderTopLeftRadius: 33, borderTopRightRadius: 33, backgroundColor: '#ffffff', marginTop: 6 },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F1E4',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  avatarBadgeEmoji: { fontSize: 16 },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  infoIcon: { fontSize: 15, width: 18, textAlign: 'center', marginTop: 1 },
  infoNameText: { fontSize: 15.5, fontWeight: '800', color: DARK_GREEN },
  infoText: { fontSize: 12.5, color: '#3F4A42', lineHeight: 18 },

  purchasesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E7EFE4',
    marginBottom: 20,
  },
  purchasesPressed: { opacity: 0.85 },
  purchasesIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF4E7',
  },
  purchasesEmoji: { fontSize: 18 },
  purchasesTextBlock: { flex: 1, marginLeft: 12 },
  purchasesTitle: { fontSize: 12.5, fontWeight: '800', color: DARK_GREEN },
  purchasesSubtitle: { fontSize: 10.5, color: '#7C897E', marginTop: 2 },
  purchasesChevron: { fontSize: 16, color: '#9AA79C', fontWeight: '800' },

  editButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 26,
    backgroundColor: ORANGE,
  },
  editButtonPressed: { opacity: 0.88 },
  editButtonText: { fontSize: 14, fontWeight: '800', color: '#ffffff', letterSpacing: 0.3 },
});
