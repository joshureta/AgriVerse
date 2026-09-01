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
  content: {
    flexGrow: 1,
    paddingTop: 20,
    paddingBottom: 110,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#134B24',
    fontSize: 26,
    fontWeight: '800',
  },

  // Segmented 3-tab pill container
  filters: {
    flexDirection: 'row',
    height: 38,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: GREEN,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginBottom: 20,
  },
  filterButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  filterButtonLast: {
    borderRightWidth: 0,
  },
  filterButtonActive: {
    backgroundColor: GREEN,
    borderRadius: 18,
    margin: -1,
  },
  filterText: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // Pending Delivery Card
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  taskCardExpanded: {
    borderColor: '#A5D6A7',
    borderWidth: 1.5,
  },

  // Top header row of the card
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // Category Icon Squircle
  categorySquircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
  },
  categoryIconText: {
    fontSize: 20,
  },

  // Priority / Order Pills
  priorityPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF0CD',
  },
  priorityPill_order: {
    backgroundColor: '#DCFCE7',
  },
  priorityPill_high: {
    backgroundColor: '#FEE2E2',
  },
  priorityPill_medium: {
    backgroundColor: '#FEF0CD',
  },
  priorityPill_low: {
    backgroundColor: '#DCFCE7',
  },
  priorityText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#9C6819',
  },
  priorityText_order: {
    color: '#166534',
  },
  priorityText_high: {
    color: '#991B1B',
  },
  priorityText_medium: {
    color: '#92400E',
  },
  priorityText_low: {
    color: '#166534',
  },

  // Duration / Window & Chevron
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationClock: {
    fontSize: 12,
    color: '#6B7280',
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  chevron: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    marginLeft: 2,
  },

  // Task Title / Destination
  taskTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 22,
    marginTop: 12,
  },

  // Expanded Details Section
  detailsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  detailBoxSmall: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: GREEN,
    letterSpacing: 0.5,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 18,
  },

  // Vehicle Picker Field
  vehiclePickerBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  vehicleSelectControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 4,
  },
  vehicleSelectText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
  },
  vehiclePlaceholder: {
    color: '#94A3B8',
    fontSize: 13,
  },
  vehicleOptionsList: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    overflow: 'hidden',
  },
  vehicleOptionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  vehicleOptionItemSelected: {
    backgroundColor: '#EAF5EA',
  },
  vehicleOptionName: {
    color: '#176D34',
    fontSize: 13,
    fontWeight: '800',
  },
  vehicleOptionPlate: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  noVehiclesNotice: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },

  // Action Button
  startButton: {
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F7F8F0',
    borderWidth: 1.5,
    borderColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  startButtonPressed: {
    backgroundColor: '#EAF4D9',
    opacity: 0.9,
  },
  startButtonText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  startButtonDisabled: {
    opacity: 0.45,
  },

  // Active / Radar Section
  radarPulseBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  radarBadgeText: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    fontSize: 10.5,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    letterSpacing: 0.5,
  },
  activeDataTable: {
    marginTop: 10,
    marginBottom: 12,
    gap: 8,
  },
  activeDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  activeRowKey: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  activeRowVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'right',
    maxWidth: '65%',
  },
  markCompletedBtn: {
    height: 46,
    borderRadius: 10,
    backgroundColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  markCompletedBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  // Completed Banner
  completedBanner: {
    backgroundColor: '#D6E8D6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  completedText: {
    color: '#176D34',
    fontSize: 13,
    fontWeight: '800',
  },

  // States
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  retry: {
    color: '#B91C1C',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 6,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    gap: 10,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyCheckCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyCheckText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  emptyTitle: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});

