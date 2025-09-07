'use client';
import { useEffect, useRef, useState } from 'react';

export type PricePoint = { t: number; p: number };
export type PriceSeries = PricePoint[];

export function usePriceFeed(start = 117_500): PriceSeries {
  const [series, setSeries] = useState<PriceSeries>([]);
  const ref = useRef(start);

  useEffect(() => {
    setSeries([{ t: Date.now(), p: ref.current }]);
    const id = setInterval(() => {
      const vol = 40 + Math.random() * 60;
      const step = (Math.random() - 0.5) * vol;
      ref.current = Math.max(1, ref.current + step);
      setSeries(s => [...s.slice(-600), { t: Date.now(), p: ref.current }]);
    }, 250);
    return () => clearInterval(id);
  }, []);
  return series;
}
