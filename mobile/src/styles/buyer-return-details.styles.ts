import { StyleSheet } from 'react-native';

export const GREEN = '#176D34';
export const DARK_GREEN = '#10351D';
export const SAGE_BG = '#EDF5EB';
export const SAGE_BORDER = '#D8E5D5';
export const CARD_BORDER = '#E3EBE4';
export const TEXT_MUTED = '#637567';
export const GOLD = '#B8860B';
export const GOLD_BG = '#FDF3DF';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F7F1',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 28,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  backText: {
    fontSize: 12,
    fontWeight: '800',
    color: TEXT_MUTED,
  },

  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    shadowColor: '#0B2E16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  eyebrow: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: TEXT_MUTED,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  meta: {
    marginTop: 4,
    fontSize: 11,
    color: TEXT_MUTED,
    lineHeight: 15,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusPillOpen: { backgroundColor: GOLD_BG },
  statusPillResolved: { backgroundColor: SAGE_BG },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotOpen: { backgroundColor: GOLD },
  statusDotResolved: { backgroundColor: GREEN },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  statusPillTextOpen: { color: GOLD },
  statusPillTextResolved: { color: GREEN },

  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  step: { flex: 1, alignItems: 'center' },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  stepDotDone: { backgroundColor: GREEN },
  stepDotPending: { backgroundColor: '#E5EDE7', borderWidth: 1, borderColor: CARD_BORDER },
  stepDotText: { fontSize: 10, fontWeight: '800', color: TEXT_MUTED },
  stepLabel: { fontSize: 9.5, fontWeight: '700', color: DARK_GREEN, textAlign: 'center' },
  stepLabelPending: { color: TEXT_MUTED },
  stepLine: { position: 'absolute', top: 11, left: '50%', right: '-50%', height: 2, backgroundColor: CARD_BORDER, zIndex: -1 },
  stepLineDone: { backgroundColor: GREEN },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: DARK_GREEN },
  sectionSub: { fontSize: 10.5, color: TEXT_MUTED, fontWeight: '600' },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: CARD_BORDER,
  },
  itemRowFirst: { borderTopWidth: 0 },
  itemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: SAGE_BG,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemImage: { width: 26, height: 26, resizeMode: 'contain' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 12, fontWeight: '800', color: DARK_GREEN },
  itemMeta: { fontSize: 10, color: TEXT_MUTED, marginTop: 1 },
  itemSubtotal: { fontSize: 12, fontWeight: '800', color: DARK_GREEN },

  claimTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1.5,
    borderTopColor: CARD_BORDER,
  },
  claimLabel: { fontSize: 9.5, color: TEXT_MUTED, fontWeight: '700', textTransform: 'uppercase' },
  claimValue: { fontSize: 13, fontWeight: '800', color: DARK_GREEN, marginTop: 2 },
  claimValueRight: { fontSize: 15, fontWeight: '800', color: GREEN, marginTop: 2 },

  advisory: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: GOLD_BG,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  advisoryTitle: { fontSize: 11.5, fontWeight: '800', color: GOLD, marginBottom: 2 },
  advisoryText: { fontSize: 10.5, color: '#8a640c', lineHeight: 15 },

  photoStrip: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  photoThumb: { width: 68, height: 68, borderRadius: 12, borderWidth: 1, borderColor: CARD_BORDER },
  photoThumbZoom: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoThumbZoomText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  emptyPhotosText: { fontSize: 11, color: TEXT_MUTED, fontStyle: 'italic' },

  descriptionWrap: { marginTop: 14 },
  descriptionLabel: { fontSize: 9.5, fontWeight: '800', color: TEXT_MUTED, textTransform: 'uppercase', marginBottom: 6 },
  descriptionQuote: {
    fontSize: 12,
    color: '#33402f',
    lineHeight: 17.5,
    fontStyle: 'italic',
    borderLeftWidth: 2,
    borderLeftColor: SAGE_BORDER,
    paddingLeft: 10,
  },

  actionRow: { gap: 10, marginTop: 4 },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 44,
    borderRadius: 24,
    backgroundColor: GREEN,
  },
  contactButtonText: { color: '#ffffff', fontSize: 12.5, fontWeight: '800' },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: CARD_BORDER,
    backgroundColor: '#FAFCF9',
  },
  backButtonText: { fontSize: 12.5, fontWeight: '800', color: '#556658' },

  loadError: { color: '#a33d35', fontSize: 12, textAlign: 'center', marginTop: 24 },

  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 14, 7, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  lightboxImage: { width: '100%', height: '70%', borderRadius: 12 },
  lightboxClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxCloseText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
});
