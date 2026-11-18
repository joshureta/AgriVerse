import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { AppState } from 'react-native';

// Reassignment happens in the admin app, so a mounted worker screen must
// fetch its current assignments again when it becomes visible.
export function useWorkerTaskRefresh(
  load: (refresh?: boolean, silent?: boolean) => Promise<void>,
  workerId?: string,
) {
  useFocusEffect(useCallback(() => {
    if (!workerId) return;

    void load();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load(false, true);
    });
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') void load(false, true);
    }, 60_000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [load, workerId]));
}
