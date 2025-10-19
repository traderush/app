"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderbookNetwork = void 0;
const events_1 = require("events");
const messages_1 = require("../types/messages");
const EphemeralOrderbook_1 = require("./EphemeralOrderbook");
class OrderbookNetwork extends events_1.EventEmitter {
    constructor(productRegistry, dependencies) {
        super();
        this.productRegistry = productRegistry;
        this.dependencies = dependencies;
        this.books = new Map();
        this.bootstrap();
    }
    placeOrder(product, context) {
        const book = this.getOrderbook(product, context.timeframe);
        if (!book) {
            return {
                success: false,
                error: `No orderbook for product ${product} timeframe ${context.timeframe}`,
            };
        }
        const success = book.placePosition(context.contractId, {
            userId: context.userId,
            amount: context.amount,
            timestamp: Date.now(),
        });
        if (!success) {
            return {
                success: false,
                error: 'Contract not available',
            };
        }
        const contract = book.getContractById(context.contractId);
        return { success: true, contract: contract ?? undefined };
    }
    handleTick(pricePoint) {
        for (const timeframeMap of this.books.values()) {
            for (const orderbook of timeframeMap.values()) {
                orderbook.onPriceUpdate(pricePoint.price, pricePoint.timestamp);
            }
        }
    }
    getContracts(product, timeframe) {
        const book = this.getOrderbook(product, timeframe);
        if (!book) {
            return [];
        }
        const contracts = Array.from(book.getActiveContracts().values());
        switch (product) {
            case messages_1.MarketType.IRON_CONDOR:
                return contracts;
            case messages_1.MarketType.SPREAD:
                return contracts;
            default:
                return contracts;
        }
    }
    getContractsForProduct(product, timeframe) {
        const book = this.getOrderbook(product, timeframe);
        if (!book) {
            return [];
        }
        return Array.from(book.getActiveContracts().values());
    }
    getContractById(product, timeframe, contractId) {
        const book = this.getOrderbook(product, timeframe);
        return book ? book.getContractById(contractId) : null;
    }
    applyMakerQuote(product, timeframe, contractId, quote) {
        const book = this.getOrderbook(product, timeframe);
        if (!book) {
            return false;
        }
        const applied = book.setMakerQuote(contractId, quote);
        if (applied) {
            this.emit('maker_quote_applied', {
                product,
                timeframe,
                contractId,
                quote,
            });
        }
        return applied;
    }
    getOrderbook(product, timeframe) {
        return this.books.get(product)?.get(timeframe);
    }
    bootstrap() {
        for (const definition of this.productRegistry.listDefinitions()) {
            const timeframeMap = new Map();
            for (const timeframe of definition.timeframes) {
                const blueprint = definition.blueprintFactory(timeframe);
                const orderbook = new EphemeralOrderbook_1.EphemeralOrderbook(blueprint, this.dependencies);
                this.attachEvents(definition.id, timeframe, orderbook);
                timeframeMap.set(timeframe, orderbook);
            }
            this.books.set(definition.id, timeframeMap);
        }
    }
    attachEvents(product, timeframe, orderbook) {
        orderbook.on('contracts_generated', ({ contracts, timestamp }) => {
            this.emit('contracts_generated', {
                product,
                timeframe,
                contracts,
                timestamp,
            });
        });
        orderbook.on('contracts_updated', ({ contracts, timestamp }) => {
            this.emit('contracts_updated', {
                product,
                timeframe,
                contracts,
                timestamp,
            });
        });
        orderbook.on('contract_settled', ({ contract, settlements, timestamp }) => {
            this.emit('contract_settled', {
                product,
                timeframe,
                contract,
                settlements: settlements,
                timestamp,
            });
        });
        orderbook.on('contract_expired', ({ contract, expiredPositions, timestamp }) => {
            this.emit('contract_expired', {
                product,
                timeframe,
                contract,
                expiredPositions: expiredPositions,
                timestamp,
            });
        });
    }
}
exports.OrderbookNetwork = OrderbookNetwork;
