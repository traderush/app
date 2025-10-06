"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalanceService = void 0;
const events_1 = require("events");
const clearingHouseConfig_1 = require("../config/clearingHouseConfig");
class BalanceService extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.userBalances = new Map();
        this.clearingHouseBalance = clearingHouseConfig_1.CLEARING_HOUSE_CONFIG.clearingHouseStartingBalance;
        this.userStartingBalance = clearingHouseConfig_1.CLEARING_HOUSE_CONFIG.userStartingBalance;
    }
    initializeUser(userId) {
        if (this.userBalances.has(userId)) {
            return this.userBalances.get(userId);
        }
        this.userBalances.set(userId, this.userStartingBalance);
        this.emit('balance_initialized', { userId, balance: this.userStartingBalance });
        return this.userStartingBalance;
    }
    credit(userId, amount) {
        if (amount <= 0) {
            throw new Error('Credit amount must be positive');
        }
        const currentBalance = this.userBalances.get(userId) || 0;
        const newBalance = currentBalance + amount;
        this.userBalances.set(userId, newBalance);
        // Update clearing house balance (opposite direction)
        this.clearingHouseBalance -= amount;
        this.emit('balance_updated', {
            userId,
            previousBalance: currentBalance,
            newBalance,
            change: amount,
            type: 'credit'
        });
        return newBalance;
    }
    debit(userId, amount) {
        if (amount <= 0) {
            throw new Error('Debit amount must be positive');
        }
        const currentBalance = this.userBalances.get(userId) || 0;
        if (currentBalance < amount) {
            throw new Error(`Insufficient balance. Current: ${currentBalance}, Required: ${amount}`);
        }
        const newBalance = currentBalance - amount;
        this.userBalances.set(userId, newBalance);
        this.clearingHouseBalance += amount;
        this.emit('balance_updated', {
            userId,
            previousBalance: currentBalance,
            newBalance,
            change: -amount,
            type: 'debit'
        });
        return newBalance;
    }
    getBalance(userId) {
        return this.userBalances.get(userId) || 0;
    }
    hasBalance(userId, amount) {
        return this.getBalance(userId) >= amount;
    }
}
exports.BalanceService = BalanceService;
