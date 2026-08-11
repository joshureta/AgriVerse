import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  header: {
    height: 86,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: { width: 55, height: 55, resizeMode: 'contain' },
  bell: { width: 28, height: 33, alignItems: 'center', justifyContent: 'center' },
  bellBody: {
    width: 20,
    height: 21,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: '#fff',
  },
  bellClapper: { width: 7, height: 4, marginTop: 2, borderRadius: 4, backgroundColor: '#fff' },
});
