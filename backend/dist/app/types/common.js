"use strict";
/**
 * Common base types used throughout the application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.err = exports.ok = exports.UnauthorizedError = exports.InsufficientBalanceError = exports.ValidationError = exports.AppError = exports.ErrorCode = exports.GameMode = void 0;
exports.isOk = isOk;
exports.isErr = isErr;
exports.assertNever = assertNever;
// Note: Import TimeFrame directly from clearingHouse/types when needed
// Game modes available in the app
var GameMode;
(function (GameMode) {
    GameMode["BOX_HIT"] = "box_hit";
    GameMode["TOWERS"] = "towers";
})(GameMode || (exports.GameMode = GameMode = {}));
// Error codes for consistent error handling
var ErrorCode;
(function (ErrorCode) {
    // Authentication errors
    ErrorCode["INVALID_TOKEN"] = "INVALID_TOKEN";
    ErrorCode["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    ErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    // Validation errors
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["INVALID_MESSAGE"] = "INVALID_MESSAGE";
    ErrorCode["INVALID_PAYLOAD"] = "INVALID_PAYLOAD";
    // Game errors
    ErrorCode["INSUFFICIENT_BALANCE"] = "INSUFFICIENT_BALANCE";
    ErrorCode["INVALID_CONTRACT"] = "INVALID_CONTRACT";
    ErrorCode["INVALID_AMOUNT"] = "INVALID_AMOUNT";
    ErrorCode["NO_ACTIVE_SESSION"] = "NO_ACTIVE_SESSION";
    ErrorCode["ALREADY_IN_SESSION"] = "ALREADY_IN_SESSION";
    // System errors
    ErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    ErrorCode["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
    ErrorCode["RATE_LIMITED"] = "RATE_LIMITED";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
// Custom error class for consistent error handling
class AppError extends Error {
    constructor(code, message, statusCode = 500, isOperational = true, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.details = details;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
// Specific error classes
class ValidationError extends AppError {
    constructor(message, field) {
        super(ErrorCode.VALIDATION_ERROR, message, 400);
        this.field = field;
    }
}
exports.ValidationError = ValidationError;
class InsufficientBalanceError extends AppError {
    constructor(required, available) {
        super(ErrorCode.INSUFFICIENT_BALANCE, `Insufficient balance. Required: ${required}, Available: ${available}`, 400, true, { required, available });
    }
}
exports.InsufficientBalanceError = InsufficientBalanceError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(ErrorCode.UNAUTHORIZED, message, 401);
    }
}
exports.UnauthorizedError = UnauthorizedError;
// Utility function to create results
const ok = (data) => ({
    success: true,
    data
});
exports.ok = ok;
const err = (error) => ({
    success: false,
    error
});
exports.err = err;
// Type guard to check if result is success
function isOk(result) {
    return result.success === true;
}
// Type guard to check if result is error
function isErr(result) {
    return result.success === false;
}
// Utility type for exhaustive checking
function assertNever(x) {
    throw new Error('Unexpected object: ' + x);
}
