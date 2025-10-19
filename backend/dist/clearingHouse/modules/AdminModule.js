"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const events_1 = require("events");
class AdminModule extends events_1.EventEmitter {
    constructor(registry) {
        super();
        this.registry = registry;
        this.whitelistedMakers = new Set();
    }
    listProducts() {
        return this.registry.listDefinitions();
    }
    whitelistMaker(makerId) {
        if (!this.whitelistedMakers.has(makerId)) {
            this.whitelistedMakers.add(makerId);
            this.emit('maker_whitelisted', { makerId });
        }
    }
    dewhitelistMaker(makerId) {
        if (this.whitelistedMakers.delete(makerId)) {
            this.emit('maker_dewhitelisted', { makerId });
        }
    }
    isMakerWhitelisted(makerId) {
        return this.whitelistedMakers.has(makerId);
    }
    listWhitelistedMakers() {
        return Array.from(this.whitelistedMakers.values());
    }
    setProductParameters(product, payload) {
        this.emit('product_config_updated', { product, payload });
    }
}
exports.AdminModule = AdminModule;
