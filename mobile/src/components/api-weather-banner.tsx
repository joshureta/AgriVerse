import React, { useMemo } from 'react';
import { ActivityIndicator, DimensionValue, Text, View } from 'react-native';

import { WeatherSnapshot, WEATHER_ICONS } from '@/lib/weather';
import { styles } from '@/styles/components/api-weather-banner.styles';

function formatTime(isoString?: string | null, fallback = '6:00 am'): string {
  if (!isoString) return fallback;
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return fallback;
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const h = hours % 12 || 12;
    const m = minutes < 10 ? '0' + minutes : minutes;
    return h + ':' + m + ' ' + ampm;
  } catch {
    return fallback;
  }
}

function parseTimeToMinutes(isoString?: string | null, fallbackMinutes = 360): number {
  if (!isoString) return fallbackMinutes;
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return fallbackMinutes;
    return d.getHours() * 60 + d.getMinutes();
  } catch {
    return fallbackMinutes;
  }
}

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
  const humidity = weather?.humidity ?? 65;
  const precipitation = weather?.precipitation != null ? weather.precipitation.toFixed(1) : '0.0';
  const pressure = weather?.pressure ?? 1012;
  const windSpeed = weather?.windSpeed ?? 14;

  const sunriseLabel = formatTime(weather?.sunrise, '5:25 am');
  const sunsetLabel = formatTime(weather?.sunset, '6:18 pm');

  const { leftPercent, topOffset, isDayTime } = useMemo(() => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const srMinutes = parseTimeToMinutes(weather?.sunrise, 5 * 60 + 25);
    const ssMinutes = parseTimeToMinutes(weather?.sunset, 18 * 60 + 18);

    let progress = 0.5;
    let isDay = true;

    if (nowMinutes <= srMinutes) {
      progress = 0.05;
      isDay = false;
    } else if (nowMinutes >= ssMinutes) {
      progress = 0.95;
      isDay = false;
    } else {
      progress = (nowMinutes - srMinutes) / (ssMinutes - srMinutes);
      progress = Math.max(0.06, Math.min(0.94, progress));
      isDay = true;
    }

    const yFactor = 4 * progress * (1 - progress);
    const top = Math.round((1 - yFactor) * 20 + 2);

    return {
      leftPercent: Math.round(progress * 100) + '%',
      topOffset: top,
      isDayTime: isDay,
    };
  }, [weather?.sunrise, weather?.sunset]);

  const weatherIcon = useMemo(() => {
    if (!isDayTime && (condition === 'sunny' || condition === 'cloudy')) {
      return '🌙';
    }
    return WEATHER_ICONS[condition] || '☀️';
  }, [condition, isDayTime]);

  if (loading && !weather) {
    return (
      <View style={[styles.card, { alignItems: 'center', justifyContent: 'center', height: 210 }]}>
        <ActivityIndicator color="#176D34" size="small" />
        <Text style={{ fontSize: 12, color: '#64748B', marginTop: 8, fontWeight: '600' }}>
          Loading weather data...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.locationBadge}>
          <Text style={styles.locationPin}>📍</Text>
          <Text numberOfLines={1} style={styles.locationText}>
            {locationLabel}
          </Text>
        </View>
        <Text style={styles.weatherArtText}>{weatherIcon}</Text>
      </View>

      <View style={styles.tempRow}>
        <Text style={styles.mainTempText}>
          {currentTemp > 0 ? '+' + currentTemp : currentTemp}°C
        </Text>
        <View style={styles.hlStack}>
          <Text style={styles.hlLabel}>
            H: <Text style={styles.hlValue}>{highTemp}°C</Text>
          </Text>
          <Text style={styles.hlLabel}>
            L: <Text style={styles.hlValue}>{lowTemp}°C</Text>
          </Text>
        </View>
        <View style={styles.conditionPill}>
          <Text style={styles.conditionPillText}>{label}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.metricsGrid}>
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>Humidity</Text>
          <Text style={styles.metricValue}>{humidity}%</Text>
        </View>
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>Precipitation</Text>
          <Text style={styles.metricValue}>{precipitation}mm</Text>
        </View>
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>Pressure</Text>
          <Text style={styles.metricValue}>{pressure}hPa</Text>
        </View>
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>Wind</Text>
          <Text style={styles.metricValue}>{windSpeed}km/h</Text>
        </View>
      </View>

      <View style={styles.solarArcSection}>
        <View style={styles.solarHeaderRow}>
          <View>
            <Text style={styles.solarTimeBadge}>{sunriseLabel}</Text>
            <Text style={styles.solarSublabel}>Sunrise</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.solarTimeBadge}>{sunsetLabel}</Text>
            <Text style={styles.solarSublabel}>Sunset</Text>
          </View>
        </View>

        <View style={styles.arcTrackWrap}>
          <View style={styles.arcCurve} />
          <View
            style={[
              styles.sunPointerDot,
              {
                left: leftPercent as DimensionValue,
                top: topOffset,
                transform: [{ translateX: -11 }],
              },
            ]}>
            <Text style={styles.sunIcon}>{isDayTime ? '☀️' : '🌙'}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
