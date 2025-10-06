"use strict";
/**
 * Box Hit game engine - wrapper around Iron Condor trading
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoxHitEngine = void 0;
const events_1 = require("events");
const clearingHouse_1 = require("../../../clearingHouse");
const types_1 = require("../../types");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('BoxHitEngine');
class BoxHitEngine extends events_1.EventEmitter {
    constructor(timeframe) {
        super();
        this.gameMode = types_1.GameMode.BOX_HIT;
        this.priceHistory = [];
        this.currentPrice = 0;
        this.isRunning = false;
        this.timeframe = timeframe;
    }
    async initialize() {
        logger.info('Initializing Box Hit engine', { timeframe: this.timeframe });
        // Initialize price history
        this.currentPrice = clearingHouse_1.clearingHouseAPI.clearingHouse.getCurrentPrice();
        this.priceHistory.push({
            price: this.currentPrice,
            timestamp: Date.now(),
        });
    }
    start() {
        this.isRunning = true;
        logger.info('Box Hit engine started', { timeframe: this.timeframe });
    }
    stop() {
        this.isRunning = false;
        logger.info('Box Hit engine stopped', { timeframe: this.timeframe });
    }
    destroy() {
        this.stop();
        this.removeAllListeners();
        this.priceHistory = [];
    }
    async placeBet(userId, contractId, amount) {
        logger.info('Attempting to place bet', {
            userId,
            contractId,
            amount,
            timeframe: this.timeframe,
        });
        // Get contract from clearing house
        const chContracts = clearingHouse_1.clearingHouseAPI.clearingHouse.getActiveIronCondorContracts(this.timeframe);
        const chContract = chContracts.find((c) => c.id === contractId);
        if (!chContract) {
            logger.warn('Contract not found', {
                contractId,
                availableContracts: chContracts
                    .slice(0, 5)
                    .map((c) => ({ id: c.id, status: c.status })),
            });
            return false;
        }
        // Log contract details for debugging
        logger.info('Found contract for bet placement', {
            contractId: chContract.id,
            startTime: new Date(chContract.exerciseWindow.start).toISOString(),
            endTime: new Date(chContract.exerciseWindow.end).toISOString(),
            strikes: chContract.strikeRange,
            status: chContract.status,
        });
        if (chContract.status !== 'active') {
            logger.warn('Contract not active', { contractId });
            return false;
        }
        // Place bet in clearing house
        const success = clearingHouse_1.clearingHouseAPI.clearingHouse.placeIronCondorPosition(userId, contractId, amount, this.timeframe);
        if (success) {
            // Emit bet placed event
            this.emit('betPlaced', {
                userId,
                contractId,
                amount,
            });
        }
        return success;
    }
    getActiveContracts() {
        // Get fresh contracts directly from clearing house
        const contracts = clearingHouse_1.clearingHouseAPI.clearingHouse.getActiveIronCondorContracts(this.timeframe);
        // Transform clearing house contracts to game contracts
        const gameContracts = [];
        for (const chContract of contracts) {
            // Include all active contracts
            const boxHitContract = {
                contractId: chContract.id,
                returnMultiplier: chContract.returnMultiplier,
                isActive: chContract.status === 'active',
                totalVolume: chContract.totalVolume,
                playerCount: chContract.positions.size,
                lowerStrike: chContract.strikeRange.lower,
                upperStrike: chContract.strikeRange.upper,
                startTime: chContract.exerciseWindow.start,
                endTime: chContract.exerciseWindow.end,
            };
            gameContracts.push(boxHitContract);
        }
        return gameContracts;
    }
    getGameState() {
        return {
            gameMode: types_1.GameMode.BOX_HIT,
            timeframe: this.timeframe,
            contracts: this.getActiveContracts(),
            currentPrice: this.currentPrice,
        };
    }
    onPriceUpdate(price, timestamp) {
        if (!this.isRunning)
            return;
        this.currentPrice = price;
        // Update price history (keep last 100 points)
        this.priceHistory.push({ price, timestamp });
        if (this.priceHistory.length > 100) {
            this.priceHistory.shift();
        }
        // Get active contracts from clearing house
        const chContracts = clearingHouse_1.clearingHouseAPI.clearingHouse.getActiveIronCondorContracts(this.timeframe);
        // Check if price hits any contracts
        for (const chContract of chContracts) {
            // Check if price is within strike range
            const isInRange = price >= chContract.strikeRange.lower &&
                price <= chContract.strikeRange.upper;
            if (isInRange) {
                this.emit('boxHit', {
                    contractId: chContract.id,
                    price,
                    timestamp,
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
        this.emit('boxExpired', {
            contractId,
            winners: winners.length,
            totalPayout,
        });
        logger.info('Box expired', {
            contractId,
            winners: winners.length,
            totalPayout,
        });
    }
}
exports.BoxHitEngine = BoxHitEngine;
