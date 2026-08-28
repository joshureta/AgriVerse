import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  header: {
    height: 66,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1F5F2B',
    shadowColor: '#0B2E16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
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

  // 3-zone layout used only when a back button is shown (logo centers on its own).
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
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBubble: {
    width: 22,
    height: 16,
    borderRadius: 7,
    borderBottomLeftRadius: 2,
    backgroundColor: '#ffffff',
  },
  bell: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBody: {
    width: 16,
    height: 17,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: '#ffffff',
  },
  bellClapper: {
    width: 5,
    height: 4,
    marginTop: 2,
    borderRadius: 3,
    backgroundColor: '#ffffff',
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
    borderColor: '#165E28',
  },
});
