// Store exports and utilities
export { useGameStore, useGameSelectors, useGameComputed } from './gameStore';
export { usePlayerStore } from './playerStore';
export { useUIStore, useModal, useNotifications, useSidebar } from './uiStore';
export { usePriceStore } from './priceStore';

// Store types
export type { GameCell, GamePosition, GameSettings, GameStats } from './gameStore';
export type { WatchedPlayer, PlayerStats, PlayerPreferences } from './playerStore';
export type { ModalState, ToastNotification, UITheme, UILayout, UISettings } from './uiStore';
export type { PricePoint, PriceDataConfig, WebSocketConnection, PriceStats } from './priceStore';

// Store utilities
import { useGameStore } from './gameStore';
import { usePlayerStore } from './playerStore';
import { useUIStore } from './uiStore';
import { usePriceStore } from './priceStore';

/**
 * Hook to get all store states for debugging or global state access
 */
export const useAllStores = () => {
  const gameState = useGameStore();
  const playerState = usePlayerStore();
  const uiState = useUIStore();
  const priceState = usePriceStore();

  return {
    game: gameState,
    player: playerState,
    ui: uiState,
    price: priceState,
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

  return () => {
    resetGame();
    resetPlayer();
    resetUI();
    resetPrice();
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
    if (typeof data === 'object' && data !== null && 'game' in data) {
      const gameData = (data as { game: { gameSettings?: any; gameStats?: any } }).game;
      if (gameData.gameSettings) {
        useGameStore.getState().updateGameSettings(gameData.gameSettings);
      }
      if (gameData.gameStats) {
        useGameStore.getState().updateGameStats(gameData.gameStats);
      }
    }

    if (typeof data === 'object' && data !== null && 'player' in data) {
      const playerData = (data as { player: { watchedPlayers?: any; preferences?: any } }).player;
      if (playerData.watchedPlayers) {
        usePlayerStore.getState().setWatchedPlayers(playerData.watchedPlayers);
      }
      if (playerData.preferences) {
        usePlayerStore.getState().updatePreferences(playerData.preferences);
      }
    }

    if (typeof data === 'object' && data !== null && 'ui' in data) {
      const uiData = (data as { ui: { theme?: any; layout?: any; settings?: any } }).ui;
      if (uiData.theme) {
        useUIStore.getState().updateTheme(uiData.theme);
      }
      if (uiData.layout) {
        useUIStore.getState().updateLayout(uiData.layout);
      }
      if (uiData.settings) {
        useUIStore.getState().updateSettings(uiData.settings);
      }
    }

    if (typeof data === 'object' && data !== null && 'price' in data) {
      const priceData = (data as { price: { config?: any } }).price;
      if (priceData.config) {
        usePriceStore.getState().updateConfig(priceData.config);
      }
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
  subscribeToAll: (callback: (state: unknown, prevState: unknown) => void) => {
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
      return storeDebug.subscribeToAll((state, prevState) => {
        console.log('Store Update:', {
          state,
          prevState,
          timestamp: new Date().toISOString(),
        });
      });
    }
    return () => {}; // No-op in production
  },
};
