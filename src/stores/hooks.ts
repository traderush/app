import { useCallback, useEffect, useRef } from 'react';
import { useConnectionStore } from './connectionStore';
import { useGameStore } from './gameStore';
import { usePriceStore } from './priceStore';
import { useUserStore } from './userStore';
import { useUIStore } from './uiStore';
import { WebSocketMessage } from '@/types/websocket';

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
  const settleTrade = useUserStore((state) => state.settleTrade);
  const markTradeAsConfirmed = useUserStore((state) => state.markTradeAsConfirmed);
  const markTradeAsFailed = useUserStore((state) => state.markTradeAsFailed);
  
  const addPricePoint = usePriceStore((state) => state.addPricePoint);
  const updateStats = usePriceStore((state) => state.updateStats);
  
  // Note: These methods don't exist yet in gameStore - using placeholders
  const updateGameSettings = useGameStore((state) => state.updateGameSettings);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    setLastMessage(message);

    switch (message.type) {
      case 'connected':
        setUser(message.payload.userId, message.payload.username);
        updateBalance(message.payload.balance);
        setConnected(true);
        setError(null);
        break;

      case 'price_update':
        addPricePoint({
          t: message.payload.timestamp,
          p: message.payload.price,
        });
        updateStats({
          currentPrice: message.payload.price,
          lastUpdate: message.payload.timestamp,
        });
        break;

      case 'box_multipliers':
        // Handle box multipliers - could update game settings if needed
        break;

      case 'tower_multipliers':
        // Handle tower multipliers - could update game settings if needed
        break;

      case 'trade_placed':
        updateBalance(message.payload.balance);
        addTrade({
          id: message.payload.contractId,
          contractId: message.payload.contractId,
          amount: message.payload.amount,
          placedAt: new Date(message.payload.position.timestamp),
        });
        break;

      case 'balance_update':
        updateBalance(message.payload.balance);
        break;

      case 'trade_result':
        console.log('🎯 Received trade_result from backend:', message.payload);
        const { tradeId, contractId, won, payout, balance, profit } = message.payload;
        
        // Mark trade as confirmed first
        const markTradeAsConfirmed = useUserStore.getState().markTradeAsConfirmed;
        markTradeAsConfirmed(tradeId);
        
        // Update user balance (authoritative from backend)
        updateBalance(balance);
        
        // Settle the trade in the store (move from active to history)
        const settleTrade = useUserStore.getState().settleTrade;
        settleTrade(tradeId, won ? 'win' : 'loss', payout);
        
        // Play hit sound for successful trades
        if (won) {
          console.log('🔊 Playing hit sound for backend settlement');
          import('@/lib/sound/SoundManager').then(({ playHitSound }) => {
            playHitSound();
          });
        }
        
        console.log('✅ Backend settlement processed (pessimistic):', {
          tradeId,
          contractId,
          won,
          payout,
          profit,
          newBalance: balance
        });
        break;

      case 'box_hit':
      case 'tower_hit':
      case 'tower_missed':
        // Handle game results - could trigger animations, sounds, etc.
        console.log('🎮 Game result received:', message.type, message.payload);
        break;

      case 'error':
        setError(message.payload.message);
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
    settleTrade,
    markTradeAsConfirmed,
    markTradeAsFailed,
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


