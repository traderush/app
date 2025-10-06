"use strict";
/**
 * Authentication message handler
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAuth = handleAuth;
const types_1 = require("../types");
const validators_1 = require("../utils/validators");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('AuthHandler');
async function handleAuth(message, context) {
    const { connectionId, connectionManager, services } = context;
    try {
        // Validate payload
        const payload = (0, validators_1.validateAuthPayload)(message.payload);
        // For no-auth mode, token is just the username
        const username = payload.token;
        // Authenticate user (creates user if doesn't exist)
        const result = await services.userService.authenticateUser(username);
        if (!result.success) {
            throw result.error;
        }
        const user = result.data;
        // Associate connection with user
        await connectionManager.authenticateConnection(connectionId, user.userId);
        // Get user balance from clearing house
        const balance = await services.userService.getUserBalance(user.userId);
        logger.info('User authenticated', {
            connectionId,
            userId: user.userId,
            username: user.username
        });
        // Return connected message
        return (0, types_1.createMessage)(types_1.ServerMessageType.CONNECTED, {
            userId: user.userId,
            username: user.username,
            balance,
            serverTime: Date.now()
        });
    }
    catch (error) {
        logger.error('Authentication failed', error, { connectionId });
        throw error;
    }
}
