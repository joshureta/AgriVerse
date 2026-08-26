import { StyleSheet } from 'react-native';

const DARK_GREEN = '#134B24';
const ACCENT_GREEN = '#1E6B37';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9F9F4',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F9F4',
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 90,
  },

  // Top Section: Greeting on left, Compact Weather on right
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  greetingBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  greeting: {
    color: DARK_GREEN,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  weatherBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    paddingTop: 2,
  },
  weatherIconImage: {
    width: 36,
    height: 34,
    resizeMode: 'contain',
    marginRight: 6,
    marginTop: 2,
  },
  weatherInfo: {
    marginRight: 8,
  },
  weatherTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  weatherTitle: {
    color: DARK_GREEN,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  weatherDate: {
    color: DARK_GREEN,
    fontSize: 12,
    fontWeight: '700',
  },
  weatherLocation: {
    color: '#3D6346',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },

  // Farmer Hero Illustration
  heroWrapper: {
    width: '100%',
    height: 155,
    marginVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
    height: 155,
    resizeMode: 'contain',
  },

  // 4 Metrics Cards in a Row
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  metricCard: {
    flex: 1,
    height: 142,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  metricValue: {
    fontSize: 42,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
  },
  metricLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },

  // Today's Tasks Section Header
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    color: DARK_GREEN,
    fontSize: 26,
    fontWeight: '800',
  },
  clipboardIcon: {
    width: 32,
    height: 42,
    borderColor: DARK_GREEN,
    borderWidth: 2.5,
    borderRadius: 4,
    position: 'relative',
    paddingTop: 8,
    paddingHorizontal: 4,
    justifyContent: 'space-around',
    paddingBottom: 3,
  },
  clipClip: {
    position: 'absolute',
    top: -6,
    left: 8,
    width: 14,
    height: 8,
    borderRadius: 2,
    borderWidth: 2.5,
    borderColor: DARK_GREEN,
    backgroundColor: '#F9F9F4',
  },
  clipCheckRow: {
    height: 7,
    flexDirection: 'row',
    alignItems: 'center',
  },
  clipCheck: {
    color: DARK_GREEN,
    fontSize: 9,
    fontWeight: '900',
    width: 9,
  },
  clipLine: {
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: DARK_GREEN,
    flex: 1,
  },

  loader: {
    marginTop: 25,
  },
  loadError: {
    color: '#a33d35',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 18,
  },

  // Task Cards List
  taskCard: {
    minHeight: 64,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EBE4',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  taskCopy: {
    flex: 1,
    paddingRight: 12,
  },
  taskCategory: {
    color: ACCENT_GREEN,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 3,
    textTransform: 'capitalize',
  },
  taskDescription: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: ACCENT_GREEN,
  },
});



