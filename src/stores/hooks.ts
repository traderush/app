import { useCallback, useEffect, useRef } from 'react';
import { useConnectionStore } from './connectionStore';
import { useGameStore } from './gameStore';
import { usePriceStore } from './priceStore';
import { useUserStore } from './userStore';
import { useUIStore } from './uiStore';
import { WebSocketMessage } from '@/types/game';

// WebSocket message handler hook
export const useWebSocketHandler = () => {
  const setLastMessage = useConnectionStore((state) => state.setLastMessage);
  const setConnected = useConnectionStore((state) => state.setConnected);
  const setError = useConnectionStore((state) => state.setError);
  const setConnecting = useConnectionStore((state) => state.setConnecting);
  
  const updateBalance = useUserStore((state) => state.updateBalance);
  const setUser = useUserStore((state) => state.setUser);
  const addTrade = useUserStore((state) => state.addTrade);
  const removeTrade = useUserStore((state) => state.removeTrade);
  
  const addPricePoint = usePriceStore((state) => state.addPricePoint);
  const updateStats = usePriceStore((state) => state.updateStats);
  
  // Note: These methods don't exist yet in gameStore - using placeholders
  const updateGameSettings = useGameStore((state) => state.updateGameSettings);

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
        updateStats({
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
    updateStats,
    updateGameSettings,
  ]);

  return { handleMessage };
};

// Game session hook (simplified version compatible with current gameStore)
export const useGameSession = () => {
  const timeframe = useGameStore((state) => state.gameSettings.timeframe);
  const updateGameSettings = useGameStore((state) => state.updateGameSettings);

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

// Price data hook with derived state (compatible with current priceStore)
export const usePriceData = () => {
  const priceData = usePriceStore((state) => state.priceData);
  const stats = usePriceStore((state) => state.stats);

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
  const modals = useUIStore((state) => state.modals);
  const openModal = useUIStore((state) => state.openModal);
  const closeModal = useUIStore((state) => state.closeModal);
  const closeAllModals = useUIStore((state) => state.closeAllModals);

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
  const signatureColor = useUIStore((state) => state.signatureColor);
  const setSignatureColor = useUIStore((state) => state.setSignatureColor);
  
  return { signatureColor, setSignatureColor };
};


