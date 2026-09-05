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
    overflow: 'hidden',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG_COLOR,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  contentInset: {
    paddingHorizontal: 18,
  },
  contentInsetCompact: {
    paddingHorizontal: 14,
  },

  // Farm Hero Card with Embedded Weather & Status Pill
  farmHeroWrapper: {
    width: '100%',
    height: 172,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
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
    top: 14,
    left: 12,
    width: '45%',
    maxWidth: 165,
    minHeight: 74,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
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
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 24,
  },
  weatherSubLoc: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    lineHeight: 14,
    marginTop: 3,
  },
  floatingStatusPill: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    maxWidth: '45%',
    backgroundColor: '#DCF5E2',
    borderWidth: 1,
    borderColor: '#C6E8CB',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  floatingStatusText: {
    color: '#1E5E2E',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  // 4 Metric Status Cards (Horizontal 1-Row Grid)
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
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

  // Equipment Status Section
  equipmentSection: {
    marginBottom: 20,
  },
  equipmentHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#134B24',
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  equipmentRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  equipmentCard: {
    flex: 1,
    height: 106,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  equipmentCard_available: {
    backgroundColor: '#176D34',
  },
  equipmentCard_transit: {
    backgroundColor: '#3D7853',
  },
  equipmentVehicle: {
    width: 72,
    height: 58,
    resizeMode: 'contain',
  },
  equipmentLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },

  // Today's Deliveries Section Header
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

  // Today's Deliveries Card (Horizontal 3-Column Layout)
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FEF0CD',
  },
  priorityPill_order: {
    backgroundColor: '#DCFCE7',
  },
  priorityPill_high: {
    backgroundColor: '#FCDCD7',
  },
  priorityPill_medium: {
    backgroundColor: '#FEF0CD',
  },
  priorityText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#9C6819',
  },
  priorityText_order: {
    color: '#166534',
  },
  priorityText_high: {
    color: '#A53A30',
  },
  priorityText_medium: {
    color: '#9C6819',
  },
  durationPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#4B5563',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  durationClockIcon: {
    fontSize: 11,
    color: '#FFFFFF',
  },
  durationPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  startTaskBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: GREEN,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  startTaskBtnPressed: {
    backgroundColor: '#EAF5EA',
  },
  startTaskBtnText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '800',
  },

  // Empty State & Error
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
  },
});

