import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  header: {
    height: 66,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#176D34',
    shadowColor: '#125829',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  logo: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  // 3-zone layout keeps the logo centered whether or not a back button is shown.
  zone: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  zoneCenter: {
    justifyContent: 'center',
  },
  zoneEnd: {
    justifyContent: 'flex-end',
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  backChevron: {
    width: 9,
    height: 9,
    marginLeft: 3,
    borderLeftWidth: 2.2,
    borderBottomWidth: 2.2,
    borderColor: '#ffffff',
    transform: [{ rotate: '45deg' }],
  },
  chat: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: '#E4572E',
    borderWidth: 1.5,
    borderColor: '#176D34',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  bell: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E4572E',
    borderWidth: 1.5,
    borderColor: '#176D34',
  },
});
