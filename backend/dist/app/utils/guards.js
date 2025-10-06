"use strict";
/**
 * Type guards and assertions for runtime type checking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAuthMessage = isAuthMessage;
exports.isJoinGameMessage = isJoinGameMessage;
exports.isPlaceTradeMessage = isPlaceTradeMessage;
exports.isErrorMessage = isErrorMessage;
exports.isPriceUpdateMessage = isPriceUpdateMessage;
exports.isAppError = isAppError;
exports.isOperationalError = isOperationalError;
exports.assertSuccess = assertSuccess;
exports.isWebSocketOpen = isWebSocketOpen;
exports.isPositiveNumber = isPositiveNumber;
exports.isValidBalance = isValidBalance;
exports.isNonEmptyString = isNonEmptyString;
exports.isNonEmptyArray = isNonEmptyArray;
exports.hasProperty = hasProperty;
exports.assertDefined = assertDefined;
exports.assertPositiveNumber = assertPositiveNumber;
exports.assertValidBalance = assertValidBalance;
exports.assertNever = assertNever;
const types_1 = require("../types");
// Client message type guards
function isAuthMessage(msg) {
    return msg.type === types_1.ClientMessageType.AUTH;
}
function isJoinGameMessage(msg) {
    return msg.type === types_1.ClientMessageType.JOIN_GAME;
}
function isPlaceTradeMessage(msg) {
    return msg.type === types_1.ClientMessageType.PLACE_TRADE;
}
// Server message type guards
function isErrorMessage(msg) {
    return msg.type === types_1.ServerMessageType.ERROR;
}
function isPriceUpdateMessage(msg) {
    return msg.type === types_1.ServerMessageType.PRICE_UPDATE;
}
// Error type guards
function isAppError(error) {
    return error instanceof types_1.AppError;
}
function isOperationalError(error) {
    if (isAppError(error)) {
        return error.isOperational;
    }
    return false;
}
// Result type guards (already in common.ts but adding here for completeness)
function assertSuccess(result) {
    if (!result.success) {
        throw result.error;
    }
}
// WebSocket type guards
function isWebSocketOpen(ws) {
    return ws && ws.readyState === 1; // WebSocket.OPEN
}
// Number validation guards
function isPositiveNumber(value) {
    return typeof value === 'number' && value > 0 && Number.isFinite(value);
}
function isValidBalance(balance) {
    return typeof balance === 'number' && balance >= 0 && Number.isFinite(balance);
}
// String validation guards
function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
// Array guards
function isNonEmptyArray(arr) {
    return Array.isArray(arr) && arr.length > 0;
}
// Object guards
function hasProperty(obj, key) {
    return key in obj;
}
// Assertion functions
function assertDefined(value, message = 'Value is not defined') {
    if (value === undefined || value === null) {
        throw new Error(message);
    }
}
function assertPositiveNumber(value, fieldName) {
    if (!isPositiveNumber(value)) {
        throw new Error(`${fieldName} must be a positive number`);
    }
}
function assertValidBalance(balance) {
    if (!isValidBalance(balance)) {
        throw new Error('Invalid balance value');
    }
}
// Exhaustive check for switch statements
function assertNever(x, message = 'Unexpected value') {
    throw new Error(`${message}: ${x}`);
}
