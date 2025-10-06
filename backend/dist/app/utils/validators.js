"use strict";
/**
 * Runtime validation using Zod
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGetLeaderboardPayload = exports.ClientMessageSchema = exports.GetGameConfigMessageSchema = exports.GetLeaderboardMessageSchema = exports.GetStateMessageSchema = exports.PlaceTradeMessageSchema = exports.LeaveGameMessageSchema = exports.JoinGameMessageSchema = exports.AuthMessageSchema = exports.GetGameConfigPayloadSchema = exports.GetLeaderboardPayloadSchema = exports.PlaceTradePayloadSchema = exports.JoinGamePayloadSchema = exports.AuthPayloadSchema = void 0;
exports.validateClientMessage = validateClientMessage;
exports.validateAuthPayload = validateAuthPayload;
exports.validateJoinGamePayload = validateJoinGamePayload;
exports.validatePlaceTradePayload = validatePlaceTradePayload;
exports.isValidAmount = isValidAmount;
exports.isValidTimeframe = isValidTimeframe;
exports.isValidGameMode = isValidGameMode;
exports.sanitizeUsername = sanitizeUsername;
exports.sanitizeToken = sanitizeToken;
const zod_1 = require("zod");
const types_1 = require("../types");
const types_2 = require("../../clearingHouse/types");
const common_1 = require("../types/common");
// Message ID validation
const MessageIdSchema = zod_1.z.string().min(1);
// Base message schema
const BaseMessageSchema = zod_1.z.object({
    messageId: MessageIdSchema,
    timestamp: zod_1.z.number().positive()
});
// Client message payload schemas
exports.AuthPayloadSchema = zod_1.z.object({
    token: zod_1.z.string().min(1)
});
exports.JoinGamePayloadSchema = zod_1.z.object({
    mode: zod_1.z.nativeEnum(types_1.GameMode),
    timeframe: zod_1.z.nativeEnum(types_2.TimeFrame)
});
exports.PlaceTradePayloadSchema = zod_1.z.object({
    contractId: zod_1.z.string().min(1),
    amount: zod_1.z.number().positive().min(1).max(10000) // Max bet limit
});
exports.GetLeaderboardPayloadSchema = zod_1.z.object({
    gameMode: zod_1.z.nativeEnum(types_1.GameMode).optional(),
    limit: zod_1.z.number().positive().max(100).optional()
});
exports.GetGameConfigPayloadSchema = zod_1.z.object({
    gameMode: zod_1.z.nativeEnum(types_1.GameMode).optional(),
    timeframe: zod_1.z.nativeEnum(types_2.TimeFrame).optional()
});
// Client message schemas
exports.AuthMessageSchema = BaseMessageSchema.extend({
    type: zod_1.z.literal(types_1.ClientMessageType.AUTH),
    payload: exports.AuthPayloadSchema
});
exports.JoinGameMessageSchema = BaseMessageSchema.extend({
    type: zod_1.z.literal(types_1.ClientMessageType.JOIN_GAME),
    payload: exports.JoinGamePayloadSchema
});
exports.LeaveGameMessageSchema = BaseMessageSchema.extend({
    type: zod_1.z.literal(types_1.ClientMessageType.LEAVE_GAME),
    payload: zod_1.z.object({}).optional()
});
exports.PlaceTradeMessageSchema = BaseMessageSchema.extend({
    type: zod_1.z.literal(types_1.ClientMessageType.PLACE_TRADE),
    payload: exports.PlaceTradePayloadSchema
});
exports.GetStateMessageSchema = BaseMessageSchema.extend({
    type: zod_1.z.literal(types_1.ClientMessageType.GET_STATE),
    payload: zod_1.z.object({}).optional()
});
exports.GetLeaderboardMessageSchema = BaseMessageSchema.extend({
    type: zod_1.z.literal(types_1.ClientMessageType.GET_LEADERBOARD),
    payload: exports.GetLeaderboardPayloadSchema
});
exports.GetGameConfigMessageSchema = BaseMessageSchema.extend({
    type: zod_1.z.literal(types_1.ClientMessageType.GET_GAME_CONFIG),
    payload: exports.GetGameConfigPayloadSchema
});
// Union of all client message schemas
exports.ClientMessageSchema = zod_1.z.discriminatedUnion('type', [
    exports.AuthMessageSchema,
    exports.JoinGameMessageSchema,
    exports.LeaveGameMessageSchema,
    exports.PlaceTradeMessageSchema,
    exports.GetStateMessageSchema,
    exports.GetLeaderboardMessageSchema,
    exports.GetGameConfigMessageSchema
]);
// Export for use in handlers
const validateGetLeaderboardPayload = (payload) => {
    try {
        return exports.GetLeaderboardPayloadSchema.parse(payload);
    }
    catch (error) {
        throw new common_1.ValidationError('Invalid leaderboard request');
    }
};
exports.validateGetLeaderboardPayload = validateGetLeaderboardPayload;
// Validation functions
function validateClientMessage(data) {
    try {
        return exports.ClientMessageSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const firstError = error.issues[0];
            console.error('Validation error details:', {
                message: firstError.message,
                path: firstError.path,
                code: firstError.code,
                received: firstError.code === 'invalid_type' ? typeof data : data,
                rawData: JSON.stringify(data).substring(0, 200)
            });
            throw new common_1.ValidationError(`Invalid message: ${firstError.message}`, firstError.path.join('.'));
        }
        throw new common_1.ValidationError('Invalid message format');
    }
}
// Specific validators with better error messages
function validateAuthPayload(payload) {
    try {
        return exports.AuthPayloadSchema.parse(payload);
    }
    catch (error) {
        throw new common_1.ValidationError('Invalid authentication token');
    }
}
function validateJoinGamePayload(payload) {
    try {
        return exports.JoinGamePayloadSchema.parse(payload);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const issue = error.issues[0];
            if (issue.path[0] === 'mode') {
                throw new common_1.ValidationError('Invalid game mode');
            }
            if (issue.path[0] === 'timeframe') {
                throw new common_1.ValidationError('Invalid timeframe');
            }
        }
        throw new common_1.ValidationError('Invalid game join request');
    }
}
function validatePlaceTradePayload(payload) {
    try {
        return exports.PlaceTradePayloadSchema.parse(payload);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const issue = error.issues[0];
            if (issue.path[0] === 'amount') {
                if (issue.code === 'too_small') {
                    throw new common_1.ValidationError('Amount must be at least $1');
                }
                if (issue.code === 'too_big') {
                    throw new common_1.ValidationError('Amount exceeds maximum bet limit of $10,000');
                }
                throw new common_1.ValidationError('Invalid trade amount');
            }
            if (issue.path[0] === 'contractId') {
                throw new common_1.ValidationError('Invalid contract ID');
            }
        }
        throw new common_1.ValidationError('Invalid trade request');
    }
}
// Additional validation helpers
function isValidAmount(amount) {
    return amount > 0 && amount <= 10000 && Number.isFinite(amount);
}
function isValidTimeframe(timeframe) {
    return Object.values(types_2.TimeFrame).includes(timeframe);
}
function isValidGameMode(mode) {
    return Object.values(types_1.GameMode).includes(mode);
}
// Sanitization helpers
function sanitizeUsername(username) {
    return username
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .substring(0, 20);
}
function sanitizeToken(token) {
    return token.trim().substring(0, 1000); // Reasonable JWT length limit
}
