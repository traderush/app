/**
 * WebSocket message type definitions
 */

import { Message, GameMode, ErrorCode } from './common';
import { TimeFrame } from '../../clearingHouse';
import { GameContract, Position, LeaderboardEntry } from './common';

// Client message types
export enum ClientMessageType {
  AUTH = 'auth',
  JOIN_GAME = 'join_game',
  LEAVE_GAME = 'leave_game',
  PLACE_TRADE = 'place_trade',
  GET_STATE = 'get_state',
  GET_LEADERBOARD = 'get_leaderboard',
  GET_GAME_CONFIG = 'get_game_config'
}

// Server message types
export enum ServerMessageType {
  CONNECTED = 'connected',
  GAME_JOINED = 'game_joined',
  GAME_LEFT = 'game_left',
  TRADE_CONFIRMED = 'trade_confirmed',
  TRADE_RESULT = 'trade_result',
  PRICE_UPDATE = 'price_update',
  BALANCE_UPDATE = 'balance_update',
  CONTRACT_UPDATE = 'contract_update',
  LEADERBOARD_UPDATE = 'leaderboard_update',
  STATE_UPDATE = 'state_update',
  ERROR = 'error',
  HEARTBEAT = 'heartbeat',
  GAME_CONFIG = 'game_config'
}

// Client message payloads
export interface AuthPayload {
  token: string;
}

export interface JoinGamePayload {
  mode: GameMode;
  timeframe: TimeFrame;
}

export interface LeaveGamePayload {
  // No payload needed
}

export interface PlaceTradePayload {
  contractId: string;
  amount: number;
}

export interface GetStatePayload {
  // No payload needed
}

export interface GetLeaderboardPayload {
  gameMode?: GameMode;
  limit?: number;
}

export interface GetGameConfigPayload {
  gameMode?: GameMode;
}

// Server message payloads
export interface ConnectedPayload {
  userId: string;
  username: string;
  balance: number;
  serverTime: number;
}

export interface GameJoinedPayload {
  sessionId: string;
  mode: GameMode;
  timeframe: TimeFrame;
  contracts: GameContract[];
  currentPrice: number;
}

export interface GameLeftPayload {
  sessionId: string;
}

export interface TradeConfirmedPayload {
  tradeId: string;
  contractId: string;
  amount: number;
  balance: number;
  position: Position;
}

export interface TradeResultPayload {
  tradeId: string;
  contractId: string;
  won: boolean;
  payout: number;
  balance: number;
  profit: number;
}

export interface PriceUpdatePayload {
  price: number;
  timestamp: number;
  change: number;
  changePercent: number;
}

export interface BalanceUpdatePayload {
  balance: number;
  change: number;
  reason: 'trade' | 'settlement' | 'deposit' | 'withdrawal';
}

export interface ContractUpdatePayload {
  gameMode: GameMode;
  timeframe: TimeFrame;
  contracts: GameContract[];
  updateType: 'new' | 'update' | 'expired';
}

export interface LeaderboardUpdatePayload {
  gameMode?: GameMode;
  entries: LeaderboardEntry[];
  userRank?: number;
}

export interface StateUpdatePayload {
  balance: number;
  activeSessions: Array<{
    sessionId: string;
    gameMode: GameMode;
    timeframe: TimeFrame;
  }>;
  activePositions: Position[];
  stats: {
    totalProfit: number;
    totalVolume: number;
    winRate: number;
    tradesCount: number;
  };
}

export interface ErrorPayload {
  code: ErrorCode;
  message: string;
  details?: any;
}

export interface HeartbeatPayload {
  serverTime: number;
}

export interface GameConfigPayload {
  gameMode: GameMode;
  config: {
    priceStep: number;
    timeStep: number;
    numRows: number;
    numColumns: number;
    basePrice: number;
  };
}

// Type-safe message definitions
export type AuthMessage = Message<ClientMessageType.AUTH, AuthPayload>;
export type JoinGameMessage = Message<ClientMessageType.JOIN_GAME, JoinGamePayload>;
export type LeaveGameMessage = Message<ClientMessageType.LEAVE_GAME, LeaveGamePayload>;
export type PlaceTradeMessage = Message<ClientMessageType.PLACE_TRADE, PlaceTradePayload>;
export type GetStateMessage = Message<ClientMessageType.GET_STATE, GetStatePayload>;
export type GetLeaderboardMessage = Message<ClientMessageType.GET_LEADERBOARD, GetLeaderboardPayload>;
export type GetGameConfigMessage = Message<ClientMessageType.GET_GAME_CONFIG, GetGameConfigPayload>;

export type ConnectedMessage = Message<ServerMessageType.CONNECTED, ConnectedPayload>;
export type GameJoinedMessage = Message<ServerMessageType.GAME_JOINED, GameJoinedPayload>;
export type GameLeftMessage = Message<ServerMessageType.GAME_LEFT, GameLeftPayload>;
export type TradeConfirmedMessage = Message<ServerMessageType.TRADE_CONFIRMED, TradeConfirmedPayload>;
export type TradeResultMessage = Message<ServerMessageType.TRADE_RESULT, TradeResultPayload>;
export type PriceUpdateMessage = Message<ServerMessageType.PRICE_UPDATE, PriceUpdatePayload>;
export type BalanceUpdateMessage = Message<ServerMessageType.BALANCE_UPDATE, BalanceUpdatePayload>;
export type ContractUpdateMessage = Message<ServerMessageType.CONTRACT_UPDATE, ContractUpdatePayload>;
export type LeaderboardUpdateMessage = Message<ServerMessageType.LEADERBOARD_UPDATE, LeaderboardUpdatePayload>;
export type StateUpdateMessage = Message<ServerMessageType.STATE_UPDATE, StateUpdatePayload>;
export type ErrorMessage = Message<ServerMessageType.ERROR, ErrorPayload>;
export type HeartbeatMessage = Message<ServerMessageType.HEARTBEAT, HeartbeatPayload>;
export type GameConfigMessage = Message<ServerMessageType.GAME_CONFIG, GameConfigPayload>;

// Union types
export type ClientMessage =
  | AuthMessage
  | JoinGameMessage
  | LeaveGameMessage
  | PlaceTradeMessage
  | GetStateMessage
  | GetLeaderboardMessage
  | GetGameConfigMessage;

export type ServerMessage =
  | ConnectedMessage
  | GameJoinedMessage
  | GameLeftMessage
  | TradeConfirmedMessage
  | TradeResultMessage
  | PriceUpdateMessage
  | BalanceUpdateMessage
  | ContractUpdateMessage
  | LeaderboardUpdateMessage
  | StateUpdateMessage
  | ErrorMessage
  | HeartbeatMessage
  | GameConfigMessage;

// Helper to create messages with proper structure
export function createMessage<T extends string, P>(
  type: T,
  payload: P,
  messageId: string = generateMessageId()
): Message<T, P> {
  return {
    type,
    payload,
    timestamp: Date.now(),
    messageId
  };
}

// Generate unique message ID
function generateMessageId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}