import { StyleSheet } from 'react-native';

export const GREEN = '#176D34';

export const styles = StyleSheet.create({
  container: {
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: GREEN,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 20,
    padding: 2,
  },
  activeIndicator: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    backgroundColor: GREEN,
    borderRadius: 17,
    elevation: 2,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
