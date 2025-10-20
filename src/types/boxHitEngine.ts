import { TimeFrame } from './timeframe';

export interface EngineContractSnapshot {
  contractId: string;
  orderId: string;
  orderbookId: string;
  timeframe: TimeFrame;
  startTime: number;
  endTime: number;
  lowerStrike: number;
  upperStrike: number;
  returnMultiplier: number;
  totalVolume: number;
  status: 'active' | 'triggered' | 'settled' | 'expired';
  type: 'IRON_CONDOR';
}

export interface EnginePricePoint {
  price: number;
  timestamp: number;
}

export interface EngineSnapshotPayload {
  timeframe: TimeFrame;
  priceHistory: EnginePricePoint[];
  contracts: EngineContractSnapshot[];
}

export type EngineServerMessage =
  | { type: 'welcome'; payload: { userId: string; username: string; balance: number; timeframes: TimeFrame[] } }
  | { type: 'snapshot'; payload: EngineSnapshotPayload }
  | { type: 'price_tick'; payload: EnginePricePoint }
  | { type: 'contract_update'; payload: { timeframe: TimeFrame; contracts: EngineContractSnapshot[] } }
  | { type: 'trade_confirmed'; payload: { contractId: string; amount: number; tradeId: string; balance: number; priceAtFill: number; timestamp: number } }
  | { type: 'trade_result'; payload: { contractId: string; tradeId: string; won: boolean; payout: number; profit: number; balance: number; timestamp: number } }
  | { type: 'balance_update'; payload: { balance: number; reason: string } }
  | { type: 'engine_status'; payload: { status: 'online' | 'degraded' | 'error'; message?: string } }
  | { type: 'heartbeat'; payload: { serverTime: number } }
  | { type: 'ack'; payload: { command: string; ok: boolean; error?: string } }
  | { type: 'error'; payload: { message: string } };

export type EngineClientMessage =
  | { type: 'hello'; payload?: { username?: string } }
  | { type: 'subscribe'; payload: { timeframe: TimeFrame } }
  | { type: 'unsubscribe'; payload: { timeframe: TimeFrame } }
  | { type: 'place_trade'; payload: { contractId: string; amount: number } }
  | { type: 'pong'; payload?: { timestamp?: number } }
  | { type: 'disconnect'; payload?: {} };
