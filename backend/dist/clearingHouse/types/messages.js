"use strict";
// WebSocket Message Types for ClearingHouse
// All message types and enums are defined here
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerMessageType = exports.ClientMessageType = exports.MarketType = void 0;
exports.isValidConnectPayload = isValidConnectPayload;
exports.isValidJoinSessionPayload = isValidJoinSessionPayload;
exports.isValidPlaceTradePayload = isValidPlaceTradePayload;
exports.isValidPlaceSpreadTradePayload = isValidPlaceSpreadTradePayload;
exports.isValidUpdateViewportPayload = isValidUpdateViewportPayload;
exports.validateClientMessage = validateClientMessage;
exports.validateServerMessage = validateServerMessage;
const index_1 = require("./index");
// Trading Market Types
var MarketType;
(function (MarketType) {
    MarketType["IRON_CONDOR"] = "iron_condor";
    MarketType["SPREAD"] = "spread";
})(MarketType || (exports.MarketType = MarketType = {}));
// Message Type Enums
var ClientMessageType;
(function (ClientMessageType) {
    ClientMessageType["CONNECT"] = "connect";
    ClientMessageType["JOIN_SESSION"] = "join_session";
    ClientMessageType["LEAVE_SESSION"] = "leave_session";
    ClientMessageType["PLACE_TRADE"] = "place_trade";
    ClientMessageType["PLACE_SPREAD_TRADE"] = "place_spread_trade";
    ClientMessageType["UPDATE_VIEWPORT"] = "update_viewport";
    ClientMessageType["GET_STATE"] = "get_state";
})(ClientMessageType || (exports.ClientMessageType = ClientMessageType = {}));
var ServerMessageType;
(function (ServerMessageType) {
    ServerMessageType["CONNECTED"] = "connected";
    ServerMessageType["SESSION_JOINED"] = "session_joined";
    ServerMessageType["SESSION_LEFT"] = "session_left";
    ServerMessageType["PRICE_UPDATE"] = "price_update";
    ServerMessageType["IRON_CONDOR_CONTRACTS"] = "iron_condor_contracts";
    ServerMessageType["SPREAD_CONTRACTS"] = "spread_contracts";
    ServerMessageType["CONTRACT_EXERCISED"] = "contract_exercised";
    ServerMessageType["CONTRACT_EXPIRED"] = "contract_expired";
    ServerMessageType["SPREAD_EXERCISED"] = "spread_exercised";
    ServerMessageType["SPREAD_MISSED"] = "spread_missed";
    ServerMessageType["TRADE_PLACED"] = "trade_placed";
    ServerMessageType["BALANCE_UPDATE"] = "balance_update";
    ServerMessageType["ERROR"] = "error";
    ServerMessageType["STATE_UPDATE"] = "state_update";
})(ServerMessageType || (exports.ServerMessageType = ServerMessageType = {}));
// Payload validation functions
function isValidConnectPayload(payload) {
    return payload && typeof payload.username === 'string';
}
function isValidJoinSessionPayload(payload) {
    return payload &&
        Object.values(MarketType).includes(payload.marketType) &&
        Object.values(index_1.TimeFrame).includes(payload.timeframe);
}
function isValidPlaceTradePayload(payload) {
    return payload &&
        typeof payload.contractId === 'string' &&
        typeof payload.amount === 'number' &&
        payload.amount > 0 &&
        Object.values(index_1.TimeFrame).includes(payload.timeframe);
}
function isValidPlaceSpreadTradePayload(payload) {
    return payload &&
        typeof payload.contractId === 'string' &&
        typeof payload.amount === 'number' &&
        payload.amount > 0 &&
        typeof payload.strikePrice === 'number' &&
        Object.values(index_1.TimeFrame).includes(payload.timeframe);
}
function isValidUpdateViewportPayload(payload) {
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
function validateClientMessage(message) {
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
function validateServerMessage(message) {
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
                Object.values(index_1.TimeFrame).includes(message.payload.timeframe);
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
