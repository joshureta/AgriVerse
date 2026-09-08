import { Platform, StyleSheet } from 'react-native';

export const GREEN = '#176D34';
export const GREEN_DARK = '#125829';
export const BG_COLOR = '#F8FAEF';

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
    gap: 12,
  },

  // Header Row: Title & Close Button
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

  // Badges Row
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 9999,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusBadgeText: {
    color: '#166534',
    fontSize: 11.5,
    fontWeight: '800',
  },
  orderBadge: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 9999,
  },
  orderBadgeText: {
    color: '#475569',
    fontSize: 11.5,
    fontWeight: '800',
  },

  // Consolidated Delivery Information Card
  deliveryInfoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoColLeft: {
    flex: 1,
    paddingRight: 8,
  },
  infoColRight: {
    alignItems: 'flex-end',
  },
  fieldKicker: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  receiverName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  phoneNumber: {
    fontSize: 12.5,
    fontWeight: '700',
    color: GREEN,
    marginTop: 1,
  },
  addressDivider: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
  },
  addressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 16,
    marginTop: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 2,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  metaChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#334155',
  },

  // Photo Proof Section
  photoSection: {
    marginTop: 2,
  },
  photoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  photoProofKicker: {
    fontSize: 11,
    fontWeight: '800',
    color: GREEN,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  photoRequiredTag: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  photoRequiredText: {
    color: '#166534',
    fontSize: 9.5,
    fontWeight: '800',
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
    height: 165,
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
  photoAttachedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(23, 109, 52, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  photoAttachedBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  photoButtonsOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  photoActionButton: {
    flex: 1,
    maxWidth: 120,
    height: 34,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  photoActionButtonPressed: {
    backgroundColor: '#F8FAFC',
    opacity: 0.9,
  },
  changeButtonText: {
    color: '#166534',
    fontSize: 12.5,
    fontWeight: '700',
  },
  removeButtonText: {
    color: '#7F1D1D',
    fontSize: 12.5,
    fontWeight: '700',
  },

  // Photo Empty Dropzone
  photoEmptyDropzone: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  photoEmptyDropzonePressed: {
    opacity: 0.85,
  },
  photoEmptyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmptyPrompt: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  photoEmptySelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: GREEN,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  photoEmptySelectButtonText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },

  // Notes Section
  notesSection: {
    marginTop: 2,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 5,
  },
  notesInput: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 60,
    maxHeight: 85,
    fontSize: 12.5,
    lineHeight: 17,
    color: '#1E293B',
  },

  // Submit Button
  submitButton: {
    width: '100%',
    height: 46,
    borderRadius: 12,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 14,
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
