"use strict";
/**
 * Game action message handlers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleJoinGame = handleJoinGame;
exports.handleLeaveGame = handleLeaveGame;
exports.handlePlaceTrade = handlePlaceTrade;
exports.handleGetGameConfig = handleGetGameConfig;
const clearingHouse_1 = require("../../clearingHouse");
const timeframeConfig_1 = require("../../config/timeframeConfig");
const types_1 = require("../types");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const validators_1 = require("../utils/validators");
const logger = (0, logger_1.createLogger)('GameHandler');
async function handleJoinGame(message, context) {
    const { userId, services } = context;
    if (!userId) {
        throw new Error('User not authenticated');
    }
    try {
        // Validate payload
        const payload = (0, validators_1.validateJoinGamePayload)(message.payload);
        // Create session
        const result = await services.sessionManager.createSession(userId, payload.mode, payload.timeframe);
        if (!result.success) {
            throw result.error;
        }
        const session = result.data;
        // Get initial contracts
        const contracts = await services.gameEngineManager.getActiveContracts(payload.mode, payload.timeframe);
        // Get current price from clearingHouse directly
        const currentPrice = clearingHouse_1.clearingHouseAPI.clearingHouse.getCurrentPrice();
        // Get user balance
        const userBalance = await services.userService.getUserBalance(userId);
        logger.info('User joined game', {
            userId,
            sessionId: session.sessionId,
            gameMode: payload.mode,
            timeframe: payload.timeframe,
        });
        return (0, types_1.createMessage)(types_1.ServerMessageType.GAME_JOINED, {
            sessionId: session.sessionId,
            mode: payload.mode,
            timeframe: payload.timeframe,
            contracts,
            currentPrice,
            balance: userBalance,
            // Include current column index so frontend can sync
            currentColumnIndex: 0, // Frontend should always start at 0 since backend only sends future contracts
        });
    }
    catch (error) {
        logger.error('Failed to join game', error, { userId });
        throw error;
    }
}
async function handleLeaveGame(_message, context) {
    const { userId, services } = context;
    if (!userId) {
        throw new Error('User not authenticated');
    }
    try {
        const result = await services.sessionManager.leaveSession(userId);
        if (!result.success) {
            throw result.error;
        }
        logger.info('User left game', { userId });
        return (0, types_1.createMessage)(types_1.ServerMessageType.GAME_LEFT, {
            sessionId: '',
        });
    }
    catch (error) {
        logger.error('Failed to leave game', error, { userId });
        throw error;
    }
}
async function handlePlaceTrade(message, context) {
    const { userId, services } = context;
    if (!userId) {
        throw new Error('User not authenticated');
    }
    try {
        // Validate payload
        const payload = (0, validators_1.validatePlaceTradePayload)(message.payload);
        // Get user session
        const session = services.sessionManager.getUserSession(userId);
        if (!session) {
            throw new Error('No active game session');
        }
        // Check balance
        const balance = await services.userService.getUserBalance(userId);
        if (balance < payload.amount) {
            throw new errors_1.InsufficientBalanceError(payload.amount, balance);
        }
        // Place bet through game engine
        const result = await services.gameEngineManager.placeBet(session.gameMode, session.timeframe, userId, payload.contractId, payload.amount);
        if (!(0, types_1.isOk)(result)) {
            throw result.error;
        }
        // Update session stats
        services.sessionManager.recordTrade(session.sessionId, payload.amount, false, // Not yet won
        0 // No profit yet
        );
        // Get new balance
        const newBalance = await services.userService.getUserBalance(userId);
        // Generate trade ID
        const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        return (0, types_1.createMessage)(types_1.ServerMessageType.TRADE_CONFIRMED, {
            tradeId,
            contractId: payload.contractId,
            amount: payload.amount,
            balance: newBalance,
            position: {
                userId,
                contractId: payload.contractId,
                amount: payload.amount,
                timestamp: Date.now(),
                gameMode: session.gameMode,
            },
        });
    }
    catch (error) {
        logger.error('Failed to place trade', error, { userId });
        throw error;
    }
}
async function handleGetGameConfig(message, context) {
    const { userId } = context;
    if (!userId) {
        throw new Error('User not authenticated');
    }
    try {
        // Get game mode and timeframe from payload
        const gameMode = message.payload?.gameMode || types_1.GameMode.BOX_HIT;
        const timeframe = message.payload?.timeframe || 2000;
        // Get configuration based on game mode and timeframe
        const config = {
            priceStep: (0, timeframeConfig_1.getTimeframeConfig)(timeframe).boxHeight,
            timeStep: timeframe, // Use the actual timeframe
            numRows: gameMode === types_1.GameMode.BOX_HIT
                ? clearingHouse_1.CLEARING_HOUSE_CONFIG.ironCondor.timeframes[timeframe]
                    .rowsAbove +
                    clearingHouse_1.CLEARING_HOUSE_CONFIG.ironCondor.timeframes[timeframe]
                        .rowsBelow +
                    1
                : 20, // Default for towers
            numColumns: gameMode === types_1.GameMode.BOX_HIT
                ? clearingHouse_1.CLEARING_HOUSE_CONFIG.ironCondor.timeframes[timeframe]
                    .numColumns
                : clearingHouse_1.CLEARING_HOUSE_CONFIG.spreads.timeframes[timeframe]
                    .numColumns,
            basePrice: clearingHouse_1.CLEARING_HOUSE_CONFIG.constants.initialPrice,
        };
        logger.info('Game config requested', { userId, gameMode, timeframe });
        return (0, types_1.createMessage)(types_1.ServerMessageType.GAME_CONFIG, {
            gameMode,
            config,
        });
    }
    catch (error) {
        logger.error('Failed to get game config', error, { userId });
        throw error;
    }
}
