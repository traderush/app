"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClockModule = void 0;
const events_1 = require("events");
class ClockModule extends events_1.EventEmitter {
    constructor(oracle) {
        super();
        this.oracle = oracle;
        this.running = false;
        this.boundListener = null;
    }
    start() {
        if (this.running) {
            return;
        }
        this.boundListener = (point) => this.emit('tick', point);
        this.oracle.on('price', this.boundListener);
        this.oracle.start();
        this.running = true;
    }
    stop() {
        if (!this.running) {
            return;
        }
        if (this.boundListener) {
            this.oracle.off('price', this.boundListener);
            this.boundListener = null;
        }
        this.oracle.stop();
        this.running = false;
    }
}
exports.ClockModule = ClockModule;
