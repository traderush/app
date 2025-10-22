import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  TradeNotification,
  TradeNotificationType,
} from '@/shared/types/boxHit';

const FADE_AFTER_MS = 2500;
const REMOVE_AFTER_MS = 3000;

type NotificationTimers = {
  fade: ReturnType<typeof setTimeout>;
  remove: ReturnType<typeof setTimeout>;
};

export interface UseTradeNotificationsResult {
  notifications: TradeNotification[];
  pushNotification: (message: string, type: TradeNotificationType) => void;
  dismissNotification: (id: string) => void;
}

export function useTradeNotifications(limit = 5): UseTradeNotificationsResult {
  const [notifications, setNotifications] = useState<TradeNotification[]>([]);
  const timersRef = useRef<Map<string, NotificationTimers>>(new Map());

  const clearTimers = useCallback((id: string) => {
    const timers = timersRef.current.get(id);
    if (timers) {
      clearTimeout(timers.fade);
      clearTimeout(timers.remove);
      timersRef.current.delete(id);
    }
  }, []);

  const fadeOutNotification = useCallback((id: string) => {
    clearTimers(id);
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? { ...notification, isVisible: false }
          : notification,
      ),
    );

    const removeTimer = setTimeout(() => {
      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== id),
      );
      clearTimers(id);
    }, REMOVE_AFTER_MS - FADE_AFTER_MS);

    const existing = timersRef.current.get(id);
    if (existing) {
      clearTimeout(existing.remove);
      timersRef.current.set(id, { ...existing, remove: removeTimer });
    } else {
      timersRef.current.set(id, {
        fade: setTimeout(() => undefined, 0),
        remove: removeTimer,
      });
    }
  }, [clearTimers]);

  const pushNotification = useCallback(
    (message: string, type: TradeNotificationType) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      setNotifications((prev) => {
        const updated = [
          ...prev,
          {
            id,
            message,
            type,
            isVisible: true,
          },
        ];
        return updated.length > limit ? updated.slice(-limit) : updated;
      });

      const fadeTimer = setTimeout(() => {
        fadeOutNotification(id);
      }, FADE_AFTER_MS);

      const removeTimer = setTimeout(() => {
        setNotifications((prev) =>
          prev.filter((notification) => notification.id !== id),
        );
        timersRef.current.delete(id);
      }, REMOVE_AFTER_MS);

      timersRef.current.set(id, { fade: fadeTimer, remove: removeTimer });
    },
    [limit, fadeOutNotification],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(({ fade, remove }) => {
        clearTimeout(fade);
        clearTimeout(remove);
      });
      timers.clear();
    };
  }, []);

  return {
    notifications,
    pushNotification,
    dismissNotification: fadeOutNotification,
  };
}
