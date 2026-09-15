import { StyleSheet } from 'react-native';

export const GREEN_NAV_BG = '#FFFFFF';
export const ACTIVE_PILL_BG = '#176D34';
export const ACTIVE_ICON_COLOR = '#FFFFFF';
export const INACTIVE_ICON_COLOR = '#4A6552';
export const INACTIVE_TEXT_COLOR = '#4A6552';

export const styles = StyleSheet.create({
  navigationArea: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#F8FAEF',
  },
  navigation: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(23, 109, 52, 0.14)',
    elevation: 8,
    shadowColor: '#04180C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  button: {
    flex: 1,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 27,
    marginHorizontal: 3,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  activeButton: {
    backgroundColor: ACTIVE_PILL_BG,
    shadowColor: '#176D34',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  pressedButton: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  iconSlot: {
    width: 28,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Label Typography
  label: {
    fontSize: 10.5,
    fontWeight: '600',
    color: INACTIVE_TEXT_COLOR,
    marginTop: 2,
    height: 14,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  activeLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: ACTIVE_ICON_COLOR,
    marginTop: 2,
    height: 14,
    textAlign: 'center',
    letterSpacing: 0.1,
  },

  // Home Icon
  homeIconWrapper: {
    width: 28,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeRoofStack: {
    width: 26,
    height: 11,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  homeRoofTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 13,
    borderRightWidth: 13,
    borderBottomWidth: 11,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  homeHouseBody: {
    width: 20,
    height: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  homeDoorCutout: {
    width: 6,
    height: 8,
    backgroundColor: ACTIVE_PILL_BG,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },

  // Tasks / Clipboard Icon
  clipboard: {
    width: 20,
    height: 24,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  clipClip: {
    position: 'absolute',
    top: -4,
    width: 9,
    height: 5,
    borderRadius: 1.5,
    borderWidth: 1.5,
  },
  clipCheckText: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 1,
  },

  // Schedule / Calendar Icon
  calendarWrapper: {
    width: 24,
    height: 24,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarRingLeft: {
    position: 'absolute',
    top: 0,
    left: 4,
    width: 2.5,
    height: 4.5,
    borderRadius: 1.25,
    zIndex: 2,
  },
  calendarRingRight: {
    position: 'absolute',
    top: 0,
    right: 4,
    width: 2.5,
    height: 4.5,
    borderRadius: 1.25,
    zIndex: 2,
  },
  calendarBox: {
    width: 22,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    marginTop: 2.5,
    paddingTop: 3,
    paddingHorizontal: 2,
  },
  calendarHeaderLine: {
    height: 1.5,
    borderRadius: 1,
    marginBottom: 2,
  },
  calendarGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 1,
  },
  calendarGridDot: {
    width: 3,
    height: 3,
    borderRadius: 0.8,
  },

  // Profile Icon
  profileIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHead: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    marginBottom: 2,
  },
  profileHeadFilled: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 2,
  },
  profileBody: {
    width: 20,
    height: 9,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 2,
    borderBottomWidth: 0,
  },
  profileBodyFilled: {
    width: 20,
    height: 9,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
});
