// Consolidated store exports (recommended)
export { useAppStore } from './appStore';
export { useTradingStore } from './tradingStore';
export { useConnectionStore } from './connectionStore';

// Legacy stores removed - migration complete

// Hook exports from hooks.ts
export { 
  useWebSocketHandler,
  useGameSession,
  useConnectionStatus,
  usePriceData,
  useModalManager,
  useSignatureColor,
  useOptimizedAppStore,
  useOptimizedTradingStore
} from './hooks';

// Consolidated store types (recommended)
export type { 
  UserProfile, 
  GameSettings, 
  UITheme, 
  UILayout, 
  UISettings, 
  ModalState, 
  ToastNotification 
} from './appStore';
export type { 
  Trade, 
  GamePosition, 
  GameCell, 
  GameStats, 
  PricePoint, 
  PriceStats 
} from './tradingStore';
export type { ConnectionStatus } from './connectionStore';

// Legacy store types removed - using consolidated types only

// Store utilities
import { useAppStore } from './appStore';
import { useTradingStore } from './tradingStore';
import { useConnectionStore } from './connectionStore';

/**
 * Hook to get all store states for debugging or global state access
 */
export const useAllStores = () => {
  const appState = useAppStore();
  const tradingState = useTradingStore();
  const connectionState = useConnectionStore();

  return {
    app: appState,
    trading: tradingState,
    connection: connectionState,
  };
};

/**
 * Hook to reset all stores to initial state
 */
export const useResetAllStores = () => {
  const resetApp = useAppStore((state) => state.resetApp);
  const resetTrading = useTradingStore((state) => state.resetTradingData);
  const resetConnection = useConnectionStore((state) => state.resetConnection);

  return () => {
    resetApp();
    resetTrading();
    resetConnection();
  };
};

/**
 * Store persistence utilities
 */
export const storeUtils = {
  /**
   * Export all store data to JSON
   */
  exportStores: () => {
    const appData = useAppStore.getState();
    const tradingData = useTradingStore.getState();

    return {
      app: {
        user: appData.user,
        gameSettings: appData.gameSettings,
        theme: appData.theme,
        layout: appData.layout,
        settings: appData.settings,
      },
      trading: {
        gameStats: tradingData.gameStats,
        tradeHistory: tradingData.tradeHistory,
        priceData: tradingData.priceData.slice(-100),
        priceStats: tradingData.priceStats,
      },
      timestamp: Date.now(),
    };
  },

  /**
   * Clear all persisted data
   */
  clearPersistedData: () => {
    localStorage.removeItem('app-store');
    localStorage.removeItem('trading-store');
  },
};

/**
 * Store subscription utilities for debugging
 */
export const storeDebug = {
  /**
   * Subscribe to all store changes for debugging
   */
  subscribeToAll: (callback: (state: unknown, prevState: unknown, action: string) => void) => {
    const unsubscribeFunctions = [
      useAppStore.subscribe(callback),
      useTradingStore.subscribe(callback),
      useConnectionStore.subscribe(callback),
    ];

    return () => {
      unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    };
  },

  /**
   * Get current state of all stores
   */
  getCurrentState: () => {
    return {
      app: useAppStore.getState(),
      trading: useTradingStore.getState(),
      connection: useConnectionStore.getState(),
    };
  },

  /**
   * Log store changes to console (development only)
   */
  enableLogging: () => {
    if (process.env.NODE_ENV === 'development') {
      return storeDebug.subscribeToAll((state, prevState, action) => {
        console.log('Store Update:', {
          action,
          state,
          prevState,
          timestamp: new Date().toISOString(),
        });
      });
    }
    return () => {}; // No-op in production
  },
};
