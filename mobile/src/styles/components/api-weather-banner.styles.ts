import { StyleSheet } from 'react-native';

export const GREEN = '#176D34';
export const DARK_GREEN = '#143A1E';

export const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  cardFlushTop: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  cardInner: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  locationText: {
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  weatherArtWrapper: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  mainTempText: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 44,
  },
  hlStack: {
    justifyContent: 'center',
    gap: 1,
  },
  hlLabel: {
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.85,
  },
  hlValue: {
    fontWeight: '800',
  },
  conditionPill: {
    marginLeft: 'auto',
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  conditionPillText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },

  // 5-Day Forecast Container
  forecastSection: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    borderWidth: 1,
  },
  forecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
  },
  forecastTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  forecastTitleText: {
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  forecastViewAll: {
    color: '#C8EBFF',
    fontSize: 10,
    fontWeight: '800',
  },
  forecastScrollList: {
    maxHeight: 132,
  },
  forecastScrollContent: {
    paddingRight: 4,
  },
  forecastDay: {
    width: 82,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
  forecastDayDivider: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.14)',
  },
  forecastDayLabel: {
    width: '100%',
    color: '#F4F8FC',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  forecastIconCircle: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  dayCol: {
    width: 68,
    fontWeight: '800',
    fontSize: 12,
  },
  iconCol: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  rainChanceText: {
    color: '#1680C5',
    fontSize: 10,
    fontWeight: '800',
  },
  forecastTempRange: {
    color: '#F4F8FC',
    fontSize: 11,
    fontWeight: '800',
  },
  tempLow: {
    width: 26,
    textAlign: 'right',
    fontWeight: '700',
    fontSize: 12,
    opacity: 0.85,
  },
  tempBarWrap: {
    flex: 1,
    height: 5,
    borderRadius: 4,
    marginHorizontal: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  tempBarFill: {
    position: 'absolute',
    height: '100%',
    borderRadius: 4,
  },
  tempHigh: {
    width: 26,
    textAlign: 'left',
    fontWeight: '900',
    fontSize: 12,
  },
});
