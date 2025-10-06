"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClearingHouseService = void 0;
const events_1 = require("events");
const clearingHouseConfig_1 = require("../config/clearingHouseConfig");
const timeframeConfig_1 = require("../../config/timeframeConfig");
const types_1 = require("../types");
const BalanceService_1 = require("./BalanceService");
const IronCondorOrderbook_1 = require("./IronCondorOrderbook");
const PriceFeedService_1 = require("./PriceFeedService");
const SpreadOrderbook_1 = require("./SpreadOrderbook");
/**
 * ClearingHouseService manages financial derivatives clearing operations
 * Handles iron condor and spread option contracts
 */
class ClearingHouseService extends events_1.EventEmitter {
    constructor() {
        super();
        this.ironCondorOrderbooks = new Map();
        this.spreadOrderbooks = new Map();
        this.currentPrice = clearingHouseConfig_1.CLEARING_HOUSE_CONFIG.constants.initialPrice;
        this.transactions = [];
        this.dataPointCount = 0;
        this.priceUnsubscribe = null;
        for (const tf of timeframeConfig_1.IronCondorTimeframes) {
            const orderbook = new IronCondorOrderbook_1.IronCondorOrderbook(tf);
            this.ironCondorOrderbooks.set(tf, orderbook);
        }
        // Initialize Spread orderbooks for each timeframe
        for (const tf of types_1.SpreadTimeframes) {
            const orderbook = new SpreadOrderbook_1.SpreadOrderbook(tf);
            this.spreadOrderbooks.set(tf, orderbook);
        }
        this.balanceService = new BalanceService_1.BalanceService();
        this.balanceService.on(types_1.MESSAGES.BALANCE_UPDATE, (data) => {
            this.emit(types_1.MESSAGES.BALANCE_UPDATE, {
                userId: data.userId,
                balance: data.newBalance,
                change: data.change,
                type: data.type,
            });
        });
        this.priceFeedService = new PriceFeedService_1.PriceFeedService();
        // Configure Iron Condor orderbooks
        for (const [timeframe, orderbook] of this.ironCondorOrderbooks.entries()) {
            orderbook.setDependencies(this.priceFeedService, this.balanceService);
            // Forward contract events with proper financial terminology
            orderbook.on('contract_exercised', (data) => {
                this.emit('iron_condor_exercised', data);
                // Record settlement transactions
                if (data.settlements) {
                    data.settlements.forEach((settlement) => {
                        this.recordTransaction({
                            userId: settlement.userId,
                            type: 'settlement',
                            amount: settlement.payout,
                            contractId: data.contractId,
                            returnMultiplier: data.returnMultiplier,
                            timestamp: data.timestamp,
                        });
                    });
                }
            });
            orderbook.on('contract_expired', (data) => this.emit('iron_condor_expired', data));
            orderbook.on('contracts_updated', (data) => {
                this.emit('iron_condor_contracts_updated', data);
            });
            orderbook.on('contracts_generated', (data) => {
                this.emit('iron_condor_contracts_generated', { ...data, timeframe });
            });
        }
        // Configure Spread orderbooks
        for (const orderbook of this.spreadOrderbooks.values()) {
            orderbook.setDependencies(this.priceFeedService, this.balanceService);
            // Forward spread events with proper financial terminology
            orderbook.on('spread_triggered', (data) => {
                this.emit('spread_triggered', data);
                // Record settlement transactions
                if (data.settlements) {
                    data.settlements.forEach((settlement) => {
                        this.recordTransaction({
                            userId: settlement.userId,
                            type: 'settlement',
                            amount: settlement.payout,
                            timestamp: data.timestamp,
                        });
                    });
                }
            });
            orderbook.on('spread_expired', (data) => this.emit('spread_expired', data));
            orderbook.on('spread_contracts_generated', (data) => this.emit('spread_contracts_generated', data));
        }
        this.priceFeedService.on(types_1.MESSAGES.PRICE_UPDATE, (price) => {
            this.onPriceUpdate(price.price, price.timestamp);
            this.emit(types_1.MESSAGES.PRICE_UPDATE, price);
        });
    }
    onPriceUpdate(price, timestamp) {
        this.currentPrice = price;
        this.dataPointCount++;
        // Let each orderbook handle its own price update and outcomes
        for (const orderbook of this.ironCondorOrderbooks.values()) {
            orderbook.onPriceUpdate(price, timestamp);
        }
        for (const orderbook of this.spreadOrderbooks.values()) {
            orderbook.onPriceUpdate(price, timestamp);
        }
    }
    /**
     * Place an iron condor position
     */
    placeIronCondorPosition(userId, contractId, amount, timeframe) {
        const orderbook = this.ironCondorOrderbooks.get(timeframe);
        if (!orderbook) {
            console.log(`[ClearingHouse] Position rejected - invalid timeframe: ${timeframe}`);
            return false;
        }
        // Check balance first
        if (!this.balanceService.hasBalance(userId, amount)) {
            console.log(`[ClearingHouse] Position rejected - insufficient balance`);
            this.emit('position_rejected', {
                userId,
                contractId,
                reason: 'Insufficient balance',
                amount,
            });
            return false;
        }
        // Try to place position in orderbook
        const success = orderbook.placePosition(contractId, userId, amount);
        if (!success) {
            console.log(`[ClearingHouse] Position rejected - contract not available`);
            this.emit('position_rejected', {
                userId,
                contractId,
                reason: 'Contract not available',
                amount,
            });
            return false;
        }
        // Deduct balance
        const newBalance = this.balanceService.debit(userId, amount);
        this.recordTransaction({
            userId,
            type: 'position',
            amount: -amount,
            contractId,
            timestamp: Date.now(),
        });
        // Get contract details for confirmation
        const contract = orderbook.getContractById(contractId);
        if (contract) {
            const confirmData = {
                userId,
                contractId,
                amount,
                balance: newBalance,
                returnMultiplier: contract.returnMultiplier,
            };
            console.log(`[ClearingHouse] Iron Condor position placed:`, confirmData);
            this.emit('iron_condor_position_confirmed', confirmData);
        }
        return true;
    }
    /**
     * Place a spread position
     */
    placeSpreadPosition(userId, contractId, amount, timeframe) {
        const orderbook = this.spreadOrderbooks.get(timeframe);
        if (!orderbook) {
            return { success: false, error: 'Invalid timeframe' };
        }
        // Check balance first
        if (!this.balanceService.hasBalance(userId, amount)) {
            return { success: false, error: 'Insufficient balance' };
        }
        // Try to place position in orderbook
        const success = orderbook.placePosition(contractId, userId, amount);
        if (!success) {
            return { success: false, error: 'Contract not active' };
        }
        // Deduct balance
        const newBalance = this.balanceService.debit(userId, amount);
        this.recordTransaction({
            userId,
            type: 'position',
            amount: -amount,
            timestamp: Date.now(),
        });
        // Get contract details for confirmation
        const contract = orderbook.getContractById(contractId);
        if (contract) {
            this.emit('spread_position_placed', {
                userId,
                contractId,
                amount,
                balance: newBalance,
                returnMultiplier: contract.returnMultiplier,
                spreadType: contract.spreadType,
            });
            console.log(`[ClearingHouse] SPREAD POSITION: User ${userId} placed $${amount} on ${contract.spreadType} spread ${contractId} (${contract.returnMultiplier}x) - New balance: $${newBalance}`);
        }
        return { success: true };
    }
    recordTransaction(transaction) {
        this.transactions.push(transaction);
        // Emit balance update
        this.emit(types_1.MESSAGES.BALANCE_UPDATE, {
            userId: transaction.userId,
            balance: this.balanceService.getBalance(transaction.userId),
            transaction,
        });
    }
    getUserBalance(userId) {
        return this.balanceService.getBalance(userId);
    }
    initializeUser(userId) {
        const balance = this.balanceService.initializeUser(userId);
        console.log(`[ClearingHouse] User ${userId} initialized with balance: $${balance}`);
    }
    /**
     * Get active iron condor contracts for a timeframe
     */
    getActiveIronCondorContracts(timeframe) {
        const orderbook = this.ironCondorOrderbooks.get(timeframe);
        if (!orderbook)
            return [];
        const contracts = Array.from(orderbook.getActiveContracts().values());
        return contracts;
    }
    /**
     * Get active spread contracts for a timeframe
     */
    getActiveSpreadContracts(timeframe) {
        const orderbook = this.spreadOrderbooks.get(timeframe);
        if (!orderbook) {
            return [];
        }
        return Array.from(orderbook.getActiveContracts().values());
    }
    getDataPointCount() {
        return this.dataPointCount;
    }
    getCurrentPrice() {
        return this.currentPrice;
    }
    // Price feed management methods
    startPriceFeed() {
        this.priceFeedService.start();
        console.log('[ClearingHouse] Price feed started');
    }
    stopPriceFeed() {
        this.priceFeedService.stop();
        console.log('[ClearingHouse] Price feed stopped');
    }
    // Cleanup method
    destroy() {
        this.stopPriceFeed();
        if (this.priceUnsubscribe) {
            this.priceUnsubscribe();
            this.priceUnsubscribe = null;
        }
        this.removeAllListeners();
        console.log('[ClearingHouse] Service destroyed');
    }
}
exports.ClearingHouseService = ClearingHouseService;
