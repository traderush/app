"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseOrderbook = void 0;
const events_1 = require("events");
/**
 * Base orderbook class for managing financial derivatives contracts
 */
class BaseOrderbook extends events_1.EventEmitter {
    constructor(timeframe) {
        super();
        this.priceFeedService = null;
        this.balanceService = null;
        this.currentPrice = 0;
        this.lastUpdateTime = 0;
        this.timeframe = timeframe;
    }
    /**
     * Set dependencies
     */
    setDependencies(priceFeedService, balanceService) {
        this.priceFeedService = priceFeedService;
        this.balanceService = balanceService;
    }
}
exports.BaseOrderbook = BaseOrderbook;
