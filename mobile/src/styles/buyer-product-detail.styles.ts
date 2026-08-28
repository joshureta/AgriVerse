import { StyleSheet } from 'react-native';

export const GREEN = '#176D34';
export const DARK_GREEN = '#123A20';

export const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F8F2' },
  scrollContent: { paddingBottom: 8 },

  hero: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F1E4',
  },
  heroEmoji: { fontSize: 150 },

  sheet: {
    marginTop: -22,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 22,
  },

  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  productName: { fontSize: 24, fontWeight: '800', color: DARK_GREEN },
  weightRange: { fontSize: 13, fontWeight: '700', color: '#5E6B60', marginTop: 4 },
  subtitle: { fontSize: 12.5, color: '#7C897E', marginTop: 4 },

  sizeLabel: { fontSize: 12, fontWeight: '800', color: DARK_GREEN, marginTop: 18, marginBottom: 8 },
  sizeRow: { flexDirection: 'row', gap: 10 },
  sizePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E1E7DE',
    backgroundColor: '#ffffff',
  },
  sizePillActive: { borderColor: GREEN },
  sizePillTitle: { fontSize: 13, fontWeight: '800', color: '#5E6B60' },
  sizePillTitleActive: { color: GREEN },
  sizePillSubtitle: { fontSize: 9.5, color: '#9AA79C', marginTop: 2 },
  sizePillSubtitleActive: { color: '#5E9A6C' },
  sizePillUnderline: { marginTop: 8, height: 2, width: '60%', borderRadius: 1, backgroundColor: 'transparent' },
  sizePillUnderlineActive: { backgroundColor: GREEN },

  descriptionHeading: { fontSize: 14, fontWeight: '800', color: GREEN, marginTop: 20 },
  descriptionText: { fontSize: 12, color: '#5E6B60', lineHeight: 18, marginTop: 8 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEF2EC',
  },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4EE',
  },
  quantityButtonText: { fontSize: 16, fontWeight: '800', color: DARK_GREEN },
  quantityValue: { fontSize: 14, fontWeight: '800', color: DARK_GREEN, minWidth: 18, textAlign: 'center' },

  priceBlock: { flex: 1 },
  priceLabel: { fontSize: 9.5, color: '#7C897E' },
  priceValue: { fontSize: 17, fontWeight: '900', color: DARK_GREEN },

  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: GREEN,
  },
  addToCartText: { color: '#ffffff', fontSize: 12.5, fontWeight: '800' },
  addToCartPressed: { opacity: 0.85 },

  // Customer reviews
  reviewsTitle: { fontSize: 14, fontWeight: '800', color: GREEN, marginTop: 20 },

  reviewCard: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#EEF2EC' },
  reviewHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewerName: { fontSize: 12.5, fontWeight: '800', color: DARK_GREEN },
  reviewDate: { fontSize: 10, color: '#9AA79C' },
  reviewComment: { fontSize: 11.5, color: '#5E6B60', lineHeight: 17, marginTop: 8 },
});
