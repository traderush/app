"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PositionService = void 0;
const events_1 = require("events");
class PositionService extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.positions = new Map();
        this.userPositions = new Map();
    }
    openPosition(params) {
        const position = {
            positionId: this.generateId(params),
            userId: params.userId,
            contractId: params.contractId,
            amount: params.amount,
            collateral: params.collateral,
            product: params.product,
            timeframe: params.timeframe,
            openedAt: Date.now(),
            status: 'open',
        };
        this.positions.set(position.positionId, position);
        if (!this.userPositions.has(position.userId)) {
            this.userPositions.set(position.userId, new Set());
        }
        this.userPositions.get(position.userId).add(position.positionId);
        this.emit('position_opened', position);
        return position;
    }
    settlePosition(positionId, payout) {
        const position = this.positions.get(positionId);
        if (!position) {
            return;
        }
        position.status = 'settled';
        position.closedAt = Date.now();
        position.payout = payout;
        this.emit('position_settled', position);
    }
    settlePositionsByContract(contractId, computePayout) {
        const affected = [];
        for (const record of this.positions.values()) {
            if (record.contractId !== contractId || record.status !== 'open') {
                continue;
            }
            const payout = computePayout(record);
            this.settlePosition(record.positionId, payout);
            affected.push({ ...record });
        }
        return affected;
    }
    getUserPositions(userId) {
        const ids = this.userPositions.get(userId);
        if (!ids)
            return [];
        return Array.from(ids)
            .map((id) => this.positions.get(id))
            .filter((p) => Boolean(p));
    }
    generateId({ userId, contractId }) {
        return `${userId}-${contractId}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;
    }
}
exports.PositionService = PositionService;
