"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketMakerEngine = void 0;
const DEFAULT_OPTIONS = {
    makerId: 'mm_bot',
    seedIntervalMs: 1000,
    initialBalance: 1000000,
    orderSizeRange: {
        min: 1,
        max: 5,
    },
};
class MarketMakerEngine {
    constructor(orderbooks, registry, balance, admin, options = {}) {
        this.orderbooks = orderbooks;
        this.registry = registry;
        this.balance = balance;
        this.admin = admin;
        this.seededContracts = new Set();
        this.timer = null;
        const resolved = { ...DEFAULT_OPTIONS, ...options };
        this.makerId = resolved.makerId;
        this.seedIntervalMs = resolved.seedIntervalMs;
        this.initialBalance = resolved.initialBalance;
        this.orderSizeRange = resolved.orderSizeRange;
    }
    start() {
        this.ensureMakerReady();
        if (!this.timer) {
            this.timer = setInterval(() => this.seedContracts(), this.seedIntervalMs);
        }
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    clearTrackedContracts(contractIds) {
        contractIds.forEach((id) => this.seededContracts.delete(id));
    }
    ensureMakerReady() {
        this.admin.whitelistMaker(this.makerId);
        const snapshot = this.balance.initializeUser(this.makerId);
        if (snapshot.available < this.initialBalance) {
            const topUp = this.initialBalance - snapshot.available;
            if (topUp > 0) {
                this.balance.credit(this.makerId, topUp, 'market_maker_initial_funding');
            }
        }
    }
    seedContracts() {
        const definitions = this.registry.listDefinitions();
        definitions.forEach((definition) => {
            definition.timeframes.forEach((timeframe) => {
                const blueprint = this.registry.getBlueprint(definition.id, timeframe);
                const contracts = this.orderbooks.getContractsForProduct(definition.id, timeframe);
                contracts.forEach((contract) => {
                    if (contract.status !== 'active') {
                        this.seededContracts.delete(contract.id);
                        return;
                    }
                    if (contract.makerQuote?.makerId === this.makerId) {
                        return;
                    }
                    const baseQuote = blueprint.createMakerQuote({
                        contract: contract,
                        makerId: this.makerId,
                    });
                    const quote = {
                        ...baseQuote,
                        collateralPerUnit: this.randomAmount(),
                    };
                    const applied = this.orderbooks.applyMakerQuote(definition.id, timeframe, contract.id, quote);
                    if (applied) {
                        this.seededContracts.add(contract.id);
                    }
                });
            });
        });
    }
    randomAmount() {
        const { min, max } = this.orderSizeRange;
        return Math.floor(min + Math.random() * (max - min + 1));
    }
}
exports.MarketMakerEngine = MarketMakerEngine;
