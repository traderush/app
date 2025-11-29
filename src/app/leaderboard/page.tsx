'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Search, Grid3x3, ChevronsUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Input } from '@/shared/ui/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { cn } from '@/shared/lib/utils';
import { PROFILE_AVATAR } from '@/shared/ui/constants/navigation';
import { usePlayerStore, type WatchedPlayer } from '@/shared/state';

// Mock data for traders
const mockTraders = [
  {
    id: 1,
    name: 'Cented',
    avatar: '🐱',
    winRate: 48.69,
    pnl: { sol: -427.5, usd: -80400 },
    positions: { total: 2210, won: 1070, lost: 1130 },
    trades: { total: 8090, won: 4700, lost: 3390 },
    volume: { count: 19500, usd: 3560000 },
    avgMultiplier: '2.5x',
  },
  {
    id: 2,
    name: 'West',
    avatar: '👓',
    winRate: 48.42,
    pnl: { sol: 220.9, usd: 41800 },
    positions: { total: 1490, won: 719, lost: 766 },
    trades: { total: 8390, won: 6190, lost: 2210 },
    volume: { count: 14700, usd: 2710000 },
    avgMultiplier: '1.8x',
  },
  {
    id: 3,
    name: 'Log',
    avatar: '😎',
    winRate: 38.09,
    pnl: { sol: 204.5, usd: 36300 },
    positions: { total: 4320, won: 1650, lost: 2670 },
    trades: { total: 11300, won: 6520, lost: 4810 },
    volume: { count: 13600, usd: 2470000 },
    avgMultiplier: '3.2x',
  },
  {
    id: 4,
    name: 'Kev',
    avatar: '🌱',
    winRate: 38.78,
    pnl: { sol: -768.4, usd: -145200 },
    positions: { total: 1960, won: 759, lost: 1200 },
    trades: { total: 5320, won: 2990, lost: 2330 },
    volume: { count: 11700, usd: 2120000 },
    avgMultiplier: '1.2x',
  },
  {
    id: 5,
    name: 'Trader5',
    avatar: '🚀',
    winRate: 52.15,
    pnl: { sol: 450.2, usd: 85200 },
    positions: { total: 3200, won: 1680, lost: 1520 },
    trades: { total: 12500, won: 6520, lost: 5980 },
    volume: { count: 25000, usd: 4750000 },
    avgMultiplier: '2.1x',
  },
  {
    id: 6,
    name: 'Trader6',
    avatar: '⭐',
    winRate: 45.23,
    pnl: { sol: 320.1, usd: 60500 },
    positions: { total: 2800, won: 1265, lost: 1535 },
    trades: { total: 9800, won: 4430, lost: 5370 },
    volume: { count: 22000, usd: 4150000 },
    avgMultiplier: '1.9x',
  },
  {
    id: 7,
    name: 'Trader7',
    avatar: '🔥',
    winRate: 55.67,
    pnl: { sol: 680.3, usd: 128500 },
    positions: { total: 3500, won: 1948, lost: 1552 },
    trades: { total: 14200, won: 7910, lost: 6290 },
    volume: { count: 28000, usd: 5290000 },
    avgMultiplier: '2.8x',
  },
  {
    id: 8,
    name: 'Trader8',
    avatar: '💎',
    winRate: 42.11,
    pnl: { sol: -120.5, usd: -22800 },
    positions: { total: 1900, won: 800, lost: 1100 },
    trades: { total: 7200, won: 3030, lost: 4170 },
    volume: { count: 16000, usd: 3020000 },
    avgMultiplier: '1.5x',
  },
  {
    id: 9,
    name: 'Trader9',
    avatar: '🎯',
    winRate: 58.34,
    pnl: { sol: 890.7, usd: 168200 },
    positions: { total: 4100, won: 2392, lost: 1708 },
    trades: { total: 15800, won: 9217, lost: 6583 },
    volume: { count: 32000, usd: 6040000 },
    avgMultiplier: '3.5x',
  },
  {
    id: 10,
    name: 'Trader10',
    avatar: '⚡',
    winRate: 49.88,
    pnl: { sol: 156.4, usd: 29500 },
    positions: { total: 2400, won: 1197, lost: 1203 },
    trades: { total: 11000, won: 5487, lost: 5513 },
    volume: { count: 21000, usd: 3970000 },
    avgMultiplier: '2.3x',
  },
];

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
};

const formatCurrency = (num: number): string => {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
};

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'box-hit' | 'sketch' | 'towers' | 'ahead'>('all');
  const [timeRange, setTimeRange] = useState<'1d' | '3d' | '7d' | '14d' | '30d'>('14d');
  const [searchQuery, setSearchQuery] = useState('');
  const [currency, setCurrency] = useState<'sol' | 'usd'>('sol');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const setSelectedPlayer = usePlayerStore((state) => state.setSelectedPlayer);
  const setIsPlayerTrackerOpen = usePlayerStore((state) => state.setIsPlayerTrackerOpen);
  
  const handlePlayerClick = useCallback((trader: typeof mockTraders[0]) => {
    const player: WatchedPlayer = {
      id: `trader_${trader.id}`,
      name: trader.name,
      address: `0x${trader.id.toString().padStart(8, '0')}...${trader.id.toString().padStart(4, '0')}`,
      avatar: PROFILE_AVATAR,
      game: 'Box Hit',
      isOnline: true,
      winRate: trader.winRate / 100,
      totalTrades: trader.trades.total,
      totalWins: trader.trades.won,
    };
    setSelectedPlayer(player);
    setIsPlayerTrackerOpen(true);
  }, [setSelectedPlayer, setIsPlayerTrackerOpen]);

  const filteredTraders = useMemo(() => {
    let filtered = mockTraders;
    if (searchQuery) {
      filtered = filtered.filter((trader) =>
        trader.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  }, [searchQuery]);

  const topTraders = useMemo(() => {
    return filteredTraders.slice(0, 3);
  }, [filteredTraders]);

  const tableTraders = useMemo(() => {
    let sorted = [...filteredTraders];
    
    if (sortBy) {
      sorted.sort((a, b) => {
        let aVal: number | string;
        let bVal: number | string;
        
        switch (sortBy) {
          case 'rank':
            // Rank is based on index, so we'll sort by PNL for now
            aVal = a.pnl.sol;
            bVal = b.pnl.sol;
            break;
          case 'pnl':
            aVal = currency === 'sol' ? a.pnl.sol : a.pnl.usd;
            bVal = currency === 'sol' ? b.pnl.sol : b.pnl.usd;
            break;
          case 'winRate':
            aVal = a.winRate;
            bVal = b.winRate;
            break;
          case 'positions':
            aVal = a.positions.total;
            bVal = b.positions.total;
            break;
          case 'trades':
            aVal = a.trades.total;
            bVal = b.trades.total;
            break;
          case 'volume':
            aVal = a.volume.count;
            bVal = b.volume.count;
            break;
          case 'avgMultiplier':
            aVal = parseFloat(a.avgMultiplier.replace('x', ''));
            bVal = parseFloat(b.avgMultiplier.replace('x', ''));
            break;
          default:
            return 0;
        }
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return 0;
      });
    }
    
    return sorted.slice(0, 10);
  }, [filteredTraders, sortBy, sortOrder, currency]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px-32px)] text-zinc-100" style={{ backgroundColor: '#000000' }}>
      {/* Top Navigation Bar */}
      <div className="border-b border-zinc-800/80 bg-zinc-950/60">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Left side - Tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === 'all'
                  ? 'text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-400'
              )}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('box-hit')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === 'box-hit'
                  ? 'text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-400'
              )}
            >
              Box Hit
            </button>
            <button
              onClick={() => setActiveTab('sketch')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === 'sketch'
                  ? 'text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-400'
              )}
            >
              Sketch
            </button>
            <button
              onClick={() => setActiveTab('towers')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === 'towers'
                  ? 'text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-400'
              )}
            >
              Towers
            </button>
            <button
              onClick={() => setActiveTab('ahead')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === 'ahead'
                  ? 'text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-400'
              )}
            >
              Ahead
            </button>
          </div>

          {/* Center - Search bar */}
          <div className="flex-1 flex justify-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
              <Input
                placeholder="Search Traders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-96 h-8 bg-zinc-900/50 border-zinc-700 text-sm text-zinc-300 rounded-md"
              />
            </div>
          </div>

          {/* Right side - Time range filters */}
          <div className="flex items-center gap-1">
            {(['1d', '3d', '7d', '14d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  'px-2 py-1 text-xs font-medium transition-colors rounded',
                  timeRange === range
                    ? 'text-blue-400 bg-blue-400/10'
                    : 'text-zinc-100 hover:text-zinc-300'
                )}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Trader Cards Section */}
      <div className="p-6 border-b border-zinc-800/80">
        <div className="flex flex-col items-center gap-4">
            {/* Top large card */}
            {topTraders[0] && (
              <div className="w-fit min-w-[500px] bg-zinc-900/50 border border-zinc-800/80 rounded-lg p-4">
              <div className="flex items-start justify-between mb-6">
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handlePlayerClick(topTraders[0])}
                >
                  <div className="w-10 h-10 rounded-md bg-zinc-800 overflow-hidden flex items-center justify-center">
                    <img src={PROFILE_AVATAR} alt={topTraders[0].name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-base font-semibold text-zinc-100">{topTraders[0].name}</div>
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-medium rounded border border-amber-500/30">#1</span>
                    </div>
                    <div className="text-xs text-zinc-400">{topTraders[0].winRate.toFixed(2)}% Win Rate</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-semibold">
                    <span className={topTraders[0].pnl.sol >= 0 ? 'text-trading-positive' : 'text-trading-negative'}>
                      {topTraders[0].pnl.sol >= 0 ? '+' : ''}
                      {topTraders[0].pnl.sol.toFixed(1)}
                    </span>
                    <span className="text-zinc-400 text-sm ml-2">SOL</span>
                    <span className={cn(
                      'text-sm ml-2',
                      topTraders[0].pnl.usd >= 0 ? 'text-trading-positive' : 'text-trading-negative'
                    )}>
                      ({topTraders[0].pnl.usd >= 0 ? '+' : ''}
                      {formatCurrency(Math.abs(topTraders[0].pnl.usd))})
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 text-xs" style={{ gridTemplateColumns: '1fr 1fr auto' }}>
                <div>
                  <div className="text-zinc-400 mb-1">Positions</div>
                  <div className="text-zinc-100 font-medium">{formatNumber(topTraders[0].positions.total)}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full flex">
                        <div
                          className="bg-trading-positive"
                          style={{ width: `${(topTraders[0].positions.won / topTraders[0].positions.total) * 100}%` }}
                        />
                        <div
                          className="bg-trading-negative"
                          style={{ width: `${(topTraders[0].positions.lost / topTraders[0].positions.total) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      <span className="text-trading-positive">{formatNumber(topTraders[0].positions.won)}</span>
                      {' / '}
                      <span className="text-trading-negative">{formatNumber(topTraders[0].positions.lost)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-zinc-400 mb-1">Trades</div>
                  <div className="text-zinc-100 font-medium">{formatNumber(topTraders[0].trades.total)}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full flex">
                        <div
                          className="bg-trading-positive"
                          style={{ width: `${(topTraders[0].trades.won / topTraders[0].trades.total) * 100}%` }}
                        />
                        <div
                          className="bg-trading-negative"
                          style={{ width: `${(topTraders[0].trades.lost / topTraders[0].trades.total) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      <span className="text-trading-positive">{formatNumber(topTraders[0].trades.won)}</span>
                      {' / '}
                      <span className="text-trading-negative">{formatNumber(topTraders[0].trades.lost)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-zinc-400 mb-1">Volume</div>
                  <div className="text-zinc-100 font-medium">
                    {formatNumber(topTraders[0].volume.count)} {formatCurrency(topTraders[0].volume.usd)}
                  </div>
                  <div className="text-zinc-400 text-[10px] mt-1">Avg Multiplier: {topTraders[0].avgMultiplier}</div>
                </div>
              </div>
            </div>
            )}

            {/* Bottom two smaller cards - nested grid to keep them side by side */}
            <div className="flex items-center gap-4 justify-center">
              {topTraders[1] && (
                <div className="w-fit min-w-[500px] bg-zinc-900/50 border border-zinc-800/80 rounded-lg p-4">
              <div className="flex items-start justify-between mb-6">
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handlePlayerClick(topTraders[1])}
                >
                  <div className="w-10 h-10 rounded-md bg-zinc-800 overflow-hidden flex items-center justify-center">
                    <img src={PROFILE_AVATAR} alt={topTraders[1].name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-base font-semibold text-zinc-100">{topTraders[1].name}</div>
                      <span className="px-2 py-0.5 bg-gray-400/20 text-gray-300 text-xs font-medium rounded border border-gray-400/30">#2</span>
                    </div>
                    <div className="text-xs text-zinc-400">{topTraders[1].winRate.toFixed(2)}% Win Rate</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-semibold">
                    <span className={topTraders[1].pnl.sol >= 0 ? 'text-trading-positive' : 'text-trading-negative'}>
                      {topTraders[1].pnl.sol >= 0 ? '+' : ''}
                      {topTraders[1].pnl.sol.toFixed(1)}
                    </span>
                    <span className="text-zinc-400 text-sm ml-2">SOL</span>
                    <span className={cn(
                      'text-sm ml-2',
                      topTraders[1].pnl.usd >= 0 ? 'text-trading-positive' : 'text-trading-negative'
                    )}>
                      ({topTraders[1].pnl.usd >= 0 ? '+' : ''}
                      {formatCurrency(Math.abs(topTraders[1].pnl.usd))})
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 text-xs" style={{ gridTemplateColumns: '1fr 1fr auto' }}>
                <div>
                  <div className="text-zinc-400 mb-1">Positions</div>
                  <div className="text-zinc-100 font-medium">{formatNumber(topTraders[1].positions.total)}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full flex">
                        <div
                          className="bg-trading-positive"
                          style={{ width: `${(topTraders[1].positions.won / topTraders[1].positions.total) * 100}%` }}
                        />
                        <div
                          className="bg-trading-negative"
                          style={{ width: `${(topTraders[1].positions.lost / topTraders[1].positions.total) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      <span className="text-trading-positive">{formatNumber(topTraders[1].positions.won)}</span>
                      {' / '}
                      <span className="text-trading-negative">{formatNumber(topTraders[1].positions.lost)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-zinc-400 mb-1">Trades</div>
                  <div className="text-zinc-100 font-medium">{formatNumber(topTraders[1].trades.total)}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full flex">
                        <div
                          className="bg-trading-positive"
                          style={{ width: `${(topTraders[1].trades.won / topTraders[1].trades.total) * 100}%` }}
                        />
                        <div
                          className="bg-trading-negative"
                          style={{ width: `${(topTraders[1].trades.lost / topTraders[1].trades.total) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      <span className="text-trading-positive">{formatNumber(topTraders[1].trades.won)}</span>
                      {' / '}
                      <span className="text-trading-negative">{formatNumber(topTraders[1].trades.lost)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-zinc-400 mb-1">Volume</div>
                  <div className="text-zinc-100 font-medium">
                    {formatNumber(topTraders[1].volume.count)} {formatCurrency(topTraders[1].volume.usd)}
                  </div>
                  <div className="text-zinc-400 text-[10px] mt-1">Avg Multiplier: {topTraders[1].avgMultiplier}</div>
                </div>
              </div>
            </div>
            )}

            {topTraders[2] && (
              <div className="w-fit min-w-[500px] bg-zinc-900/50 border border-zinc-800/80 rounded-lg p-4">
              <div className="flex items-start justify-between mb-6">
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handlePlayerClick(topTraders[2])}
                >
                  <div className="w-10 h-10 rounded-md bg-zinc-800 overflow-hidden flex items-center justify-center">
                    <img src={PROFILE_AVATAR} alt={topTraders[2].name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-base font-semibold text-zinc-100">{topTraders[2].name}</div>
                      <span className="px-2 py-0.5 bg-orange-600/20 text-orange-400 text-xs font-medium rounded border border-orange-600/30">#3</span>
                    </div>
                    <div className="text-xs text-zinc-400">{topTraders[2].winRate.toFixed(2)}% Win Rate</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-semibold">
                    <span className={topTraders[2].pnl.sol >= 0 ? 'text-trading-positive' : 'text-trading-negative'}>
                      {topTraders[2].pnl.sol >= 0 ? '+' : ''}
                      {topTraders[2].pnl.sol.toFixed(1)}
                    </span>
                    <span className="text-zinc-400 text-sm ml-2">SOL</span>
                    <span className={cn(
                      'text-sm ml-2',
                      topTraders[2].pnl.usd >= 0 ? 'text-trading-positive' : 'text-trading-negative'
                    )}>
                      ({topTraders[2].pnl.usd >= 0 ? '+' : ''}
                      {formatCurrency(Math.abs(topTraders[2].pnl.usd))})
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 text-xs" style={{ gridTemplateColumns: '1fr 1fr auto' }}>
                <div>
                  <div className="text-zinc-400 mb-1">Positions</div>
                  <div className="text-zinc-100 font-medium">{formatNumber(topTraders[2].positions.total)}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full flex">
                        <div
                          className="bg-trading-positive"
                          style={{ width: `${(topTraders[2].positions.won / topTraders[2].positions.total) * 100}%` }}
                        />
                        <div
                          className="bg-trading-negative"
                          style={{ width: `${(topTraders[2].positions.lost / topTraders[2].positions.total) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      <span className="text-trading-positive">{formatNumber(topTraders[2].positions.won)}</span>
                      {' / '}
                      <span className="text-trading-negative">{formatNumber(topTraders[2].positions.lost)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-zinc-400 mb-1">Trades</div>
                  <div className="text-zinc-100 font-medium">{formatNumber(topTraders[2].trades.total)}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full flex">
                        <div
                          className="bg-trading-positive"
                          style={{ width: `${(topTraders[2].trades.won / topTraders[2].trades.total) * 100}%` }}
                        />
                        <div
                          className="bg-trading-negative"
                          style={{ width: `${(topTraders[2].trades.lost / topTraders[2].trades.total) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      <span className="text-trading-positive">{formatNumber(topTraders[2].trades.won)}</span>
                      {' / '}
                      <span className="text-trading-negative">{formatNumber(topTraders[2].trades.lost)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-zinc-400 mb-1">Volume</div>
                  <div className="text-zinc-100 font-medium">
                    {formatNumber(topTraders[2].volume.count)} {formatCurrency(topTraders[2].volume.usd)}
                  </div>
                  <div className="text-zinc-400 text-[10px] mt-1">Avg Multiplier: {topTraders[2].avgMultiplier}</div>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="p-6">
        <div className="flex flex-col bg-zinc-900/50 border border-zinc-800/80 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800/80">
            <h3 className="text-sm font-medium text-zinc-300">Traders</h3>
            <div className="flex items-center gap-2">
              <Select value={currency} onValueChange={(value) => setCurrency(value as 'sol' | 'usd')}>
                <SelectTrigger className="h-8 w-20 border-zinc-700 bg-zinc-900/50 text-zinc-300 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sol">SOL</SelectItem>
                  <SelectItem value="usd">USD</SelectItem>
                </SelectContent>
              </Select>
              <button className="p-1.5 hover:bg-zinc-800 rounded transition-colors">
                <Grid3x3 className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          </div>
          <div>
            <table className="w-full text-sm">
            <thead className="bg-zinc-950">
              <tr className="border-b border-zinc-800">
                <th 
                  className="px-4 py-2 text-left text-xs font-normal text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors"
                  onClick={() => handleSort('rank')}
                >
                  <div className="flex items-center gap-1">
                    Rank
                    {sortBy === 'rank' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ChevronsUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-2 text-left text-xs font-normal text-zinc-400">Trader</th>
                <th 
                  className="px-4 py-2 text-left text-xs font-normal text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors"
                  onClick={() => handleSort('pnl')}
                >
                  <div className="flex items-center gap-1">
                    PNL
                    {sortBy === 'pnl' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ChevronsUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-2 text-left text-xs font-normal text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors"
                  onClick={() => handleSort('winRate')}
                >
                  <div className="flex items-center gap-1">
                    Win Rate
                    {sortBy === 'winRate' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ChevronsUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-2 text-left text-xs font-normal text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors"
                  onClick={() => handleSort('positions')}
                >
                  <div className="flex items-center gap-1">
                    Positions
                    {sortBy === 'positions' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ChevronsUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-2 text-left text-xs font-normal text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors"
                  onClick={() => handleSort('trades')}
                >
                  <div className="flex items-center gap-1">
                    Trades
                    {sortBy === 'trades' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ChevronsUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-2 text-left text-xs font-normal text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors"
                  onClick={() => handleSort('volume')}
                >
                  <div className="flex items-center gap-1">
                    Volume
                    {sortBy === 'volume' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ChevronsUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-2 text-left text-xs font-normal text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors"
                  onClick={() => handleSort('avgMultiplier')}
                >
                  <div className="flex items-center gap-1">
                    Avg Multiplier
                    {sortBy === 'avgMultiplier' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ChevronsUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="text-xs font-normal text-zinc-200">
              {tableTraders.map((trader, index) => (
                <tr
                  key={trader.id}
                  className={cn(
                    'border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors',
                    index % 2 === 0 && 'bg-zinc-950/30'
                  )}
                >
                  <td className="px-4 py-3 text-zinc-300">{index + 1}</td>
                  <td className="px-4 py-3">
                    <div 
                      className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handlePlayerClick(trader)}
                    >
                      <div className="w-8 h-8 rounded-md bg-zinc-800 overflow-hidden flex items-center justify-center">
                        <img src={PROFILE_AVATAR} alt={trader.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-zinc-100 font-medium">{trader.name}</span>
                    </div>
                  </td>
                  <td className={cn(
                    'px-4 py-3 font-medium',
                    trader.pnl.sol >= 0 ? 'text-trading-positive' : 'text-trading-negative'
                  )}>
                    {currency === 'sol' ? (
                      <>
                        {trader.pnl.sol >= 0 ? '+' : ''}
                        {trader.pnl.sol.toFixed(1)}
                      </>
                    ) : (
                      <>
                        {trader.pnl.usd >= 0 ? '+' : ''}
                        {formatCurrency(Math.abs(trader.pnl.usd))}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{trader.winRate.toFixed(2)}%</td>
                  <td className="px-4 py-3">
                    <div className="text-zinc-300 font-medium">{formatNumber(trader.positions.total)}</div>
                    <div className="text-xs text-zinc-400">
                      <span className="text-trading-positive">{formatNumber(trader.positions.won)}</span>
                      {' / '}
                      <span className="text-trading-negative">{formatNumber(trader.positions.lost)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-zinc-300 font-medium">{formatNumber(trader.trades.total)}</div>
                    <div className="text-xs text-zinc-400">
                      <span className="text-trading-positive">{formatNumber(trader.trades.won)}</span>
                      {' / '}
                      <span className="text-trading-negative">{formatNumber(trader.trades.lost)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{formatNumber(trader.volume.count)}</td>
                  <td className="px-4 py-3 text-zinc-300">{trader.avgMultiplier}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}
