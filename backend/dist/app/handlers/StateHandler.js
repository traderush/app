"use strict";
/**
 * State query message handlers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGetState = handleGetState;
exports.handleGetLeaderboard = handleGetLeaderboard;
const types_1 = require("../types");
const validators_1 = require("../utils/validators");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('StateHandler');
async function handleGetState(_message, context) {
    const { userId, services } = context;
    if (!userId) {
        throw new Error('User not authenticated');
    }
    try {
        // Get user data
        const user = await services.userService.getUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        // Get balance
        const balance = await services.userService.getUserBalance(userId);
        // Get active sessions
        const session = services.sessionManager.getUserSession(userId);
        const activeSessions = session ? [{
                sessionId: session.sessionId,
                gameMode: session.gameMode,
                timeframe: session.timeframe
            }] : [];
        // Get active positions (simplified for now)
        const activePositions = [];
        if (session) {
            // In a real implementation, we'd track active positions
            // For now, we'll leave it empty
        }
        logger.info('State requested', { userId });
        return (0, types_1.createMessage)(types_1.ServerMessageType.STATE_UPDATE, {
            balance,
            activeSessions,
            activePositions,
            stats: {
                totalProfit: user.stats.totalProfit,
                totalVolume: user.stats.totalVolume,
                winRate: user.stats.winRate,
                tradesCount: user.stats.totalTrades
            }
        });
    }
    catch (error) {
        logger.error('Failed to get state', error, { userId });
        throw error;
    }
}
async function handleGetLeaderboard(message, context) {
    const { userId, services } = context;
    if (!userId) {
        throw new Error('User not authenticated');
    }
    try {
        // Validate payload
        const payload = (0, validators_1.validateGetLeaderboardPayload)(message.payload);
        const limit = payload.limit || 10;
        const gameMode = payload.gameMode;
        // Get leaderboard from service
        const entries = await services.leaderboardService.getLeaderboard(gameMode, limit);
        // Find user's rank
        const userRank = await services.leaderboardService.getUserRank(userId, gameMode);
        logger.info('Leaderboard requested', { userId, gameMode, limit });
        return (0, types_1.createMessage)(types_1.ServerMessageType.LEADERBOARD_UPDATE, {
            gameMode,
            entries,
            userRank
        });
    }
    catch (error) {
        logger.error('Failed to get leaderboard', error, { userId });
        throw error;
    }
}
