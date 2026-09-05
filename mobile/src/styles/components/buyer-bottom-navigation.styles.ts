import { StyleSheet } from 'react-native';

export const GREEN_NAV_BG = '#176D34';
export const GREEN_NAV_GRADIENT = ['#479237', '#1F5F2B'] as const;
export const ACTIVE_PILL_BG = 'rgba(255, 255, 255, 0.22)';
export const ACTIVE_ICON_COLOR = '#FFFFFF';
export const INACTIVE_ICON_COLOR = 'rgba(255, 255, 255, 0.65)';
export const INACTIVE_TEXT_COLOR = 'rgba(255, 255, 255, 0.72)';

export const styles = StyleSheet.create({
  navigationArea: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#F8FAEF',
  },
  navigation: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 7,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    elevation: 14,
    shadowColor: '#07150C',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  button: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    marginHorizontal: 3,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  activeButton: {
    backgroundColor: ACTIVE_PILL_BG,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  pressedButton: {
    opacity: 0.75,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: INACTIVE_TEXT_COLOR,
    marginTop: 2,
    height: 14,
    textAlign: 'center',
  },
  activeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: ACTIVE_ICON_COLOR,
    marginTop: 2,
    height: 14,
    textAlign: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -8,
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
  cartBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 11,
  },

  homeIcon: {
    width: 22,
    height: 20,
    alignItems: 'center',
  },
  homeRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderBottomWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  homeBody: {
    width: 16,
    height: 11,
    marginTop: -1,
    borderRadius: 2,
  },

  cartIcon: {
    width: 24,
    height: 20,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cartBasket: {
    width: 18,
    height: 12,
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  cartHandle: {
    position: 'absolute',
    top: 0,
    width: 10,
    height: 6,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  cartWheels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 12,
    marginTop: 2,
  },
  cartWheel: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  boxIcon: {
    width: 22,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxBody: {
    width: 20,
    height: 16,
    borderWidth: 2,
    borderRadius: 2,
  },
  boxLid: {
    position: 'absolute',
    top: 6,
    width: 20,
    height: 2,
  },

  profileIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  profileHead: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 2,
    marginBottom: 2,
  },
  profileBody: {
    width: 17,
    height: 8,
    borderTopLeftRadius: 8.5,
    borderTopRightRadius: 8.5,
    borderWidth: 2,
    borderBottomWidth: 0,
  },
});
