import { StyleSheet } from 'react-native';

export const GREEN = '#176D34';
export const GREEN_DARK = '#125829';
export const BG_COLOR = '#F8FAEF';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: GREEN,
  },
  mainBodyContainer: {
    flex: 1,
    backgroundColor: BG_COLOR,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG_COLOR,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 110,
  },

  // Top Greeting Section
  greeting: {
    color: '#134B24',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 14,
  },

  // Farm Hero Card with Embedded Weather & Status Pill
  farmHeroWrapper: {
    width: '100%',
    height: 170,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 18,
    backgroundColor: '#E2F0DC',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  heroBackgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  floatingWeatherCard: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  weatherTempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weatherSunIcon: {
    fontSize: 20,
  },
  weatherTempValue: {
    fontSize: 19,
    fontWeight: '900',
    color: '#111827',
    lineHeight: 22,
  },
  weatherSubLoc: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginTop: 2,
  },
  floatingStatusPill: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#D7ECD8',
    borderWidth: 1,
    borderColor: '#C2E5C4',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  floatingStatusText: {
    color: '#166534',
    fontSize: 11.5,
    fontWeight: '700',
  },

  // 4 Metric Status Cards (Horizontal 1-Row Grid)
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 22,
  },
  metricCard: {
    flex: 1,
    height: 78,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  metricTopLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.95,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 30,
    textAlign: 'center',
  },

  // Section Heading
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 4,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clipboardIconWrap: {
    width: 22,
    height: 26,
    borderWidth: 2.2,
    borderColor: '#134B24',
    borderRadius: 4.5,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingTop: 4,
    paddingHorizontal: 3,
  },
  clipboardTopClip: {
    position: 'absolute',
    top: -4,
    width: 10,
    height: 5,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#134B24',
    backgroundColor: BG_COLOR,
  },
  clipboardLine: {
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#134B24',
    marginBottom: 2.5,
  },
  clipboardLineShort: {
    width: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#134B24',
    alignSelf: 'flex-start',
    marginLeft: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#134B24',
    letterSpacing: -0.4,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '800',
    color: GREEN,
  },

  // Today's Tasks Card (Horizontal 3-Column Layout from Screenshot)
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#EEF0F2',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  categorySquircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIcon: {
    fontSize: 26,
  },
  taskCenterColumn: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
    gap: 6,
  },
  priorityPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    borderRadius: 14,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  priority_high: {
    backgroundColor: '#FCDCD7',
  },
  priorityText_high: {
    color: '#A53A30',
  },
  priority_medium: {
    backgroundColor: '#FEF0CD',
  },
  priorityText_medium: {
    color: '#9C6819',
  },
  priority_low: {
    backgroundColor: '#DCFCE7',
  },
  priorityText_low: {
    color: '#166534',
  },
  durationPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#5A626A',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 14,
  },
  durationClockIcon: {
    fontSize: 11,
    color: '#FFFFFF',
  },
  durationPillText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '600',
  },
  startTaskBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: GREEN,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startTaskBtnPressed: {
    backgroundColor: '#F7F8F0',
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  startTaskBtnText: {
    color: GREEN,
    fontSize: 13.5,
    fontWeight: '700',
  },

  loader: {
    marginTop: 20,
    marginBottom: 20,
  },
  loadError: {
    color: '#DC2626',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 14,
    fontWeight: '500',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});



