import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 14,
    right: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#14251A',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
    marginTop: 5,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  text: {
    color: '#D7E8D2',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
});
