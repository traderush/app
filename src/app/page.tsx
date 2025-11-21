'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import { useUIStore } from '@/shared/state';
import { cn } from '@/shared/lib/utils';

const formatCurrency = (num: number): string => {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
};

const formatPrice = (num: number): string => {
  if (num >= 1000) return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${num.toFixed(2)}`;
};

// Mock assets data
const assets = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/d8/fd/f6/d8fdf69a-e716-1018-1740-b344df03476a/AppIcon-0-0-1x_U007epad-0-11-0-sRGB-85-220.png/460x0w.webp',
    price: 65000,
    change24h: 2.5,
    change24hValue: 1625,
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    icon: 'https://static1.tokenterminal.com//ethereum/logo.png?logo_hash=fd8f54cab23f8f4980041f4e74607cac0c7ab880',
    price: 3420,
    change24h: 1.8,
    change24hValue: 61.56,
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    icon: 'https://avatarfiles.alphacoders.com/377/377220.png',
    price: 142.5,
    change24h: -0.5,
    change24hValue: -0.71,
  },
  {
    symbol: 'DEMO',
    name: 'Demo Asset',
    icon: 'https://framerusercontent.com/images/dWPrOABO15xb2dkrxTZj3Z6cAU.png?width=256&height=256',
    price: 100,
    change24h: 2.5,
    change24hValue: 2.5,
  },
];

export default function Home() {
  const signatureColor = useUIStore((state) => state.signatureColor);
  const tradingPositiveColor = useUIStore((state) => state.tradingPositiveColor);
  const tradingNegativeColor = useUIStore((state) => state.tradingNegativeColor);

  // Mock portfolio value
  const portfolioValue = 12450.33;
  const portfolioChange = -1389.67;
  const portfolioChangePercent = -10.04;

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px-32px)] text-zinc-100" style={{ backgroundColor: '#000000' }}>
      {/* Portfolio Summary - Top Section */}
      <div className="px-6 py-8 border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto">
          <div className="mb-2">
            <div className="text-sm text-zinc-400 mb-1">Portfolio Value</div>
            <div className="text-4xl font-semibold text-zinc-100">{formatCurrency(portfolioValue)}</div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-medium"
              style={{ color: portfolioChange >= 0 ? tradingPositiveColor : tradingNegativeColor }}
            >
              {portfolioChange >= 0 ? '+' : ''}{formatCurrency(portfolioChange)} ({portfolioChangePercent >= 0 ? '+' : ''}{portfolioChangePercent.toFixed(2)}%)
            </span>
            <span className="text-xs text-zinc-500">Today</span>
          </div>
        </div>
      </div>

      {/* Market Overview */}
      <div className="px-6 py-6 border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-100">Markets</h2>
            <Link
              href="/portfolio"
              className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors flex items-center gap-1"
            >
              View All
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Assets List */}
          <div className="space-y-1">
            {assets.map((asset) => {
              const isPositive = asset.change24h >= 0;
              const changeColor = isPositive ? tradingPositiveColor : tradingNegativeColor;
              
              return (
                <Link
                  key={asset.symbol}
                  href="/box-hit"
                  className="flex items-center justify-between py-4 px-2 rounded-lg hover:bg-zinc-900/30 transition-colors group"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-zinc-900">
                      <Image
                        src={asset.icon}
                        alt={asset.name}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-zinc-100">{asset.symbol}</span>
                        <span className="text-sm text-zinc-500">{asset.name}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-base font-semibold text-zinc-100">{formatPrice(asset.price)}</div>
                      <div className="flex items-center gap-1 justify-end">
                        {isPositive ? (
                          <ArrowUpRight className="w-3 h-3" style={{ color: changeColor }} />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" style={{ color: changeColor }} />
                        )}
                        <span className="text-sm font-medium" style={{ color: changeColor }}>
                          {isPositive ? '+' : ''}{asset.change24h.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trading Games Section */}
      <div className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-zinc-100">Trading Games</h2>
            <Link
              href="/leaderboard"
              className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors flex items-center gap-1"
            >
              Leaderboard
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/box-hit"
              className="p-4 rounded-lg border border-zinc-800/50 hover:border-zinc-700 transition-colors group"
            >
              <div className="text-base font-semibold text-zinc-100 mb-1 group-hover:text-zinc-50 transition-colors">
                Box Hit
              </div>
              <div className="text-sm text-zinc-400">Predict price movements</div>
            </Link>
            <div className="p-4 rounded-lg border border-zinc-800/30 opacity-50">
              <div className="text-base font-semibold text-zinc-500 mb-1">Sketch</div>
              <div className="text-sm text-zinc-600">Coming soon</div>
            </div>
            <div className="p-4 rounded-lg border border-zinc-800/30 opacity-50">
              <div className="text-base font-semibold text-zinc-500 mb-1">Towers</div>
              <div className="text-sm text-zinc-600">Coming soon</div>
            </div>
            <div className="p-4 rounded-lg border border-zinc-800/30 opacity-50">
              <div className="text-base font-semibold text-zinc-500 mb-1">Ahead</div>
              <div className="text-sm text-zinc-600">Coming soon</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-6 py-6 border-t border-zinc-800/50">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-xs text-zinc-500 mb-1">24h Volume</div>
              <div className="text-lg font-semibold text-zinc-100">$45.20B</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">Active Traders</div>
              <div className="text-lg font-semibold text-zinc-100">12.5K</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">Win Rate</div>
              <div className="text-lg font-semibold" style={{ color: tradingPositiveColor }}>52.3%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
