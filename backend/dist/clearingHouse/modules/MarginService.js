"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarginService = void 0;
const events_1 = require("events");
class MarginService extends events_1.EventEmitter {
    constructor(ledger) {
        super();
        this.ledger = ledger;
    }
    /**
     * Optimistically ensure the maker has sufficient available balance after an order fill.
     */
    validate(userId, collateral) {
        return this.ledger.hasAvailable(userId, collateral);
    }
    /**
     * Apply collateral requirements immediately after the fill.
     * This mirrors the legacy behaviour of debiting the user balance up front.
     */
    applyFill(userId, collateral, marketType, timeframe) {
        if (!this.validate(userId, collateral)) {
            this.emit('margin_event', {
                type: 'violation',
                userId,
                required: collateral,
                available: this.ledger.getAvailable(userId),
                marketType,
                timeframe,
            });
            return { success: false };
        }
        const balance = this.ledger.debit(userId, collateral, `${marketType}:${timeframe}:debit`);
        this.emit('margin_event', {
            type: 'fill_recorded',
            userId,
            collateral,
            marketType,
            timeframe,
            balance,
        });
        return { success: true, balance };
    }
    /**
     * Release payout proceeds back to the user account.
     */
    settlePayout(userId, payout, reason) {
        return this.ledger.credit(userId, payout, reason);
    }
}
exports.MarginService = MarginService;
