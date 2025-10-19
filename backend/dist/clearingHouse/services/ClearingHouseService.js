"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClearingHouseService = void 0;
const events_1 = require("events");
const clearingHouseConfig_1 = require("../config/clearingHouseConfig");
const types_1 = require("../types");
const messages_1 = require("../types/messages");
const ProductTypeRegistry_1 = require("../modules/ProductTypeRegistry");
const BalanceLedger_1 = require("../modules/BalanceLedger");
const MarginService_1 = require("../modules/MarginService");
const PositionService_1 = require("../modules/PositionService");
const OracleModule_1 = require("../modules/OracleModule");
const ClockModule_1 = require("../modules/ClockModule");
const OrderbookNetwork_1 = require("../modules/OrderbookNetwork");
const OrderService_1 = require("../modules/OrderService");
const AdminModule_1 = require("../modules/AdminModule");
const MarketMakerEngine_1 = require("../modules/MarketMakerEngine");
class ClearingHouseService extends events_1.EventEmitter {
    constructor() {
        super();
        this.currentPrice = clearingHouseConfig_1.CLEARING_HOUSE_CONFIG.constants.initialPrice;
        this.dataPointCount = 0;
        this.transactions = [];
        this.productRegistry = new ProductTypeRegistry_1.ProductTypeRegistry();
        this.balanceService = new BalanceLedger_1.BalanceLedger();
        this.marginService = new MarginService_1.MarginService(this.balanceService);
        this.positionService = new PositionService_1.PositionService();
        this.oracle = new OracleModule_1.OracleModule();
        this.clock = new ClockModule_1.ClockModule(this.oracle);
        this.orderbooks = new OrderbookNetwork_1.OrderbookNetwork(this.productRegistry, {
            priceProvider: this.oracle,
        });
        this.orderService = new OrderService_1.OrderService(this.productRegistry, this.orderbooks, this.marginService, this.positionService);
        this.adminModule = new AdminModule_1.AdminModule(this.productRegistry);
        this.marketMaker = new MarketMakerEngine_1.MarketMakerEngine(this.orderbooks, this.productRegistry, this.balanceService, this.adminModule);
        this.bindEvents();
        this.marketMaker.start();
    }
    initializeUser(userId) {
        const snapshot = this.balanceService.initializeUser(userId);
        this.log(`[ClearingHouse] User ${userId} initialized with balance: $${snapshot.available}`);
    }
    getUserBalance(userId) {
        return this.balanceService.getBalance(userId);
    }
    placeIronCondorPosition(userId, contractId, amount, timeframe) {
        const result = this.placePosition(messages_1.MarketType.IRON_CONDOR, userId, contractId, amount, timeframe);
        return result.success;
    }
    placeSpreadPosition(userId, contractId, amount, timeframe) {
        const result = this.placePosition(messages_1.MarketType.SPREAD, userId, contractId, amount, timeframe);
        if (!result.success) {
            return { success: false, error: result.error };
        }
        return { success: true };
    }
    getActiveIronCondorContracts(timeframe) {
        return this.orderbooks.getContracts(messages_1.MarketType.IRON_CONDOR, timeframe);
    }
    getActiveSpreadContracts(timeframe) {
        return this.orderbooks.getContracts(messages_1.MarketType.SPREAD, timeframe);
    }
    getActiveContracts(product, timeframe) {
        switch (product) {
            case messages_1.MarketType.IRON_CONDOR:
                return this.orderbooks.getContracts(messages_1.MarketType.IRON_CONDOR, timeframe);
            case messages_1.MarketType.SPREAD:
                return this.orderbooks.getContracts(messages_1.MarketType.SPREAD, timeframe);
            default:
                return this.orderbooks.getContracts(product, timeframe);
        }
    }
    getCurrentPrice() {
        return this.currentPrice;
    }
    getDataPointCount() {
        return this.dataPointCount;
    }
    startPriceFeed() {
        this.clock.start();
        this.log('[ClearingHouse] Clock started');
    }
    stopPriceFeed() {
        this.clock.stop();
        this.log('[ClearingHouse] Clock stopped');
    }
    destroy() {
        this.stopPriceFeed();
        this.marketMaker.stop();
        this.removeAllListeners();
        this.log('[ClearingHouse] Service destroyed');
    }
    getAdminModule() {
        return this.adminModule;
    }
    placePosition(product, userId, contractId, amount, timeframe) {
        const result = this.orderService.placeOrder(product, {
            userId,
            contractId,
            amount,
            timeframe,
        });
        if (!result.success || !result.position || !result.contract) {
            this.emit('position_rejected', {
                userId,
                contractId,
                reason: result.error,
                amount,
                product,
            });
            return { success: false, error: result.error };
        }
        const returnMultiplier = this.productRegistry.getReturnMultiplier(product, result.contract);
        const collateral = result.collateral ?? amount;
        this.emit('position_confirmed', {
            product,
            userId,
            contractId,
            amount,
            collateral,
            balance: result.balance,
            returnMultiplier,
            contract: result.contract,
        });
        return {
            success: true,
            balance: result.balance,
            contract: result.contract,
            position: result.position,
            collateral,
        };
    }
    bindEvents() {
        this.clock.on('tick', (price) => this.handleTick(price));
        this.balanceService.on('balance_event', (event) => {
            this.emit(types_1.MESSAGES.BALANCE_UPDATE, {
                userId: event.snapshot.userId,
                balance: event.snapshot.available,
                change: event.delta ?? 0,
                type: event.type,
            });
        });
        this.marginService.on('margin_event', (event) => {
            if (event.type === 'fill_recorded') {
                this.recordTransaction({
                    userId: event.userId,
                    type: 'position',
                    amount: -event.collateral,
                    timestamp: Date.now(),
                });
            }
        });
        this.orderbooks.on('contracts_generated', (payload) => {
            this.emit('contracts_generated', payload);
        });
        this.orderbooks.on('contracts_updated', (payload) => {
            this.emit('contracts_updated', payload);
        });
        this.orderbooks.on('contract_settled', (payload) => {
            this.handleSettlement(payload);
        });
        this.orderbooks.on('contract_expired', (payload) => {
            this.handleExpiry(payload);
        });
        this.orderService.on('order_placed', (payload) => {
            this.emit('order_placed', payload);
        });
        this.positionService.on('position_settled', (position) => {
            this.recordTransaction({
                userId: position.userId,
                type: 'settlement',
                amount: position.payout ?? 0,
                contractId: position.contractId,
                timestamp: position.closedAt ?? Date.now(),
            });
        });
    }
    handleTick(price) {
        this.currentPrice = price.price;
        this.dataPointCount += 1;
        this.orderbooks.handleTick(price);
        this.emit(types_1.MESSAGES.PRICE_UPDATE, price);
    }
    handleSettlement(payload) {
        const payoutLookup = new Map(payload.settlements.map((entry) => [entry.userId, entry.payout]));
        const settledPositions = this.positionService.settlePositionsByContract(payload.contract.id, (record) => payoutLookup.get(record.userId) ?? 0);
        for (const settlement of payload.settlements) {
            if (settlement.payout > 0) {
                this.marginService.settlePayout(settlement.userId, settlement.payout, `${payload.product}:${payload.contract.id}:settlement`);
                this.recordTransaction({
                    userId: settlement.userId,
                    type: 'settlement',
                    amount: settlement.payout,
                    contractId: payload.contract.id,
                    timestamp: payload.timestamp,
                });
            }
        }
        this.emit('contract_settled', {
            product: payload.product,
            timeframe: payload.timeframe,
            contract: payload.contract,
            settlements: payload.settlements,
            timestamp: payload.timestamp,
            positions: settledPositions,
        });
        this.marketMaker.clearTrackedContracts([payload.contract.id]);
    }
    handleExpiry(payload) {
        this.positionService.settlePositionsByContract(payload.contract.id, () => 0);
        this.emit('contract_expired', payload);
        this.marketMaker.clearTrackedContracts([payload.contract.id]);
    }
    formatContractForClient(product, contract) {
        return this.productRegistry.formatContractForClient(product, contract);
    }
    getReturnMultiplier(product, contract) {
        return this.productRegistry.getReturnMultiplier(product, contract);
    }
    recordTransaction(transaction) {
        this.transactions.push(transaction);
        this.emit('transaction_recorded', transaction);
    }
    log(message) {
        console.log(message);
    }
}
exports.ClearingHouseService = ClearingHouseService;
