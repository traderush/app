"use strict";
/**
 * Structured logging utility
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogLevel = void 0;
exports.createLogger = createLogger;
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "debug";
    LogLevel["INFO"] = "info";
    LogLevel["WARN"] = "warn";
    LogLevel["ERROR"] = "error";
    LogLevel["FATAL"] = "fatal";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor(serviceName) {
        this.serviceName = serviceName;
        this.minLevel = process.env.LOG_LEVEL || LogLevel.INFO;
    }
    shouldLog(level) {
        const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
        return levels.indexOf(level) >= levels.indexOf(this.minLevel);
    }
    formatLog(level, message, context, error) {
        const log = {
            timestamp: new Date().toISOString(),
            level,
            service: this.serviceName,
            message,
            ...context
        };
        if (error) {
            log.error = {
                errorName: error.name,
                errorMessage: error.message,
                stack: error.stack
            };
        }
        return JSON.stringify(log);
    }
    debug(message, context) {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.log(this.formatLog(LogLevel.DEBUG, message, context));
        }
    }
    info(message, context) {
        if (this.shouldLog(LogLevel.INFO)) {
            console.log(this.formatLog(LogLevel.INFO, message, context));
        }
    }
    warn(message, context) {
        if (this.shouldLog(LogLevel.WARN)) {
            console.warn(this.formatLog(LogLevel.WARN, message, context));
        }
    }
    error(message, error, context) {
        if (this.shouldLog(LogLevel.ERROR)) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error(this.formatLog(LogLevel.ERROR, message, context, err));
        }
    }
    fatal(message, error, context) {
        if (this.shouldLog(LogLevel.FATAL)) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error(this.formatLog(LogLevel.FATAL, message, context, err));
        }
    }
    // Create child logger with additional context
    child(defaultContext) {
        const childLogger = new Logger(this.serviceName);
        const originalMethods = {
            debug: childLogger.debug.bind(childLogger),
            info: childLogger.info.bind(childLogger),
            warn: childLogger.warn.bind(childLogger),
            error: childLogger.error.bind(childLogger),
            fatal: childLogger.fatal.bind(childLogger)
        };
        childLogger.debug = (message, context) => {
            originalMethods.debug(message, { ...defaultContext, ...context });
        };
        childLogger.info = (message, context) => {
            originalMethods.info(message, { ...defaultContext, ...context });
        };
        childLogger.warn = (message, context) => {
            originalMethods.warn(message, { ...defaultContext, ...context });
        };
        childLogger.error = (message, error, context) => {
            originalMethods.error(message, error, { ...defaultContext, ...context });
        };
        childLogger.fatal = (message, error, context) => {
            originalMethods.fatal(message, error, { ...defaultContext, ...context });
        };
        return childLogger;
    }
}
// Export logger factory
function createLogger(serviceName) {
    return new Logger(serviceName);
}
