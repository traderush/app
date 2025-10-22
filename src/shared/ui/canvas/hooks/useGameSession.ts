import { useCallback, useEffect, useRef, useState } from 'react';
import { useUserStore } from '@/shared/state/userStore';
import { playHitSound } from '@/shared/lib/sound/SoundManager';
import type {
  BoxHitContract,
  BoxHitPosition,
  BoxHitPositionMap,
  TradeResultPayload,
} from '@/shared/types/boxHit';

const debug = (...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.debug(...args);
  }
};

type OutgoingMessage = {
  type: string;
  payload?: unknown;
};

type WebSocketBridge = {
  send: (message: OutgoingMessage) => void;
  on: (event: string, handler: (data: unknown) => void) => void;
  off: (event: string, handler: (data: unknown) => void) => void;
};

interface UseGameSessionProps {
  gameMode: 'box_hit';
  timeframe: number;
  ws: WebSocketBridge | null;
  enabled: boolean;
}

interface UseGameSessionReturn {
  isJoined: boolean;
  contracts: BoxHitContract[];
  userBalance: number;
  positions: BoxHitPositionMap;
  handleTradePlace: (contractId: string, amount: number) => void;
}

export function useGameSession({
  gameMode,
  timeframe,
  ws,
  enabled,
}: UseGameSessionProps): UseGameSessionReturn {
  const [isJoined, setIsJoined] = useState(false);
  const [contracts, setContracts] = useState<BoxHitContract[]>([]);
  const [userBalance, setUserBalance] = useState(0);
  const [positions, setPositions] = useState<BoxHitPositionMap>(new Map());
  const positionsRef = useRef<BoxHitPositionMap>(new Map());

  // Get userStore functions
  const settleTrade = useUserStore((state) => state.settleTrade);
  const updateBalance = useUserStore((state) => state.updateBalance);
  const addTrade = useUserStore((state) => state.addTrade);

  // Track initialization to prevent duplicate joins
  const initRef = useRef(false);
  const wsRef = useRef(ws);
  const isJoinedRef = useRef(false);
  const contractsReceived = useRef(false);

  // Update ws ref
  useEffect(() => {
    wsRef.current = ws;
  }, [ws]);

  // Handle trade placement
  const handleTradePlace = useCallback(
    (contractId: string, amount: number) => {
      debug('🔍 handleTradePlace called:', {
        contractId,
        amount,
        hasWs: !!wsRef.current,
        isJoined,
        enabled
      });
      
      if (wsRef.current && isJoined) {
        debug('✅ Sending place_trade message:', { contractId, amount });
        
        // Add trade to userStore immediately when placed
        addTrade({
          contractId: contractId,
          amount: amount,
          placedAt: new Date(),
        });
        
        debug('➕ Trade added to userStore:', { contractId, amount });
        
        wsRef.current.send({
          type: 'place_trade',
          payload: { contractId, amount },
        });
      } else {
        debug('❌ Cannot place trade:', {
          hasWs: !!wsRef.current,
          isJoined,
          enabled
        });
      }
    },
    [isJoined, addTrade, enabled]
  );

  useEffect(() => {
    // Skip if not enabled or no ws
    if (!enabled || !wsRef.current) {
      return;
    }

    // Skip if already initialized
    if (initRef.current) {
      return;
    }

    const currentWs = wsRef.current;
    // Mark as initialized immediately
    initRef.current = true;

    let mounted = true;

    // Event handlers
    const handleGameJoined = (message: unknown) => {
      if (!mounted) return;
      const data = message as {
        payload?: { contracts?: BoxHitContract[]; balance?: number };
        contracts?: BoxHitContract[];
        balance?: number;
      };

      const incomingContracts = data.payload?.contracts ?? data.contracts ?? [];
      const initialBalance = data.payload?.balance ?? data.balance;

      debug('[useGameSession] Game joined:', {
        timeframe,
        hasContracts: incomingContracts.length > 0,
        contractCount: incomingContracts.length,
      });

      setIsJoined(true);
      isJoinedRef.current = true;
      setContracts(incomingContracts);

      if (typeof initialBalance === 'number') {
        setUserBalance(initialBalance);
      }
    };

    const handleContractUpdate = (message: unknown) => {
      if (!mounted) return;

      const data = message as {
        payload?: { contracts?: BoxHitContract[]; updateType?: string };
        contracts?: BoxHitContract[];
      };

      const payloadContracts = data.payload?.contracts ?? data.contracts ?? [];

      if (!contractsReceived.current) {
        contractsReceived.current = true;
        const firstContract = payloadContracts[0];
        debug('[useGameSession] First contract update:', {
          updateType: data.payload?.updateType,
          contractCount: payloadContracts.length,
          firstContract: firstContract
            ? {
                ...firstContract,
                startTimeStr: firstContract.startTime
                  ? new Date(firstContract.startTime).toISOString()
                  : 'N/A',
                endTimeStr: firstContract.endTime
                  ? new Date(firstContract.endTime).toISOString()
                  : 'N/A',
                timeDiff: firstContract.startTime
                  ? firstContract.startTime - Date.now()
                  : 'N/A',
              }
            : null,
        });
      }

      if (data.payload?.updateType === 'new') {
        setContracts((prev) => [...prev, ...payloadContracts]);
      } else {
        setContracts(payloadContracts);
      }
    };

    const handleTradeConfirmed = (message: unknown) => {
      if (!mounted) return;
      debug('✅ Trade confirmed event:', message);

      const data = message as {
        payload?: {
          balance?: number;
          contractId?: string;
          amount?: number;
          tradeId?: string;
          timestamp?: number;
        };
        balance?: number;
        contractId?: string;
        amount?: number;
        tradeId?: string;
        timestamp?: number;
      };

      const payload = data.payload ?? data;

      if (typeof payload.balance === 'number') {
        setUserBalance(payload.balance);
      }

      const contractId = payload.contractId ?? 'unknown';
      const amount = payload.amount ?? 0;
      const positionId = payload.tradeId ?? contractId ?? `trade_${Date.now()}`;

      const position: BoxHitPosition = {
        contractId,
        amount,
        timestamp: payload.timestamp || Date.now(),
        tradeId: positionId,
      };

      debug('📋 Adding position to map:', { tradeId: positionId, position });
      setPositions((prev) => {
        const newPositions = new Map(prev);
        newPositions.set(positionId, position);
        positionsRef.current = newPositions;
        debug('📋 Updated positions map:', {
          size: newPositions.size,
          positions: Array.from(newPositions.entries()),
          newPosition: { tradeId: positionId, contractId, amount },
        });
        return newPositions;
      });
    };

    const handleTradeResult = (message: unknown) => {
      if (!mounted) return;
      debug('🎯 Trade result received:', message);

      const payload = (message as { payload?: TradeResultPayload })?.payload ?? (message as TradeResultPayload | undefined);
      if (!payload) return;

      const {
        contractId,
        won,
        payout = 0,
        profit = 0,
        balance,
        tradeId,
      } = payload;

      debug('🎯 Processing trade result:', {
        tradeId,
        contractId,
        won,
        payout,
        profit,
        balance,
      });

      let positionEntry: [string, BoxHitPosition] | undefined;

      if (tradeId) {
        const directMatch = positionsRef.current.get(tradeId);
        if (directMatch) {
          positionEntry = [tradeId, directMatch];
        }
      }

      if (!positionEntry) {
        for (const entry of positionsRef.current.entries()) {
          if (entry[1].contractId === contractId) {
            positionEntry = entry;
            debug('✅ Found position by contractId:', { positionKey: entry[0], contractId });
            break;
          }
        }
      }

      if (positionEntry) {
        const [positionKey, position] = positionEntry;
        const originalTradeId = position.tradeId || positionKey;

        settleTrade(originalTradeId, won ? 'win' : 'loss', payout);
        debug('🔊 About to play hit sound for trade result:', { won, payout });
        void playHitSound();

        setPositions((prev) => {
          const newPositions = new Map(prev);
          const target = newPositions.get(positionKey);
          if (target) {
            target.result = won ? 'win' : 'loss';
            target.payout = payout;
            target.settledAt = new Date();
          }
          positionsRef.current = newPositions;
          return newPositions;
        });

        debug('✅ Trade settled in userStore:', {
          originalTradeId,
          settlementTradeId: tradeId,
          contractId,
          amount: position.amount,
          result: won ? 'win' : 'loss',
          payout,
          profit,
        });
      } else {
        console.warn('⚠️ Position not found for tradeId or contractId:', { tradeId, contractId });
        debug('📋 Available positions:', Array.from(positionsRef.current.entries()));
      }

      if (typeof balance === 'number') {
        const locked = (payload as { locked?: number }).locked;
        setUserBalance(balance);
        updateBalance(balance, typeof locked === 'number' ? locked : undefined);
      }
    };

    const handleBalanceUpdate = (message: unknown) => {
      if (!mounted) return;
      debug('Balance update:', message);
      const data = message as { payload?: { balance?: number; locked?: number } };
      const balance = data.payload?.balance;
      const locked = data.payload?.locked;
      if (typeof balance === 'number') {
        debug('Setting balance to:', balance);
        setUserBalance(balance);
        updateBalance(balance, typeof locked === 'number' ? locked : undefined);
      }
    };

    // Register handlers
    currentWs.on('game_joined', handleGameJoined);
    currentWs.on('contract_update', handleContractUpdate);
    currentWs.on('trade_confirmed', handleTradeConfirmed);
    currentWs.on('trade_result', handleTradeResult);
    currentWs.on('balance_update', handleBalanceUpdate);

    // Join game after a small delay
    const joinTimeout = setTimeout(() => {
      if (mounted && wsRef.current) {
        debug('[useGameSession] Sending join_game:', {
          mode: gameMode,
          timeframe,
        });
        wsRef.current.send({
          type: 'join_game',
          payload: {
            mode: gameMode,
            timeframe,
          },
        });
      }
    }, 100);

    // Cleanup function
    return () => {
      mounted = false;
      clearTimeout(joinTimeout);

      // Unregister handlers
      currentWs.off('game_joined', handleGameJoined);
      currentWs.off('contract_update', handleContractUpdate);
      currentWs.off('trade_confirmed', handleTradeConfirmed);
      currentWs.off('trade_result', handleTradeResult);
      currentWs.off('balance_update', handleBalanceUpdate);

      // Send leave game message
      if (isJoinedRef.current && wsRef.current) {
        wsRef.current.send({
          type: 'leave_game',
          payload: {},
        });
        isJoinedRef.current = false;
      }

      // Reset init ref on cleanup
      initRef.current = false;
    };
  }, [enabled, gameMode, timeframe, settleTrade, updateBalance]);

  return {
    isJoined,
    contracts,
    userBalance,
    positions,
    handleTradePlace,
  };
}
