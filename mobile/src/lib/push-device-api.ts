import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiRequest } from './api';

const PUSH_TOKEN_STORAGE_KEY = 'agriverse:fcm-device-token';

export async function registerPushDevice(token: string, deviceName: string | null) {
  await apiRequest('/api/push/devices', {
    method: 'POST',
    body: JSON.stringify({
      token,
      platform: 'android',
      provider: 'fcm',
      device_name: deviceName,
    }),
  });
  await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
}

export async function unregisterStoredPushDevice() {
  const token = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
  if (!token) return;

  try {
    await apiRequest('/api/push/devices', {
      method: 'DELETE',
      body: JSON.stringify({ token }),
    });
  } finally {
    await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
  }
}
