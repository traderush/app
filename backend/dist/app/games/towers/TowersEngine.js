"use strict";
/**
 * Towers game engine - wrapper around Spread trading
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TowersEngine = void 0;
const events_1 = require("events");
const clearingHouse_1 = require("../../../clearingHouse");
const types_1 = require("../../types");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('TowersEngine');
// Max tower height (visual levels)
// const MAX_TOWER_HEIGHT = 10;
class TowersEngine extends events_1.EventEmitter {
    constructor(timeframe) {
        super();
        this.gameMode = types_1.GameMode.TOWERS;
        this.priceHistory = [];
        this.currentPrice = 0;
        this.lastPrice = 0;
        this.isRunning = false;
        this.timeframe = timeframe;
    }
    async initialize() {
        logger.info('Initializing Towers engine', { timeframe: this.timeframe });
        // Initialize price
        this.currentPrice = clearingHouse_1.clearingHouseAPI.clearingHouse.getCurrentPrice();
        this.lastPrice = this.currentPrice;
        this.priceHistory.push({
            price: this.currentPrice,
            timestamp: Date.now(),
        });
    }
    start() {
        this.isRunning = true;
        logger.info('Towers engine started', { timeframe: this.timeframe });
    }
    stop() {
        this.isRunning = false;
        logger.info('Towers engine stopped', { timeframe: this.timeframe });
    }
    destroy() {
        this.stop();
        this.removeAllListeners();
        this.priceHistory = [];
    }
    async placeBet(userId, contractId, amount) {
        // Get contract from clearing house
        const chContracts = clearingHouse_1.clearingHouseAPI.clearingHouse.getActiveSpreadContracts(this.timeframe);
        const chContract = chContracts.find((c) => c.id === contractId);
        if (!chContract) {
            logger.warn('Contract not found', { contractId });
            return false;
        }
        if (chContract.status !== 'active') {
            logger.warn('Contract not active', { contractId });
            return false;
        }
        // Place bet in clearing house
        const result = clearingHouse_1.clearingHouseAPI.clearingHouse.placeSpreadPosition(userId, contractId, amount, this.timeframe);
        if (result.success) {
            // Emit bet placed event
            this.emit('betPlaced', {
                userId,
                contractId,
                amount,
            });
            logger.info('Bet placed on spread', {
                userId,
                contractId,
                amount,
                type: chContract.spreadType,
            });
        }
        return result.success;
    }
    getActiveContracts() {
        // Get fresh contracts directly from clearing house
        const contracts = clearingHouse_1.clearingHouseAPI.clearingHouse.getActiveSpreadContracts(this.timeframe);
        // Transform clearing house contracts to game contracts
        const gameContracts = [];
        for (const chContract of contracts) {
            // Include all active contracts
            const towersContract = {
                contractId: chContract.id,
                returnMultiplier: chContract.returnMultiplier,
                isActive: chContract.status === 'active',
                totalVolume: chContract.totalVolume,
                playerCount: chContract.positions.size,
                strikePrice: chContract.strikePrice,
                type: chContract.spreadType,
                startTime: chContract.exerciseWindow.start,
                endTime: chContract.exerciseWindow.end,
            };
            gameContracts.push(towersContract);
        }
        return gameContracts;
    }
    getGameState() {
        return {
            gameMode: types_1.GameMode.TOWERS,
            timeframe: this.timeframe,
            contracts: this.getActiveContracts(),
            currentPrice: this.currentPrice,
        };
    }
    onPriceUpdate(price, timestamp) {
        if (!this.isRunning)
            return;
        this.lastPrice = this.currentPrice;
        this.currentPrice = price;
        // Update price history
        this.priceHistory.push({ price, timestamp });
        if (this.priceHistory.length > 100) {
            this.priceHistory.shift();
        }
        // Get active contracts from clearing house
        const chContracts = clearingHouse_1.clearingHouseAPI.clearingHouse.getActiveSpreadContracts(this.timeframe);
        // Check price direction
        const priceDirection = price > this.lastPrice ? 'UP' : 'DOWN';
        for (const chContract of chContracts) {
            // Check if contract type matches price movement
            const contractDirection = chContract.spreadType === 'call' ? 'UP' : 'DOWN';
            if (contractDirection === priceDirection) {
                this.emit('towerBuild', {
                    contractId: chContract.id,
                    type: chContract.spreadType,
                    priceDirection,
                });
            }
        }
        // Emit state update
        this.emit('stateUpdate', this.getGameState());
    }
    onNewContracts(_contracts) {
        // Simply emit the state update - we don't store contracts
        this.emit('contractsUpdated', this.getGameState());
    }
    onContractSettlement(contractId, winners) {
        // Calculate total payout
        const totalPayout = winners.reduce((sum, w) => sum + w.payout, 0);
        this.emit('towerSettled', {
            contractId,
            winners: winners.length,
            totalPayout,
        });
        logger.info('Tower settled', {
            contractId,
            winners: winners.length,
            totalPayout,
        });
    }
}
exports.TowersEngine = TowersEngine;
