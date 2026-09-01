import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiRequest } from './api';

const WEATHER_CACHE_KEY = 'agriverseWeatherSnapshot';

export type WeatherCondition = 'sunny' | 'cloudy' | 'overcast' | 'foggy' | 'rainy' | 'snowy' | 'stormy';

export type WeatherSnapshot = {
  condition: WeatherCondition;
  label: string;
  temp: number;
  humidity: number;
  windSpeed: number;
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
    return readCachedWeather();
  }
}
