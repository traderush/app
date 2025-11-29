'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { AreaSeries } from 'lightweight-charts';
import { useUIStore } from '@/shared/state';

// Generate demo PNL data - cumulative realized PNL over time
const generateDemoData = (): Array<{ time: UTCTimestamp; value: number }> => {
  const data = [];
  const now = Date.now();
  let cumulativePnl = 0; // Start at $0 (neutral)
  
  // Generate 30 days of data
  for (let i = 29; i >= 0; i--) {
    const timestamp = now - i * 24 * 60 * 60 * 1000;
    const time = Math.floor(timestamp / 1000) as UTCTimestamp;
    // Simulate daily PNL changes
    const dailyChange = -30 + Math.random() * 60 - 15;
    cumulativePnl += dailyChange;
    data.push({
      time,
      value: cumulativePnl,
    });
  }
  return data;
};

export default function RealizedPnlChart() {
  const el = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const areaRef = useRef<ISeriesApi<'Area'> | null>(null);
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<string | null>(null);
  const tradingPositiveColor = useUIStore((state) => state.tradingPositiveColor);
  const tradingNegativeColor = useUIStore((state) => state.tradingNegativeColor);

  useEffect(() => {
    if (!el.current) return;
    let cleanup = () => {};

    // Wait a bit to ensure container has dimensions
    const timeoutId = setTimeout(() => {
      const loadChart = async () => {
        if (!el.current) return;
        
        try {
          const mod = await import('lightweight-charts');
          const createChart =
            (mod as { createChart?: unknown }).createChart ??
            ((mod as { default?: { createChart?: unknown } }).default?.createChart);

          if (!createChart) {
            console.error('Failed to load lightweight-charts');
            return;
          }

          // Generate demo data first
          const demoData = generateDemoData();
          console.log('Demo data:', demoData.length, 'points');

          // Ensure container has dimensions
          const container = el.current!;
          if (container.clientWidth === 0 || container.clientHeight === 0) {
            console.warn('Container has no dimensions');
            return;
          }

          const chart: IChartApi = (createChart as (container: HTMLElement, options: unknown) => IChartApi)(
            container,
            {
              layout: {
                background: { type: 'Solid', color: 'transparent' },
                textColor: '#a1a1aa',
              },
              grid: {
                horzLines: { 
                  color: 'rgba(255,255,255,0.1)',
                  visible: true,
                },
                vertLines: { 
                  color: 'rgba(255,255,255,0.04)',
                  visible: true,
                },
              },
              rightPriceScale: {
                borderVisible: true,
                borderColor: 'rgba(255,255,255,0.2)',
                scaleMargins: { top: 0.1, bottom: 0.2 },
                visible: true,
                entireTextOnly: false,
                autoScale: true,
              },
              timeScale: {
                borderVisible: true,
                borderColor: 'rgba(255,255,255,0.2)',
                timeVisible: true,
                secondsVisible: false,
                visible: true,
                rightOffset: 0,
                barSpacing: 0,
                fixLeftEdge: false,
                fixRightEdge: false,
              },
              leftPriceScale: {
                visible: false,
              },
              crosshair: {
                mode: 1,
                vertLine: {
                  color: 'rgba(255,255,255,0.3)',
                  width: 1,
                },
                horzLine: {
                  color: 'rgba(255,255,255,0.3)',
                  width: 1,
                },
              },
              width: container.clientWidth,
              height: container.clientHeight,
            }
          );

          chartRef.current = chart;

          // Helper to convert hex to rgba
          const hexToRgba = (hex: string, opacity: number) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
          };

          // Determine which color to use based on the data (use negative for now, will update dynamically)
          const chartColor = tradingNegativeColor;
          
          // Create area series with trading colors
          // In lightweight-charts v5, use addSeries with AreaSeries type definition
          areaRef.current = chart.addSeries(AreaSeries, {
            lineColor: chartColor,
            topColor: hexToRgba(chartColor, 0.2),
            bottomColor: hexToRgba(chartColor, 0),
            lineWidth: 2,
            priceFormat: {
              type: 'price',
              precision: 2,
              minMove: 0.01,
            },
          }) as ISeriesApi<'Area'>;

          // Set data immediately
          if (areaRef.current && demoData.length > 0) {
            console.log('Setting chart data...');
            areaRef.current.setData(demoData);
            // Fit content to show all data from the start
            chart.timeScale().fitContent();
          }

          // Handle crosshair move to show PNL value
          chart.subscribeCrosshairMove((param) => {
            if (param.point === undefined || !param.time || param.seriesData.size === 0) {
              setHoverValue(null);
              setHoverTime(null);
              return;
            }

            const seriesData = param.seriesData.get(areaRef.current!);
            if (seriesData && 'value' in seriesData) {
              setHoverValue(seriesData.value as number);
              // Format time
              const date = new Date((param.time as number) * 1000);
              setHoverTime(date.toLocaleDateString() + ' ' + date.toLocaleTimeString());
            }
          });

          const resize = () => {
            if (el.current && chartRef.current) {
              chartRef.current.applyOptions({
                width: el.current.clientWidth,
                height: el.current.clientHeight,
              });
            }
          };
          resize();
          const ro = new ResizeObserver(resize);
          ro.observe(container);
          cleanup = () => {
            ro.disconnect();
            if (chartRef.current) {
              chartRef.current.remove();
            }
          };
        } catch (error) {
          console.error('Error loading chart:', error);
        }
      };

      void loadChart();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      cleanup();
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={el} className="w-full h-full" />
      {hoverValue !== null && hoverTime && (
        <div className="absolute top-2 left-2 bg-zinc-900/90 border border-zinc-700 rounded px-2 py-1 text-xs z-10">
          <div className="text-zinc-400">{hoverTime}</div>
          <div className={hoverValue >= 0 ? 'text-trading-positive' : 'text-trading-negative'}>
            ${hoverValue >= 0 ? '+' : ''}
            {hoverValue.toFixed(2)}
          </div>
        </div>
      )}
      {/* TradingView branding */}
      <div className="absolute bottom-1 right-2 text-[10px] text-zinc-500/70 z-10 pointer-events-none">
        TradingView
      </div>
    </div>
  );
}

