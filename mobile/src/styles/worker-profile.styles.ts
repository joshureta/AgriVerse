import { StyleSheet } from 'react-native';

const GREEN = '#176D34';
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
    color: '#134B24',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 24,
  },
  profileCard: {
    borderWidth: 1.5,
    borderColor: '#81CF91',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 24,
    paddingBottom: 18,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#152E1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
  },
  identitySection: {
    alignItems: 'center',
  },
  avatar: {
    width: 124,
    height: 124,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#DCEFE0',
    borderRadius: 62,
    backgroundColor: '#EAF6E8',
  },
  informationCard: {
    marginTop: 22,
    borderWidth: 1,
    borderColor: '#DFE6E7',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingTop: 21,
    paddingBottom: 23,
    backgroundColor: '#F8FAFB',
  },
  fullName: {
    color: '#15191D',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 21,
  },
  profileRows: {
    gap: 17,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rowIcon: {
    width: 28,
    minHeight: 22,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginRight: 5,
  },
  rowLabel: {
    width: 88,
    color: '#15191D',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
  },
  rowValue: {
    flex: 1,
    color: '#56616A',
    fontSize: 13,
    lineHeight: 19,
  },
  logoutButton: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 18,
    borderWidth: 1.5,
    borderColor: GREEN,
    borderRadius: 10,
    backgroundColor: PAGE_BACKGROUND,
  },
  logoutButtonPressed: {
    backgroundColor: '#E6F3E5',
    opacity: 0.85,
  },
  logoutButtonDisabled: {
    opacity: 0.65,
  },
  logoutText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '800',
  },
});
