"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalanceLedger = void 0;
const events_1 = require("events");
const clearingHouseConfig_1 = require("../config/clearingHouseConfig");
class BalanceLedger extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.clearingHouseFloat = clearingHouseConfig_1.CLEARING_HOUSE_CONFIG.clearingHouseStartingBalance;
        this.startingBalance = clearingHouseConfig_1.CLEARING_HOUSE_CONFIG.userStartingBalance;
        this.accounts = new Map();
    }
    initializeUser(userId) {
        const existing = this.accounts.get(userId);
        if (existing) {
            return this.buildSnapshot(userId, existing);
        }
        const account = {
            available: this.startingBalance,
            locked: 0,
            version: 1,
        };
        this.accounts.set(userId, account);
        const snapshot = this.buildSnapshot(userId, account);
        this.emit('balance_event', {
            type: 'initialize',
            snapshot,
        });
        return snapshot;
    }
    credit(userId, amount, reason) {
        if (amount <= 0) {
            throw new Error('Credit amount must be positive');
        }
        const account = this.getAccount(userId);
        account.available += amount;
        account.version += 1;
        this.clearingHouseFloat -= amount;
        this.emit('balance_event', {
            type: 'credit',
            snapshot: this.buildSnapshot(userId, account),
            delta: amount,
            reason,
        });
        return account.available;
    }
    debit(userId, amount, reason) {
        if (amount <= 0) {
            throw new Error('Debit amount must be positive');
        }
        const account = this.getAccount(userId);
        if (account.available < amount) {
            throw new Error(`Insufficient balance. Current: ${account.available}, required: ${amount}`);
        }
        account.available -= amount;
        account.version += 1;
        this.clearingHouseFloat += amount;
        this.emit('balance_event', {
            type: 'debit',
            snapshot: this.buildSnapshot(userId, account),
            delta: -amount,
            reason,
        });
        return account.available;
    }
    lockCollateral(userId, amount, reason) {
        if (amount <= 0) {
            throw new Error('Lock amount must be positive');
        }
        const account = this.getAccount(userId);
        if (account.available < amount) {
            throw new Error(`Insufficient available balance to lock. Available: ${account.available}, required: ${amount}`);
        }
        account.available -= amount;
        account.locked += amount;
        account.version += 1;
        const snapshot = this.buildSnapshot(userId, account);
        this.emit('balance_event', {
            type: 'lock',
            snapshot,
            delta: -amount,
            reason,
        });
        return snapshot;
    }
    unlockCollateral(userId, amount, reason) {
        if (amount <= 0) {
            throw new Error('Unlock amount must be positive');
        }
        const account = this.getAccount(userId);
        if (account.locked < amount) {
            throw new Error(`Insufficient locked balance to unlock. Locked: ${account.locked}, requested: ${amount}`);
        }
        account.locked -= amount;
        account.available += amount;
        account.version += 1;
        const snapshot = this.buildSnapshot(userId, account);
        this.emit('balance_event', {
            type: 'unlock',
            snapshot,
            delta: amount,
            reason,
        });
        return snapshot;
    }
    getAvailable(userId) {
        return this.accounts.get(userId)?.available ?? 0;
    }
    getLocked(userId) {
        return this.accounts.get(userId)?.locked ?? 0;
    }
    getBalance(userId) {
        return this.getAvailable(userId);
    }
    hasAvailable(userId, amount) {
        return this.getAvailable(userId) >= amount;
    }
    getSnapshot(userId) {
        const account = this.getAccount(userId);
        return this.buildSnapshot(userId, account);
    }
    getAccount(userId) {
        if (!this.accounts.has(userId)) {
            this.initializeUser(userId);
        }
        return this.accounts.get(userId);
    }
    buildSnapshot(userId, account) {
        return {
            userId,
            available: account.available,
            locked: account.locked,
            version: account.version,
        };
    }
}
exports.BalanceLedger = BalanceLedger;
