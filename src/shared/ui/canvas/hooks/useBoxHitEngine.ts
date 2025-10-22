'use client';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import {
  createInitialEngineState,
  getBoxHitEngineService,
  type BoxHitEngineService,
  type EngineState,
} from '@/shared/lib/boxHitEngine/BoxHitEngineService';
import type { TimeFrame } from '@/shared/types/timeframe';
import type {
  EngineContractSnapshot,
  EnginePricePoint,
} from '@/shared/types/boxHitEngine';
import type { BoxHitPosition } from '@/shared/types/boxHit';

export interface BoxHitEngineHandle {
  state: EngineState;
  priceSeries: EnginePricePoint[];
  contracts: EngineContractSnapshot[];
  positions: Map<string, BoxHitPosition>;
  lastPrice?: EnginePricePoint;
  lastPlaceTradeError?: EngineState['lastPlaceTradeError'];
  connect: (username?: string) => void;
  disconnect: () => void;
  subscribe: (timeframe: TimeFrame) => void;
  placeTrade: (contractId: string, amount: number) => void;
}

const getServerSnapshot = createInitialEngineState;

export function useBoxHitEngine(): BoxHitEngineHandle {
  const service = useMemo<BoxHitEngineService>(() => getBoxHitEngineService(), []);

  const subscribe = useCallback((notify: () => void) => {
    return service.subscribeToState(() => notify());
  }, [service]);

  const state = useSyncExternalStore(
    subscribe,
    () => service.getState(),
    getServerSnapshot,
  );

  const positions = useMemo(() => {
    return new Map<string, BoxHitPosition>(Object.entries(state.positions));
  }, [state.positions]);

  const connect = useCallback((username?: string) => {
    service.connect(username);
  }, [service]);

  const disconnect = useCallback(() => {
    service.disconnect();
  }, [service]);

  const subscribeTimeframe = useCallback((timeframe: TimeFrame) => {
    service.subscribe(timeframe);
  }, [service]);

  const placeTrade = useCallback((contractId: string, amount: number) => {
    service.placeTrade(contractId, amount);
  }, [service]);

  useEffect(() => () => {
    service.disconnect();
  }, [service]);

  return {
    state,
    priceSeries: state.priceSeries,
    contracts: state.contracts,
    positions,
    lastPrice: state.lastTick,
    lastPlaceTradeError: state.lastPlaceTradeError,
    connect,
    disconnect,
    subscribe: subscribeTimeframe,
    placeTrade,
  };
}
