import type { TimeFrame } from './timeframe';

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
  | { type: 'welcome'; payload: { userId: string; username: string; balance: number; locked: number; timeframes: TimeFrame[] } }
  | { type: 'snapshot'; payload: EngineSnapshotPayload }
  | { type: 'price_tick'; payload: EnginePricePoint }
  | { type: 'contract_update'; payload: { timeframe: TimeFrame; contracts: EngineContractSnapshot[] } }
  | { type: 'trade_confirmed'; payload: { contractId: string; amount: number; tradeId: string; balance: number; priceAtFill: number; timestamp: number } }
  | { type: 'verification_hit'; payload: { contractId: string; tradeId: string; price: number; triggerTs: number } }
  | { type: 'trade_result'; payload: { contractId: string; tradeId: string; won: boolean; payout: number; profit: number; balance: number; timestamp: number } }
  | { type: 'balance_update'; payload: { balance: number; delta: number; asset: string; locked: number; reason: string; metadata?: Record<string, unknown> } }
  | { type: 'positions_snapshot'; payload: { balance: number; locked: number; openPositions: Array<{
    tradeId: string;
    contractId: string;
    amount: number;
    timestamp: number;
    result?: 'win' | 'loss';
    payout?: number;
    profit?: number;
    settledAt?: number;
  }>; history: Array<{
    tradeId: string;
    contractId: string;
    amount: number;
    timestamp: number;
    result?: 'win' | 'loss';
    payout?: number;
    profit?: number;
    settledAt?: number;
  }> } }
  | { type: 'engine_status'; payload: { status: 'online' | 'degraded' | 'error'; message?: string } }
  | { type: 'heartbeat'; payload: { serverTime: number } }
  | { type: 'ack'; payload: { command: string; ok: boolean; error?: string; context?: { contractId?: string } } }
  | { type: 'error'; payload: { message: string } };

export type EngineClientMessage =
  | { type: 'hello'; payload?: { username?: string } }
  | { type: 'subscribe'; payload: { timeframe: TimeFrame } }
  | { type: 'unsubscribe'; payload: { timeframe: TimeFrame } }
  | { type: 'place_trade'; payload: { contractId: string; amount: number } }
  | { type: 'pong'; payload?: { timestamp?: number } }
  | { type: 'disconnect'; payload?: Record<string, never> }
  | { type: 'get_positions'; payload?: Record<string, never> };
