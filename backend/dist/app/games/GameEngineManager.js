"use strict";
/**
 * Manages game engines and coordinates game operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEngineManager = void 0;
const events_1 = require("events");
const clearingHouse_1 = require("../../clearingHouse");
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
const BoxHitEngine_1 = require("./boxhit/BoxHitEngine");
const TowersEngine_1 = require("./towers/TowersEngine");
const logger = (0, logger_1.createLogger)('GameEngineManager');
class GameEngineManager extends events_1.EventEmitter {
    constructor() {
        super();
        this.engines = new Map();
        this.setupClearingHouseListeners();
    }
    /**
     * Get or create a game engine
     */
    async getEngine(gameMode, timeframe) {
        const key = this.getEngineKey(gameMode, timeframe);
        let engine = this.engines.get(key);
        if (!engine) {
            engine = await this.createEngine(gameMode, timeframe);
            this.engines.set(key, engine);
        }
        return engine;
    }
    /**
     * Create a new game engine
     */
    async createEngine(gameMode, timeframe) {
        logger.info('Creating game engine', { gameMode, timeframe });
        let engine;
        switch (gameMode) {
            case types_1.GameMode.BOX_HIT:
                engine = new BoxHitEngine_1.BoxHitEngine(timeframe);
                break;
            case types_1.GameMode.TOWERS:
                engine = new TowersEngine_1.TowersEngine(timeframe);
                break;
            default:
                throw new Error(`Unknown game mode: ${gameMode}`);
        }
        await engine.initialize();
        engine.start();
        logger.info('Game engine created and started', { gameMode, timeframe });
        return engine;
    }
    /**
     * Place a bet in a game
     */
    async placeBet(gameMode, timeframe, userId, contractId, amount) {
        try {
            const engine = await this.getEngine(gameMode, timeframe);
            const success = await engine.placeBet(userId, contractId, amount);
            if (!success) {
                return (0, types_1.err)(new types_1.AppError(types_1.ErrorCode.INVALID_CONTRACT, 'Failed to place bet'));
            }
            return (0, types_1.ok)(true);
        }
        catch (error) {
            logger.error('Failed to place bet', error, {
                gameMode,
                userId,
                contractId,
                amount,
            });
            return (0, types_1.err)(new types_1.AppError(types_1.ErrorCode.INTERNAL_ERROR, 'Failed to place bet'));
        }
    }
    /**
     * Get active contracts for a game
     */
    async getActiveContracts(gameMode, timeframe) {
        try {
            const engine = await this.getEngine(gameMode, timeframe);
            return engine.getActiveContracts();
        }
        catch (error) {
            logger.error('Failed to get active contracts', error, {
                gameMode,
                timeframe,
            });
            return [];
        }
    }
    /**
     * Get current game state
     */
    async getGameState(gameMode, timeframe) {
        try {
            const engine = await this.getEngine(gameMode, timeframe);
            return engine.getGameState();
        }
        catch (error) {
            logger.error('Failed to get game state', error, {
                gameMode,
                timeframe,
            });
            return null;
        }
    }
    /**
     * Setup clearing house event listeners
     */
    setupClearingHouseListeners() {
        // Listen for price updates
        clearingHouse_1.clearingHouseAPI.onPriceUpdate((price, timestamp) => {
            // Broadcast to all engines
            for (const engine of this.engines.values()) {
                engine.onPriceUpdate(price, timestamp);
            }
        });
        // Listen for contract settlements
        clearingHouse_1.clearingHouseAPI.onContractSettlement((settlement) => {
            // Transform settlements array to winners format expected by game engines
            // settlements contains: { userId, position, payout }
            const winners = (settlement.settlements || [])
                .filter((s) => s.payout > 0)
                .map((s) => ({
                userId: s.userId,
                payout: s.payout,
                trade: s.position
            }));
            // Find relevant engines and notify them
            for (const engine of this.engines.values()) {
                if (settlement.type === 'ironCondor' &&
                    engine.gameMode === types_1.GameMode.BOX_HIT) {
                    engine.onContractSettlement(settlement.contractId, winners);
                }
                else if (settlement.type === 'spread' &&
                    engine.gameMode === types_1.GameMode.TOWERS) {
                    engine.onContractSettlement(settlement.contractId, winners);
                }
            }
        });
        // Listen for new Iron Condor contracts
        clearingHouse_1.clearingHouseAPI.clearingHouse.on('iron_condor_contracts_generated', (data) => {
            const timeframe = data.timeframe;
            const engine = this.engines.get(`${types_1.GameMode.BOX_HIT}:${timeframe}`);
            if (engine) {
                engine.onNewContracts(data.contracts);
                // Trigger contract update broadcast with new contracts only
                this.emit('contracts_updated', {
                    gameMode: types_1.GameMode.BOX_HIT,
                    timeframe,
                    newContracts: data.contracts,
                    isInitial: data.contracts.length > 100, // Initial load has many contracts
                });
            }
        });
        // Listen for new Spread contracts
        clearingHouse_1.clearingHouseAPI.clearingHouse.on('spread_contracts_generated', (data) => {
            const timeframe = data.timeframe;
            const engine = this.engines.get(`${types_1.GameMode.TOWERS}:${timeframe}`);
            if (engine) {
                engine.onNewContracts(data.contracts);
                // Trigger contract update broadcast with new contracts only
                this.emit('contracts_updated', {
                    gameMode: types_1.GameMode.TOWERS,
                    timeframe,
                    newContracts: data.contracts,
                    isInitial: data.contracts.length > 100, // Initial load has many contracts
                });
            }
        });
        logger.info('Clearing house listeners setup');
    }
    /**
     * Start all engines
     */
    startAll() {
        clearingHouse_1.clearingHouseAPI.clearingHouse.startPriceFeed();
        logger.info('Started price feed');
    }
    /**
     * Stop all engines
     */
    stopAll() {
        clearingHouse_1.clearingHouseAPI.clearingHouse.stopPriceFeed();
        for (const engine of this.engines.values()) {
            engine.stop();
            engine.destroy();
        }
        this.engines.clear();
        logger.info('All engines stopped');
    }
    /**
     * Get engine key for map storage
     */
    getEngineKey(gameMode, timeframe) {
        return `${gameMode}:${timeframe}`;
    }
    /**
     * Get statistics
     */
    getStats() {
        const stats = {
            activeEngines: this.engines.size,
            engines: [],
        };
        for (const [key, engine] of this.engines.entries()) {
            const [gameMode, timeframe] = key.split(':');
            const contracts = engine.getActiveContracts();
            stats.engines.push({
                gameMode,
                timeframe: parseInt(timeframe),
                activeContracts: contracts.length,
                totalVolume: contracts.reduce((sum, c) => sum + c.totalVolume, 0),
            });
        }
        return stats;
    }
}
exports.GameEngineManager = GameEngineManager;
