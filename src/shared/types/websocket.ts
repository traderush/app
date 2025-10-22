// WebSocket message types for the new architecture
import type { IronCondorId, TimeFrame, ContractId } from './contracts';
import type { GridBox } from './game';
import type { GameType } from './gameType';

// Base message structure
export interface WSMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
}

// Connection messages
export interface ConnectedMessage extends WSMessage<{
  userId: string;
  username: string;
  balance: number;
}> {
  type: 'connected';
}

// Game session messages
export interface GameJoinedMessage extends WSMessage<{
  sessionId: string;
  gameType: GameType;
  timeframe: TimeFrame;
  mode: 'unlimited' | 'timed' | 'limited_trades';
}> {
  type: 'game_joined';
}

export interface GameLeftMessage extends WSMessage<Record<string, never>> {
  type: 'game_left';
}

// Trading messages (updated to use contract IDs)
export interface PlaceTradeMessage extends WSMessage<{
  contractId: IronCondorId; // Replaces boxId
  amount: number;
  timeframe: TimeFrame;
}> {
  type: 'place_trade';
}

// Price update messages
export interface PriceUpdateMessage extends WSMessage<{
  price: number;
  timestamp: number;
  timeframe: TimeFrame;
}> {
  type: 'price_update';
}

// Multiplier messages (updated with contract IDs)
export interface BoxMultipliersMessage extends WSMessage<{
  timeframe: TimeFrame;
  multipliers: GridBox[];
}> {
  type: 'box_multipliers';
}

// Result messages (updated with contract IDs)
export interface BoxHitMessage extends WSMessage<{
  contractId: IronCondorId; // Replaces boxId
  multiplier: number;
  winners: Array<{
    userId: string;
    trade: number;
    payout: number;
  }>;
}> {
  type: 'box_hit';
}

// Balance update message
export interface BalanceUpdateMessage extends WSMessage<{
  balance: number;
  source: string;
}> {
  type: 'balance_update';
}

// Trade response messages
export interface TradePlacedMessage extends WSMessage<{
  contractId: ContractId;
  amount: number;
  balance: number;
  position: {
    userId: string;
    amount: number;
    timestamp: number;
  };
}> {
  type: 'trade_placed';
}

// Error message
export interface ErrorMessage extends WSMessage<{
  message: string;
  code?: string;
}> {
  type: 'error';
}

// State update message
export interface StateUpdateMessage extends WSMessage<{
  balance?: number;
  activeTrades?: Array<{
    id: string;
    contractId: ContractId;
    amount: number;
    placedAt: Date;
  }>;
}> {
  type: 'state_update';
}

// Message type union
export type WebSocketMessage = 
  | ConnectedMessage
  | GameJoinedMessage
  | GameLeftMessage
  | PlaceTradeMessage
  | PriceUpdateMessage
  | BoxMultipliersMessage
  | BoxHitMessage
  | BalanceUpdateMessage
  | TradePlacedMessage
  | ErrorMessage
  | StateUpdateMessage;
