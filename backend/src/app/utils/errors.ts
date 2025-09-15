/**
 * Custom error classes and error handling utilities
 */

import { AppError, ErrorCode } from '../types';
import { createLogger } from './logger';

const logger = createLogger('ErrorHandler');

// Specific error classes extending AppError
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(ErrorCode.UNAUTHORIZED, message, 401);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(ErrorCode.UNAUTHORIZED, message, 401);
  }
}

export class TokenExpiredError extends AppError {
  constructor() {
    super(ErrorCode.TOKEN_EXPIRED, 'Authentication token has expired', 401);
  }
}

export class InvalidContractError extends AppError {
  constructor(contractId: string) {
    super(
      ErrorCode.INVALID_CONTRACT,
      `Invalid or expired contract: ${contractId}`,
      400,
      true,
      { contractId }
    );
  }
}

export class NoActiveSessionError extends AppError {
  constructor() {
    super(ErrorCode.NO_ACTIVE_SESSION, 'No active game session found', 400);
  }
}

export class AlreadyInSessionError extends AppError {
  constructor(currentSession: string) {
    super(
      ErrorCode.ALREADY_IN_SESSION,
      'Already in an active game session',
      400,
      true,
      { currentSession }
    );
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

// Error handler utility
export function handleError(error: unknown): AppError {
  // If it's already an AppError, return it
  if (error instanceof AppError) {
    return error;
  }

  // Handle specific known errors
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('ECONNREFUSED')) {
      return new AppError(
        ErrorCode.SERVICE_UNAVAILABLE,
        'Service temporarily unavailable',
        503
      );
    }

    // Validation errors from libraries
    if (error.name === 'ValidationError') {
      return new AppError(ErrorCode.VALIDATION_ERROR, error.message, 400);
    }
  }

  // Log unexpected errors
  logger.error('Unexpected error occurred', error);

  // Return generic error for unknown cases
  return new AppError(
    ErrorCode.INTERNAL_ERROR,
    'An unexpected error occurred',
    500,
    false
  );
}

// Error serializer for WebSocket messages
export function serializeError(error: AppError) {
  return {
    code: error.code,
    message: error.message,
    details: error.details,
  };
}

// WebSocket error handler
export function handleWebSocketError(
  ws: any,
  error: unknown,
  connectionId?: string
) {
  const appError = handleError(error);

  logger.error('WebSocket error', appError, { connectionId });

  if (ws && ws.readyState === 1) {
    // OPEN
    ws.send(
      JSON.stringify({
        type: 'error',
        payload: serializeError(appError),
        timestamp: Date.now(),
      })
    );
  }

  return appError;
}

// Async error wrapper
export function asyncHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  return ((...args) => {
    return fn(...args).catch((error) => {
      throw handleError(error);
    });
  }) as T;
}
