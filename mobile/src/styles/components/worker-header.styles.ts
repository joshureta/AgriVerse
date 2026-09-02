import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  header: {
    height: 64,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#176D34',
    zIndex: 10,
  },
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
  logo: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  bellWrapper: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellOutline: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#176D34',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 11,
  },
});
