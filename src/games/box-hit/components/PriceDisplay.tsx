'use client';

import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PriceDisplayProps {
  currentPrice: number;
  previousPrice: number;
  isLive: boolean;
  exchange: string;
}

const PriceDisplay = React.memo<PriceDisplayProps>(({
  currentPrice,
  previousPrice,
  isLive,
  exchange
}) => {
  // Memoized computed values
  const priceChange = useMemo(() => {
    return currentPrice - previousPrice;
  }, [currentPrice, previousPrice]);

  const priceChangePercent = useMemo(() => {
    if (previousPrice === 0) return 0;
    return (priceChange / previousPrice) * 100;
  }, [priceChange, previousPrice]);

  const isPositive = useMemo(() => {
    return priceChange >= 0;
  }, [priceChange]);

  const formattedPrice = useMemo(() => {
    return currentPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }, [currentPrice]);

  const formattedChange = useMemo(() => {
    const sign = priceChange >= 0 ? '+' : '';
    return `${sign}${priceChange.toFixed(2)}`;
  }, [priceChange]);

  const formattedChangePercent = useMemo(() => {
    const sign = priceChangePercent >= 0 ? '+' : '';
    return `${sign}${priceChangePercent.toFixed(2)}%`;
  }, [priceChangePercent]);

  return (
    <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
      {/* Exchange Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-zinc-300">{exchange}</div>
        <div className={`text-xs px-2 py-1 rounded-full ${
          isLive ? 'bg-green-500/20 text-green-400' : 'bg-zinc-500/20 text-zinc-400'
        }`}>
          {isLive ? 'LIVE' : 'OFFLINE'}
        </div>
      </div>

      {/* Price Display */}
      <div className="space-y-2">
        <div className="text-2xl font-bold text-white">
          ${formattedPrice}
        </div>
        
        {/* Price Change */}
        <div className={`flex items-center space-x-2 ${
          isPositive ? 'text-green-400' : 'text-red-400'
        }`}>
          {isPositive ? (
            <TrendingUp size={16} />
          ) : (
            <TrendingDown size={16} />
          )}
          <span className="text-sm font-medium">
            {formattedChange}
          </span>
          <span className="text-sm">
            ({formattedChangePercent})
          </span>
        </div>
      </div>

      {/* Additional Info */}
      <div className="text-xs text-zinc-400">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
});

PriceDisplay.displayName = 'PriceDisplay';

export default PriceDisplay;
