"use strict";
// Centralized timeframe configuration
// This file contains all timeframe-specific logic and configurations
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIMEFRAME_CONFIGS = exports.SpreadTimeframes = exports.IronCondorTimeframes = exports.TimeFrame = void 0;
exports.getTimeframeConfig = getTimeframeConfig;
exports.isValidTimeframe = isValidTimeframe;
exports.isValidIronCondorTimeframe = isValidIronCondorTimeframe;
exports.isValidSpreadTimeframe = isValidSpreadTimeframe;
exports.timeframeToDisplayString = timeframeToDisplayString;
exports.getAllTimeframes = getAllTimeframes;
exports.getTimeframeByIndex = getTimeframeByIndex;
var TimeFrame;
(function (TimeFrame) {
    TimeFrame[TimeFrame["HALF_SECOND"] = 500] = "HALF_SECOND";
    TimeFrame[TimeFrame["SECOND"] = 1000] = "SECOND";
    TimeFrame[TimeFrame["TWO_SECONDS"] = 2000] = "TWO_SECONDS";
    TimeFrame[TimeFrame["FOUR_SECONDS"] = 4000] = "FOUR_SECONDS";
    TimeFrame[TimeFrame["TEN_SECONDS"] = 10000] = "TEN_SECONDS";
})(TimeFrame || (exports.TimeFrame = TimeFrame = {}));
// Const arrays for type definitions
exports.IronCondorTimeframes = [
    TimeFrame.HALF_SECOND,
    TimeFrame.SECOND,
    TimeFrame.TWO_SECONDS,
    TimeFrame.FOUR_SECONDS,
    TimeFrame.TEN_SECONDS,
];
exports.SpreadTimeframes = [
    TimeFrame.TWO_SECONDS,
    TimeFrame.TEN_SECONDS,
];
// Complete configuration for all timeframes
exports.TIMEFRAME_CONFIGS = {
    [TimeFrame.HALF_SECOND]: {
        displayName: '0.5 Second',
        shortName: '0.5s',
        ironCondor: {
            numColumns: 25,
            columnsBehind: 5,
            rowsAbove: 10,
            rowsBelow: 10,
        },
        spread: {
            numColumns: 25,
            columnsBehind: 5,
        },
        boxHeight: 0.05,
        contractGenerationOffset: 25000,
        contractExpiryBuffer: 50,
    },
    [TimeFrame.SECOND]: {
        displayName: '1 Second',
        shortName: '1s',
        ironCondor: {
            numColumns: 25,
            columnsBehind: 5,
            rowsAbove: 10,
            rowsBelow: 10,
        },
        spread: {
            numColumns: 25,
            columnsBehind: 5,
        },
        boxHeight: 0.08,
        contractGenerationOffset: 25000,
        contractExpiryBuffer: 50,
    },
    [TimeFrame.TWO_SECONDS]: {
        displayName: '2 Seconds',
        shortName: '2s',
        ironCondor: {
            numColumns: 25,
            columnsBehind: 8,
            rowsAbove: 10,
            rowsBelow: 10,
        },
        spread: {
            numColumns: 25,
            columnsBehind: 8,
        },
        boxHeight: 0.1,
        contractGenerationOffset: 50000,
        contractExpiryBuffer: 100,
    },
    [TimeFrame.FOUR_SECONDS]: {
        displayName: '4 Seconds',
        shortName: '4s',
        ironCondor: {
            numColumns: 25,
            columnsBehind: 10,
            rowsAbove: 10,
            rowsBelow: 10,
        },
        spread: {
            numColumns: 25,
            columnsBehind: 10,
        },
        boxHeight: 0.15,
        contractGenerationOffset: 100000,
        contractExpiryBuffer: 200,
    },
    [TimeFrame.TEN_SECONDS]: {
        displayName: '10 Seconds',
        shortName: '10s',
        ironCondor: {
            numColumns: 25,
            columnsBehind: 15,
            rowsAbove: 10,
            rowsBelow: 10,
        },
        spread: {
            numColumns: 25,
            columnsBehind: 15,
        },
        boxHeight: 0.25,
        contractGenerationOffset: 250000,
        contractExpiryBuffer: 500,
    },
};
// Helper functions
function getTimeframeConfig(timeframe) {
    const config = exports.TIMEFRAME_CONFIGS[timeframe];
    if (!config) {
        throw new Error(`Invalid timeframe: ${timeframe}`);
    }
    return config;
}
function isValidTimeframe(value) {
    return value === TimeFrame.TWO_SECONDS || value === TimeFrame.TEN_SECONDS;
}
function isValidIronCondorTimeframe(value) {
    return isValidTimeframe(value);
}
function isValidSpreadTimeframe(value) {
    return isValidTimeframe(value);
}
function timeframeToDisplayString(timeframe) {
    return getTimeframeConfig(timeframe).shortName;
}
// Get all available timeframes
function getAllTimeframes() {
    return Object.keys(exports.TIMEFRAME_CONFIGS).map(Number);
}
// Get timeframe by index (useful for UI navigation)
function getTimeframeByIndex(index) {
    const timeframes = getAllTimeframes();
    return timeframes[Math.max(0, Math.min(index, timeframes.length - 1))];
}
