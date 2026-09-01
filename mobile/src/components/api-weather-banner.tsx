import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  DimensionValue,
  Image,
  ImageSourcePropType,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { DailyForecastItem, WeatherCondition, WeatherSnapshot } from '@/lib/weather';
import { styles } from '@/styles/components/api-weather-banner.styles';

/* -------------------------------------------------------------------------- */
/*                       VECTOR SVG ICONS FROM PROTOTYPE                      */
/* -------------------------------------------------------------------------- */

export function MapPinIcon({ size = 13, color = '#143A1E' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"
        fill={color}
      />
    </Svg>
  );
}

export function CalendarIcon({ size = 13, color = '#4B6354' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"
        fill={color}
      />
    </Svg>
  );
}

export function WeatherVectorIcon({
  condition,
  isNight = false,
  size = 20,
}: {
  condition: WeatherCondition;
  isNight?: boolean;
  size?: number;
}) {
  // Clear Night: Crescent Moon
  if (isNight && (condition === 'sunny' || condition === 'cloudy' || condition === 'overcast')) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12.3 2a10 10 0 0 0-.19 20 10.04 10.04 0 0 0 9.77-7.82 1 1 0 0 0-1.17-1.18 8 8 0 1 1-9.6-9.6 1 1 0 0 0-1.18-1.17A9.87 9.87 0 0 0 12.3 2z"
          fill="#C7D2FE"
        />
      </Svg>
    );
  }

  // Sunny: Radiant Sun
  if (condition === 'sunny') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 0 0 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"
          fill="#F59E0B"
        />
      </Svg>
    );
  }

  // Rainy: Cloud with Raindrops
  if (condition === 'rainy' || condition === 'snowy') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"
          fill="#64748B"
        />
        <Path
          d="M7 21a1 1 0 0 1-.89-1.45l2-4a1 1 0 1 1 1.78.89l-2 4A1 1 0 0 1 7 21zm5 0a1 1 0 0 1-.89-1.45l2-4a1 1 0 1 1 1.78.89l-2 4A1 1 0 0 1 12 21zm5 0a1 1 0 0 1-.89-1.45l2-4a1 1 0 1 1 1.78.89l-2 4A1 1 0 0 1 17 21z"
          fill="#0284C7"
        />
      </Svg>
    );
  }

  // Thunderstorm: Dark Cloud + Lightning Bolt
  if (condition === 'stormy') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M19.35 9.04C18.67 5.59 15.64 3 12 3 9.11 3 6.6 4.64 5.35 7.04 2.34 7.36 0 9.91 0 13c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"
          fill="#475569"
        />
        <Path d="M12.5 13H9l3-6h-2l-1 5h2.5l-2 7 5-6z" fill="#FBBF24" />
      </Svg>
    );
  }

  // Cloudy / Overcast
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"
        fill="#94A3B8"
      />
    </Svg>
  );
}

/* -------------------------------------------------------------------------- */
/*                 WEATHER THEMES & BANNER BACKGROUND ASSETS                  */
/* -------------------------------------------------------------------------- */

type WeatherTheme = {
  bgImage: ImageSourcePropType;
  borderColor: string;
  textColor: string;
  subTextColor: string;
  locBg: string;
  locTextColor: string;
  dividerColor: string;
  pillBg: string;
  pillTextColor: string;
  forecastBg: string;
  forecastBorder: string;
  forecastHeaderBorder: string;
  forecastTitleColor: string;
  rowBorder: string;
  barBg: string;
  barFillColor: string;
};

function getTheme(condition: WeatherCondition, isNight: boolean): WeatherTheme {
  if (isNight) {
    return {
      bgImage: require('@/assets/images/weather-bg-night.png'),
      borderColor: '#2E1065',
      textColor: '#FFFFFF',
      subTextColor: '#94A3B8',
      locBg: 'rgba(255, 255, 255, 0.16)',
      locTextColor: '#F1F5F9',
      dividerColor: 'rgba(255, 255, 255, 0.18)',
      pillBg: '#EDE9FE',
      pillTextColor: '#6D28D9',
      forecastBg: 'rgba(15, 23, 42, 0.82)',
      forecastBorder: 'rgba(255, 255, 255, 0.16)',
      forecastHeaderBorder: 'rgba(255, 255, 255, 0.16)',
      forecastTitleColor: '#C7D2FE',
      rowBorder: 'rgba(255, 255, 255, 0.1)',
      barBg: 'rgba(255, 255, 255, 0.15)',
      barFillColor: '#38BDF8',
    };
  }

  if (condition === 'sunny') {
    return {
      bgImage: require('@/assets/images/weather-bg-sunny.png'),
      borderColor: '#FDE047',
      textColor: '#0F2D18',
      subTextColor: '#475569',
      locBg: 'rgba(255, 255, 255, 0.85)',
      locTextColor: '#143A1E',
      dividerColor: 'rgba(20, 58, 30, 0.15)',
      pillBg: '#DCFCE7',
      pillTextColor: '#15803D',
      forecastBg: 'rgba(255, 255, 255, 0.82)',
      forecastBorder: 'rgba(255, 255, 255, 0.95)',
      forecastHeaderBorder: 'rgba(20, 58, 30, 0.12)',
      forecastTitleColor: '#164E2A',
      rowBorder: 'rgba(20, 58, 30, 0.08)',
      barBg: 'rgba(20, 58, 30, 0.1)',
      barFillColor: '#22C55E',
    };
  }

  if (condition === 'rainy') {
    return {
      bgImage: require('@/assets/images/weather-bg-rainy.png'),
      borderColor: '#7DD3FC',
      textColor: '#082F49',
      subTextColor: '#0369A1',
      locBg: 'rgba(255, 255, 255, 0.85)',
      locTextColor: '#0369A1',
      dividerColor: 'rgba(8, 47, 73, 0.15)',
      pillBg: '#E0F2FE',
      pillTextColor: '#0284C7',
      forecastBg: 'rgba(255, 255, 255, 0.82)',
      forecastBorder: 'rgba(255, 255, 255, 0.95)',
      forecastHeaderBorder: 'rgba(8, 47, 73, 0.12)',
      forecastTitleColor: '#0369A1',
      rowBorder: 'rgba(8, 47, 73, 0.08)',
      barBg: 'rgba(8, 47, 73, 0.12)',
      barFillColor: '#0284C7',
    };
  }

  if (condition === 'stormy') {
    return {
      bgImage: require('@/assets/images/weather-bg-thunderstorm.png'),
      borderColor: '#334155',
      textColor: '#F8FAFC',
      subTextColor: '#CBD5E1',
      locBg: 'rgba(255, 255, 255, 0.18)',
      locTextColor: '#FFFFFF',
      dividerColor: 'rgba(255, 255, 255, 0.22)',
      pillBg: '#FEE2E2',
      pillTextColor: '#B91C1C',
      forecastBg: 'rgba(15, 23, 42, 0.82)',
      forecastBorder: 'rgba(255, 255, 255, 0.18)',
      forecastHeaderBorder: 'rgba(255, 255, 255, 0.18)',
      forecastTitleColor: '#CBD5E1',
      rowBorder: 'rgba(255, 255, 255, 0.12)',
      barBg: 'rgba(255, 255, 255, 0.18)',
      barFillColor: '#F59E0B',
    };
  }

  // Default: Cloudy / Overcast
  return {
    bgImage: require('@/assets/images/weather-bg-cloudy.png'),
    borderColor: '#CBD5E1',
    textColor: '#0F172A',
    subTextColor: '#334155',
    locBg: 'rgba(255, 255, 255, 0.85)',
    locTextColor: '#0F172A',
    dividerColor: 'rgba(15, 23, 42, 0.15)',
    pillBg: 'rgba(255, 255, 255, 0.85)',
    pillTextColor: '#334155',
    forecastBg: 'rgba(255, 255, 255, 0.82)',
    forecastBorder: 'rgba(255, 255, 255, 0.95)',
    forecastHeaderBorder: 'rgba(15, 23, 42, 0.12)',
    forecastTitleColor: '#334155',
    rowBorder: 'rgba(15, 23, 42, 0.08)',
    barBg: 'rgba(15, 23, 42, 0.1)',
    barFillColor: '#64748B',
  };
}

/* -------------------------------------------------------------------------- */
/*                     MAIN API WEATHER BANNER COMPONENT                      */
/* -------------------------------------------------------------------------- */

export function ApiWeatherBanner({
  weather,
  loading = false,
}: {
  weather: WeatherSnapshot | null;
  loading?: boolean;
}) {
  const currentTemp = weather?.temp ?? 28;
  const highTemp = weather?.highTemp ?? currentTemp + 3;
  const lowTemp = weather?.lowTemp ?? currentTemp - 4;
  const label = weather?.label ?? 'Sunny';
  const condition = weather?.condition ?? 'sunny';
  const locationLabel = weather?.locationLabel ?? 'Silang, Cavite';

  const isNight = useMemo(() => {
    const hours = new Date().getHours();
    return hours < 6 || hours >= 18;
  }, []);

  const theme = useMemo(() => getTheme(condition, isNight), [condition, isNight]);

  const forecastDays: DailyForecastItem[] = useMemo(() => {
    if (weather?.dailyForecast && weather.dailyForecast.length > 0) {
      return weather.dailyForecast.slice(0, 5);
    }
    return [
      { date: '1', day: 'Today', condition, label, lowTemp, highTemp, rainChance: 0 },
      { date: '2', day: 'Tomorrow', condition: 'cloudy', label: 'Partly Cloudy', lowTemp: 24, highTemp: 31, rainChance: 20 },
      { date: '3', day: 'Thu', condition: 'sunny', label: 'Sunny', lowTemp: 25, highTemp: 33, rainChance: 0 },
      { date: '4', day: 'Fri', condition: 'cloudy', label: 'Partly Cloudy', lowTemp: 24, highTemp: 32, rainChance: 10 },
      { date: '5', day: 'Sat', condition: 'sunny', label: 'Sunny', lowTemp: 25, highTemp: 34, rainChance: 0 },
    ];
  }, [condition, highTemp, label, lowTemp, weather?.dailyForecast]);

  if (loading && !weather) {
    return (
      <View
        style={[
          styles.card,
          {
            borderColor: theme.borderColor,
            alignItems: 'center',
            justifyContent: 'center',
            height: 220,
          },
        ]}>
        <Image source={theme.bgImage} style={styles.backgroundImage} resizeMode="cover" />
        <ActivityIndicator color={theme.textColor} size="small" />
        <Text style={{ fontSize: 12, color: theme.subTextColor, marginTop: 8, fontWeight: '600' }}>
          Loading weather data...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderColor: theme.borderColor }]}>
      {/* Background Weather Image */}
      <Image source={theme.bgImage} style={styles.backgroundImage} resizeMode="cover" />

      <View style={styles.cardInner}>
        {/* Top Location & Vector Weather Icon */}
        <View style={styles.topRow}>
          <View style={[styles.locationBadge, { backgroundColor: theme.locBg }]}>
            <MapPinIcon size={13} color={theme.locTextColor} />
            <Text numberOfLines={1} style={[styles.locationText, { color: theme.locTextColor }]}>
              {locationLabel}
            </Text>
          </View>
          <View style={styles.weatherArtWrapper}>
            <WeatherVectorIcon condition={condition} isNight={isNight} size={30} />
          </View>
        </View>

        {/* Main Temperature & High/Low */}
        <View style={styles.tempRow}>
          <Text style={[styles.mainTempText, { color: theme.textColor }]}>
            {currentTemp > 0 ? `+${currentTemp}` : currentTemp}°C
          </Text>
          <View style={styles.hlStack}>
            <Text style={[styles.hlLabel, { color: theme.subTextColor }]}>
              H: <Text style={[styles.hlValue, { color: theme.textColor }]}>{highTemp}°C</Text>
            </Text>
            <Text style={[styles.hlLabel, { color: theme.subTextColor }]}>
              L: <Text style={[styles.hlValue, { color: theme.textColor }]}>{lowTemp}°C</Text>
            </Text>
          </View>
          <View style={[styles.conditionPill, { backgroundColor: theme.pillBg }]}>
            <Text style={[styles.conditionPillText, { color: theme.pillTextColor }]}>{label}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: theme.dividerColor }]} />

        {/* 5-Day Forecast Section (Scrollable, Clean Header) */}
        <View
          style={[
            styles.forecastSection,
            { backgroundColor: theme.forecastBg, borderColor: theme.forecastBorder },
          ]}>
          {/* Header (No Scrollable text) */}
          <View style={[styles.forecastHeader, { borderColor: theme.forecastHeaderBorder }]}>
            <View style={styles.forecastTitleRow}>
              <CalendarIcon size={13} color={theme.forecastTitleColor} />
              <Text style={[styles.forecastTitleText, { color: theme.forecastTitleColor }]}>
                5-Day Forecast
              </Text>
            </View>
          </View>

          {/* Scrollable 5-Day List */}
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            style={styles.forecastScrollList}
            contentContainerStyle={styles.forecastScrollContent}>
            {forecastDays.map((item, idx) => {
              const hasRain = (item.rainChance ?? 0) > 0;
              const barWidthPercent: DimensionValue = `${Math.min(
                100,
                Math.max(30, ((item.highTemp - item.lowTemp) / 15) * 100)
              )}%`;

              return (
                <View
                  key={idx}
                  style={[
                    styles.forecastRow,
                    {
                      borderColor: theme.rowBorder,
                      borderBottomWidth: idx === forecastDays.length - 1 ? 0 : 1,
                    },
                  ]}>
                  {/* Day */}
                  <Text style={[styles.dayCol, { color: theme.textColor }]}>{item.day}</Text>

                  {/* Vector Icon + Rain Chance */}
                  <View style={styles.iconCol}>
                    <WeatherVectorIcon condition={item.condition} size={15} />
                    {hasRain ? (
                      <Text
                        style={[
                          styles.rainChanceText,
                          { color: isNight ? '#38BDF8' : '#0284C7' },
                        ]}>
                        {item.rainChance}%
                      </Text>
                    ) : null}
                  </View>

                  {/* Low Temp */}
                  <Text style={[styles.tempLow, { color: theme.subTextColor }]}>
                    {item.lowTemp}°
                  </Text>

                  {/* Temperature Range Bar */}
                  <View style={[styles.tempBarWrap, { backgroundColor: theme.barBg }]}>
                    <View
                      style={[
                        styles.tempBarFill,
                        {
                          width: barWidthPercent,
                          backgroundColor: theme.barFillColor,
                        },
                      ]}
                    />
                  </View>

                  {/* High Temp */}
                  <Text style={[styles.tempHigh, { color: theme.textColor }]}>
                    {item.highTemp}°
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}
