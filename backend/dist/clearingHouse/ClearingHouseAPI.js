"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearingHouseAPI = exports.ClearingHouseAPI = void 0;
const events_1 = require("events");
const ClearingHouseService_1 = require("./services/ClearingHouseService");
const messages_1 = require("./types/messages");
/**
 * ClearingHouseAPI is the public interface for the clearing house.
 * All external access to clearing house functionality should go through this API.
 */
class ClearingHouseAPI extends events_1.EventEmitter {
    constructor() {
        super();
        this.sessions = new Map();
        this.userSessions = new Map(); // userId -> sessionId
        this.clearingHouse = new ClearingHouseService_1.ClearingHouseService();
        this.setupEventForwarding();
    }
    // User Management
    async authenticateUser(username, userId) {
        // Use provided userId or generate a new one
        const finalUserId = userId ||
            `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        // Get or create balance
        let balance = this.clearingHouse.getUserBalance(finalUserId);
        if (balance === 0) {
            // New user gets initial balance
            const balanceService = this.clearingHouse.balanceService;
            balanceService.credit(finalUserId, 10000);
            balance = this.clearingHouse.getUserBalance(finalUserId);
        }
        return {
            userId: finalUserId,
            username,
            balance,
        };
    }
    // Session Management
    async createSession(userId, marketType, timeframe) {
        const sessionId = `${marketType}_session_${Date.now()}`;
        const sessionInfo = {
            sessionId,
            userId,
            marketType,
            timeframe,
            startedAt: Date.now(),
        };
        this.sessions.set(sessionId, sessionInfo);
        this.userSessions.set(userId, sessionId);
        return {
            sessionId,
            marketType,
            timeframe,
            mode: 'unlimited',
        };
    }
    async leaveSession(userId) {
        const sessionId = this.userSessions.get(userId);
        if (sessionId) {
            this.sessions.delete(sessionId);
            this.userSessions.delete(userId);
        }
    }
    // Trading Operations
    async placeIronCondorTrade(userId, contractId, amount) {
        // Get timeframe from session
        const sessionId = this.userSessions.get(userId);
        const session = sessionId ? this.sessions.get(sessionId) : null;
        if (!session) {
            throw new Error('User not in a session');
        }
        const success = this.clearingHouse.placeIronCondorPosition(userId, contractId, amount, session.timeframe);
        if (!success) {
            throw new Error('Trade failed');
        }
        const balance = this.clearingHouse.getUserBalance(userId);
        return {
            contractId,
            amount,
            balance,
            position: {
                userId,
                amount,
                timestamp: Date.now(),
            },
        };
    }
    async placeSpreadTrade(userId, contractId, amount) {
        // Get timeframe from session
        const sessionId = this.userSessions.get(userId);
        const session = sessionId ? this.sessions.get(sessionId) : null;
        if (!session) {
            throw new Error('User not in a session');
        }
        const result = this.clearingHouse.placeSpreadPosition(userId, contractId, amount, session.timeframe);
        if (!result.success) {
            throw new Error(result.error || 'Trade failed');
        }
        const balance = this.clearingHouse.getUserBalance(userId);
        return {
            contractId,
            amount,
            balance,
            position: {
                userId,
                amount,
                timestamp: Date.now(),
            },
        };
    }
    // Contract Information
    async getIronCondorContracts(timeframe) {
        const contracts = this.clearingHouse
            .getActiveContracts(messages_1.MarketType.IRON_CONDOR, timeframe)
            .map((contract) => this.clearingHouse.formatContractForClient(messages_1.MarketType.IRON_CONDOR, contract));
        return {
            timeframe,
            contracts: contracts,
        };
    }
    async getSpreadContracts(timeframe) {
        const contracts = this.clearingHouse
            .getActiveContracts(messages_1.MarketType.SPREAD, timeframe)
            .map((contract) => this.clearingHouse.formatContractForClient(messages_1.MarketType.SPREAD, contract));
        return {
            timeframe,
            contracts: contracts,
        };
    }
    // Balance Operations
    getUserBalance(userId) {
        return this.clearingHouse.getUserBalance(userId);
    }
    deposit(userId, amount) {
        const balanceService = this.clearingHouse.balanceService;
        return balanceService.credit(userId, amount);
    }
    // Message Processing
    async processMessage(message, userId) {
        switch (message.type) {
            case messages_1.ClientMessageType.CONNECT:
                const authResult = await this.authenticateUser(message.payload.username);
                return {
                    type: messages_1.ServerMessageType.CONNECTED,
                    payload: authResult,
                    timestamp: Date.now(),
                };
            case messages_1.ClientMessageType.JOIN_SESSION:
                const sessionResult = await this.createSession(userId, message.payload.marketType, message.payload.timeframe);
                return {
                    type: messages_1.ServerMessageType.SESSION_JOINED,
                    payload: sessionResult,
                    timestamp: Date.now(),
                };
            case messages_1.ClientMessageType.PLACE_TRADE:
                const tradeResult = await this.placeIronCondorTrade(userId, message.payload.contractId, message.payload.amount);
                return {
                    type: messages_1.ServerMessageType.TRADE_PLACED,
                    payload: tradeResult,
                    timestamp: Date.now(),
                };
            case messages_1.ClientMessageType.PLACE_SPREAD_TRADE:
                const spreadResult = await this.placeSpreadTrade(userId, message.payload.contractId, message.payload.amount);
                return {
                    type: messages_1.ServerMessageType.TRADE_PLACED,
                    payload: spreadResult,
                    timestamp: Date.now(),
                };
            case messages_1.ClientMessageType.GET_STATE:
                const balance = this.getUserBalance(userId);
                return {
                    type: messages_1.ServerMessageType.STATE_UPDATE,
                    payload: { balance },
                    timestamp: Date.now(),
                };
            default:
                return null;
        }
    }
    // Event Subscriptions
    onPriceUpdate(callback) {
        this.on('price.update', callback);
    }
    onBalanceUpdate(callback) {
        this.on('balance.update', callback);
    }
    onContractSettlement(callback) {
        this.on('contract.settlement', callback);
    }
    contractEventName(product, suffix) {
        switch (product) {
            case messages_1.MarketType.IRON_CONDOR:
                return `iron_condor_${suffix}`;
            case messages_1.MarketType.SPREAD:
                return `spread_${suffix}`;
            default:
                return `${product}_${suffix}`;
        }
    }
    contractTypeLabel(product) {
        switch (product) {
            case messages_1.MarketType.IRON_CONDOR:
                return 'ironCondor';
            case messages_1.MarketType.SPREAD:
                return 'spread';
            default:
                return product;
        }
    }
    setupEventForwarding() {
        this.clearingHouse.on('price_update', (pricePoint) => {
            this.emit('price.update', pricePoint.price, pricePoint.timestamp);
        });
        this.clearingHouse.on('balance_updated', (data) => {
            this.emit('balance.update', data.userId, data.balance);
        });
        this.clearingHouse.on('contracts_generated', (payload) => {
            const formatted = payload.contracts.map((contract) => this.clearingHouse.formatContractForClient(payload.product, contract));
            this.emit(this.contractEventName(payload.product, 'contracts_generated'), {
                product: payload.product,
                timeframe: payload.timeframe,
                contracts: formatted,
                timestamp: payload.timestamp,
            });
        });
        this.clearingHouse.on('contracts_updated', (payload) => {
            const formatted = payload.contracts.map((contract) => this.clearingHouse.formatContractForClient(payload.product, contract));
            this.emit(this.contractEventName(payload.product, 'contracts_updated'), {
                product: payload.product,
                timeframe: payload.timeframe,
                contracts: formatted,
                timestamp: payload.timestamp,
            });
        });
        this.clearingHouse.on('contract_settled', (payload) => {
            const type = this.contractTypeLabel(payload.product);
            const settlements = payload.settlements.map((settlement) => ({
                userId: settlement.userId,
                position: settlement.amount,
                payout: settlement.payout,
            }));
            this.emit('contract.settlement', {
                type,
                contractId: payload.contract.id,
                settlements,
                timestamp: payload.timestamp,
                contract: this.clearingHouse.formatContractForClient(payload.product, payload.contract),
            });
        });
        this.clearingHouse.on('contract_expired', (payload) => {
            const type = this.contractTypeLabel(payload.product);
            const settlements = payload.expiredPositions.map((pos) => ({
                userId: pos.userId,
                position: pos.amount,
                payout: 0,
            }));
            this.emit('contract.settlement', {
                type,
                contractId: payload.contract.id,
                settlements,
                timestamp: payload.timestamp,
                contract: this.clearingHouse.formatContractForClient(payload.product, payload.contract),
            });
        });
        this.clearingHouse.on('position_confirmed', (payload) => {
            this.emit('position.confirmed', payload);
        });
        this.clearingHouse.on('position_rejected', (payload) => {
            this.emit('position.rejected', payload);
        });
    }
}
exports.ClearingHouseAPI = ClearingHouseAPI;
// Export singleton instance
exports.clearingHouseAPI = new ClearingHouseAPI();
