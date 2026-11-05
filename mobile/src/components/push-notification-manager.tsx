import Constants, { AppOwnership } from 'expo-constants';
import * as Device from 'expo-device';
import type { NotificationResponse, Subscription } from 'expo-notifications';
import { type Href, router } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';

import { useAuth, type WorkerProfile } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import { registerPushDevice } from '@/lib/push-device-api';

const ANDROID_CHANNEL_ID = 'agriverse-updates';
type NotificationsModule = typeof import('expo-notifications');

let notificationsModulePromise: Promise<NotificationsModule> | null = null;

function isExpoGo() {
  return Constants.appOwnership === AppOwnership.Expo;
}

async function loadNotificationsModule() {
  if (isExpoGo()) return null;

  notificationsModulePromise ??= import('expo-notifications').then((notifications) => {
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    return notifications;
  });
  return notificationsModulePromise;
}

async function configureAndroidChannel(notifications: NotificationsModule) {
  await notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'AgriVerse updates',
    description: 'Task, delivery, order, and account updates',
    importance: notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
    lightColor: '#237C31',
    sound: 'default',
  });
}

async function registerNativeFcmToken(notifications: NotificationsModule) {
  await configureAndroidChannel(notifications);
  const currentPermission = await notifications.getPermissionsAsync();
  const permission = currentPermission.granted
    ? currentPermission
    : await notifications.requestPermissionsAsync();
  if (!permission.granted) return;

  const nativeToken = await notifications.getDevicePushTokenAsync();
  if (nativeToken.type !== 'android' || typeof nativeToken.data !== 'string') return;
  await registerPushDevice(nativeToken.data, Device.deviceName || null);
}

function notificationDestination(
  profile: WorkerProfile,
  data: Record<string, unknown>,
): Href {
  const entityType = typeof data.entityType === 'string' ? data.entityType : null;
  const entityId = typeof data.entityId === 'string' ? data.entityId : null;

  if (profile.role === 'buyer' && entityType === 'order' && entityId) {
    return { pathname: '/BuyerOrderTracking', params: { id: entityId } } as Href;
  }
  if (profile.worker_category === 'driver' && entityType === 'order') {
    return '/DriverTaskDashboard' as Href;
  }
  if (profile.role === 'farm_worker' && entityType === 'task') {
    return '/WorkerTaskPending' as Href;
  }
  return profile.role === 'buyer'
    ? '/BuyerNotifications' as Href
    : '/Notifications' as Href;
}

async function openNotification(
  response: NotificationResponse,
  profile: WorkerProfile,
) {
  const data = response.notification.request.content.data || {};
  const notificationId = Number(data.notificationId);
  if (Number.isSafeInteger(notificationId) && notificationId > 0) {
    apiRequest(`/api/notifications/${notificationId}/read`, { method: 'PATCH' }).catch(() => {});
  }
  router.push(notificationDestination(profile, data));
}

export function PushNotificationManager() {
  const { profile } = useAuth();

  const handleResponse = useCallback((response: NotificationResponse) => {
    if (!profile) return;
    void openNotification(response, profile);
    void loadNotificationsModule().then((notifications) => (
      notifications?.clearLastNotificationResponseAsync()
    ));
  }, [profile]);

  useEffect(() => {
    if (!profile?.onboarding_completed_at || Platform.OS !== 'android' || isExpoGo()) return;

    let cancelled = false;
    let tokenSubscription: Subscription | undefined;
    let responseSubscription: Subscription | undefined;

    void loadNotificationsModule().then(async (notifications) => {
      if (!notifications || cancelled) return;

      try {
        await registerNativeFcmToken(notifications);
      } catch (error) {
        console.warn('Firebase push registration failed:', error);
      }
      if (cancelled) return;

      tokenSubscription = notifications.addPushTokenListener((nativeToken) => {
        if (nativeToken.type !== 'android' || typeof nativeToken.data !== 'string') return;
        registerPushDevice(nativeToken.data, Device.deviceName || null).catch((error) => {
          console.warn('Firebase push token refresh failed:', error);
        });
      });
      responseSubscription = notifications.addNotificationResponseReceivedListener(handleResponse);

      notifications.getLastNotificationResponseAsync().then((lastResponse) => {
        if (!lastResponse) return;
        handleResponse(lastResponse);
      }).catch(() => {});
    }).catch((error) => {
      console.warn('Firebase notifications could not be initialized:', error);
    });

    return () => {
      cancelled = true;
      tokenSubscription?.remove();
      responseSubscription?.remove();
    };
  }, [handleResponse, profile?.onboarding_completed_at]);

  return null;
}
