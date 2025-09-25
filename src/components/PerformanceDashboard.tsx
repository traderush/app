'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePerformance } from '@/hooks/usePerformance';
import { useGameStore, usePriceStore } from '@/stores';

interface PerformanceDashboardProps {
  enabled?: boolean;
  refreshInterval?: number;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ 
  enabled = process.env.NODE_ENV === 'development',
  refreshInterval = 5000 
}) => {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    frameRate: 0,
    memoryUsage: 0,
    componentCount: 0,
    storeUpdates: 0
  });

  const performance = usePerformance('PerformanceDashboard');
  const { gameStats } = useGameStore();
  const { priceData } = usePriceStore();

  // Update metrics periodically
  useEffect(() => {
    if (!enabled) return;

    const updateMetrics = () => {
      const renderTime = performance.measureRenderTime(() => {});
      const memoryUsage = (performance as any).getMemoryUsage?.() || 0;
      
      setMetrics(prev => ({
        ...prev,
        renderTime,
        frameRate: 60, // This would come from canvas optimization
        memoryUsage,
        componentCount: 15, // Count of active components
        storeUpdates: gameStats.totalBets + priceData.length
      }));
    };

    const interval = setInterval(updateMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [enabled, refreshInterval, performance, gameStats.totalBets, priceData.length]);

  // Memoized performance score
  const performanceScore = useMemo(() => {
    const scores = [
      metrics.frameRate >= 55 ? 10 : metrics.frameRate >= 45 ? 8 : metrics.frameRate >= 30 ? 6 : 3,
      metrics.renderTime <= 16 ? 10 : metrics.renderTime <= 33 ? 8 : metrics.renderTime <= 50 ? 6 : 3,
      metrics.memoryUsage < 100 ? 10 : metrics.memoryUsage < 200 ? 8 : metrics.memoryUsage < 500 ? 6 : 3,
      metrics.componentCount < 20 ? 10 : metrics.componentCount < 50 ? 8 : 6
    ];
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }, [metrics]);

  const getPerformanceColor = (score: number) => {
    if (score >= 8) return 'text-green-400';
    if (score >= 6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getPerformanceStatus = (score: number) => {
    if (score >= 8) return '🚀 Excellent';
    if (score >= 6) return '⚡ Good';
    return '🐌 Needs optimization';
  };

  if (!enabled) return null;

  return (
    <div className="fixed top-4 right-4 bg-zinc-900/95 border border-zinc-700 rounded-lg p-4 text-xs font-mono z-50 max-w-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        <span className="text-zinc-300 font-medium">Performance Dashboard</span>
        <span className={`font-bold ${getPerformanceColor(performanceScore)}`}>
          {performanceScore}/10
        </span>
      </div>
      
      <div className="space-y-2 text-zinc-400">
        <div className="flex justify-between">
          <span>FPS:</span>
          <span className="text-white">{metrics.frameRate}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Render Time:</span>
          <span className="text-white">{metrics.renderTime.toFixed(1)}ms</span>
        </div>
        
        <div className="flex justify-between">
          <span>Memory:</span>
          <span className="text-white">{metrics.memoryUsage.toFixed(1)}MB</span>
        </div>
        
        <div className="flex justify-between">
          <span>Components:</span>
          <span className="text-white">{metrics.componentCount}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Store Updates:</span>
          <span className="text-white">{metrics.storeUpdates}</span>
        </div>
      </div>
      
      <div className="mt-3 pt-2 border-t border-zinc-700">
        <div className="text-xs text-zinc-500">
          {getPerformanceStatus(performanceScore)}
        </div>
      </div>
    </div>
  );
};

export default React.memo(PerformanceDashboard);
