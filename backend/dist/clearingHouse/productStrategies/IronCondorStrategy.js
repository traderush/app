"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIronCondorBlueprint = createIronCondorBlueprint;
const clearingHouseConfig_1 = require("../config/clearingHouseConfig");
const types_1 = require("../types");
const messages_1 = require("../types/messages");
const timeframeConfig_1 = require("../../config/timeframeConfig");
function deterministicMultiplier(rowIndex, columnIndex, totalRows) {
    const { min, max } = clearingHouseConfig_1.CLEARING_HOUSE_CONFIG.constants.multiplierRange;
    const span = max - min;
    const cellIndex = columnIndex * totalRows + rowIndex;
    const maxIndex = Math.max(1, totalRows * 100 - 1);
    const normalized = (cellIndex % maxIndex) / maxIndex;
    const multiplier = min + normalized * span;
    return Number(multiplier.toFixed(1));
}
function alignPrice(reference, priceSpread) {
    const gridIndex = Math.floor(reference / priceSpread);
    const gridLevel = gridIndex * priceSpread;
    return Number(gridLevel.toFixed(2));
}
function createIronCondorBlueprint(timeframe) {
    const config = (0, clearingHouseConfig_1.getIronCondorConfig)(timeframe);
    const timeframeConfig = (0, timeframeConfig_1.getTimeframeConfig)(timeframe);
    const totalRows = config.rowsAbove + config.rowsBelow + 1;
    const priceSpread = timeframeConfig.boxHeight;
    return {
        id: messages_1.MarketType.IRON_CONDOR,
        timeframe,
        totalColumns: config.numColumns,
        generateColumn(context) {
            const column = [];
            const exerciseEnd = context.startTime + context.timeframe;
            const basePrice = alignPrice(context.referencePrice, priceSpread);
            for (let row = 0; row < totalRows; row++) {
                const levelOffset = row - config.rowsBelow;
                const lower = Number((basePrice + levelOffset * priceSpread).toFixed(2));
                const upper = Number((basePrice + (levelOffset + 1) * priceSpread).toFixed(2));
                const contract = {
                    id: context.generateId(),
                    returnMultiplier: 1,
                    timeframe: context.timeframe,
                    totalVolume: 0,
                    positions: new Map(),
                    status: types_1.ContractStatus.ACTIVE,
                    strikeRange: {
                        lower,
                        upper,
                    },
                    exerciseWindow: {
                        start: context.startTime,
                        end: exerciseEnd,
                    },
                    gridPosition: {
                        column: context.columnIndex,
                        row,
                    },
                };
                column.push(contract);
            }
            return column;
        },
        isWinningPrice(contract, pricePoint) {
            return (pricePoint.price >= contract.strikeRange.lower &&
                pricePoint.price <= contract.strikeRange.upper);
        },
        cloneContract(contract) {
            return {
                ...contract,
                strikeRange: { ...contract.strikeRange },
                exerciseWindow: { ...contract.exerciseWindow },
                positions: new Map(contract.positions),
                makerQuote: contract.makerQuote
                    ? { ...contract.makerQuote }
                    : undefined,
                gridPosition: { ...contract.gridPosition },
            };
        },
        toClientContract(contract) {
            const returnMultiplier = contract.makerQuote?.returnMultiplier ?? contract.returnMultiplier;
            return {
                contractId: contract.id,
                returnMultiplier,
                lowerStrike: contract.strikeRange.lower,
                upperStrike: contract.strikeRange.upper,
                isActive: contract.status === types_1.ContractStatus.ACTIVE,
                totalVolume: contract.totalVolume,
                makerId: contract.makerQuote?.makerId ?? null,
                collateralPerUnit: contract.makerQuote?.collateralPerUnit ?? null,
            };
        },
        getReturnMultiplier(contract) {
            return contract.makerQuote?.returnMultiplier ?? contract.returnMultiplier;
        },
        createMakerQuote({ contract, makerId }) {
            const { column, row } = contract.gridPosition;
            const multiplier = deterministicMultiplier(row, column, config.rowsAbove + config.rowsBelow + 1);
            return {
                makerId,
                returnMultiplier: multiplier,
                collateralPerUnit: 1,
            };
        },
        calculateRequiredCollateral({ amount, quote }) {
            return amount * quote.collateralPerUnit;
        },
        describeSettlement(contract, settlement) {
            return {
                contractId: contract.id,
                returnMultiplier: contract.makerQuote?.returnMultiplier ?? contract.returnMultiplier,
                lowerStrike: contract.strikeRange.lower,
                upperStrike: contract.strikeRange.upper,
                ...settlement,
            };
        },
        describeExpiry(contract, expiry) {
            return {
                contractId: contract.id,
                lowerStrike: contract.strikeRange.lower,
                upperStrike: contract.strikeRange.upper,
                ...expiry,
            };
        },
    };
}
