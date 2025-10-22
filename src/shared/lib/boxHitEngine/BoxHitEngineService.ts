import { EventEmitter } from '@/shared/lib/canvasLogic/utils/EventEmitter';
import type { TimeFrame } from '@/shared/types/timeframe';
import type {
  EngineClientMessage,
  EngineContractSnapshot,
  EnginePricePoint,
  EngineServerMessage,
} from '@/shared/types/boxHitEngine';
import type { BoxHitPosition } from '@/shared/types/boxHit';

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

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'handshake'
  | 'awaiting_snapshot'
  | 'live'
  | 'error'
  | 'disconnected';

export interface EngineState {
  status: ConnectionStatus;
  userId?: string;
  username?: string;
  balance: number;
  locked: number;
  timeframe?: TimeFrame;
  priceSeries: EnginePricePoint[];
  contracts: EngineContractSnapshot[];
  positions: Record<string, BoxHitPosition>;
  snapshotVersion: number;
  lastTick?: EnginePricePoint;
  error?: string;
  lastPlaceTradeError?: {
    contractId?: string;
    error: string;
    at: number;
  };
}

type EngineAction =
  | { type: 'SET_STATUS'; status: ConnectionStatus; error?: string }
  | { type: 'SET_WELCOME'; payload: { userId: string; username: string; balance: number; locked?: number } }
  | { type: 'SET_SNAPSHOT'; payload: { timeframe: TimeFrame; priceHistory: EnginePricePoint[]; contracts: EngineContractSnapshot[] } }
  | { type: 'ADD_TICK'; payload: EnginePricePoint }
  | { type: 'SET_CONTRACTS'; payload: EngineContractSnapshot[] }
  | { type: 'SET_BALANCE'; payload: { balance: number; locked?: number } }
  | { type: 'SET_POSITIONS_SNAPSHOT'; payload: { positions: Record<string, BoxHitPosition>; balance?: number; locked?: number } }
  | { type: 'UPSERT_POSITION'; payload: BoxHitPosition }
  | { type: 'MARK_POSITION_VERIFIED'; payload: { tradeId: string; contractId: string; timestamp: number } }
  | { type: 'RESOLVE_POSITION'; payload: { tradeId: string; contractId: string; result: 'win' | 'loss'; payout: number; profit: number; timestamp: number; balance: number } }
  | { type: 'SET_ERROR'; error?: string }
  | { type: 'PLACE_TRADE_FAILED'; payload: { contractId?: string; error: string } }
  | { type: 'RESET' };

export const createInitialEngineState = (): EngineState => ({
  status: 'idle',
  balance: 0,
  locked: 0,
  priceSeries: [],
  contracts: [],
  positions: {},
  snapshotVersion: 0,
  lastPlaceTradeError: undefined,
});

const _initialState: EngineState = createInitialEngineState();

const trimPriceSeries = (series: EnginePricePoint[]): EnginePricePoint[] => {
  if (series.length <= MAX_PRICE_POINTS) {
    return series;
  }
  return series.slice(series.length - MAX_PRICE_POINTS);
};

const reducer = (state: EngineState, action: EngineAction): EngineState => {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, status: action.status, error: action.error };
    case 'SET_WELCOME':
      return {
        ...state,
        userId: action.payload.userId,
        username: action.payload.username,
        balance: action.payload.balance,
        locked: typeof action.payload.locked === 'number' ? action.payload.locked : state.locked,
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
      return { ...state, balance: action.payload.balance, locked: action.payload.locked ?? state.locked };
    case 'SET_POSITIONS_SNAPSHOT':
      return {
        ...state,
        positions: action.payload.positions,
        balance: action.payload.balance ?? state.balance,
        locked: action.payload.locked ?? state.locked,
      };
    case 'UPSERT_POSITION': {
      const positions = { ...state.positions, [action.payload.tradeId]: action.payload };
      return { ...state, positions };
    }
    case 'MARK_POSITION_VERIFIED': {
      const existing = state.positions[action.payload.tradeId];
      const updated: BoxHitPosition = existing
        ? {
            ...existing,
            contractId: action.payload.contractId,
            result: 'win',
            verifiedAt: new Date(action.payload.timestamp),
          }
        : {
            contractId: action.payload.contractId,
            amount: 0,
            timestamp: action.payload.timestamp,
            tradeId: action.payload.tradeId,
            result: 'win',
            verifiedAt: new Date(action.payload.timestamp),
          };
      return {
        ...state,
        positions: {
          ...state.positions,
          [action.payload.tradeId]: updated,
        },
      };
    }
    case 'RESOLVE_POSITION': {
      const key = action.payload.tradeId;
      const existing = state.positions[key];
      if (!existing) {
        const fallback: BoxHitPosition = {
          contractId: action.payload.contractId,
          amount: 0,
          timestamp: action.payload.timestamp,
          tradeId: action.payload.tradeId,
          result: action.payload.result,
          payout: action.payload.payout,
          profit: action.payload.profit,
          settledAt: new Date(action.payload.timestamp),
        };
        const positions = { ...state.positions, [key]: fallback };
        return { ...state, positions, balance: action.payload.balance };
      }
      const updated: BoxHitPosition = {
        ...existing,
        result: action.payload.result,
        payout: action.payload.payout,
        profit: action.payload.profit,
        settledAt: new Date(action.payload.timestamp),
      };
      const positions = { ...state.positions, [key]: updated };
      return { ...state, positions, balance: action.payload.balance };
    }
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'PLACE_TRADE_FAILED':
      return {
        ...state,
        lastPlaceTradeError: {
          contractId: action.payload.contractId,
          error: action.payload.error,
          at: Date.now(),
        },
        error: action.payload.error,
      };
    case 'RESET':
      return createInitialEngineState();
    default:
      return state;
  }
};

type EngineEvents = {
  state: EngineState;
  placeTradeError: EngineState['lastPlaceTradeError'] | undefined;
};

export class BoxHitEngineService {
  private state: EngineState = createInitialEngineState();
  private emitter = new EventEmitter<EngineEvents>();
  private ws: WebSocket | null = null;
  private shouldConnect = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingTimeframe: TimeFrame | null = null;
  private username: string = '';
  private currentTimeframe?: TimeFrame;

  private readonly handleServerMessage = (event: MessageEvent<string>): void => {
    let message: EngineServerMessage;
    try {
      message = JSON.parse(event.data) as EngineServerMessage;
    } catch {
      this.dispatch({ type: 'SET_STATUS', status: 'error', error: 'Malformed server message.' });
      return;
    }

    switch (message.type) {
      case 'welcome':
        this.dispatch({ type: 'SET_WELCOME', payload: message.payload });
        if (this.pendingTimeframe) {
          this.sendMessage({ type: 'subscribe', payload: { timeframe: this.pendingTimeframe } });
        }
        break;
      case 'snapshot':
        this.currentTimeframe = message.payload.timeframe;
        this.dispatch({ type: 'SET_SNAPSHOT', payload: message.payload });
        break;
      case 'price_tick':
        this.dispatch({ type: 'ADD_TICK', payload: message.payload });
        break;
      case 'contract_update':
        if (
          this.currentTimeframe !== undefined
          && message.payload.timeframe !== this.currentTimeframe
        ) {
          break;
        }
        this.dispatch({ type: 'SET_CONTRACTS', payload: message.payload.contracts });
        break;
      case 'trade_confirmed': {
        const position: BoxHitPosition = {
          contractId: message.payload.contractId,
          amount: message.payload.amount,
          timestamp: message.payload.timestamp,
          tradeId: message.payload.tradeId,
        };
        this.dispatch({ type: 'UPSERT_POSITION', payload: position });
        this.dispatch({ type: 'SET_BALANCE', payload: { balance: message.payload.balance } });
        this.dispatch({ type: 'SET_ERROR', error: undefined });
        break;
      }
      case 'verification_hit': {
        this.dispatch({
          type: 'MARK_POSITION_VERIFIED',
          payload: {
            tradeId: message.payload.tradeId,
            contractId: message.payload.contractId,
            timestamp: message.payload.triggerTs,
          },
        });
        break;
      }
      case 'trade_result': {
        this.dispatch({
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
        this.dispatch({ type: 'SET_BALANCE', payload: { balance: message.payload.balance } });
        break;
      }
      case 'balance_update':
        this.dispatch({ type: 'SET_BALANCE', payload: { balance: message.payload.balance, locked: message.payload.locked } });
        break;
      case 'positions_snapshot': {
        const positions: Record<string, BoxHitPosition> = {};
        const mapEntry = (entry: typeof message.payload.openPositions[number]) => {
          positions[entry.tradeId] = {
            contractId: entry.contractId,
            amount: entry.amount,
            timestamp: entry.timestamp,
            tradeId: entry.tradeId,
            result: entry.result,
            payout: entry.payout,
            profit: entry.profit,
            settledAt: entry.settledAt ? new Date(entry.settledAt) : undefined,
          };
        };
        message.payload.openPositions.forEach(mapEntry);
        message.payload.history.forEach(mapEntry);
        this.dispatch({
          type: 'SET_POSITIONS_SNAPSHOT',
          payload: {
            positions,
            balance: message.payload.balance,
            locked: message.payload.locked,
          },
        });
        this.dispatch({ type: 'SET_ERROR', error: undefined });
        break;
      }
      case 'engine_status':
        if (message.payload.status === 'error') {
          this.dispatch({ type: 'SET_STATUS', status: 'error', error: message.payload.message ?? 'Engine error' });
        }
        break;
      case 'ack':
        if (!message.payload.ok) {
          const errorMessage = message.payload.error ?? 'Command failed';
          if (message.payload.command === 'place_trade') {
            this.dispatch({
              type: 'PLACE_TRADE_FAILED',
              payload: {
                contractId: message.payload.context?.contractId,
                error: errorMessage,
              },
            });
          } else {
            this.dispatch({ type: 'SET_ERROR', error: errorMessage });
          }
        }
        break;
      case 'error':
        this.dispatch({ type: 'SET_ERROR', error: message.payload.message });
        break;
      case 'heartbeat':
        this.sendMessage({ type: 'pong', payload: { timestamp: Date.now() } });
        break;
      default:
        break;
    }
  };

  private readonly handleSocketOpen = (): void => {
    this.dispatch({ type: 'SET_STATUS', status: 'handshake', error: undefined });
    const hello: EngineClientMessage = {
      type: 'hello',
      payload: this.username
        ? { username: this.username }
        : undefined,
    };
    this.sendMessage(hello);
    this.sendMessage({ type: 'get_positions', payload: {} });
    if (this.pendingTimeframe) {
      this.sendMessage({ type: 'subscribe', payload: { timeframe: this.pendingTimeframe } });
      this.dispatch({ type: 'SET_STATUS', status: 'awaiting_snapshot' });
    }
  };

  private readonly handleSocketError = (): void => {
    this.dispatch({ type: 'SET_STATUS', status: 'error', error: 'WebSocket error occurred.' });
  };

  private readonly handleSocketClose = (): void => {
    this.ws = null;
    if (this.shouldConnect) {
      this.dispatch({ type: 'SET_STATUS', status: 'disconnected', error: undefined });
      this.reconnectTimer = setTimeout(() => {
        this.openSocket();
      }, RECONNECT_DELAY_MS);
    } else {
      this.dispatch({ type: 'SET_STATUS', status: 'idle', error: undefined });
    }
  };

  connect(username?: string): void {
    this.shouldConnect = true;
    if (username) {
      this.username = username;
    } else if (!this.username) {
      this.username = `player_${Math.random().toString(36).slice(2, 9)}`;
    }
    this.openSocket();
  }

  disconnect(): void {
    this.shouldConnect = false;
    this.clearReconnectTimer();
    this.dispatch({ type: 'RESET' });
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pendingTimeframe = null;
    this.currentTimeframe = undefined;
  }

  subscribe(timeframe: TimeFrame): void {
    this.pendingTimeframe = timeframe;
    this.currentTimeframe = timeframe;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendMessage({ type: 'subscribe', payload: { timeframe } });
      this.dispatch({ type: 'SET_STATUS', status: 'awaiting_snapshot', error: undefined });
    }
  }

  placeTrade(contractId: string, amount: number): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    this.sendMessage({ type: 'place_trade', payload: { contractId, amount } });
  }

  getState(): EngineState {
    return this.state;
  }

  getPriceSeries(): EnginePricePoint[] {
    return this.state.priceSeries;
  }

  getContracts(): EngineContractSnapshot[] {
    return this.state.contracts;
  }

  getPositionsMap(): Map<string, BoxHitPosition> {
    return new Map<string, BoxHitPosition>(Object.entries(this.state.positions));
  }

  getLastPrice(): EnginePricePoint | undefined {
    return this.state.lastTick;
  }

  getLastPlaceTradeError(): EngineState['lastPlaceTradeError'] | undefined {
    return this.state.lastPlaceTradeError;
  }

  subscribeToState(listener: (state: EngineState) => void): () => void {
    this.emitter.on('state', listener);
    return () => this.emitter.off('state', listener);
  }

  subscribeToTradeErrors(listener: (error?: EngineState['lastPlaceTradeError']) => void): () => void {
    this.emitter.on('placeTradeError', listener);
    return () => this.emitter.off('placeTradeError', listener);
  }

  destroy(): void {
    this.disconnect();
    this.emitter.removeAllListeners();
  }

  private dispatch(action: EngineAction): void {
    const nextState = reducer(this.state, action);
    const errorChanged = nextState.lastPlaceTradeError !== this.state.lastPlaceTradeError;
    this.state = nextState;
    this.emitter.emit('state', this.state);
    if (errorChanged) {
      this.emitter.emit('placeTradeError', this.state.lastPlaceTradeError);
    }
  }

  private sendMessage(message: EngineClientMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    if (process.env.NODE_ENV === 'development') {
      console.debug('[boxHitEngine] →', message);
    }
    this.ws.send(JSON.stringify(message));
  }

  private openSocket(): void {
    if (!this.shouldConnect || this.ws) {
      return;
    }
    this.clearReconnectTimer();
    this.dispatch({ type: 'SET_STATUS', status: 'connecting', error: undefined });

    const url = getEngineUrl();
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = this.handleSocketOpen;
    ws.onmessage = (event) => {
      this.handleServerMessage(event as MessageEvent<string>);
    };
    ws.onerror = this.handleSocketError;
    ws.onclose = this.handleSocketClose;
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

let singleton: BoxHitEngineService | null = null;

export const getBoxHitEngineService = (): BoxHitEngineService => {
  if (!singleton) {
    singleton = new BoxHitEngineService();
  }
  return singleton;
};
