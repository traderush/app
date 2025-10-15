/**
 * useGameSessionHandlers Hook
 * 
 * Manages game session event handlers and trade processing logic.
 * Separates business logic from UI state management.
 */

import { useCallback } from 'react';
import { Contract, Position } from '@/types/game';
import { logger } from '@/utils/logger';
import { handleCanvasError } from '@/lib/errorHandler';

export interface GameSessionHandlers {
  handlePositionHit: (positionId: string) => void;
  handlePositionMiss: (positionId: string) => void;
  handleTradingModeChange: (tradingMode: boolean) => void;
}

export interface UseGameSessionHandlersProps {
  setIsCanvasStarted: (started: boolean) => void;
}

export const useGameSessionHandlers = ({
  setIsCanvasStarted,
}: UseGameSessionHandlersProps): GameSessionHandlers => {
  
  const handlePositionHit = useCallback((positionId: string) => {
    try {
      logger.info('Position hit', { positionId }, 'GAME');
      // Additional hit processing logic can be added here
    } catch (error) {
      handleCanvasError(error, {
        component: 'GameSession',
        action: 'handlePositionHit',
        metadata: { positionId }
      });
    }
  }, []);

  const handlePositionMiss = useCallback((positionId: string) => {
    try {
      logger.info('Position missed', { positionId }, 'GAME');
      // Additional miss processing logic can be added here
    } catch (error) {
      handleCanvasError(error, {
        component: 'GameSession',
        action: 'handlePositionMiss',
        metadata: { positionId }
      });
    }
  }, []);

  const handleTradingModeChange = useCallback((tradingMode: boolean) => {
    try {
      // Control canvas start/stop based on trading mode
      setIsCanvasStarted(tradingMode);
    } catch (error) {
      handleCanvasError(error, {
        component: 'GameSession',
        action: 'handleTradingModeChange',
        metadata: { tradingMode }
      });
    }
  }, [setIsCanvasStarted]);

  return {
    handlePositionHit,
    handlePositionMiss,
    handleTradingModeChange,
  };
};
