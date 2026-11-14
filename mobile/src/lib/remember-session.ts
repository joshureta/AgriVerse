import AsyncStorage from '@react-native-async-storage/async-storage';

const preferenceKey = 'agriverse-remember-session';
const currentSession = new Map<string, string>();
const authKeys = new Set<string>();

let rememberSession = true;
let preferenceLoaded = false;
let preferenceLoading: Promise<void> | null = null;

function loadPreference(): Promise<void> {
  if (preferenceLoaded) return Promise.resolve();
  if (!preferenceLoading) {
    preferenceLoading = AsyncStorage.getItem(preferenceKey)
      .then((value) => {
        rememberSession = value !== 'false';
        preferenceLoaded = true;
      })
      .finally(() => { preferenceLoading = null; });
  }
  return preferenceLoading;
}

export async function setRememberSession(remember: boolean) {
  await loadPreference();
  if (rememberSession !== remember) currentSession.clear();
  rememberSession = remember;
  await AsyncStorage.setItem(preferenceKey, String(remember));
  if (!remember) {
    await Promise.all([...authKeys].map((key) => AsyncStorage.removeItem(key)));
  }
}

export const rememberSessionStorage = {
  async getItem(key: string) {
    authKeys.add(key);
    await loadPreference();
    return rememberSession ? AsyncStorage.getItem(key) : currentSession.get(key) ?? null;
  },
  async setItem(key: string, value: string) {
    authKeys.add(key);
    await loadPreference();
    if (rememberSession) await AsyncStorage.setItem(key, value);
    else currentSession.set(key, value);
  },
  async removeItem(key: string) {
    currentSession.delete(key);
    await AsyncStorage.removeItem(key);
  },
};
