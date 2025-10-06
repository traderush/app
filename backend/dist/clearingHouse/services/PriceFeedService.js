"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceFeedService = void 0;
const events_1 = require("events");
const clearingHouseConfig_1 = require("../config/clearingHouseConfig");
const types_1 = require("../types");
class PriceFeedService extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.currentPrice = clearingHouseConfig_1.CLEARING_HOUSE_CONFIG.constants.initialPrice;
        this.volatility = clearingHouseConfig_1.CLEARING_HOUSE_CONFIG.constants.volatility;
        this.updateInterval = clearingHouseConfig_1.CLEARING_HOUSE_CONFIG.constants.priceUpdateInterval; // ms
        this.intervalId = null;
    }
    start() {
        if (this.intervalId)
            return;
        this.intervalId = setInterval(() => {
            const price = this.generatePrice();
            this.emit(types_1.MESSAGES.PRICE_UPDATE, price);
        }, this.updateInterval);
    }
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    generatePrice() {
        const change = (Math.random() - 0.5) * this.volatility * this.currentPrice;
        this.currentPrice += change;
        return {
            price: this.currentPrice,
            timestamp: Date.now()
        };
    }
    getCurrentPrice() {
        return this.currentPrice;
    }
}
exports.PriceFeedService = PriceFeedService;
