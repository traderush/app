"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSpreadBlueprint = createSpreadBlueprint;
const clearingHouseConfig_1 = require("../config/clearingHouseConfig");
const types_1 = require("../types");
const messages_1 = require("../types/messages");
function calculateSpreadGap(timeframe, referencePrice) {
    const baseGap = timeframe === 2000 ? 0.008 : 0.015;
    return referencePrice * baseGap;
}
function deterministicMultiplier(columnIndex, offset) {
    const baseMultiplier = 1.8 + clearingHouseConfig_1.CLEARING_HOUSE_CONFIG.constants.volatility * 10;
    const adjustment = ((columnIndex + offset) % 5) * 0.05;
    return Number((baseMultiplier + adjustment).toFixed(2));
}
function createSpreadBlueprint(timeframe) {
    const config = (0, clearingHouseConfig_1.getSpreadConfig)(timeframe);
    return {
        id: messages_1.MarketType.SPREAD,
        timeframe,
        totalColumns: config.numColumns,
        generateColumn(context) {
            const exerciseEnd = context.startTime + context.timeframe;
            const spreadGap = calculateSpreadGap(context.timeframe, context.referencePrice);
            const basePrice = context.referencePrice;
            const callContract = {
                id: context.generateId(),
                spreadType: types_1.SpreadType.CALL,
                strikePrice: Number((basePrice + spreadGap).toFixed(4)),
                returnMultiplier: 1,
                timeframe: context.timeframe,
                totalVolume: 0,
                positions: new Map(),
                status: types_1.ContractStatus.ACTIVE,
                exerciseWindow: {
                    start: context.startTime,
                    end: exerciseEnd,
                },
                gridPosition: {
                    column: context.columnIndex,
                    row: 0,
                },
            };
            const putContract = {
                id: context.generateId(),
                spreadType: types_1.SpreadType.PUT,
                strikePrice: Number((basePrice - spreadGap).toFixed(4)),
                returnMultiplier: 1,
                timeframe: context.timeframe,
                totalVolume: 0,
                positions: new Map(),
                status: types_1.ContractStatus.ACTIVE,
                exerciseWindow: {
                    start: context.startTime,
                    end: exerciseEnd,
                },
                gridPosition: {
                    column: context.columnIndex,
                    row: 1,
                },
            };
            return [callContract, putContract];
        },
        isWinningPrice(contract, pricePoint) {
            if (contract.spreadType === types_1.SpreadType.CALL) {
                return pricePoint.price >= contract.strikePrice;
            }
            return pricePoint.price <= contract.strikePrice;
        },
        cloneContract(contract) {
            return {
                ...contract,
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
                strikePrice: contract.strikePrice,
                type: contract.spreadType,
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
            const offset = contract.spreadType === types_1.SpreadType.CALL ? 1 : 2;
            const multiplier = deterministicMultiplier(contract.gridPosition.column, offset);
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
                type: contract.spreadType,
                strikePrice: contract.strikePrice,
                returnMultiplier: contract.makerQuote?.returnMultiplier ?? contract.returnMultiplier,
                ...settlement,
            };
        },
        describeExpiry(contract, expiry) {
            return {
                contractId: contract.id,
                type: contract.spreadType,
                strikePrice: contract.strikePrice,
                returnMultiplier: contract.makerQuote?.returnMultiplier ?? contract.returnMultiplier,
                ...expiry,
            };
        },
    };
}
