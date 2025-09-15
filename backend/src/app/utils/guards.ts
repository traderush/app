/**
 * Type guards and assertions for runtime type checking
 */

import { 
  ClientMessage, 
  ServerMessage, 
  ClientMessageType,
  ServerMessageType,
  AppError,
  Result
} from '../types';

// Client message type guards
export function isAuthMessage(msg: ClientMessage): msg is ClientMessage & { type: ClientMessageType.AUTH } {
  return msg.type === ClientMessageType.AUTH;
}

export function isJoinGameMessage(msg: ClientMessage): msg is ClientMessage & { type: ClientMessageType.JOIN_GAME } {
  return msg.type === ClientMessageType.JOIN_GAME;
}

export function isPlaceTradeMessage(msg: ClientMessage): msg is ClientMessage & { type: ClientMessageType.PLACE_TRADE } {
  return msg.type === ClientMessageType.PLACE_TRADE;
}

// Server message type guards
export function isErrorMessage(msg: ServerMessage): msg is ServerMessage & { type: ServerMessageType.ERROR } {
  return msg.type === ServerMessageType.ERROR;
}

export function isPriceUpdateMessage(msg: ServerMessage): msg is ServerMessage & { type: ServerMessageType.PRICE_UPDATE } {
  return msg.type === ServerMessageType.PRICE_UPDATE;
}

// Error type guards
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

// Result type guards (already in common.ts but adding here for completeness)
export function assertSuccess<T>(result: Result<T>): asserts result is { success: true; data: T } {
  if (!result.success) {
    throw result.error;
  }
}

// WebSocket type guards
export function isWebSocketOpen(ws: any): boolean {
  return ws && ws.readyState === 1; // WebSocket.OPEN
}

// Number validation guards
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && value > 0 && Number.isFinite(value);
}

export function isValidBalance(balance: unknown): balance is number {
  return typeof balance === 'number' && balance >= 0 && Number.isFinite(balance);
}

// String validation guards
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

// Array guards
export function isNonEmptyArray<T>(arr: T[]): arr is [T, ...T[]] {
  return Array.isArray(arr) && arr.length > 0;
}

// Object guards
export function hasProperty<T extends object, K extends string | number | symbol>(
  obj: T,
  key: K
): obj is T & Record<K, unknown> {
  return key in obj;
}

// Assertion functions
export function assertDefined<T>(value: T | undefined | null, message: string = 'Value is not defined'): asserts value is T {
  if (value === undefined || value === null) {
    throw new Error(message);
  }
}

export function assertPositiveNumber(value: unknown, fieldName: string): asserts value is number {
  if (!isPositiveNumber(value)) {
    throw new Error(`${fieldName} must be a positive number`);
  }
}

export function assertValidBalance(balance: unknown): asserts balance is number {
  if (!isValidBalance(balance)) {
    throw new Error('Invalid balance value');
  }
}

// Exhaustive check for switch statements
export function assertNever(x: never, message: string = 'Unexpected value'): never {
  throw new Error(`${message}: ${x}`);
}