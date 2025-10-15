import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore, useTradingStore } from '@/stores';
import { playHitSound } from '@/lib/sound/SoundManager';
import { Contract, Position, WebSocketService, WebSocketMessage } from '@/types/game';

interface UseGameSessionProps {
  gameMode: 'box_hit' | 'towers';
  timeframe: number;
  ws: WebSocketService | null;
  enabled: boolean;
}

interface UseGameSessionReturn {
  isJoined: boolean;
  contracts: Contract[];
  userBalance: number;
  positions: Map<string, Position>;
  handleTradePlace: (contractId: string, amount: number) => void;
}

export function useGameSession({
  gameMode,
  timeframe,
  ws,
  enabled,
}: UseGameSessionProps): UseGameSessionReturn {
  const [isJoined, setIsJoined] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [userBalance, setUserBalance] = useState(0);
  const [positions, setPositions] = useState<Map<string, Position>>(new Map());

  // Get userStore functions
  const settleTrade = useTradingStore((state) => state.settleTrade);
  const updateBalance = useAppStore((state) => state.updateBalance);
  const addTrade = useTradingStore((state) => state.addTrade);

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
      if (wsRef.current && isJoined) {
        // Add trade to userStore immediately when placed
        addTrade({
          contractId: contractId,
          amount: amount,
          placedAt: new Date(),
        });
        
        wsRef.current.send({
          type: 'place_trade',
          payload: { contractId, amount },
        });
      }
    },
    [isJoined]
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
    const handleGameJoined = (data: unknown) => {
      const msg = data as WebSocketMessage;
      if (!mounted) return;
      console.log('[useGameSession] Game joined:', {
        timeframe,
        hasContracts: !!((msg.payload as any)?.contracts || (msg as any).contracts),
        contractCount: ((msg.payload as any)?.contracts || (msg as any).contracts || []).length,
      });
      setIsJoined(true);
      isJoinedRef.current = true;
      if (msg.payload && (msg.payload as any).contracts) {
        setContracts((msg.payload as any).contracts);
      } else if ((msg as any).contracts) {
        setContracts((msg as any).contracts);
      }
      // Set initial balance from game_joined message
      if (msg.payload && typeof (msg.payload as any).balance === 'number') {
        setUserBalance((msg.payload as any).balance);
      } else if (typeof (msg as any).balance === 'number') {
        setUserBalance((msg as any).balance);
      }
    };

    const handleContractUpdate = (data: unknown) => {
      const msg = data as WebSocketMessage;
      if (!mounted) return;
      const now = Date.now();
      const timestamp = new Date().toISOString();

      // Only log first update
      if (!contractsReceived.current) {
        contractsReceived.current = true;
        const firstContract = ((msg.payload as any)?.contracts ||
          (msg as any).contracts ||
          [])[0];
        console.log('[useGameSession] First contract update:', {
          updateType: (msg.payload as any)?.updateType,
          contractCount: ((msg.payload as any)?.contracts || (msg as any).contracts || []).length,
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

      if (msg.payload && (msg.payload as any).contracts) {
        const contracts = (msg.payload as any).contracts;
        const updateType = (msg.payload as any).updateType;

        if (updateType === 'new') {
          // Append new contracts to existing ones
          setContracts((prev) => [...prev, ...contracts]);
        } else {
          // Replace all contracts (initial load or full update)
          setContracts(contracts);
        }
      } else if ((msg as any).contracts) {
        setContracts((msg as any).contracts);
      }
    };

    const handleTradeConfirmed = (data: unknown) => {
      const msg = data as WebSocketMessage;
      if (!mounted) return;
      console.log('✅ Trade confirmed event:', msg);
      if (msg.payload && typeof (msg.payload as any).balance === 'number') {
        setUserBalance((msg.payload as any).balance);
      } else if (typeof (msg as any).balance === 'number') {
        setUserBalance((msg as any).balance);
      }
      
      // Extract contractId from payload or root level
      const contractId = (msg.payload as any)?.contractId || (msg as any).contractId;
      const amount = (msg.payload as any)?.amount || (msg as any).amount;
      const tradeId = (msg.payload as any)?.tradeId || (msg as any).tradeId;
      
      const position: Position = {
        id: tradeId,
        contractId: contractId,
        amount: amount,
        placedAt: new Date((msg as any).timestamp || Date.now()),
      };
      
      console.log('📋 Adding position to map:', { tradeId, position });
      setPositions((prev) => {
        const newPositions = new Map(prev);
        newPositions.set(tradeId, position);
        console.log('📋 Updated positions map:', { 
          size: newPositions.size, 
          positions: Array.from(newPositions.entries()),
          newPosition: { tradeId, contractId, amount }
        });
        return newPositions;
      });
    };

    const handleTradeResult = (data: unknown) => {
      const msg = data as WebSocketMessage;
      if (!mounted) return;
      console.log('🎯 Trade result received:', msg);
      
      // Extract data from message
      const payload = msg.payload || msg;
      const tradeId = (payload as any).tradeId;
      const contractId = (payload as any).contractId;
      const won = (payload as any).won;
      const payout = (payload as any).payout || 0;
      const profit = (payload as any).profit || 0;
      const balance = (payload as any).balance;
      
      console.log('🎯 Processing trade result:', {
        tradeId,
        contractId,
        won,
        payout,
        profit,
        balance
      });
      
      // Find the position by contractId since tradeId might not match
      let position = positions.get(tradeId);
      if (!position) {
        // Try to find by contractId if tradeId doesn't match
        console.log('🔍 TradeId not found, searching by contractId:', contractId);
        for (const [posTradeId, pos] of positions.entries()) {
          if (pos.contractId === contractId) {
            position = pos;
            console.log('✅ Found position by contractId:', { posTradeId, contractId });
            break;
          }
        }
      }
      
      if (position) {
        const amount = position.amount;
        
        // Use the position ID as the trade ID
        const originalTradeId = position.id;
        
        // Settle the trade in userStore (this will update stats and PnL)
        settleTrade(originalTradeId, won ? 'win' : 'loss', payout);
        
        // Play hit sound for trade result
        console.log('🔊 About to play hit sound for trade result:', { won, payout });
        playHitSound();
        
        console.log('✅ Trade settled in userStore:', {
          originalTradeId,
          settlementTradeId: tradeId,
          contractId,
          amount,
          result: won ? 'win' : 'loss',
          payout,
          profit
        });
      } else {
        console.warn('⚠️ Position not found for tradeId or contractId:', { tradeId, contractId });
        console.log('📋 Available positions:', Array.from(positions.entries()));
      }
      
      // Update positions state
      setPositions((prev) => {
        const newPositions = new Map(prev);
        const position = newPositions.get(tradeId);
        if (position) {
          position.result = won ? 'win' : 'loss';
          position.payout = payout;
          position.settledAt = new Date();
        }
        return newPositions;
      });
      
      // Update balance
      if (typeof balance === 'number') {
        setUserBalance(balance);
        updateBalance(balance);
      }
    };

    const handleBalanceUpdate = (data: unknown) => {
      const msg = data as WebSocketMessage;
      if (!mounted) return;
      console.log('Balance update:', msg);
      if (msg.payload && typeof (msg.payload as any).balance === 'number') {
        console.log('Setting balance to:', (msg.payload as any).balance);
        setUserBalance((msg.payload as any).balance);
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
        console.log('[useGameSession] Sending join_game:', {
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
  }, [enabled, gameMode, timeframe]); // Remove ws from dependencies

  return {
    isJoined,
    contracts,
    userBalance,
    positions,
    handleTradePlace,
  };
}
