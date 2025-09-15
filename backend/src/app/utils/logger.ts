/**
 * Structured logging utility
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

interface LogContext {
  userId?: string;
  connectionId?: string;
  sessionId?: string;
  gameMode?: string;
  [key: string]: any;
}

class Logger {
  private serviceName: string;
  private minLevel: LogLevel;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.minLevel = (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    const log: any = {
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

  debug(message: string, context?: LogContext) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatLog(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context?: LogContext) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatLog(LogLevel.INFO, message, context));
    }
  }

  warn(message: string, context?: LogContext) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatLog(LogLevel.WARN, message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    if (this.shouldLog(LogLevel.ERROR)) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(this.formatLog(LogLevel.ERROR, message, context, err));
    }
  }

  fatal(message: string, error?: Error | unknown, context?: LogContext) {
    if (this.shouldLog(LogLevel.FATAL)) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(this.formatLog(LogLevel.FATAL, message, context, err));
    }
  }

  // Create child logger with additional context
  child(defaultContext: LogContext): Logger {
    const childLogger = new Logger(this.serviceName);
    const originalMethods = {
      debug: childLogger.debug.bind(childLogger),
      info: childLogger.info.bind(childLogger),
      warn: childLogger.warn.bind(childLogger),
      error: childLogger.error.bind(childLogger),
      fatal: childLogger.fatal.bind(childLogger)
    };

    childLogger.debug = (message: string, context?: LogContext) => {
      originalMethods.debug(message, { ...defaultContext, ...context });
    };

    childLogger.info = (message: string, context?: LogContext) => {
      originalMethods.info(message, { ...defaultContext, ...context });
    };

    childLogger.warn = (message: string, context?: LogContext) => {
      originalMethods.warn(message, { ...defaultContext, ...context });
    };

    childLogger.error = (message: string, error?: Error | unknown, context?: LogContext) => {
      originalMethods.error(message, error, { ...defaultContext, ...context });
    };

    childLogger.fatal = (message: string, error?: Error | unknown, context?: LogContext) => {
      originalMethods.fatal(message, error, { ...defaultContext, ...context });
    };

    return childLogger;
  }
}

// Export logger factory
export function createLogger(serviceName: string): Logger {
  return new Logger(serviceName);
}