'use client';

import { useEffect, useState } from 'react';
import { useAppStore, ToastNotification } from '@/stores/appStore';

/**
 * Global Toast Component
 * 
 * Displays toast notifications from the centralized UI store.
 * Replaces inline toast logic throughout the application.
 */
export default function GlobalToast() {
  const notifications = useAppStore((state) => state.notifications);
  const removeNotification = useAppStore((state) => state.removeNotification);
  const [visibleToasts, setVisibleToasts] = useState<Map<string, boolean>>(new Map());

  // Auto-remove notifications after their duration
  useEffect(() => {
    const timers = new Map<string, NodeJS.Timeout>();

    notifications.forEach((notification) => {
      if (!timers.has(notification.id)) {
        const timer = setTimeout(() => {
          setVisibleToasts(prev => new Map(prev.set(notification.id, false)));
          
          // Remove from store after fade-out animation
          setTimeout(() => {
            removeNotification(notification.id);
            setVisibleToasts(prev => {
              const newMap = new Map(prev);
              newMap.delete(notification.id);
              return newMap;
            });
          }, 300);
        }, notification.duration || 5000);

        timers.set(notification.id, timer);
      }
    });

    // Cleanup timers for removed notifications
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [notifications, removeNotification]);

  // Update visible state for new notifications
  useEffect(() => {
    notifications.forEach((notification) => {
      if (!visibleToasts.has(notification.id)) {
        setVisibleToasts(prev => new Map(prev.set(notification.id, true)));
      }
    });
  }, [notifications, visibleToasts]);

  const handleClose = (notificationId: string) => {
    setVisibleToasts(prev => new Map(prev.set(notificationId, false)));
    
    // Remove from store after fade-out animation
    setTimeout(() => {
      removeNotification(notificationId);
      setVisibleToasts(prev => {
        const newMap = new Map(prev);
        newMap.delete(notificationId);
        return newMap;
      });
    }, 300);
  };

  const getToastIcon = (type: ToastNotification['type']) => {
    const iconClass = "w-6 h-6";
    
    switch (type) {
      case 'success':
        return (
          <svg className={`${iconClass} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className={`${iconClass} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className={`${iconClass} text-yellow-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'info':
        return (
          <svg className={`${iconClass} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getToastBorderColor = (type: ToastNotification['type']) => {
    switch (type) {
      case 'success':
        return 'border-green-500/30';
      case 'error':
        return 'border-red-500/30';
      case 'warning':
        return 'border-yellow-500/30';
      case 'info':
        return 'border-blue-500/30';
      default:
        return 'border-zinc-700';
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3">
      {notifications.slice(-5).map((notification, index) => {
        const isVisible = visibleToasts.get(notification.id) ?? true;
        
        return (
          <div
            key={notification.id}
            className={`
              bg-[#171717] border rounded-lg px-5 py-4 shadow-lg flex items-center gap-4 
              transition-all duration-300 ease-in-out transform
              ${getToastBorderColor(notification.type)}
              ${isVisible 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-2'
              }
            `}
            style={{
              transform: `translateY(${isVisible ? 0 : 8}px)`,
              zIndex: 1000 - index // Stack with newest on top
            }}
          >
            <div className="flex-shrink-0">
              {getToastIcon(notification.type)}
            </div>
            
            <div className="flex-grow min-w-0">
              {notification.title && (
                <div className="text-sm font-medium text-zinc-100 mb-1">
                  {notification.title}
                </div>
              )}
              {notification.message && (
                <div className="text-sm text-zinc-200">
                  {notification.message}
                </div>
              )}
            </div>
            
            <button
              onClick={() => handleClose(notification.id)}
              className="flex-shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors p-1"
              aria-label="Close notification"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
