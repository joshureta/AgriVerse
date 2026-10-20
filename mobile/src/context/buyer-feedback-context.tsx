import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NotificationToast } from '@/components/notification-toast';
import { useAuth } from '@/context/auth-context';
import { loadNotifications } from '@/lib/notifications';

type Toast = { id: number; title: string; body: string; actionLabel?: string; onPress?: () => void };
type ToastInput = Omit<Toast, 'id'>;
type ToastState = { ownerId: string | null; current: Toast | null; queue: Toast[] };
type FeedbackContextValue = {
  unreadNotifications: number;
  showToast: (toast: ToastInput) => void;
  syncUnreadNotifications: (count: number) => void;
};

const POLL_INTERVAL_MS = 20000;
const BuyerFeedbackContext = createContext<FeedbackContextValue | null>(null);

export function BuyerFeedbackProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [badge, setBadge] = useState({ ownerId: null as string | null, count: 0 });
  const [toasts, setToasts] = useState<ToastState>({ ownerId: null, current: null, queue: [] });
  const nextToastId = useRef(0);
  const isBuyer = profile?.role === 'buyer';
  const buyerId = isBuyer ? profile.id : null;
  const unreadNotifications = badge.ownerId === buyerId ? badge.count : 0;
  const current = toasts.ownerId === buyerId ? toasts.current : null;

  const showToast = useCallback((toast: ToastInput) => {
    if (!buyerId) return;
    const item = { ...toast, id: ++nextToastId.current };
    setToasts((state) => {
      if (state.ownerId !== buyerId) return { ownerId: buyerId, current: item, queue: [] };
      return state.current
        ? { ...state, queue: [...state.queue, item] }
        : { ...state, current: item };
    });
  }, [buyerId]);
  const syncUnreadNotifications = useCallback((count: number) => {
    if (buyerId) setBadge({ ownerId: buyerId, count });
  }, [buyerId]);
  const advanceToast = useCallback(() => {
    setToasts((state) => ({ ...state, current: state.queue[0] || null, queue: state.queue.slice(1) }));
  }, []);

  useEffect(() => {
    if (!buyerId) return;
    let cancelled = false;
    let seenNotificationIds: Set<number> | null = null;

    async function poll() {
      try {
        const result = await loadNotifications();
        if (cancelled) return;
        syncUnreadNotifications(result.unread_count || 0);
        const list = result.notifications || [];
        const previousSeenIds = seenNotificationIds;
        if (previousSeenIds) {
          list.filter((item) => !previousSeenIds.has(item.id)).sort((a, b) => a.id - b.id).forEach((item) => {
            showToast({
              title: item.title,
              body: item.body,
              onPress: () => router.push('/BuyerNotifications' as never),
            });
          });
        }
        seenNotificationIds = new Set(list.map((item) => item.id));
      } catch {
        // Keep the previous badge and retry on the next poll.
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [buyerId, showToast, syncUnreadNotifications]);

  const value = useMemo(
    () => ({ unreadNotifications, showToast, syncUnreadNotifications }),
    [unreadNotifications, showToast, syncUnreadNotifications],
  );

  return (
    <BuyerFeedbackContext.Provider value={value}>
      {children}
      {buyerId ? (
        <NotificationToast
          insetsTop={insets.top}
          item={current}
          onHide={advanceToast}
          onPress={() => {
            const action = current?.onPress;
            advanceToast();
            action?.();
          }}
        />
      ) : null}
    </BuyerFeedbackContext.Provider>
  );
}

export function useBuyerFeedback() {
  const context = useContext(BuyerFeedbackContext);
  if (!context) throw new Error('BuyerFeedbackProvider is required');
  return context;
}
