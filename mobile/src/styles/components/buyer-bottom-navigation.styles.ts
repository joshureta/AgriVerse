import { StyleSheet } from 'react-native';

export const BAR_GREEN = '#0E2E18';
export const ICON_LIGHT = '#E7F2E4';
export const ICON_MUTED = '#8FB89A';

export const styles = StyleSheet.create({
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: BAR_GREEN,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
  },
  activeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  pressedButton: {
    opacity: 0.75,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: ICON_MUTED,
    marginTop: 2,
  },
  activeLabel: {
    color: '#ffffff',
    fontWeight: '800',
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
