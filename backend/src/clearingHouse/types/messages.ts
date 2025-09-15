// WebSocket Message Types for ClearingHouse
// All message types and enums are defined here

import { TimeFrame } from './index';

// Trading Market Types
export enum MarketType {
  IRON_CONDOR = 'iron_condor',
  SPREAD = 'spread'
}

// Message Type Enums
export enum ClientMessageType {
  CONNECT = 'connect',
  JOIN_SESSION = 'join_session',
  LEAVE_SESSION = 'leave_session',
  PLACE_TRADE = 'place_trade',
  PLACE_SPREAD_TRADE = 'place_spread_trade',
  UPDATE_VIEWPORT = 'update_viewport',
  GET_STATE = 'get_state'
}

export enum ServerMessageType {
  CONNECTED = 'connected',
  SESSION_JOINED = 'session_joined',
  SESSION_LEFT = 'session_left',
  PRICE_UPDATE = 'price_update',
  IRON_CONDOR_CONTRACTS = 'iron_condor_contracts',
  SPREAD_CONTRACTS = 'spread_contracts',
  CONTRACT_EXERCISED = 'contract_exercised',
  CONTRACT_EXPIRED = 'contract_expired',
  SPREAD_EXERCISED = 'spread_exercised',
  SPREAD_MISSED = 'spread_missed',
  TRADE_PLACED = 'trade_placed',
  BALANCE_UPDATE = 'balance_update',
  ERROR = 'error',
  STATE_UPDATE = 'state_update'
}

// Base message structure
export interface WSMessage<T = any> {
  type: string;
  payload: T;
  timestamp: number;
}

// Client Message Payloads
export interface ConnectPayload {
  username: string;
}

export interface JoinSessionPayload {
  marketType: MarketType;
  timeframe: TimeFrame;
}

export interface PlaceTradePayload {
  contractId: string;
  amount: number;
  timeframe: TimeFrame;
}

export interface PlaceSpreadTradePayload {
  contractId: string;
  amount: number;
  timeframe: TimeFrame;
  strikePrice: number;
}

export interface UpdateViewportPayload {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

// Server Message Payloads
export interface ConnectedPayload {
  userId: string;
  username: string;
  balance: number;
}

export interface SessionJoinedPayload {
  sessionId: string;
  marketType: MarketType;
  timeframe: TimeFrame;
  mode: 'unlimited' | 'timed' | 'limited_trades';
}

export interface PriceUpdatePayload {
  price: number;
  timestamp: number;
  timeframe: TimeFrame;
}

export interface IronCondorContractsPayload {
  timeframe: TimeFrame;
  contracts: Array<{
    contractId: string;
    returnMultiplier: number;
    lowerStrike: number;
    upperStrike: number;
    isActive: boolean;
    totalVolume: number;
  }>;
}

export interface SpreadContractsPayload {
  timeframe: TimeFrame;
  contracts: Array<{
    contractId: string;
    returnMultiplier: number;
    strikePrice: number;
    type: 'call' | 'put';
    isActive: boolean;
    totalVolume: number;
  }>;
}

export interface ContractExercisedPayload {
  contractId: string;
  returnMultiplier: number;
  winners: Array<{
    userId: string;
    trade: number;
    payout: number;
  }>;
}

export interface ContractExpiredPayload {
  contractId: string;
  returnMultiplier: number;
  losers: Array<{
    userId: string;
    trade: number;
  }>;
}

export interface SpreadExercisedPayload {
  contractId: string;
  type: 'call' | 'put';
  returnMultiplier: number;
  strikePrice: number;
  winners: Array<{
    userId: string;
    trade: number;
    payout: number;
  }>;
}

export interface SpreadMissedPayload {
  contractId: string;
  type: 'call' | 'put';
  returnMultiplier: number;
  strikePrice: number;
}

export interface TradePlacedPayload {
  contractId: string;
  amount: number;
  balance: number;
  position: {
    userId: string;
    amount: number;
    timestamp: number;
  };
}

export interface BalanceUpdatePayload {
  balance: number;
  source: string;
}

export interface ErrorPayload {
  message: string;
  code?: string;
}

export interface StateUpdatePayload {
  balance?: number;
  activeTrades?: Array<{
    id: string;
    contractId: string;
    amount: number;
    placedAt: number;
  }>;
}

// Client Messages
export interface ConnectMessage extends WSMessage<ConnectPayload> {
  type: ClientMessageType.CONNECT;
}

export interface JoinSessionMessage extends WSMessage<JoinSessionPayload> {
  type: ClientMessageType.JOIN_SESSION;
}

export interface LeaveSessionMessage extends WSMessage<null> {
  type: ClientMessageType.LEAVE_SESSION;
}

export interface PlaceTradeMessage extends WSMessage<PlaceTradePayload> {
  type: ClientMessageType.PLACE_TRADE;
}

export interface PlaceSpreadTradeMessage extends WSMessage<PlaceSpreadTradePayload> {
  type: ClientMessageType.PLACE_SPREAD_TRADE;
}

export interface UpdateViewportMessage extends WSMessage<UpdateViewportPayload> {
  type: ClientMessageType.UPDATE_VIEWPORT;
}

export interface GetStateMessage extends WSMessage<null> {
  type: ClientMessageType.GET_STATE;
}

// Server Messages
export interface ConnectedMessage extends WSMessage<ConnectedPayload> {
  type: ServerMessageType.CONNECTED;
}

export interface SessionJoinedMessage extends WSMessage<SessionJoinedPayload> {
  type: ServerMessageType.SESSION_JOINED;
}

export interface SessionLeftMessage extends WSMessage<null> {
  type: ServerMessageType.SESSION_LEFT;
}

export interface PriceUpdateMessage extends WSMessage<PriceUpdatePayload> {
  type: ServerMessageType.PRICE_UPDATE;
}

export interface IronCondorContractsMessage extends WSMessage<IronCondorContractsPayload> {
  type: ServerMessageType.IRON_CONDOR_CONTRACTS;
}

export interface SpreadContractsMessage extends WSMessage<SpreadContractsPayload> {
  type: ServerMessageType.SPREAD_CONTRACTS;
}

export interface ContractExercisedMessage extends WSMessage<ContractExercisedPayload> {
  type: ServerMessageType.CONTRACT_EXERCISED;
}

export interface ContractExpiredMessage extends WSMessage<ContractExpiredPayload> {
  type: ServerMessageType.CONTRACT_EXPIRED;
}

export interface SpreadExercisedMessage extends WSMessage<SpreadExercisedPayload> {
  type: ServerMessageType.SPREAD_EXERCISED;
}

export interface SpreadMissedMessage extends WSMessage<SpreadMissedPayload> {
  type: ServerMessageType.SPREAD_MISSED;
}

export interface TradePlacedMessage extends WSMessage<TradePlacedPayload> {
  type: ServerMessageType.TRADE_PLACED;
}

export interface BalanceUpdateMessage extends WSMessage<BalanceUpdatePayload> {
  type: ServerMessageType.BALANCE_UPDATE;
}

export interface ErrorMessage extends WSMessage<ErrorPayload> {
  type: ServerMessageType.ERROR;
}

export interface StateUpdateMessage extends WSMessage<StateUpdatePayload> {
  type: ServerMessageType.STATE_UPDATE;
}

// Type unions
export type ClientMessage = 
  | ConnectMessage
  | JoinSessionMessage
  | LeaveSessionMessage
  | PlaceTradeMessage
  | PlaceSpreadTradeMessage
  | UpdateViewportMessage
  | GetStateMessage;

export type ServerMessage = 
  | ConnectedMessage
  | SessionJoinedMessage
  | SessionLeftMessage
  | PriceUpdateMessage
  | IronCondorContractsMessage
  | SpreadContractsMessage
  | ContractExercisedMessage
  | ContractExpiredMessage
  | SpreadExercisedMessage
  | SpreadMissedMessage
  | TradePlacedMessage
  | BalanceUpdateMessage
  | ErrorMessage
  | StateUpdateMessage;

// Payload validation functions
export function isValidConnectPayload(payload: any): payload is ConnectPayload {
  return payload && typeof payload.username === 'string';
}

export function isValidJoinSessionPayload(payload: any): payload is JoinSessionPayload {
  return payload &&
    Object.values(MarketType).includes(payload.marketType) &&
    Object.values(TimeFrame).includes(payload.timeframe);
}

export function isValidPlaceTradePayload(payload: any): payload is PlaceTradePayload {
  return payload &&
    typeof payload.contractId === 'string' &&
    typeof payload.amount === 'number' &&
    payload.amount > 0 &&
    Object.values(TimeFrame).includes(payload.timeframe);
}

export function isValidPlaceSpreadTradePayload(payload: any): payload is PlaceSpreadTradePayload {
  return payload &&
    typeof payload.contractId === 'string' &&
    typeof payload.amount === 'number' &&
    payload.amount > 0 &&
    typeof payload.strikePrice === 'number' &&
    Object.values(TimeFrame).includes(payload.timeframe);
}

export function isValidUpdateViewportPayload(payload: any): payload is UpdateViewportPayload {
  return payload &&
    typeof payload.startRow === 'number' &&
    typeof payload.endRow === 'number' &&
    typeof payload.startCol === 'number' &&
    typeof payload.endCol === 'number' &&
    payload.startRow >= 0 &&
    payload.endRow >= payload.startRow &&
    payload.startCol >= 0 &&
    payload.endCol >= payload.startCol;
}

// Helper to validate client messages
export function validateClientMessage(message: any): message is ClientMessage {
  if (!message || typeof message.type !== 'string' || !message.payload) {
    return false;
  }
  
  // Validate specific message types
  switch (message.type) {
    case ClientMessageType.CONNECT:
      return isValidConnectPayload(message.payload);
    
    case ClientMessageType.JOIN_SESSION:
      return isValidJoinSessionPayload(message.payload);
    
    case ClientMessageType.PLACE_TRADE:
      return isValidPlaceTradePayload(message.payload);
    
    case ClientMessageType.PLACE_SPREAD_TRADE:
      return isValidPlaceSpreadTradePayload(message.payload);
    
    case ClientMessageType.UPDATE_VIEWPORT:
      return isValidUpdateViewportPayload(message.payload);
    
    case ClientMessageType.GET_STATE:
      return message.payload === null;
    
    case ClientMessageType.LEAVE_SESSION:
      return message.payload === null;
    
    default:
      return false;
  }
}

// Helper to validate server messages
export function validateServerMessage(message: any): message is ServerMessage {
  if (!message || typeof message.type !== 'string' || !message.payload) {
    return false;
  }
  
  // Validate specific message types
  switch (message.type) {
    case ServerMessageType.CONNECTED:
      return typeof message.payload.userId === 'string' &&
        typeof message.payload.username === 'string' &&
        typeof message.payload.balance === 'number';
    
    case ServerMessageType.SESSION_JOINED:
      return typeof message.payload.sessionId === 'string' &&
        Object.values(MarketType).includes(message.payload.marketType) &&
        Object.values(TimeFrame).includes(message.payload.timeframe);
    
    case ServerMessageType.PRICE_UPDATE:
      return typeof message.payload.price === 'number' &&
        typeof message.payload.timestamp === 'number';
    
    case ServerMessageType.BALANCE_UPDATE:
      return typeof message.payload.balance === 'number' &&
        typeof message.payload.source === 'string';
    
    case ServerMessageType.ERROR:
      return typeof message.payload.message === 'string';
    
    // Add more validation as needed
    default:
      return true; // For now, accept other message types
  }
}