/**
 * Common base types used throughout the application
 */

// Note: Import TimeFrame directly from clearingHouse/types when needed

// Game modes available in the app
export enum GameMode {
  BOX_HIT = 'box_hit'
}

// Base message structure for all WebSocket communication
export interface Message<T extends string, P = any> {
  type: T;
  payload: P;
  timestamp: number;
  messageId: string; // For idempotency
}

// Error codes for consistent error handling
export enum ErrorCode {
  // Authentication errors
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_MESSAGE = 'INVALID_MESSAGE',
  INVALID_PAYLOAD = 'INVALID_PAYLOAD',
  
  // Game errors
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INVALID_CONTRACT = 'INVALID_CONTRACT',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  NO_ACTIVE_SESSION = 'NO_ACTIVE_SESSION',
  ALREADY_IN_SESSION = 'ALREADY_IN_SESSION',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMITED = 'RATE_LIMITED'
}

// Custom error class for consistent error handling
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes
export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(ErrorCode.VALIDATION_ERROR, message, 400);
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(required: number, available: number) {
    super(
      ErrorCode.INSUFFICIENT_BALANCE,
      `Insufficient balance. Required: ${required}, Available: ${available}`,
      400,
      true,
      { required, available }
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(ErrorCode.UNAUTHORIZED, message, 401);
  }
}

// Result type for safe error handling
export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };

// Utility function to create results
export const ok = <T>(data: T): Result<T> => ({
  success: true,
  data
});

export const err = <E = AppError>(error: E): Result<never, E> => ({
  success: false,
  error
});

// Type guard to check if result is success
export function isOk<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success === true;
}

// Type guard to check if result is error
export function isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return result.success === false;
}

// Utility type for exhaustive checking
export function assertNever(x: never): never {
  throw new Error('Unexpected object: ' + x);
}

// Contract status for game contracts
export interface GameContract {
  contractId: string;
  returnMultiplier: number;
  isActive: boolean;
  totalVolume: number;
  playerCount: number;
  startTime: number;
  endTime: number;
}

// Position tracking
export interface Position {
  userId: string;
  contractId: string;
  amount: number;
  timestamp: number;
  gameMode: GameMode;
}

// Leaderboard entry
export interface LeaderboardEntry {
  userId: string;
  username: string;
  totalProfit: number;
  totalVolume: number;
  winRate: number;
  rank: number;
}