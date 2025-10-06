"use strict";
/**
 * Streaming service for real-time data updates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamingService = void 0;
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
const clearingHouse_1 = require("../../clearingHouse");
const logger = (0, logger_1.createLogger)('StreamingService');
class StreamingService {
    constructor(router, gameEngineManager, userService, sessionManager, _config = {}) {
        this.subscriptions = new Set();
        this.lastPrice = 0;
        this.router = router;
        this.gameEngineManager = gameEngineManager;
        this.userService = userService;
        this.sessionManager = sessionManager;
    }
    /**
     * Start streaming services
     */
    start() {
        // Subscribe to clearing house events
        this.subscribeToClearingHouse();
        // Subscribe to game engine events
        this.subscribeToGameEngines();
        logger.info('Streaming service started');
    }
    /**
     * Stop streaming services
     */
    stop() {
        // Unsubscribe from all events
        for (const unsubscribe of this.subscriptions) {
            unsubscribe();
        }
        this.subscriptions.clear();
        logger.info('Streaming service stopped');
    }
    /**
     * Subscribe to clearing house events
     */
    subscribeToClearingHouse() {
        // Price updates
        clearingHouse_1.clearingHouseAPI.onPriceUpdate((price, timestamp) => {
            this.handlePriceUpdate(price, timestamp);
        });
        // Balance updates
        clearingHouse_1.clearingHouseAPI.onBalanceUpdate((userId, balance) => {
            this.handleBalanceUpdate(userId, balance);
        });
        // Contract settlements
        clearingHouse_1.clearingHouseAPI.onContractSettlement((settlement) => {
            this.handleContractSettlement(settlement);
        });
    }
    /**
     * Subscribe to game engine events
     */
    subscribeToGameEngines() {
        // Listen for contract updates from game engines
        this.gameEngineManager.on('contracts_updated', async ({ gameMode, timeframe, newContracts, isInitial }) => {
            if (isInitial) {
                // Initial load - send all contracts
                await this.streamContractUpdates(gameMode, timeframe);
            }
            else if (newContracts) {
                // New contracts only - send just the new ones
                await this.streamNewContracts(gameMode, timeframe, newContracts);
            }
        });
    }
    /**
     * Handle price updates
     */
    handlePriceUpdate(price, timestamp) {
        const change = price - this.lastPrice;
        const changePercent = this.lastPrice > 0 ? (change / this.lastPrice) * 100 : 0;
        const payload = {
            price,
            timestamp,
            change,
            changePercent
        };
        // Broadcast to all users with active sessions
        const sessions = this.sessionManager.getAllSessions();
        const userIds = [...new Set(sessions.map(s => s.userId))];
        this.router.broadcast((0, types_1.createMessage)(types_1.ServerMessageType.PRICE_UPDATE, payload), userIds);
        this.lastPrice = price;
    }
    /**
     * Handle balance updates
     */
    handleBalanceUpdate(userId, balance) {
        const payload = {
            balance,
            change: 0, // TODO: Track balance changes
            reason: 'trade'
        };
        this.router.sendToUser(userId, (0, types_1.createMessage)(types_1.ServerMessageType.BALANCE_UPDATE, payload));
    }
    /**
     * Handle contract settlement
     */
    async handleContractSettlement(settlement) {
        logger.info('Processing contract settlement', {
            contractId: settlement.contractId,
            type: settlement.type,
            settlementCount: settlement.settlements?.length || 0
        });
        // Handle the actual data structure from clearing house
        // settlements array contains: { userId, position, payout }
        if (!settlement.settlements || settlement.settlements.length === 0) {
            logger.warn('No settlements found in contract settlement event', { contractId: settlement.contractId });
            return;
        }
        for (const settlementItem of settlement.settlements) {
            const { userId, position: trade, payout } = settlementItem;
            // Determine if this is a win or loss
            const won = payout > 0;
            const profit = won ? payout - trade : -trade;
            // Update user stats
            await this.userService.recordTradeResult(userId, won, profit, trade);
            // Update session stats
            const session = this.sessionManager.getUserSession(userId);
            if (session) {
                this.sessionManager.recordTrade(session.sessionId, trade, won, profit);
            }
            // Send trade result to user
            const payload = {
                tradeId: `settlement_${Date.now()}_${userId}`,
                contractId: settlement.contractId,
                won,
                payout: won ? payout : 0,
                balance: await this.userService.getUserBalance(userId),
                profit
            };
            logger.info('Sending trade result to user', {
                userId,
                contractId: settlement.contractId,
                won,
                payout,
                profit
            });
            this.router.sendToUser(userId, (0, types_1.createMessage)(types_1.ServerMessageType.TRADE_RESULT, payload));
        }
    }
    /**
     * Stream contract updates to users in specific games
     */
    async streamContractUpdates(gameMode, timeframe) {
        const contracts = await this.gameEngineManager.getActiveContracts(gameMode, timeframe);
        const payload = {
            gameMode,
            timeframe,
            contracts,
            updateType: 'update'
        };
        // Send to users in this game mode
        const sessions = this.sessionManager.getSessionsByGameMode(gameMode);
        const userIds = sessions
            .filter(s => s.timeframe === timeframe)
            .map(s => s.userId);
        if (userIds.length > 0) {
            this.router.broadcast((0, types_1.createMessage)(types_1.ServerMessageType.CONTRACT_UPDATE, payload), userIds);
        }
    }
    /**
     * Stream only new contracts to relevant users
     */
    async streamNewContracts(gameMode, timeframe, newContracts) {
        // Transform contracts based on game mode
        let transformedContracts = [];
        if (gameMode === types_1.GameMode.BOX_HIT) {
            // Transform Iron Condor contracts
            transformedContracts = newContracts.map(c => ({
                contractId: c.id,
                returnMultiplier: c.returnMultiplier,
                isActive: c.status === 'active',
                totalVolume: c.totalVolume,
                playerCount: c.positions.size,
                lowerStrike: c.strikeRange.lower,
                upperStrike: c.strikeRange.upper,
                startTime: c.exerciseWindow.start,
                endTime: c.exerciseWindow.end,
            }));
        }
        else if (gameMode === types_1.GameMode.TOWERS) {
            // Transform Spread contracts
            transformedContracts = newContracts.map(c => ({
                contractId: c.id,
                returnMultiplier: c.returnMultiplier,
                isActive: c.status === 'active',
                totalVolume: c.totalVolume,
                playerCount: c.positions.size,
                strikePrice: c.strikePrice,
                type: c.spreadType,
                startTime: c.exerciseWindow.start,
                endTime: c.exerciseWindow.end,
            }));
        }
        const payload = {
            gameMode,
            timeframe,
            contracts: transformedContracts,
            updateType: 'new' // Indicates these are new contracts only
        };
        // Send to users in this game mode
        const sessions = this.sessionManager.getSessionsByGameMode(gameMode);
        const userIds = sessions
            .filter(s => s.timeframe === timeframe)
            .map(s => s.userId);
        if (userIds.length > 0) {
            this.router.broadcast((0, types_1.createMessage)(types_1.ServerMessageType.CONTRACT_UPDATE, payload), userIds);
        }
    }
    /**
     * Get streaming statistics
     */
    getStats() {
        return {
            subscriptions: this.subscriptions.size,
            lastPrice: this.lastPrice,
            activeSessions: this.sessionManager.getAllSessions().length
        };
    }
}
exports.StreamingService = StreamingService;
