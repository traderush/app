'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import { TimeFrame } from '@/types/timeframe';
import type {
  EngineClientMessage,
  EngineContractSnapshot,
  EnginePricePoint,
  EngineServerMessage,
} from '@/types/boxHitEngine';
import type { BoxHitPosition } from '@/types/boxHit';

const MAX_PRICE_POINTS = 600;
const RECONNECT_DELAY_MS = 1_000;

const getEngineUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_ENGINE_WS;
  if (envUrl) {
    return envUrl;
  }

  if (typeof window === 'undefined') {
    return 'ws://localhost:8080/ws';
  }

  const { protocol, hostname, port } = window.location;
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';

  const shouldUseDefaultPort = !port || ['3000', '3001', '3002'].includes(port);
  const targetPort = shouldUseDefaultPort
    ? (wsProtocol === 'wss:' ? '443' : '8080')
    : port;

  const authority = `${hostname}${targetPort ? `:${targetPort}` : ''}`;
  return `${wsProtocol}//${authority}/ws`;
};

type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'handshake'
  | 'awaiting_snapshot'
  | 'live'
  | 'error'
  | 'disconnected';

interface EngineState {
  status: ConnectionStatus;
  userId?: string;
  username?: string;
  balance: number;
  timeframe?: TimeFrame;
  priceSeries: EnginePricePoint[];
  contracts: EngineContractSnapshot[];
  positions: Record<string, BoxHitPosition>;
  snapshotVersion: number;
  lastTick?: EnginePricePoint;
  error?: string;
}

type EngineAction =
  | { type: 'SET_STATUS'; status: ConnectionStatus; error?: string }
  | { type: 'SET_WELCOME'; payload: { userId: string; username: string; balance: number } }
  | { type: 'SET_SNAPSHOT'; payload: { timeframe: TimeFrame; priceHistory: EnginePricePoint[]; contracts: EngineContractSnapshot[] } }
  | { type: 'ADD_TICK'; payload: EnginePricePoint }
  | { type: 'SET_CONTRACTS'; payload: EngineContractSnapshot[] }
  | { type: 'SET_BALANCE'; payload: number }
  | { type: 'UPSERT_POSITION'; payload: BoxHitPosition }
  | { type: 'RESOLVE_POSITION'; payload: { tradeId: string; contractId: string; result: 'win' | 'loss'; payout: number; profit: number; timestamp: number; balance: number } }
  | { type: 'SET_ERROR'; error?: string }
  | { type: 'RESET' };

const initialState: EngineState = {
  status: 'idle',
  balance: 0,
  priceSeries: [],
  contracts: [],
  positions: {},
  snapshotVersion: 0,
};

function trimPriceSeries(series: EnginePricePoint[]): EnginePricePoint[] {
  if (series.length <= MAX_PRICE_POINTS) {
    return series;
  }
  return series.slice(series.length - MAX_PRICE_POINTS);
}

function reducer(state: EngineState, action: EngineAction): EngineState {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, status: action.status, error: action.error };
    case 'SET_WELCOME':
      return {
        ...state,
        userId: action.payload.userId,
        username: action.payload.username,
        balance: action.payload.balance,
        status: state.status === 'handshake' ? 'awaiting_snapshot' : state.status,
      };
    case 'SET_SNAPSHOT': {
      return {
        ...state,
        status: 'live',
        timeframe: action.payload.timeframe,
        priceSeries: trimPriceSeries([...action.payload.priceHistory]),
        contracts: action.payload.contracts,
        snapshotVersion: state.snapshotVersion + 1,
        error: undefined,
      };
    }
    case 'ADD_TICK': {
      const nextSeries = trimPriceSeries([...state.priceSeries, action.payload]);
      return {
        ...state,
        priceSeries: nextSeries,
        lastTick: action.payload,
      };
    }
    case 'SET_CONTRACTS':
      return { ...state, contracts: action.payload };
    case 'SET_BALANCE':
      return { ...state, balance: action.payload };
    case 'UPSERT_POSITION': {
      const positions = { ...state.positions, [action.payload.tradeId]: action.payload };
      return { ...state, positions };
    }
    case 'RESOLVE_POSITION': {
      const key = action.payload.tradeId;
      const existing = state.positions[key];
      if (!existing) {
        return { ...state, balance: action.payload.balance };
      }
      const updated: BoxHitPosition = {
        ...existing,
        result: action.payload.result,
        payout: action.payload.payout,
        settledAt: new Date(action.payload.timestamp),
      };
      const positions = { ...state.positions, [key]: updated };
      return { ...state, positions, balance: action.payload.balance };
    }
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

export interface BoxHitEngineHandle {
  state: EngineState;
  priceSeries: EnginePricePoint[];
  contracts: EngineContractSnapshot[];
  positions: Map<string, BoxHitPosition>;
  lastPrice?: EnginePricePoint;
  connect: (username?: string) => void;
  disconnect: () => void;
  subscribe: (timeframe: TimeFrame) => void;
  placeTrade: (contractId: string, amount: number) => void;
}

export function useBoxHitEngine(): BoxHitEngineHandle {
  const [state, dispatch] = useReducer(reducer, initialState);
  const wsRef = useRef<WebSocket | null>(null);
  const shouldConnectRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTimeframeRef = useRef<TimeFrame | null>(null);
  const usernameRef = useRef<string>('');
  const currentTimeframeRef = useRef<TimeFrame | undefined>(undefined);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: EngineClientMessage) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    if (process.env.NODE_ENV === 'development') {
      console.debug('[boxHitEngine] →', message);
    }
    wsRef.current.send(JSON.stringify(message));
  }, []);

  const handleServerMessage = useCallback((event: MessageEvent<string>) => {
    let message: EngineServerMessage;
    try {
      message = JSON.parse(event.data) as EngineServerMessage;
    } catch (error) {
      dispatch({ type: 'SET_STATUS', status: 'error', error: 'Malformed server message.' });
      return;
    }

    switch (message.type) {
      case 'welcome':
        if (process.env.NODE_ENV === 'development') {
          console.debug('[boxHitEngine] welcome', message.payload);
        }
        dispatch({ type: 'SET_WELCOME', payload: message.payload });
        if (pendingTimeframeRef.current) {
          sendMessage({ type: 'subscribe', payload: { timeframe: pendingTimeframeRef.current } });
        }
        break;
      case 'snapshot':
        if (process.env.NODE_ENV === 'development') {
          console.debug('[boxHitEngine] snapshot', message.payload);
        }
        currentTimeframeRef.current = message.payload.timeframe;
        dispatch({ type: 'SET_SNAPSHOT', payload: message.payload });
        break;
      case 'price_tick':
        dispatch({ type: 'ADD_TICK', payload: message.payload });
        break;
      case 'contract_update':
        if (
          currentTimeframeRef.current !== undefined
          && message.payload.timeframe !== currentTimeframeRef.current
        ) {
          break;
        }
        dispatch({ type: 'SET_CONTRACTS', payload: message.payload.contracts });
        break;
      case 'trade_confirmed': {
        const position: BoxHitPosition = {
          contractId: message.payload.contractId,
          amount: message.payload.amount,
          timestamp: message.payload.timestamp,
          tradeId: message.payload.tradeId,
        };
        dispatch({ type: 'UPSERT_POSITION', payload: position });
        dispatch({ type: 'SET_BALANCE', payload: message.payload.balance });
        break;
      }
      case 'trade_result': {
        dispatch({
          type: 'RESOLVE_POSITION',
          payload: {
            tradeId: message.payload.tradeId,
            contractId: message.payload.contractId,
            result: message.payload.won ? 'win' : 'loss',
            payout: message.payload.payout,
            profit: message.payload.profit,
            timestamp: message.payload.timestamp,
            balance: message.payload.balance,
          },
        });
        break;
      }
      case 'balance_update':
        dispatch({ type: 'SET_BALANCE', payload: message.payload.balance });
        break;
      case 'engine_status':
        if (message.payload.status === 'error') {
          dispatch({ type: 'SET_STATUS', status: 'error', error: message.payload.message ?? 'Engine error' });
        }
        break;
      case 'ack':
        if (!message.payload.ok) {
          dispatch({ type: 'SET_ERROR', error: message.payload.error ?? 'Command failed' });
        }
        break;
      case 'error':
        dispatch({ type: 'SET_ERROR', error: message.payload.message });
        break;
      case 'heartbeat':
        sendMessage({ type: 'pong', payload: { timestamp: Date.now() } });
        break;
      default:
        break;
    }
  }, [sendMessage]);

  const openSocket = useCallback(() => {
    if (!shouldConnectRef.current || wsRef.current) {
      return;
    }
    clearReconnectTimer();
    dispatch({ type: 'SET_STATUS', status: 'connecting', error: undefined });

    const url = getEngineUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      dispatch({ type: 'SET_STATUS', status: 'handshake', error: undefined });
      const hello: EngineClientMessage = {
        type: 'hello',
        payload: usernameRef.current
          ? { username: usernameRef.current }
          : undefined,
      };
      sendMessage(hello);
      if (pendingTimeframeRef.current) {
        sendMessage({ type: 'subscribe', payload: { timeframe: pendingTimeframeRef.current } });
        dispatch({ type: 'SET_STATUS', status: 'awaiting_snapshot' });
      }
    };

    ws.onmessage = (event) => {
      handleServerMessage(event as MessageEvent<string>);
    };

    ws.onerror = () => {
      dispatch({ type: 'SET_STATUS', status: 'error', error: 'WebSocket error occurred.' });
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (shouldConnectRef.current) {
        dispatch({ type: 'SET_STATUS', status: 'disconnected', error: undefined });
        reconnectTimerRef.current = setTimeout(() => {
          openSocket();
        }, RECONNECT_DELAY_MS);
      } else {
        dispatch({ type: 'SET_STATUS', status: 'idle', error: undefined });
      }
    };
  }, [clearReconnectTimer, handleServerMessage, sendMessage]);

  const connect = useCallback((username?: string) => {
    shouldConnectRef.current = true;
    if (username) {
      usernameRef.current = username;
    } else if (!usernameRef.current) {
      usernameRef.current = `player_${Math.random().toString(36).slice(2, 9)}`;
    }
    openSocket();
  }, [openSocket]);

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;
    clearReconnectTimer();
    dispatch({ type: 'RESET' });
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    pendingTimeframeRef.current = null;
    currentTimeframeRef.current = undefined;
  }, [clearReconnectTimer]);

  const subscribe = useCallback((timeframe: TimeFrame) => {
    pendingTimeframeRef.current = timeframe;
    currentTimeframeRef.current = timeframe;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      sendMessage({ type: 'subscribe', payload: { timeframe } });
      dispatch({ type: 'SET_STATUS', status: 'awaiting_snapshot', error: undefined });
    }
  }, [sendMessage]);

  const placeTrade = useCallback((contractId: string, amount: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    sendMessage({ type: 'place_trade', payload: { contractId, amount } });
  }, [sendMessage]);

  useEffect(() => () => {
    disconnect();
  }, [disconnect]);

  useEffect(() => {
    currentTimeframeRef.current = state.timeframe;
  }, [state.timeframe]);

  const positions = useMemo(() => {
    return new Map<string, BoxHitPosition>(Object.entries(state.positions));
  }, [state.positions]);

  return {
    state,
    priceSeries: state.priceSeries,
    contracts: state.contracts,
    positions,
    lastPrice: state.lastTick,
    connect,
    disconnect,
    subscribe,
    placeTrade,
  };
}
