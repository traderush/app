'use client';
import { useEffect, useRef } from 'react';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import type { PriceSeries } from '@/games/shared/usePriceFeed';

export default function ChartCanvas({ data }: { data: PriceSeries }) {
  const el = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!el.current) return;
    let cleanup = () => {};
    (async () => {
      const mod = await import('lightweight-charts');
      const createChart = (mod as { createChart?: unknown }).createChart ?? ((mod as { default?: { createChart?: unknown } }).default?.createChart);
      const chart: IChartApi = (createChart as (container: HTMLElement, options: unknown) => IChartApi)(el.current!, {
        layout: { background: { type: 'Solid', color: 'transparent' }, textColor: '#a1a1aa' },
        grid: { horzLines: { color: 'rgba(255,255,255,.08)' }, vertLines: { color: 'rgba(255,255,255,.04)' } },
        rightPriceScale: { borderVisible: false },
        timeScale: { borderVisible: false },
        crosshair: { mode: 0 },
      });
      chartRef.current = chart;
      lineRef.current = (chart.addSeries as (options: unknown) => ISeriesApi<'Line'>)({ lineWidth: 2 });

      const resize = () => chart.applyOptions({
        width: el.current!.clientWidth, height: el.current!.clientHeight,
      });
      resize();
      const ro = new ResizeObserver(resize); ro.observe(el.current!);
      cleanup = () => { ro.disconnect(); chart.remove(); };
    })();
    return () => cleanup();
  }, []);

  useEffect(() => {
    const s = lineRef.current; if (!s || data.length === 0) return;
    s.setData(data.map(d => ({ time: Math.floor(d.t / 1000) as number, value: d.p })));
  }, [data]);

  return <div ref={el} className="w-full h-full min-h-[300px]" />;
}
