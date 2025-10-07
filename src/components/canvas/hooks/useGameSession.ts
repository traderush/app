import { useCallback, useEffect, useRef, useState } from 'react';

interface UseGameSessionProps {
  gameMode: 'box_hit' | 'towers';
  timeframe: number;
  ws: {
    send: (message: any) => void;
    on: (event: string, handler: (data: any) => void) => void;
    off: (event: string, handler: (data: any) => void) => void;
  } | null;
  enabled: boolean;
}

interface UseGameSessionReturn {
  isJoined: boolean;
  contracts: any[];
  userBalance: number;
  positions: Map<string, any>;
  handleTradePlace: (contractId: string, amount: number) => void;
}

export function useGameSession({
  gameMode,
  timeframe,
  ws,
  enabled,
}: UseGameSessionProps): UseGameSessionReturn {
  const [isJoined, setIsJoined] = useState(false);
  const [contracts, setContracts] = useState<any[]>([]);
  const [userBalance, setUserBalance] = useState(0);
  const [positions, setPositions] = useState<Map<string, any>>(new Map());

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
      console.log('🔍 handleTradePlace called:', {
        contractId,
        amount,
        hasWs: !!wsRef.current,
        isJoined,
        enabled
      });
      
      if (wsRef.current && isJoined) {
        console.log('✅ Sending place_trade message:', { contractId, amount });
        wsRef.current.send({
          type: 'place_trade',
          payload: { contractId, amount },
        });
      } else {
        console.log('❌ Cannot place trade:', {
          hasWs: !!wsRef.current,
          isJoined,
          enabled
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
    const handleGameJoined = (msg: any) => {
      if (!mounted) return;
      console.log('[useGameSession] Game joined:', {
        timeframe,
        hasContracts: !!(msg.payload?.contracts || msg.contracts),
        contractCount: (msg.payload?.contracts || msg.contracts || []).length,
      });
      setIsJoined(true);
      isJoinedRef.current = true;
      if (msg.payload && msg.payload.contracts) {
        setContracts(msg.payload.contracts);
      } else if (msg.contracts) {
        setContracts(msg.contracts);
      }
      // Set initial balance from game_joined message
      if (msg.payload && typeof msg.payload.balance === 'number') {
        setUserBalance(msg.payload.balance);
      } else if (typeof msg.balance === 'number') {
        setUserBalance(msg.balance);
      }
    };

    const handleContractUpdate = (msg: any) => {
      if (!mounted) return;
      const now = Date.now();
      const timestamp = new Date().toISOString();

      // Only log first update
      if (!contractsReceived.current) {
        contractsReceived.current = true;
        const firstContract = (msg.payload?.contracts ||
          msg.contracts ||
          [])[0];
        console.log('[useGameSession] First contract update:', {
          updateType: msg.payload?.updateType,
          contractCount: (msg.payload?.contracts || msg.contracts || []).length,
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

      if (msg.payload && msg.payload.contracts) {
        const contracts = msg.payload.contracts;
        const updateType = msg.payload.updateType;

        if (updateType === 'new') {
          // Append new contracts to existing ones
          setContracts((prev) => [...prev, ...contracts]);
        } else {
          // Replace all contracts (initial load or full update)
          setContracts(contracts);
        }
      } else if (msg.contracts) {
        setContracts(msg.contracts);
      }
    };

    const handleTradeConfirmed = (msg: any) => {
      if (!mounted) return;
      console.log('✅ Trade confirmed event:', msg);
      if (msg.payload && typeof msg.payload.balance === 'number') {
        setUserBalance(msg.payload.balance);
      } else if (typeof msg.balance === 'number') {
        setUserBalance(msg.balance);
      }
      
      // Extract contractId from payload or root level
      const contractId = msg.payload?.contractId || msg.contractId;
      const amount = msg.payload?.amount || msg.amount;
      const tradeId = msg.payload?.tradeId || msg.tradeId;
      
      const position = {
        contractId: contractId,
        amount: amount,
        timestamp: msg.timestamp || Date.now(),
        tradeId: tradeId,
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

    const handleTradeResult = (msg: any) => {
      if (!mounted) return;
      console.log('Trade result:', msg);
      setPositions((prev) => {
        const newPositions = new Map(prev);
        const position = newPositions.get(msg.tradeId);
        if (position) {
          position.result = msg.result;
        }
        return newPositions;
      });
      if (msg.payload && typeof msg.payload.balance === 'number') {
        setUserBalance(msg.payload.balance);
      } else if (typeof msg.balance === 'number') {
        setUserBalance(msg.balance);
      }
    };

    const handleBalanceUpdate = (msg: any) => {
      if (!mounted) return;
      console.log('Balance update:', msg);
      if (msg.payload && typeof msg.payload.balance === 'number') {
        console.log('Setting balance to:', msg.payload.balance);
        setUserBalance(msg.payload.balance);
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
