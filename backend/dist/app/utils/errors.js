"use strict";
/**
 * Custom error classes and error handling utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsufficientBalanceError = exports.AlreadyInSessionError = exports.NoActiveSessionError = exports.InvalidContractError = exports.TokenExpiredError = exports.UnauthorizedError = exports.AuthenticationError = void 0;
exports.handleError = handleError;
exports.serializeError = serializeError;
exports.handleWebSocketError = handleWebSocketError;
exports.asyncHandler = asyncHandler;
const types_1 = require("../types");
const logger_1 = require("./logger");
const logger = (0, logger_1.createLogger)('ErrorHandler');
// Specific error classes extending AppError
class AuthenticationError extends types_1.AppError {
    constructor(message = 'Authentication failed') {
        super(types_1.ErrorCode.UNAUTHORIZED, message, 401);
    }
}
exports.AuthenticationError = AuthenticationError;
class UnauthorizedError extends types_1.AppError {
    constructor(message = 'Unauthorized') {
        super(types_1.ErrorCode.UNAUTHORIZED, message, 401);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class TokenExpiredError extends types_1.AppError {
    constructor() {
        super(types_1.ErrorCode.TOKEN_EXPIRED, 'Authentication token has expired', 401);
    }
}
exports.TokenExpiredError = TokenExpiredError;
class InvalidContractError extends types_1.AppError {
    constructor(contractId) {
        super(types_1.ErrorCode.INVALID_CONTRACT, `Invalid or expired contract: ${contractId}`, 400, true, { contractId });
    }
}
exports.InvalidContractError = InvalidContractError;
class NoActiveSessionError extends types_1.AppError {
    constructor() {
        super(types_1.ErrorCode.NO_ACTIVE_SESSION, 'No active game session found', 400);
    }
}
exports.NoActiveSessionError = NoActiveSessionError;
class AlreadyInSessionError extends types_1.AppError {
    constructor(currentSession) {
        super(types_1.ErrorCode.ALREADY_IN_SESSION, 'Already in an active game session', 400, true, { currentSession });
    }
}
exports.AlreadyInSessionError = AlreadyInSessionError;
class InsufficientBalanceError extends types_1.AppError {
    constructor(required, available) {
        super(types_1.ErrorCode.INSUFFICIENT_BALANCE, `Insufficient balance. Required: ${required}, Available: ${available}`, 400, true, { required, available });
    }
}
exports.InsufficientBalanceError = InsufficientBalanceError;
// Error handler utility
function handleError(error) {
    // If it's already an AppError, return it
    if (error instanceof types_1.AppError) {
        return error;
    }
    // Handle specific known errors
    if (error instanceof Error) {
        // Network errors
        if (error.message.includes('ECONNREFUSED')) {
            return new types_1.AppError(types_1.ErrorCode.SERVICE_UNAVAILABLE, 'Service temporarily unavailable', 503);
        }
        // Validation errors from libraries
        if (error.name === 'ValidationError') {
            return new types_1.AppError(types_1.ErrorCode.VALIDATION_ERROR, error.message, 400);
        }
    }
    // Log unexpected errors
    logger.error('Unexpected error occurred', error);
    // Return generic error for unknown cases
    return new types_1.AppError(types_1.ErrorCode.INTERNAL_ERROR, 'An unexpected error occurred', 500, false);
}
// Error serializer for WebSocket messages
function serializeError(error) {
    return {
        code: error.code,
        message: error.message,
        details: error.details,
    };
}
// WebSocket error handler
function handleWebSocketError(ws, error, connectionId) {
    const appError = handleError(error);
    logger.error('WebSocket error', appError, { connectionId });
    if (ws && ws.readyState === 1) {
        // OPEN
        ws.send(JSON.stringify({
            type: 'error',
            payload: serializeError(appError),
            timestamp: Date.now(),
        }));
    }
    return appError;
}
// Async error wrapper
function asyncHandler(fn) {
    return ((...args) => {
        return fn(...args).catch((error) => {
            throw handleError(error);
        });
    });
}
