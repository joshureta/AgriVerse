import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  header: {
    height: 66,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E5E2B',
  },
  logo: { width: 44, height: 44, resizeMode: 'contain' },
  bell: { width: 28, height: 32, alignItems: 'center', justifyContent: 'center' },
  bellBody: {
    width: 18,
    height: 19,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: '#ffffff',
  },
  bellClapper: {
    width: 6,
    height: 4,
    marginTop: 2,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
});
