"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpreadOrderbook = void 0;
const clearingHouseConfig_1 = require("../config/clearingHouseConfig");
const types_1 = require("../types");
const BaseOrderbook_1 = require("./BaseOrderbook");
/**
 * SpreadOrderbook manages spread option contracts for a specific timeframe
 * Maintains an array of columns, each containing [call, put] contracts
 */
class SpreadOrderbook extends BaseOrderbook_1.BaseOrderbook {
    constructor(timeframe) {
        super(timeframe);
        this.contracts = [];
        this.config = (0, clearingHouseConfig_1.getSpreadConfig)(this.timeframe);
        this.currentColumnIndex = 0;
        this.nextContractId = 0;
        this.totalColumns = this.config.numColumns;
        this.startTime = Date.now();
        this.generateFullTable();
    }
    /**
     * Generate the entire spread table upfront
     */
    generateFullTable() {
        const currentTime = this.startTime;
        const spreadGap = this.calculateSpreadGap();
        // Generate all columns
        for (let col = 0; col < this.totalColumns; col++) {
            const exerciseStart = currentTime + col * this.timeframe;
            const exerciseEnd = exerciseStart + this.timeframe;
            // Create call contract
            const callContract = {
                id: `SC_${this.timeframe}_${this.nextContractId++}`,
                spreadType: types_1.SpreadType.CALL,
                strikePrice: this.getCurrentBasePrice() + spreadGap,
                returnMultiplier: this.generateReturnMultiplier(),
                timeframe: this.timeframe,
                totalVolume: 0,
                positions: new Map(),
                status: types_1.ContractStatus.ACTIVE,
                exerciseWindow: {
                    start: exerciseStart,
                    end: exerciseEnd,
                },
            };
            // Create put contract
            const putContract = {
                id: `SP_${this.timeframe}_${this.nextContractId++}`,
                spreadType: types_1.SpreadType.PUT,
                strikePrice: this.getCurrentBasePrice() - spreadGap,
                returnMultiplier: this.generateReturnMultiplier(),
                timeframe: this.timeframe,
                totalVolume: 0,
                positions: new Map(),
                status: types_1.ContractStatus.ACTIVE,
                exerciseWindow: {
                    start: exerciseStart,
                    end: exerciseEnd,
                },
            };
            this.contracts.push([callContract, putContract]);
        }
        // Emit initial contracts
        this.emitActiveContracts();
    }
    /**
     * Get contracts at specific column
     */
    getContractsAt(col) {
        if (col < 0 || col >= this.totalColumns) {
            return null;
        }
        return this.contracts[col];
    }
    /**
     * Get contract by ID
     */
    getContractById(id) {
        for (const [call, put] of this.contracts) {
            if (call && call.id === id)
                return call;
            if (put && put.id === id)
                return put;
        }
        return null;
    }
    /**
     * Place a position on a contract
     */
    placePosition(contractId, userId, amount) {
        const contract = this.getContractById(contractId);
        if (!contract || contract.status !== types_1.ContractStatus.ACTIVE) {
            return false;
        }
        // Verify contract is not in the current or past columns
        const contractCol = this.getContractColumn(contract);
        if (contractCol <= this.currentColumnIndex) {
            return false;
        }
        // Add position
        if (!contract.positions.has(userId)) {
            contract.positions.set(userId, []);
        }
        contract.positions.get(userId).push({
            userId,
            amount,
            timestamp: Date.now(),
            contractId,
        });
        contract.totalVolume += amount;
        return true;
    }
    /**
     * Get which column a contract is in
     */
    getContractColumn(contract) {
        for (let col = 0; col < this.contracts.length; col++) {
            const [call, put] = this.contracts[col];
            if (contract === call || contract === put) {
                return col;
            }
        }
        return -1;
    }
    /**
     * Handle price update
     */
    onPriceUpdate(price, timestamp) {
        this.currentPrice = price;
        this.lastUpdateTime = timestamp;
        // Check if we need to shift columns
        const elapsedTime = timestamp - this.startTime;
        const newColumnIndex = Math.floor(elapsedTime / this.timeframe);
        if (newColumnIndex > this.currentColumnIndex) {
            // Process outcomes for current column before shifting
            this.processCurrentColumn(price, timestamp);
            // Shift columns
            const columnsToShift = Math.min(newColumnIndex - this.currentColumnIndex, this.totalColumns);
            for (let i = 0; i < columnsToShift; i++) {
                this.shiftColumns(timestamp);
            }
            this.currentColumnIndex = newColumnIndex;
        }
        // Check for triggers in active column
        this.checkActiveColumnForTriggers(price, timestamp);
        // Emit updated contracts
        this.emitActiveContracts();
    }
    /**
     * Process outcomes for the current column
     */
    processCurrentColumn(currentPrice, timestamp) {
        if (this.currentColumnIndex >= this.contracts.length)
            return;
        const [call, put] = this.contracts[this.currentColumnIndex];
        // Check call contract
        if (call && call.totalVolume > 0 && call.status === types_1.ContractStatus.ACTIVE) {
            if (currentPrice >= call.strikePrice) {
                this.triggerContract(call, timestamp);
            }
            else {
                this.expireContract(call, timestamp);
            }
        }
        // Check put contract
        if (put && put.totalVolume > 0 && put.status === types_1.ContractStatus.ACTIVE) {
            if (currentPrice <= put.strikePrice) {
                this.triggerContract(put, timestamp);
            }
            else {
                this.expireContract(put, timestamp);
            }
        }
    }
    /**
     * Check active column for immediate triggers
     */
    checkActiveColumnForTriggers(currentPrice, timestamp) {
        const activeColumnIndex = this.currentColumnIndex + 1;
        if (activeColumnIndex >= this.contracts.length)
            return;
        const [call, put] = this.contracts[activeColumnIndex];
        // Check if we're in the exercise window
        if (call &&
            timestamp >= call.exerciseWindow.start &&
            timestamp <= call.exerciseWindow.end) {
            if (call.totalVolume > 0 &&
                currentPrice >= call.strikePrice &&
                call.status === types_1.ContractStatus.ACTIVE) {
                this.triggerContract(call, timestamp);
            }
        }
        if (put &&
            timestamp >= put.exerciseWindow.start &&
            timestamp <= put.exerciseWindow.end) {
            if (put.totalVolume > 0 &&
                currentPrice <= put.strikePrice &&
                put.status === types_1.ContractStatus.ACTIVE) {
                this.triggerContract(put, timestamp);
            }
        }
    }
    /**
     * Shift columns by removing first and adding new one at the end
     */
    shiftColumns(timestamp) {
        // Remove first column
        const removedColumn = this.contracts.shift();
        // Process any remaining active contracts
        if (removedColumn) {
            const [call, put] = removedColumn;
            if (call &&
                call.status === types_1.ContractStatus.ACTIVE &&
                call.totalVolume > 0) {
                this.expireContract(call, timestamp);
            }
            if (put && put.status === types_1.ContractStatus.ACTIVE && put.totalVolume > 0) {
                this.expireContract(put, timestamp);
            }
        }
        // Add new column at the end
        const lastColumn = this.contracts[this.contracts.length - 1];
        const lastCall = lastColumn[0];
        const newExerciseStart = lastCall.exerciseWindow.end;
        const newExerciseEnd = newExerciseStart + this.timeframe;
        const spreadGap = this.calculateSpreadGap();
        const newCallContract = {
            id: `SC_${this.timeframe}_${this.nextContractId++}`,
            spreadType: types_1.SpreadType.CALL,
            strikePrice: this.getCurrentBasePrice() + spreadGap,
            returnMultiplier: this.generateReturnMultiplier(),
            timeframe: this.timeframe,
            totalVolume: 0,
            positions: new Map(),
            status: types_1.ContractStatus.ACTIVE,
            exerciseWindow: {
                start: newExerciseStart,
                end: newExerciseEnd,
            },
        };
        const newPutContract = {
            id: `SP_${this.timeframe}_${this.nextContractId++}`,
            spreadType: types_1.SpreadType.PUT,
            strikePrice: this.getCurrentBasePrice() - spreadGap,
            returnMultiplier: this.generateReturnMultiplier(),
            timeframe: this.timeframe,
            totalVolume: 0,
            positions: new Map(),
            status: types_1.ContractStatus.ACTIVE,
            exerciseWindow: {
                start: newExerciseStart,
                end: newExerciseEnd,
            },
        };
        this.contracts.push([newCallContract, newPutContract]);
        // Emit new contracts event
        this.emit('spread_contracts_generated', {
            contracts: [newCallContract, newPutContract],
            timeframe: this.timeframe,
            timestamp: timestamp,
        });
    }
    /**
     * Trigger a contract (spread was crossed)
     */
    triggerContract(contract, timestamp) {
        contract.status = types_1.ContractStatus.TRIGGERED;
        const settlements = [];
        for (const [userId, positions] of contract.positions) {
            for (const position of positions) {
                const payout = position.amount * contract.returnMultiplier;
                if (this.balanceService) {
                    this.balanceService.credit(userId, payout);
                }
                settlements.push({ userId, position: position.amount, payout });
            }
        }
        this.emit('spread_triggered', {
            contractId: contract.id,
            spreadType: contract.spreadType,
            returnMultiplier: contract.returnMultiplier,
            strikePrice: contract.strikePrice,
            settlements,
            timestamp,
        });
    }
    /**
     * Expire a contract
     */
    expireContract(contract, timestamp) {
        contract.status = types_1.ContractStatus.EXPIRED;
        const expiredPositions = [];
        for (const [userId, positions] of contract.positions) {
            for (const position of positions) {
                expiredPositions.push({ userId, position: position.amount });
            }
        }
        this.emit('spread_expired', {
            contractId: contract.id,
            spreadType: contract.spreadType,
            returnMultiplier: contract.returnMultiplier,
            strikePrice: contract.strikePrice,
            expiredPositions,
            timestamp,
        });
    }
    /**
     * Calculate spread gap based on timeframe
     */
    calculateSpreadGap() {
        const baseGap = this.timeframe === 2000 ? 0.008 : 0.015; // TimeFrame.TWO_SECONDS = 2000
        return this.getCurrentBasePrice() * baseGap;
    }
    /**
     * Generate return multiplier
     */
    generateReturnMultiplier() {
        const baseMultiplier = 1.8;
        const volatility = clearingHouseConfig_1.CLEARING_HOUSE_CONFIG.constants.volatility;
        const volatilityBonus = volatility * 10;
        const multiplier = baseMultiplier + volatilityBonus;
        // Add some randomness
        const variance = 0.1;
        const random = 1 + (Math.random() - 0.5) * variance;
        return Number((multiplier * random).toFixed(2));
    }
    /**
     * Emit current active contracts
     */
    emitActiveContracts() {
        const activeContracts = [];
        // Only emit contracts from current column onwards
        for (let col = Math.max(0, this.currentColumnIndex); col < this.contracts.length; col++) {
            const [call, put] = this.contracts[col];
            if (call && call.status === types_1.ContractStatus.ACTIVE) {
                activeContracts.push(call);
            }
            if (put && put.status === types_1.ContractStatus.ACTIVE) {
                activeContracts.push(put);
            }
        }
        this.emit('contracts_updated', {
            contracts: activeContracts,
            timestamp: this.lastUpdateTime,
        });
    }
    /**
     * Get all active contracts
     */
    getActiveContracts() {
        const activeContracts = new Map();
        // Only return contracts from current column onwards
        for (let col = Math.max(0, this.currentColumnIndex); col < this.contracts.length; col++) {
            const [call, put] = this.contracts[col];
            if (call && call.status === types_1.ContractStatus.ACTIVE) {
                activeContracts.set(call.id, call);
            }
            if (put && put.status === types_1.ContractStatus.ACTIVE) {
                activeContracts.set(put.id, put);
            }
        }
        return activeContracts;
    }
    /**
     * Get current base price from price feed service
     */
    getCurrentBasePrice() {
        if (this.priceFeedService) {
            return this.priceFeedService.getCurrentPrice();
        }
        return clearingHouseConfig_1.CLEARING_HOUSE_CONFIG.constants.initialPrice;
    }
    /**
     * Clear all data
     */
    clear() {
        this.contracts = [];
        this.currentColumnIndex = 0;
        this.nextContractId = 0;
        this.generateFullTable();
    }
}
exports.SpreadOrderbook = SpreadOrderbook;
