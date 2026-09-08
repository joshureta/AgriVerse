import { Platform, StyleSheet } from 'react-native';

export const GREEN = '#176D34';
export const GREEN_DARK = '#125829';

export const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },

  // Dimmed Backdrop (No heavy blur)
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  backdropPressable: {
    flex: 1,
  },

  // Slide-Up Bottom Sheet Panel
  bottomSheet: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 16,
    maxHeight: '92%',
  },

  sheetContent: {
    gap: 13,
  },

  // Header Row: Title & Close
  sheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPressed: {
    backgroundColor: '#E2E8F0',
  },
  closeButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '800',
  },

  // Category & Location Badges
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: '#ECFDF5',
  },
  categoryBadgeHarvesting: {
    backgroundColor: '#FEF3C7',
  },
  categoryBadgeText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '700',
  },
  categoryBadgeTextHarvesting: {
    color: '#78350F',
    fontSize: 13,
    fontWeight: '700',
  },
  fieldBadge: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 9999,
  },
  fieldBadgeText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },

  // Objective Box (Standard Non-Harvesting Tasks)
  standardObjectiveBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  standardObjectiveLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  standardObjectiveText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 17,
  },

  // 2x2 Harvest Counts Grid (Exact match to uploaded design)
  harvestGrid: {
    gap: 10,
    marginTop: 2,
    marginBottom: 2,
  },
  harvestGridRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  harvestGridItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  harvestItemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  harvestItemInput: {
    width: 68,
    height: 40,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    padding: 0,
  },

  // Photo Proof Section
  photoSection: {
    marginTop: 2,
  },
  photoProofKicker: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#176D34',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  photoProofContainer: {
    borderWidth: 1.2,
    borderColor: '#86EFAC',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 6,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  photoImageWrapper: {
    width: '100%',
    height: 175,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoButtonsOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  photoActionButton: {
    flex: 1,
    maxWidth: 130,
    height: 38,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  photoActionButtonPressed: {
    backgroundColor: '#F8FAFC',
    opacity: 0.9,
  },
  changeButtonText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '700',
  },
  removeButtonText: {
    color: '#7F1D1D',
    fontSize: 14,
    fontWeight: '700',
  },

  // Photo Empty Dropzone
  photoEmptyDropzone: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  photoEmptyDropzonePressed: {
    opacity: 0.85,
  },
  photoEmptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmptyPrompt: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  photoEmptySelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: GREEN,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  photoEmptySelectButtonText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },

  // Insights Section
  insightsSection: {
    marginTop: 2,
  },
  insightsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  insightsInput: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 65,
    maxHeight: 90,
    fontSize: 13,
    lineHeight: 18,
    color: '#1E293B',
  },

  // Submit Button
  submitButton: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Loading & Error States
  loadingCard: {
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    padding: 36,
    borderRadius: 24,
    marginHorizontal: 20,
    marginBottom: 30,
  },
  loadingText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 30,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 2,
  },
  backText: { color: GREEN, fontSize: 13, fontWeight: '800', marginTop: 10 },
});
