import { StyleSheet } from 'react-native';

const DARK_GREEN = '#134B24';
const ACCENT_GREEN = '#1E6B37';

export const styles = StyleSheet.create({
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  navButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF1E4',
  },
  navArrow: {
    color: DARK_GREEN,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22,
  },
  weekLabelWrap: {
    flex: 1,
    alignItems: 'center',
  },
  weekLabel: {
    color: DARK_GREEN,
    fontSize: 14,
    fontWeight: '700',
  },
  gridCard: {
    backgroundColor: '#F3F5EE',
    borderRadius: 18,
    paddingVertical: 14,
    paddingLeft: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  gridContent: {
    paddingRight: 12,
  },
  dayColumn: {
    width: 96,
    marginRight: 10,
  },
  dayHeader: {
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 10,
  },
  dayHeaderToday: {
    backgroundColor: DARK_GREEN,
  },
  dayHeaderSelected: {
    backgroundColor: '#DCE9D3',
  },
  dayLabel: {
    color: ACCENT_GREEN,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dayLabelToday: {
    color: '#FFFFFF',
  },
  dayNumber: {
    color: DARK_GREEN,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  dayNumberToday: {
    color: '#FFFFFF',
  },
  dayEvents: {
    gap: 10,
  },
  eventCard: {
    minHeight: 92,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventTime: {
    fontSize: 10,
    fontWeight: '800',
  },
  eventBody: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  eventTitle: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  eventSubtitle: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 3,
  },
});
