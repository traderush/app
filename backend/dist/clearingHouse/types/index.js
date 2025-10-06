"use strict";
// Clearing House Types
// These types are specific to the clearing house trading operations
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MESSAGES = exports.SpreadType = exports.ContractStatus = exports.TIMEFRAME_CONFIGS = exports.TimeFrame = exports.SpreadTimeframes = exports.isValidTimeframe = exports.isValidSpreadTimeframe = exports.isValidIronCondorTimeframe = exports.IronCondorTimeframes = exports.getTimeframeConfig = exports.getAllTimeframes = void 0;
// Re-export all timeframe-related exports from config
var timeframeConfig_1 = require("../../config/timeframeConfig");
Object.defineProperty(exports, "getAllTimeframes", { enumerable: true, get: function () { return timeframeConfig_1.getAllTimeframes; } });
Object.defineProperty(exports, "getTimeframeConfig", { enumerable: true, get: function () { return timeframeConfig_1.getTimeframeConfig; } });
Object.defineProperty(exports, "IronCondorTimeframes", { enumerable: true, get: function () { return timeframeConfig_1.IronCondorTimeframes; } });
Object.defineProperty(exports, "isValidIronCondorTimeframe", { enumerable: true, get: function () { return timeframeConfig_1.isValidIronCondorTimeframe; } });
Object.defineProperty(exports, "isValidSpreadTimeframe", { enumerable: true, get: function () { return timeframeConfig_1.isValidSpreadTimeframe; } });
Object.defineProperty(exports, "isValidTimeframe", { enumerable: true, get: function () { return timeframeConfig_1.isValidTimeframe; } });
Object.defineProperty(exports, "SpreadTimeframes", { enumerable: true, get: function () { return timeframeConfig_1.SpreadTimeframes; } });
Object.defineProperty(exports, "TimeFrame", { enumerable: true, get: function () { return timeframeConfig_1.TimeFrame; } });
Object.defineProperty(exports, "TIMEFRAME_CONFIGS", { enumerable: true, get: function () { return timeframeConfig_1.TIMEFRAME_CONFIGS; } });
// Re-export all message types
__exportStar(require("./messages"), exports);
// Contract status enum
var ContractStatus;
(function (ContractStatus) {
    ContractStatus["ACTIVE"] = "active";
    ContractStatus["EXERCISED"] = "exercised";
    ContractStatus["EXPIRED"] = "expired";
    ContractStatus["ABANDONED"] = "abandoned";
    ContractStatus["TRIGGERED"] = "triggered";
})(ContractStatus || (exports.ContractStatus = ContractStatus = {}));
// Spread type enum
var SpreadType;
(function (SpreadType) {
    SpreadType["CALL"] = "call";
    SpreadType["PUT"] = "put";
})(SpreadType || (exports.SpreadType = SpreadType = {}));
var MESSAGES;
(function (MESSAGES) {
    MESSAGES["BALANCE_UPDATE"] = "balance_updated";
    MESSAGES["PRICE_UPDATE"] = "price_update";
})(MESSAGES || (exports.MESSAGES = MESSAGES = {}));
