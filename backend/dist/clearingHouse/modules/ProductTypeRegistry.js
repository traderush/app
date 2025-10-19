"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductTypeRegistry = void 0;
const messages_1 = require("../types/messages");
const timeframeConfig_1 = require("../../config/timeframeConfig");
const IronCondorStrategy_1 = require("../productStrategies/IronCondorStrategy");
const SpreadStrategy_1 = require("../productStrategies/SpreadStrategy");
class ProductTypeRegistry {
    constructor() {
        this.definitions = new Map();
        this.registerDefaultProducts();
    }
    listDefinitions() {
        return Array.from(this.definitions.values());
    }
    getDefinition(product) {
        const definition = this.definitions.get(product);
        if (!definition) {
            throw new Error(`Unknown product type: ${product}`);
        }
        return definition;
    }
    getBlueprint(product, timeframe) {
        const definition = this.getDefinition(product);
        if (!definition.timeframes.includes(timeframe)) {
            throw new Error(`Timeframe ${timeframe} not supported for product ${product}`);
        }
        return definition.blueprintFactory(timeframe);
    }
    formatContractForClient(product, contract) {
        const blueprint = this.getBlueprint(product, contract.timeframe);
        return blueprint.toClientContract(contract);
    }
    getReturnMultiplier(product, contract) {
        const blueprint = this.getBlueprint(product, contract.timeframe);
        return blueprint.getReturnMultiplier(contract);
    }
    registerDefaultProducts() {
        this.register({
            id: messages_1.MarketType.IRON_CONDOR,
            label: 'Iron Condor',
            description: 'Range-bound contract paying out when price settles inside the configured strike band.',
            timeframes: timeframeConfig_1.IronCondorTimeframes,
            blueprintFactory: IronCondorStrategy_1.createIronCondorBlueprint,
        });
        this.register({
            id: messages_1.MarketType.SPREAD,
            label: 'Directional Spread',
            description: 'Directional payoff triggering when the price crosses the configured strike.',
            timeframes: timeframeConfig_1.SpreadTimeframes,
            blueprintFactory: SpreadStrategy_1.createSpreadBlueprint,
        });
    }
    register(definition) {
        this.definitions.set(definition.id, definition);
    }
}
exports.ProductTypeRegistry = ProductTypeRegistry;
