import { useCallback, useEffect, useRef, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  timestamp: number;
  isVisible: boolean;
}

const FADE_AFTER_MS = 2500;
const REMOVE_AFTER_MS = 3000;
const MAX_TOASTS = 5;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const hideToast = useCallback((id: number) => {
    clearTimer(id);
    setToasts((prev) =>
      prev.map((toast) =>
        toast.id === id ? { ...toast, isVisible: false } : toast,
      ),
    );

    const removalTimer = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      timersRef.current.delete(id);
    }, REMOVE_AFTER_MS - FADE_AFTER_MS);

    timersRef.current.set(id, removalTimer);
  }, [clearTimer]);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = Date.now();
      const toast: Toast = {
        id,
        message,
        type,
        timestamp: Date.now(),
        isVisible: true,
      };

      setToasts((prev) => {
        const updated = [...prev, toast];
        return updated.length > MAX_TOASTS ? updated.slice(-MAX_TOASTS) : updated;
      });

      const fadeTimer = setTimeout(() => {
        hideToast(id);
      }, FADE_AFTER_MS);

      timersRef.current.set(id, fadeTimer);
    },
    [hideToast],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return {
    toasts,
    showToast,
    hideToast,
  };
}
