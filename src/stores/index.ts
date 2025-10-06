// Store exports and utilities
export { useGameStore } from './gameStore';
export { usePlayerStore } from './playerStore';
export { useUIStore, useModal, useNotifications, useSidebar } from './uiStore';
export { usePriceStore } from './priceStore';
export { useConnectionStore } from './connectionStore';
export { useUserStore } from './userStore';

// Hook exports from hooks.ts
export { 
  useWebSocketHandler,
  useGameSession,
  useConnectionStatus,
  usePriceData,
  useModalManager,
  useSignatureColor
} from './hooks';

// Store types
export type { GameCell, GamePosition, GameSettings, GameStats } from './gameStore';
export type { WatchedPlayer, PlayerStats, PlayerPreferences } from './playerStore';
export type { ModalState, ToastNotification, UITheme, UILayout, UISettings } from './uiStore';
export type { PricePoint, PriceDataConfig, WebSocketConnection, PriceStats } from './priceStore';
export type { ConnectionStatus, WebSocketMessage } from './connectionStore';
export type { Trade, UserProfile, UserStats } from './userStore';

// Store utilities
import { useGameStore } from './gameStore';
import { usePlayerStore } from './playerStore';
import { useUIStore } from './uiStore';
import { usePriceStore } from './priceStore';
import { useConnectionStore } from './connectionStore';
import { useUserStore } from './userStore';

/**
 * Hook to get all store states for debugging or global state access
 */
export const useAllStores = () => {
  const gameState = useGameStore();
  const playerState = usePlayerStore();
  const uiState = useUIStore();
  const priceState = usePriceStore();
  const connectionState = useConnectionStore();
  const userState = useUserStore();

  return {
    game: gameState,
    player: playerState,
    ui: uiState,
    price: priceState,
    connection: connectionState,
    user: userState,
  };
};

/**
 * Hook to reset all stores to initial state
 */
export const useResetAllStores = () => {
  const resetGame = useGameStore((state) => state.resetGame);
  const resetPlayer = usePlayerStore((state) => state.resetPlayerData);
  const resetUI = useUIStore((state) => state.resetUI);
  const resetPrice = usePriceStore((state) => state.resetPriceData);
  const resetConnection = useConnectionStore((state) => state.resetConnection);
  const resetUser = useUserStore((state) => state.resetUserData);

  return () => {
    resetGame();
    resetPlayer();
    resetUI();
    resetPrice();
    resetConnection();
    resetUser();
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
    const gameData = useGameStore.getState();
    const playerData = usePlayerStore.getState();
    const uiData = useUIStore.getState();
    const priceData = usePriceStore.getState();

    return {
      game: {
        gameSettings: gameData.gameSettings,
        gameStats: gameData.gameStats,
      },
      player: {
        watchedPlayers: playerData.watchedPlayers,
        preferences: playerData.preferences,
      },
      ui: {
        theme: uiData.theme,
        layout: uiData.layout,
        settings: uiData.settings,
      },
      price: {
        config: priceData.config,
      },
      timestamp: Date.now(),
    };
  },

  /**
   * Import store data from JSON
   */
  importStores: (data: unknown) => {
    if (data.game) {
      useGameStore.getState().updateGameSettings(data.game.gameSettings || {});
      useGameStore.getState().updateGameStats(data.game.gameStats || {});
    }

    if (data.player) {
      usePlayerStore.getState().setWatchedPlayers(data.player.watchedPlayers || []);
      usePlayerStore.getState().updatePreferences(data.player.preferences || {});
    }

    if (data.ui) {
      useUIStore.getState().updateTheme(data.ui.theme || {});
      useUIStore.getState().updateLayout(data.ui.layout || {});
      useUIStore.getState().updateSettings(data.ui.settings || {});
    }

    if (data.price) {
      usePriceStore.getState().updateConfig(data.price.config || {});
    }
  },

  /**
   * Clear all persisted data
   */
  clearPersistedData: () => {
    localStorage.removeItem('player-store');
    localStorage.removeItem('ui-store');
    // Note: gameStore and priceStore don't use persistence by default
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
      useGameStore.subscribe(callback),
      usePlayerStore.subscribe(callback),
      useUIStore.subscribe(callback),
      usePriceStore.subscribe(callback),
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
      game: useGameStore.getState(),
      player: usePlayerStore.getState(),
      ui: useUIStore.getState(),
      price: usePriceStore.getState(),
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
