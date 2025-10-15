import { useCallback, useEffect, useRef } from 'react';
import { useConnectionStore } from './connectionStore';
import { useAppStore } from './appStore';
import { useTradingStore } from './tradingStore';
import { WebSocketMessage } from '@/types/game';
import { useShallow } from 'zustand/react/shallow';

// WebSocket message handler hook
export const useWebSocketHandler = () => {
  const setLastMessage = useConnectionStore((state) => state.setLastMessage);
  const setConnected = useConnectionStore((state) => state.setConnected);
  const setError = useConnectionStore((state) => state.setError);
  const setConnecting = useConnectionStore((state) => state.setConnecting);
  
  const updateBalance = useAppStore((state) => state.updateBalance);
  const setUser = useAppStore((state) => state.setUser);
  const addTrade = useTradingStore((state) => state.addTrade);
  const removeTrade = useTradingStore((state) => state.removeTrade);
  
  const addPricePoint = useTradingStore((state) => state.addPricePoint);
  const updatePriceStats = useTradingStore((state) => state.updatePriceStats);
  
  const updateGameSettings = useAppStore((state) => state.updateGameSettings);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    setLastMessage(message);

    switch (message.type) {
      case 'connected':
        const connectedPayload = message.payload as { userId: string; username: string; balance: number };
        setUser(connectedPayload.userId, connectedPayload.username);
        updateBalance(connectedPayload.balance);
        setConnected(true);
        setError(null);
        break;

      case 'price_update':
        const pricePayload = message.payload as { timestamp: number; price: number };
        addPricePoint({
          t: pricePayload.timestamp,
          p: pricePayload.price,
        });
        updatePriceStats({
          currentPrice: pricePayload.price,
          lastUpdate: pricePayload.timestamp,
        });
        break;

      case 'box_multipliers':
        // Handle box multipliers - could update game settings if needed
        break;

      case 'tower_multipliers':
        // Handle tower multipliers - could update game settings if needed
        break;

      case 'trade_placed':
        const tradePayload = message.payload as { 
          balance: number; 
          contractId: string; 
          amount: number; 
          position: { timestamp: number } 
        };
        updateBalance(tradePayload.balance);
        addTrade({
          id: tradePayload.contractId,
          contractId: tradePayload.contractId,
          amount: tradePayload.amount,
          placedAt: new Date(tradePayload.position.timestamp),
        });
        break;

      case 'balance_update':
        const balancePayload = message.payload as { balance: number };
        updateBalance(balancePayload.balance);
        break;

      case 'box_hit':
      case 'tower_hit':
      case 'tower_missed':
        // Handle game results - could trigger animations, sounds, etc.
        break;

      case 'error':
        const errorPayload = message.payload as { message: string };
        setError(errorPayload.message);
        break;

      default:
        console.warn('Unhandled WebSocket message type:', message.type);
    }
  }, [
    setLastMessage,
    setUser,
    updateBalance,
    setConnected,
    setError,
    addTrade,
    addPricePoint,
    updatePriceStats,
    updateGameSettings,
  ]);

  return { handleMessage };
};

// Game session hook (simplified version compatible with current appStore)
export const useGameSession = () => {
  const timeframe = useAppStore((state) => state.gameSettings.timeframe);
  const updateGameSettings = useAppStore((state) => state.updateGameSettings);

  const startGame = useCallback((type: string, timeMs: number) => {
    updateGameSettings({ timeframe: timeMs });
  }, [updateGameSettings]);

  const endGame = useCallback(() => {
    // Reset to default timeframe
    updateGameSettings({ timeframe: 2000 });
  }, [updateGameSettings]);

  return {
    gameType: 'boxhit', // Default game type
    timeframe,
    sessionId: '', // Not implemented yet
    isPlaying: false, // Not implemented yet
    startGame,
    endGame,
  };
};

// Connection status hook
export const useConnectionStatus = () => {
  const isConnected = useConnectionStore((state) => state.isConnected);
  const isConnecting = useConnectionStore((state) => state.isConnecting);
  const connectionError = useConnectionStore((state) => state.connectionError);
  const reconnectAttempts = useConnectionStore((state) => state.reconnectAttempts);
  const maxReconnectAttempts = useConnectionStore((state) => state.maxReconnectAttempts);

  const connectionStatus = isConnected ? 'connected' : isConnecting ? 'connecting' : 'disconnected';

  return {
    isConnected,
    isConnecting,
    connectionError,
    reconnectAttempts,
    maxReconnectAttempts,
    connectionStatus,
  };
};

// Price data hook with derived state (compatible with current tradingStore)
export const usePriceData = () => {
  const priceData = useTradingStore((state) => state.priceData);
  const stats = useTradingStore((state) => state.priceStats);

  const currentPrice = stats.currentPrice || (priceData.length > 0 ? priceData[priceData.length - 1].p : 0);
  const priceHistory = priceData;

  const priceChange = priceData.length > 1 
    ? currentPrice - priceData[priceData.length - 2].p 
    : 0;

  const priceChangePercent = priceData.length > 1 && priceData[priceData.length - 2].p !== 0
    ? (priceChange / priceData[priceData.length - 2].p) * 100
    : 0;

  return {
    currentPrice,
    priceHistory,
    priceRange: { min: stats.low24h, max: stats.high24h },
    lastUpdate: stats.lastUpdate,
    priceChange,
    priceChangePercent,
  };
};

// Modal management hook
export const useModalManager = () => {
  const modals = useAppStore((state) => state.modals);
  const openModal = useAppStore((state) => state.openModal);
  const closeModal = useAppStore((state) => state.closeModal);
  const closeAllModals = useAppStore((state) => state.closeAllModals);

  const isAnyModalOpen = Object.values(modals).some(Boolean);

  return {
    modals,
    openModal,
    closeModal,
    closeAllModals,
    isAnyModalOpen,
  };
};

// Signature color hook (replaces SignatureColorContext)
export const useSignatureColor = () => {
  const signatureColor = useAppStore((state) => state.signatureColor);
  const setSignatureColor = useAppStore((state) => state.setSignatureColor);
  
  return { signatureColor, setSignatureColor };
};

// Performance-optimized hooks for trading game components
export const useOptimizedAppStore = () => {
  // Common batched selections for UI components
  const uiState = useAppStore(
    useShallow((state) => ({
      layout: state.layout,
      theme: state.theme,
      settings: state.settings,
      signatureColor: state.signatureColor,
    }))
  );

  const userState = useAppStore(
    useShallow((state) => ({
      user: state.user,
      isAuthenticated: state.isAuthenticated,
      balance: state.balance,
      balanceHistory: state.balanceHistory,
    }))
  );

  const modalState = useAppStore(
    useShallow((state) => ({
      modals: state.modals,
    }))
  );

  return {
    ...uiState,
    ...userState,
    ...modalState,
  };
};

export const useOptimizedTradingStore = () => {
  // Common batched selections for trading components
  const gameState = useTradingStore(
    useShallow((state) => ({
      gameStats: state.gameStats,
      tradeHistory: state.tradeHistory,
      activeTrades: state.activeTrades,
    }))
  );

  const priceState = useTradingStore(
    useShallow((state) => ({
      priceData: state.priceData,
      priceStats: state.priceStats,
    }))
  );

  const playerState = useTradingStore(
    useShallow((state) => ({
      watchedPlayers: state.watchedPlayers,
      selectedPlayer: state.selectedPlayer,
      isPlayerTrackerOpen: state.isPlayerTrackerOpen,
    }))
  );

  return {
    ...gameState,
    ...priceState,
    ...playerState,
  };
};


