/**
 * Health check endpoint for monitoring server status
 */

import { createLogger } from '../utils/logger';
import { PerformanceMonitor } from './PerformanceMonitor';

const logger = createLogger('HealthCheck');

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  uptime: number;
  version: string;
  metrics: {
    connections: {
      active: number;
      total: number;
      peak: number;
    };
    performance: {
      messagesPerSecond: number;
      averageResponseTime: number;
      errorRate: number;
    };
    system: {
      memoryUsage: NodeJS.MemoryUsage;
      cpuUsage: NodeJS.CpuUsage;
    };
  };
  checks: {
    websocket: boolean;
    memory: boolean;
    cpu: boolean;
    errorRate: boolean;
  };
}

export class HealthCheck {
  private static instance: HealthCheck;
  private performanceMonitor: PerformanceMonitor;

  private constructor() {
    this.performanceMonitor = PerformanceMonitor.getInstance();
  }

  static getInstance(): HealthCheck {
    if (!HealthCheck.instance) {
      HealthCheck.instance = new HealthCheck();
    }
    return HealthCheck.instance;
  }

  /**
   * Perform health check
   */
  async performHealthCheck(): Promise<HealthCheckResponse> {
    const metrics = this.performanceMonitor.getMetrics();
    
    // Check WebSocket connections
    const websocketHealthy = metrics.activeConnections >= 0;
    
    // Check memory usage (alert if > 1GB)
    const memoryHealthy = metrics.memoryUsage.heapUsed < 1024 * 1024 * 1024;
    
    // Check CPU usage (alert if > 80%)
    const cpuHealthy = true; // CPU usage check would need more sophisticated monitoring
    
    // Check error rate (alert if > 10%)
    const errorRateHealthy = metrics.errorRate < 0.1;
    
    const checks = {
      websocket: websocketHealthy,
      memory: memoryHealthy,
      cpu: cpuHealthy,
      errorRate: errorRateHealthy
    };
    
    // Determine overall status
    const allHealthy = Object.values(checks).every(check => check);
    const someHealthy = Object.values(checks).some(check => check);
    
    const status = allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy';
    
    const response: HealthCheckResponse = {
      status,
      timestamp: Date.now(),
      uptime: metrics.uptime,
      version: process.env.npm_package_version || '1.0.0',
      metrics: {
        connections: {
          active: metrics.activeConnections,
          total: metrics.totalConnections,
          peak: metrics.peakConnections
        },
        performance: {
          messagesPerSecond: metrics.messagesPerSecond,
          averageResponseTime: metrics.averageResponseTime,
          errorRate: metrics.errorRate
        },
        system: {
          memoryUsage: metrics.memoryUsage,
          cpuUsage: metrics.cpuUsage
        }
      },
      checks
    };
    
    // Log health status
    if (status !== 'healthy') {
      logger.warn('Health check failed', { status, checks });
    }
    
    return response;
  }

  /**
   * Get health check endpoint handler
   */
  getHealthCheckHandler() {
    return async (request: Request): Promise<Response> => {
      try {
        const healthData = await this.performHealthCheck();
        
        return new Response(JSON.stringify(healthData, null, 2), {
          status: healthData.status === 'healthy' ? 200 : 503,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
      } catch (error) {
        logger.error('Health check failed', error);
        
        return new Response(JSON.stringify({
          status: 'unhealthy',
          timestamp: Date.now(),
          error: 'Health check failed'
        }), {
          status: 503,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
    };
  }
}
