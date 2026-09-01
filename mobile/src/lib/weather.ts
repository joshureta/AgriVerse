import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiRequest } from './api';

const WEATHER_CACHE_KEY = 'agriverseWeatherSnapshot';

export type WeatherCondition =
  | 'sunny'
  | 'cloudy'
  | 'overcast'
  | 'foggy'
  | 'rainy'
  | 'snowy'
  | 'stormy';

export type WeatherSnapshot = {
  condition: WeatherCondition;
  label: string;
  temp: number;
  highTemp?: number;
  lowTemp?: number;
  humidity: number;
  precipitation?: number;
  pressure?: number;
  windSpeed: number;
  sunrise?: string | null;
  sunset?: string | null;
  locationLabel: string;
  observedAt: string;
};

export const WEATHER_ICONS: Record<WeatherCondition, string> = {
  sunny: '☀️',
  cloudy: '⛅',
  overcast: '☁️',
  foggy: '🌫️',
  rainy: '🌧️',
  snowy: '❄️',
  stormy: '⛈️',
};

export const DEFAULT_WEATHER_SNAPSHOT: WeatherSnapshot = {
  condition: 'sunny',
  label: 'Sunny',
  temp: 28,
  highTemp: 32,
  lowTemp: 24,
  humidity: 65,
  precipitation: 0.0,
  pressure: 1012,
  windSpeed: 14,
  sunrise: null,
  sunset: null,
  locationLabel: 'Silang, Cavite',
  observedAt: new Date().toISOString(),
};

async function readCachedWeather(): Promise<WeatherSnapshot | null> {
  try {
    const stored = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
    return stored ? (JSON.parse(stored) as WeatherSnapshot) : null;
  } catch {
    return null;
  }
}

async function writeCachedWeather(snapshot: WeatherSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Non-fatal: the widget just won't have a cached fallback next time.
  }
}

export async function loadWeather(): Promise<WeatherSnapshot | null> {
  try {
    const snapshot = await apiRequest<WeatherSnapshot>('/api/weather/current');
    await writeCachedWeather(snapshot);
    return snapshot;
  } catch {
    const cached = await readCachedWeather();
    return cached || DEFAULT_WEATHER_SNAPSHOT;
  }
}

