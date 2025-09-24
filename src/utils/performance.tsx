/**
 * Performance monitoring and optimization utilities
 */

import React from 'react';

interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  timestamp: number;
  props?: Record<string, unknown>;
  memoized?: boolean;
}

interface WebSocketMetrics {
  connectionTime: number;
  messageCount: number;
  errorCount: number;
  reconnectCount: number;
  averageLatency: number;
}

interface GameMetrics {
  frameRate: number;
  canvasRenderTime: number;
  memoryUsage: number;
  selectionCount: number;
  updateFrequency: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private wsMetrics: Map<string, WebSocketMetrics> = new Map();
  private gameMetrics: GameMetrics | null = null;
  private observers: Set<(metrics: { type: string; data: unknown }) => void> = new Set();
  private isEnabled = process.env.NODE_ENV === 'development';

  // Component performance tracking
  trackComponentRender(componentName: string, renderTime: number, props?: Record<string, unknown>) {
    if (!this.isEnabled) return;

    const metric: PerformanceMetrics = {
      componentName,
      renderTime,
      timestamp: Date.now(),
      props,
    };

    this.metrics.push(metric);
    
    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Log slow renders (> 16ms = 60fps threshold)
    if (renderTime > 16) {
      console.warn(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`, props);
    }

    this.notifyObservers({ type: 'component', data: metric });
  }

  // WebSocket performance tracking
  trackWebSocketMetrics(exchange: string, metrics: Partial<WebSocketMetrics>) {
    if (!this.isEnabled) return;

    const current = this.wsMetrics.get(exchange) || {
      connectionTime: 0,
      messageCount: 0,
      errorCount: 0,
      reconnectCount: 0,
      averageLatency: 0,
    };

    const updated = { ...current, ...metrics };
    this.wsMetrics.set(exchange, updated);

    this.notifyObservers({ type: 'websocket', data: { exchange, metrics: updated } });
  }

  // Game performance tracking
  trackGameMetrics(metrics: Partial<GameMetrics>) {
    if (!this.isEnabled) return;

    this.gameMetrics = { ...this.gameMetrics, ...metrics } as GameMetrics;

    // Log performance issues
    if (metrics.frameRate && metrics.frameRate < 30) {
      console.warn(`Low frame rate detected: ${metrics.frameRate.toFixed(1)}fps`);
    }

    if (metrics.memoryUsage && metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
      console.warn(`High memory usage detected: ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`);
    }

    this.notifyObservers({ type: 'game', data: this.gameMetrics });
  }

  // Get performance summary
  getPerformanceSummary() {
    const componentMetrics = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.componentName]) {
        acc[metric.componentName] = {
          count: 0,
          totalTime: 0,
          maxTime: 0,
          avgTime: 0,
        };
      }
      
      const stats = acc[metric.componentName];
      stats.count++;
      stats.totalTime += metric.renderTime;
      stats.maxTime = Math.max(stats.maxTime, metric.renderTime);
      stats.avgTime = stats.totalTime / stats.count;
      
      return acc;
    }, {} as Record<string, { count: number; totalTime: number; maxTime: number; avgTime: number }>);

    return {
      components: componentMetrics,
      websockets: Object.fromEntries(this.wsMetrics),
      game: this.gameMetrics,
      timestamp: Date.now(),
    };
  }

  // Subscribe to performance updates
  subscribe(callback: (metrics: { type: string; data: unknown }) => void) {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  private notifyObservers(data: { type: string; data: unknown }) {
    this.observers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Performance monitor callback error:', error);
      }
    });
  }

  // Clear all metrics
  clear() {
    this.metrics = [];
    this.wsMetrics.clear();
    this.gameMetrics = null;
  }

  // Enable/disable monitoring
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for component performance tracking
export function usePerformanceTracking(componentName: string, props?: Record<string, unknown>) {
  const renderStart = React.useRef<number>(0);
  const isMemoized = React.useRef<boolean>(false);

  React.useEffect(() => {
    renderStart.current = performance.now();
  });

  React.useEffect(() => {
    const renderTime = performance.now() - renderStart.current;
    performanceMonitor.trackComponentRender(componentName, renderTime, props);
  });

  // Track memoization effectiveness
  React.useMemo(() => {
    isMemoized.current = true;
    return null;
  }, []);

  return {
    trackRender: (renderTime: number) => {
      performanceMonitor.trackComponentRender(componentName, renderTime, props);
    },
    isMemoized: isMemoized.current,
  };
}

// WebSocket performance tracking hook
export function useWebSocketPerformance(exchange: string) {
  const metricsRef = React.useRef<WebSocketMetrics>({
    connectionTime: 0,
    messageCount: 0,
    errorCount: 0,
    reconnectCount: 0,
    averageLatency: 0,
  });

  const trackConnection = React.useCallback((connectionTime: number) => {
    metricsRef.current.connectionTime = connectionTime;
    performanceMonitor.trackWebSocketMetrics(exchange, { connectionTime });
  }, [exchange]);

  const trackMessage = React.useCallback((latency?: number) => {
    metricsRef.current.messageCount++;
    if (latency) {
      metricsRef.current.averageLatency = 
        (metricsRef.current.averageLatency * (metricsRef.current.messageCount - 1) + latency) / 
        metricsRef.current.messageCount;
    }
    performanceMonitor.trackWebSocketMetrics(exchange, {
      messageCount: metricsRef.current.messageCount,
      averageLatency: metricsRef.current.averageLatency,
    });
  }, [exchange]);

  const trackError = React.useCallback(() => {
    metricsRef.current.errorCount++;
    performanceMonitor.trackWebSocketMetrics(exchange, { errorCount: metricsRef.current.errorCount });
  }, [exchange]);

  const trackReconnect = React.useCallback(() => {
    metricsRef.current.reconnectCount++;
    performanceMonitor.trackWebSocketMetrics(exchange, { reconnectCount: metricsRef.current.reconnectCount });
  }, [exchange]);

  return {
    trackConnection,
    trackMessage,
    trackError,
    trackReconnect,
    metrics: metricsRef.current,
  };
}

// Game performance tracking hook
export function useGamePerformance() {
  const frameCountRef = React.useRef<number>(0);
  const lastFrameTimeRef = React.useRef<number>(0);
  const fpsRef = React.useRef<number>(60);

  const trackFrame = React.useCallback((renderTime: number) => {
    const now = performance.now();
    frameCountRef.current++;

    if (now - lastFrameTimeRef.current >= 1000) {
      fpsRef.current = frameCountRef.current;
      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
    }

    performanceMonitor.trackGameMetrics({
      frameRate: fpsRef.current,
      canvasRenderTime: renderTime,
      memoryUsage: (performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory?.usedJSHeapSize || 0,
    });
  }, []);

  const trackSelection = React.useCallback((count: number) => {
    performanceMonitor.trackGameMetrics({
      selectionCount: count,
    });
  }, []);

  return {
    trackFrame,
    trackSelection,
    fps: fpsRef.current,
  };
}

// Performance dashboard component (for development)
export function PerformanceDashboard() {
  const [summary, setSummary] = React.useState<any>(null);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = performanceMonitor.subscribe(() => {
      setSummary(performanceMonitor.getPerformanceSummary());
    });

    // Initial summary
    setSummary(performanceMonitor.getPerformanceSummary());

    return unsubscribe;
  }, []);

  // Keyboard shortcut to toggle dashboard
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!isVisible || !summary) return null;

  return (
    <div className="fixed top-4 right-4 bg-black/90 text-white p-4 rounded-lg max-w-md max-h-96 overflow-auto text-xs z-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Performance Dashboard</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-3">
        <div>
          <h4 className="font-semibold mb-1">Components</h4>
          {Object.entries(summary.components).map(([name, stats]: [string, any]) => (
            <div key={name} className="ml-2 text-xs">
              <span className="font-mono">{name}:</span> {stats.avgTime.toFixed(1)}ms avg, {stats.maxTime.toFixed(1)}ms max
            </div>
          ))}
        </div>

        <div>
          <h4 className="font-semibold mb-1">WebSockets</h4>
          {Object.entries(summary.websockets).map(([exchange, metrics]: [string, any]) => (
            <div key={exchange} className="ml-2 text-xs">
              <span className="font-mono">{exchange}:</span> {metrics.messageCount} msgs, {metrics.errorCount} errors
            </div>
          ))}
        </div>

        {summary.game && (
          <div>
            <h4 className="font-semibold mb-1">Game</h4>
            <div className="ml-2 text-xs">
              <div>FPS: {summary.game.frameRate?.toFixed(1) || 'N/A'}</div>
              <div>Memory: {summary.game.memoryUsage ? (summary.game.memoryUsage / 1024 / 1024).toFixed(1) + 'MB' : 'N/A'}</div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-gray-600">
        <button 
          onClick={() => performanceMonitor.clear()}
          className="text-xs bg-red-600 px-2 py-1 rounded hover:bg-red-700"
        >
          Clear Metrics
        </button>
      </div>
    </div>
  );
}

export default performanceMonitor;
