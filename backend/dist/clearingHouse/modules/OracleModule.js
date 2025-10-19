"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OracleModule = void 0;
const events_1 = require("events");
const PriceFeedService_1 = require("../services/PriceFeedService");
const types_1 = require("../types");
class OracleModule extends events_1.EventEmitter {
    constructor(priceFeed = new PriceFeedService_1.PriceFeedService()) {
        super();
        this.priceFeed = priceFeed;
        this.unsubscribe = null;
    }
    start() {
        if (this.unsubscribe) {
            return;
        }
        const listener = (point) => {
            this.emit('price', point);
        };
        this.priceFeed.on(types_1.MESSAGES.PRICE_UPDATE, listener);
        this.priceFeed.start();
        this.unsubscribe = () => {
            this.priceFeed.off(types_1.MESSAGES.PRICE_UPDATE, listener);
            this.priceFeed.stop();
            this.unsubscribe = null;
        };
    }
    stop() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        else {
            this.priceFeed.stop();
        }
    }
    getCurrentPrice() {
        return this.priceFeed.getCurrentPrice();
    }
}
exports.OracleModule = OracleModule;
