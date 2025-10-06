"use strict";
// Clearing House Configuration
// Based on BACKEND.md specifications
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidSpreadTimeframe = exports.isValidIronCondorTimeframe = exports.CLEARING_HOUSE_CONFIG = void 0;
exports.getIronCondorConfig = getIronCondorConfig;
exports.getSpreadConfig = getSpreadConfig;
const timeframeConfig_1 = require("../../config/timeframeConfig");
exports.CLEARING_HOUSE_CONFIG = {
    userStartingBalance: 1000,
    clearingHouseStartingBalance: 1000000,
    ironCondor: {
        timeframes: Object.entries(timeframeConfig_1.TIMEFRAME_CONFIGS).reduce((acc, [tf, config]) => {
            acc[Number(tf)] = {
                rowsAbove: config.ironCondor.rowsAbove,
                rowsBelow: config.ironCondor.rowsBelow,
                numColumns: config.ironCondor.numColumns,
            };
            return acc;
        }, {}),
    },
    spreads: {
        timeframes: Object.entries(timeframeConfig_1.TIMEFRAME_CONFIGS).reduce((acc, [tf, config]) => {
            acc[Number(tf)] = {
                numColumns: config.spread.numColumns,
            };
            return acc;
        }, {}),
    },
    constants: {
        initialPrice: 100,
        volatility: 0.0005,
        multiplierRange: {
            min: 1,
            max: 3,
        },
        priceUpdateInterval: 100,
    },
};
// Helper functions
function getIronCondorConfig(timeframe) {
    return exports.CLEARING_HOUSE_CONFIG.ironCondor.timeframes[timeframe];
}
function getSpreadConfig(timeframe) {
    return exports.CLEARING_HOUSE_CONFIG.spreads.timeframes[timeframe];
}
// Re-export validation helpers
var timeframeConfig_2 = require("../../config/timeframeConfig");
Object.defineProperty(exports, "isValidIronCondorTimeframe", { enumerable: true, get: function () { return timeframeConfig_2.isValidIronCondorTimeframe; } });
Object.defineProperty(exports, "isValidSpreadTimeframe", { enumerable: true, get: function () { return timeframeConfig_2.isValidSpreadTimeframe; } });
