/**
 * Performance monitoring utilities for the backend
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('PerformanceMonitor');

export interface PerformanceMetrics {
  totalConnections: number;
  activeConnections: number;
  messagesProcessed: number;
  averageResponseTime: number;
  errorCount: number;
  uptime: number;
  connectionsPerSecond: number;
  messagesPerSecond: number;
  errorRate: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  peakConnections: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics;
  private startTime: number;

  private constructor() {
    this.startTime = Date.now();
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      messagesProcessed: 0,
      averageResponseTime: 0,
      errorCount: 0,
      uptime: 0,
      connectionsPerSecond: 0,
      messagesPerSecond: 0,
      errorRate: 0,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      peakConnections: 0
    };
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Update connection metrics
   */
  updateConnections(active: number, total: number) {
    this.metrics.activeConnections = active;
    this.metrics.totalConnections = total;
    this.metrics.peakConnections = Math.max(this.metrics.peakConnections, active);
  }

  /**
   * Update message processing metrics
   */
  updateMessageProcessing(processed: boolean, responseTime: number, error: boolean) {
    if (processed) {
      this.metrics.messagesProcessed++;
    }
    
    if (responseTime > 0) {
      const currentAvg = this.metrics.averageResponseTime;
      const count = this.metrics.messagesProcessed;
      this.metrics.averageResponseTime = 
        (currentAvg * (count - 1) + responseTime) / count;
    }
    
    if (error) {
      this.metrics.errorCount++;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    const now = Date.now();
    this.metrics.uptime = now - this.startTime;
    this.metrics.connectionsPerSecond = this.metrics.totalConnections / (this.metrics.uptime / 1000);
    this.metrics.messagesPerSecond = this.metrics.messagesProcessed / (this.metrics.uptime / 1000);
    this.metrics.errorRate = this.metrics.messagesProcessed > 0 
      ? this.metrics.errorCount / this.metrics.messagesProcessed 
      : 0;
    this.metrics.memoryUsage = process.memoryUsage();
    this.metrics.cpuUsage = process.cpuUsage();
    
    return { ...this.metrics };
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const metrics = this.getMetrics();
    const isHealthy = metrics.errorRate < 0.1 && metrics.averageResponseTime < 100;
    
    return {
      status: isHealthy ? 'healthy' : 'degraded',
      metrics,
      timestamp: Date.now()
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.startTime = Date.now();
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      messagesProcessed: 0,
      averageResponseTime: 0,
      errorCount: 0,
      uptime: 0,
      connectionsPerSecond: 0,
      messagesPerSecond: 0,
      errorRate: 0,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      peakConnections: 0
    };
  }

  /**
   * Log performance summary
   */
  logPerformanceSummary() {
    const metrics = this.getMetrics();
    logger.info('Performance Summary', {
      uptime: `${Math.round(metrics.uptime / 1000)}s`,
      connections: `${metrics.activeConnections}/${metrics.totalConnections}`,
      messages: `${metrics.messagesProcessed} (${metrics.messagesPerSecond.toFixed(2)}/s)`,
      responseTime: `${metrics.averageResponseTime.toFixed(2)}ms`,
      errorRate: `${(metrics.errorRate * 100).toFixed(2)}%`,
      memory: `${Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024)}MB`
    });
  }
}
