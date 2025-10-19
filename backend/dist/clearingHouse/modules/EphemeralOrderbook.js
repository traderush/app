"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EphemeralOrderbook = void 0;
const events_1 = require("events");
const types_1 = require("../types");
class EphemeralOrderbook extends events_1.EventEmitter {
    constructor(blueprint, dependencies) {
        super();
        this.blueprint = blueprint;
        this.dependencies = dependencies;
        this.contracts = [];
        this.currentColumnIndex = 0;
        this.nextContractId = 0;
        this.startTime = Date.now();
        this.bootstrap();
    }
    placePosition(contractId, placement) {
        const contract = this.findContract(contractId);
        if (!contract || contract.status !== types_1.ContractStatus.ACTIVE) {
            return false;
        }
        if (contract.exerciseWindow.start <= placement.timestamp) {
            return false;
        }
        if (!contract.positions.has(placement.userId)) {
            contract.positions.set(placement.userId, []);
        }
        contract.positions.get(placement.userId).push({
            userId: placement.userId,
            amount: placement.amount,
            timestamp: placement.timestamp,
            contractId: contract.id,
        });
        contract.totalVolume += placement.amount;
        return true;
    }
    onPriceUpdate(price, timestamp) {
        const pricePoint = { price, timestamp };
        const timeframe = this.blueprint.timeframe;
        const elapsed = timestamp - (this.startTime + this.currentColumnIndex * timeframe);
        if (elapsed >= timeframe) {
            const columnsToAdvance = Math.floor(elapsed / timeframe);
            this.advanceColumns(columnsToAdvance, timestamp);
        }
        this.scanContracts(pricePoint);
    }
    getActiveContracts() {
        const active = new Map();
        for (const column of this.contracts) {
            for (const contract of column) {
                if (contract && contract.status === types_1.ContractStatus.ACTIVE) {
                    active.set(contract.id, this.blueprint.cloneContract(contract));
                }
            }
        }
        return active;
    }
    getContractById(contractId) {
        const contract = this.findContract(contractId);
        return contract ? this.blueprint.cloneContract(contract) : null;
    }
    setMakerQuote(contractId, quote) {
        const contract = this.findContract(contractId);
        if (!contract) {
            return false;
        }
        contract.makerQuote = quote;
        contract.returnMultiplier = quote.returnMultiplier;
        this.emit('contracts_updated', {
            contracts: this.snapshotActiveContracts(),
            timeframe: this.blueprint.timeframe,
            timestamp: Date.now(),
        });
        return true;
    }
    clear() {
        this.contracts = [];
        this.currentColumnIndex = 0;
        this.nextContractId = 0;
        this.startTime = Date.now();
        this.bootstrap();
    }
    bootstrap() {
        this.startTime = Date.now();
        const origin = this.startTime;
        for (let columnIndex = 0; columnIndex < this.blueprint.totalColumns; columnIndex++) {
            const column = this.generateColumn(origin, columnIndex);
            this.contracts.push(column);
        }
        this.emit('contracts_generated', {
            contracts: this.snapshotActiveContracts(),
            timeframe: this.blueprint.timeframe,
            timestamp: origin,
        });
    }
    generateColumn(baseStartTime, columnIndex) {
        const startTime = baseStartTime + columnIndex * this.blueprint.timeframe;
        const referencePrice = this.dependencies.priceProvider.getCurrentPrice();
        const context = {
            timeframe: this.blueprint.timeframe,
            columnIndex,
            startTime,
            referencePrice,
            generateId: () => `${this.blueprint.id}_${this.blueprint.timeframe}_${this.nextContractId++}`,
        };
        return this.blueprint.generateColumn(context);
    }
    advanceColumns(columnsToAdvance, timestamp) {
        for (let i = 0; i < columnsToAdvance; i++) {
            const removed = this.contracts.shift();
            if (removed) {
                for (const contract of removed) {
                    if (contract &&
                        contract.status === types_1.ContractStatus.ACTIVE &&
                        contract.totalVolume > 0) {
                        this.expireContract(contract, timestamp);
                    }
                }
            }
            const newColumnIndex = this.currentColumnIndex + this.contracts.length;
            const newColumn = this.generateColumn(this.startTime, newColumnIndex);
            this.contracts.push(newColumn);
        }
        this.currentColumnIndex += columnsToAdvance;
        this.emit('contracts_updated', {
            contracts: this.snapshotActiveContracts(),
            timeframe: this.blueprint.timeframe,
            timestamp,
        });
    }
    scanContracts(pricePoint) {
        for (const column of this.contracts) {
            for (let i = 0; i < column.length; i++) {
                const contract = column[i];
                if (!contract || contract.status !== types_1.ContractStatus.ACTIVE) {
                    continue;
                }
                const { start, end } = contract.exerciseWindow;
                if (pricePoint.timestamp >= start &&
                    pricePoint.timestamp <= end &&
                    contract.totalVolume > 0 &&
                    this.blueprint.isWinningPrice(contract, pricePoint)) {
                    this.exerciseContract(contract, pricePoint.timestamp);
                    column[i] = null;
                }
                else if (pricePoint.timestamp > end && contract.totalVolume > 0) {
                    this.expireContract(contract, pricePoint.timestamp);
                    column[i] = null;
                }
                else if (pricePoint.timestamp > end) {
                    contract.status = types_1.ContractStatus.EXPIRED;
                    column[i] = null;
                }
            }
        }
    }
    exerciseContract(contract, timestamp) {
        contract.status = types_1.ContractStatus.EXERCISED;
        const settlements = [];
        for (const [userId, positions] of contract.positions.entries()) {
            for (const position of positions) {
                const payout = position.amount * this.blueprint.getReturnMultiplier(contract);
                settlements.push({ userId, amount: position.amount, payout });
            }
        }
        this.emit('contract_settled', {
            contract: this.blueprint.cloneContract(contract),
            settlements,
            timeframe: this.blueprint.timeframe,
            timestamp,
        });
    }
    expireContract(contract, timestamp) {
        contract.status = types_1.ContractStatus.EXPIRED;
        const expiredPositions = [];
        for (const [userId, positions] of contract.positions.entries()) {
            for (const position of positions) {
                expiredPositions.push({ userId, amount: position.amount });
            }
        }
        this.emit('contract_expired', {
            contract: this.blueprint.cloneContract(contract),
            expiredPositions,
            timeframe: this.blueprint.timeframe,
            timestamp,
        });
    }
    findContract(contractId) {
        for (const column of this.contracts) {
            for (const contract of column) {
                if (contract && contract.id === contractId) {
                    return contract;
                }
            }
        }
        return null;
    }
    snapshotActiveContracts() {
        const results = [];
        for (const column of this.contracts) {
            for (const contract of column) {
                if (contract && contract.status === types_1.ContractStatus.ACTIVE) {
                    results.push(this.blueprint.cloneContract(contract));
                }
            }
        }
        return results;
    }
}
exports.EphemeralOrderbook = EphemeralOrderbook;
