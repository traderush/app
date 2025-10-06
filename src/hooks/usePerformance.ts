import { useEffect, useRef } from 'react';

export interface PerformanceMetrics {
  renderTime: number;
  frameRate: number;
  memoryUsage?: number;
}

export const usePerformance = (componentName: string) => {
  const renderStartRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Track render time
  useEffect(() => {
    renderStartRef.current = performance.now();
    
    return () => {
      const renderTime = performance.now() - renderStartRef.current;
      if (process.env.NODE_ENV === 'development') {
        console.log(`${componentName} render time: ${renderTime.toFixed(2)}ms`);
      }
    };
  });

  // Track frame rate
  useEffect(() => {
    let animationId: number;
    
    const measureFrameRate = () => {
      const now = performance.now();
      frameCountRef.current++;
      
      if (now - lastTimeRef.current >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current));
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`${componentName} FPS: ${fps}`);
        }
        
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      
      animationId = requestAnimationFrame(measureFrameRate);
    };
    
    animationId = requestAnimationFrame(measureFrameRate);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [componentName]);

  // Memory usage (if available)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
      const memory = (performance as { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      console.log(`${componentName} memory:`, {
        used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
      });
    }
  }, [componentName]);

  return {
    measureRenderTime: (fn: () => void) => {
      const start = performance.now();
      fn();
      const end = performance.now();
      return end - start;
    }
  };
};
