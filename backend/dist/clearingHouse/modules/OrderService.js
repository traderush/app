"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const events_1 = require("events");
const messages_1 = require("../types/messages");
class OrderService extends events_1.EventEmitter {
    constructor(registry, orderbooks, margin, positions) {
        super();
        this.registry = registry;
        this.orderbooks = orderbooks;
        this.margin = margin;
        this.positions = positions;
    }
    placeIronCondor(params) {
        return this.placeOrder(messages_1.MarketType.IRON_CONDOR, params);
    }
    placeSpread(params) {
        return this.placeOrder(messages_1.MarketType.SPREAD, params);
    }
    placeOrder(product, { userId, contractId, amount, timeframe }) {
        if (amount <= 0) {
            return { success: false, error: 'Amount must be positive' };
        }
        let blueprint;
        try {
            blueprint = this.registry.getBlueprint(product, timeframe);
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Invalid product timeframe',
            };
        }
        const placement = this.orderbooks.placeOrder(product, {
            timeframe,
            contractId,
            userId,
            amount,
        });
        if (!placement.success || !placement.contract) {
            return {
                success: false,
                error: placement.error || 'Contract not available',
            };
        }
        const contract = placement.contract;
        const quote = contract.makerQuote;
        if (!quote) {
            return { success: false, error: 'No maker liquidity available' };
        }
        const collateral = blueprint.calculateRequiredCollateral({
            amount,
            contract: contract,
            quote,
        });
        const marginResult = this.margin.applyFill(userId, collateral, product, timeframe);
        if (!marginResult.success) {
            return { success: false, error: 'Margin check failed' };
        }
        const position = this.positions.openPosition({
            userId,
            contractId,
            amount,
            collateral,
            product,
            timeframe,
        });
        const result = {
            success: true,
            balance: marginResult.balance,
            contractId,
            contract: placement.contract,
            product,
            position,
            collateral,
        };
        this.emit('order_placed', result);
        return result;
    }
}
exports.OrderService = OrderService;
