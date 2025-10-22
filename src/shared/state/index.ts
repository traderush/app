// Store exports and utilities
export { useGameStore } from './gameStore';
export { usePlayerStore } from './playerStore';
export { useUIStore, useModal, useNotifications, useSidebar } from './uiStore';
export { usePriceStore } from './priceStore';
export { useConnectionStore } from './connectionStore';
export { useUserStore } from './userStore';

// Store types
export type { GameCell, GamePosition, GameSettings, GameStats } from './gameStore';
export type { WatchedPlayer, PlayerStats, PlayerPreferences } from './playerStore';
export type { ModalState, ToastNotification, UITheme, UILayout, UISettings, PnLCustomization } from './uiStore';
export type { PricePoint, PriceDataConfig, WebSocketConnection, PriceStats } from './priceStore';
export type { ConnectionStatus } from './connectionStore';
export type { WebSocketMessage } from '@/shared/types/websocket';
export type { Trade, UserProfile, UserStats } from './userStore';

// Store utilities
import { useGameStore } from './gameStore';
import { usePlayerStore } from './playerStore';
import { useUIStore } from './uiStore';
import { usePriceStore } from './priceStore';
import { useConnectionStore } from './connectionStore';
import { useUserStore } from './userStore';
import type { GameSettings, GameStats } from './gameStore';
import type { WatchedPlayer, PlayerPreferences } from './playerStore';
import type { UITheme, UILayout, UISettings, PnLCustomization } from './uiStore';
import type { PriceDataConfig } from './priceStore';

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
type PersistedStoresSnapshot = {
  game?: {
    gameSettings?: Partial<GameSettings>;
    gameStats?: Partial<GameStats>;
  };
  player?: {
    watchedPlayers?: WatchedPlayer[];
    preferences?: Partial<PlayerPreferences>;
  };
  ui?: {
    theme?: Partial<UITheme>;
    layout?: Partial<UILayout>;
    settings?: Partial<UISettings>;
    signatureColor?: string;
    pnLCustomization?: Partial<PnLCustomization>;
    favoriteAssets?: Array<'BTC' | 'ETH' | 'SOL' | 'DEMO'>;
  };
  price?: {
    config?: Partial<PriceDataConfig>;
  };
};

const isPersistedStoresSnapshot = (value: unknown): value is PersistedStoresSnapshot =>
  typeof value === 'object' && value !== null;

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
        signatureColor: uiData.signatureColor,
        pnLCustomization: uiData.pnLCustomization,
        favoriteAssets: Array.from(uiData.favoriteAssets),
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
  importStores: (snapshot: unknown) => {
    if (!isPersistedStoresSnapshot(snapshot)) {
      return;
    }

    if (snapshot.game) {
      useGameStore.getState().updateGameSettings(snapshot.game.gameSettings || {});
      useGameStore.getState().updateGameStats(snapshot.game.gameStats || {});
    }

    if (snapshot.player) {
      usePlayerStore.getState().setWatchedPlayers(snapshot.player.watchedPlayers || []);
      usePlayerStore.getState().updatePreferences(snapshot.player.preferences || {});
    }

    if (snapshot.ui) {
      useUIStore.getState().updateTheme(snapshot.ui.theme || {});
      useUIStore.getState().updateLayout(snapshot.ui.layout || {});
      useUIStore.getState().updateSettings(snapshot.ui.settings || {});

      if (Array.isArray(snapshot.ui.favoriteAssets)) {
        useUIStore.getState().setFavoriteAssets(snapshot.ui.favoriteAssets);
      }

      if (snapshot.ui.signatureColor) {
        useUIStore.getState().setSignatureColor(snapshot.ui.signatureColor);
      }

      if (snapshot.ui.pnLCustomization) {
        useUIStore
          .getState()
          .updatePnLCustomization(snapshot.ui.pnLCustomization);
      }
    }

    if (snapshot.price) {
      usePriceStore.getState().updateConfig(snapshot.price.config || {});
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
type StoreKey = 'game' | 'player' | 'ui' | 'price';

export const storeDebug = {
  /**
   * Subscribe to all store changes for debugging
   */
  subscribeToAll: (
    callback: (state: unknown, prevState: unknown, store: StoreKey) => void
  ) => {
    const unsubscribeFunctions = [
      useGameStore.subscribe((state, prevState) => callback(state, prevState, 'game')),
      usePlayerStore.subscribe((state, prevState) => callback(state, prevState, 'player')),
      useUIStore.subscribe((state, prevState) => callback(state, prevState, 'ui')),
      usePriceStore.subscribe((state, prevState) => callback(state, prevState, 'price')),
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
      return storeDebug.subscribeToAll((state, prevState, store) => {
        console.log('Store Update:', {
          store,
          state,
          prevState,
          timestamp: new Date().toISOString(),
        });
      });
    }
    return () => {}; // No-op in production
  },
};
