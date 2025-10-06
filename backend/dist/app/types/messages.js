"use strict";
/**
 * WebSocket message type definitions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerMessageType = exports.ClientMessageType = void 0;
exports.createMessage = createMessage;
// Client message types
var ClientMessageType;
(function (ClientMessageType) {
    ClientMessageType["AUTH"] = "auth";
    ClientMessageType["JOIN_GAME"] = "join_game";
    ClientMessageType["LEAVE_GAME"] = "leave_game";
    ClientMessageType["PLACE_TRADE"] = "place_trade";
    ClientMessageType["GET_STATE"] = "get_state";
    ClientMessageType["GET_LEADERBOARD"] = "get_leaderboard";
    ClientMessageType["GET_GAME_CONFIG"] = "get_game_config";
})(ClientMessageType || (exports.ClientMessageType = ClientMessageType = {}));
// Server message types
var ServerMessageType;
(function (ServerMessageType) {
    ServerMessageType["CONNECTED"] = "connected";
    ServerMessageType["GAME_JOINED"] = "game_joined";
    ServerMessageType["GAME_LEFT"] = "game_left";
    ServerMessageType["TRADE_CONFIRMED"] = "trade_confirmed";
    ServerMessageType["TRADE_RESULT"] = "trade_result";
    ServerMessageType["PRICE_UPDATE"] = "price_update";
    ServerMessageType["BALANCE_UPDATE"] = "balance_update";
    ServerMessageType["CONTRACT_UPDATE"] = "contract_update";
    ServerMessageType["LEADERBOARD_UPDATE"] = "leaderboard_update";
    ServerMessageType["STATE_UPDATE"] = "state_update";
    ServerMessageType["ERROR"] = "error";
    ServerMessageType["HEARTBEAT"] = "heartbeat";
    ServerMessageType["GAME_CONFIG"] = "game_config";
})(ServerMessageType || (exports.ServerMessageType = ServerMessageType = {}));
// Helper to create messages with proper structure
function createMessage(type, payload, messageId = generateMessageId()) {
    return {
        type,
        payload,
        timestamp: Date.now(),
        messageId
    };
}
// Generate unique message ID
function generateMessageId() {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
