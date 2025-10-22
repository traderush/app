/**
 * Production-ready logging service
 * Replaces console statements with structured logging
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: number;
  context?: string;
}

// Extend Window interface for logging
declare global {
  interface Window {
    __tradeRushLogs?: LogEntry[];
  }
}

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown, context?: string): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const contextStr = context ? `[${context}]` : '';
    return `${timestamp} ${levelName} ${contextStr}: ${message}`;
  }

  private log(level: LogLevel, message: string, data?: unknown, context?: string): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, data, context);

    // In development, use console for immediate feedback
    if (this.isDevelopment) {
      switch (level) {
        case LogLevel.DEBUG:
          console.log(formattedMessage, data || '');
          break;
        case LogLevel.INFO:
          console.info(formattedMessage, data || '');
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage, data || '');
          break;
        case LogLevel.ERROR:
          console.error(formattedMessage, data || '');
          break;
      }
    } else {
      // In production, send to logging service
      this.sendToLoggingService({ level, message, data, timestamp: Date.now(), context });
    }
  }

  private sendToLoggingService(entry: LogEntry): void {
    // In production, this would send logs to your logging service
    // For now, we'll just store them in memory for debugging
    if (typeof window !== 'undefined') {
      if (!window.__tradeRushLogs) {
        window.__tradeRushLogs = [];
      }
      window.__tradeRushLogs.push(entry);
      
      // Keep only last 100 logs to prevent memory issues
      if (window.__tradeRushLogs.length > 100) {
        window.__tradeRushLogs = window.__tradeRushLogs.slice(-100);
      }
    }
  }

  debug(message: string, data?: unknown, context?: string): void {
    this.log(LogLevel.DEBUG, message, data, context);
  }

  info(message: string, data?: unknown, context?: string): void {
    this.log(LogLevel.INFO, message, data, context);
  }

  warn(message: string, data?: unknown, context?: string): void {
    this.log(LogLevel.WARN, message, data, context);
  }

  error(message: string, data?: unknown, context?: string): void {
    this.log(LogLevel.ERROR, message, data, context);
  }

  // Performance logging
  performance(operation: string, duration: number, data?: unknown): void {
    this.info(`Performance: ${operation} took ${duration}ms`, data, 'PERF');
  }

  // WebSocket specific logging
  websocket(event: string, data?: unknown): void {
    this.info(`WebSocket: ${event}`, data, 'WS');
  }

  // Canvas specific logging
  canvas(event: string, data?: unknown): void {
    this.debug(`Canvas: ${event}`, data, 'CANVAS');
  }

  // Connection specific logging
  connection(event: string, data?: unknown): void {
    this.info(`Connection: ${event}`, data, 'CONN');
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types for external use
export type { LogEntry };
