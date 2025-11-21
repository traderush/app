'use client';

import React, { useState, useMemo } from 'react';
import { Search, Upload, ChevronsUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Input } from '@/shared/ui/ui/input';
import { cn } from '@/shared/lib/utils';
import RealizedPnlChart from './components/RealizedPnlChart';

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

// Mock data for positions history
const mockHistory = [
  {
    id: 1,
    gameName: 'Box Hit',
    time: '10:30:45 AM',
    bought: { usd: 100 },
    sold: { usd: 250 },
    pnl: { usd: 150 },
  },
  {
    id: 2,
    gameName: 'Sketch',
    time: '11:15:22 AM',
    bought: { usd: 200 },
    sold: { usd: 180 },
    pnl: { usd: -20 },
  },
  {
    id: 3,
    gameName: 'Towers',
    time: '12:00:10 PM',
    bought: { usd: 150 },
    sold: { usd: 450 },
    pnl: { usd: 300 },
  },
];

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'box-hit' | 'sketch' | 'towers' | 'ahead'>('all');
  const [timeRange, setTimeRange] = useState<'1d' | '3d' | '7d' | '14d' | '30d'>('14d');
  const [searchQuery, setSearchQuery] = useState('');
  const [positionTab, setPositionTab] = useState<'history' | 'top-100'>('history');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const sortedHistory = useMemo(() => {
    let sorted = [...mockHistory];
    
    if (sortBy) {
      sorted.sort((a, b) => {
        let aVal: number | string;
        let bVal: number | string;
        
        switch (sortBy) {
          case 'gameName':
            aVal = a.gameName;
            bVal = b.gameName;
            break;
          case 'time':
            // Simple time comparison (you might want to parse dates properly)
            aVal = a.time;
            bVal = b.time;
            break;
          case 'tradeSize':
            aVal = a.bought.usd;
            bVal = b.bought.usd;
            break;
          case 'multiplier':
            aVal = a.sold.usd / a.bought.usd;
            bVal = b.sold.usd / b.bought.usd;
            break;
          case 'entryPrice':
            aVal = a.bought.usd;
            bVal = b.bought.usd;
            break;
          case 'result':
            aVal = a.pnl.usd;
            bVal = b.pnl.usd;
            break;
          default:
            return 0;
        }
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        return 0;
      });
    }
    
    return sorted;
  }, [sortBy, sortOrder]);

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
                placeholder="Search..."
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
                  'px-2 py-0.5 text-xs font-medium transition-colors rounded',
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

      {/* Top Three Panels */}
      <div className="flex gap-4 p-6 border-b border-zinc-800/80">
        {/* Balance Panel */}
        <div className="w-1/4 bg-zinc-900/50 border border-zinc-800/80 rounded-lg p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">Balance</h3>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-zinc-400 mb-1">PNL</div>
              <div className="text-lg font-semibold text-trading-negative">-$1,389.67</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 mb-1">Rank #</div>
              <div className="text-lg font-semibold text-zinc-100">#1,247</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 mb-1">Available Balance</div>
              <div className="text-lg font-semibold text-zinc-100">$12,450.33</div>
            </div>
          </div>
        </div>

        {/* Realized PNL Chart Panel */}
        <div className="w-1/2 bg-zinc-900/50 border border-zinc-800/80 rounded-lg p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">Realized PNL</h3>
          <div className="h-64">
            <RealizedPnlChart />
          </div>
        </div>

        {/* Performance Panel */}
        <div className="w-1/4 bg-zinc-900/50 border border-zinc-800/80 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">Performance</h3>
            <Upload className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-zinc-400 mb-1">Account Creation</div>
              <div className="text-sm font-semibold text-zinc-100">Jan 15, 2024</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 mb-1">PNL</div>
              <div className="text-lg font-semibold text-trading-negative">-$737.31</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 mb-1">Total Trades</div>
              <div className="text-sm font-semibold text-zinc-100">
                108 <span className="text-trading-positive">58</span> / <span className="text-trading-negative">50</span> (<span className="text-trading-positive">53.7%</span>)
              </div>
            </div>
          </div>
          
          {/* PNL Breakdown inside Performance Panel */}
          <div className="mt-4 pt-4 border-t border-zinc-800/50">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-trading-positive" />
                  <span className="text-zinc-400">{'>'}5x: 0</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-trading-positive" />
                  <span className="text-zinc-400">2x ~ 5x: 0</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-trading-positive" />
                  <span className="text-zinc-400">1x ~ 2x: 13</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-trading-negative" />
                  <span className="text-zinc-400">0x: 36</span>
                </div>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full flex">
                  <div className="bg-trading-positive" style={{ width: '26.5%' }} />
                  <div className="bg-trading-negative" style={{ width: '73.5%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Positions/History Section */}
      <div className="flex-1 overflow-auto p-6">
        <div className="flex flex-col bg-zinc-900/50 border border-zinc-800/80 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between py-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-1 pl-4">
              <button
                onClick={() => setPositionTab('history')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium transition-colors',
                  positionTab === 'history'
                    ? 'text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-400'
                )}
              >
                History
              </button>
              <button
                onClick={() => setPositionTab('top-100')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium transition-colors',
                  positionTab === 'top-100'
                    ? 'text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-400'
                )}
              >
                Top 100
              </button>
            </div>
          </div>
          <div>
          <table className="w-full text-sm">
            <thead className="bg-zinc-950">
              <tr className="border-b border-zinc-800">
                <th 
                  className="px-4 py-2 text-left text-xs font-normal text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors"
                  onClick={() => handleSort('gameName')}
                >
                  <div className="flex items-center gap-1">
                    Game Name
                    {sortBy === 'gameName' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ChevronsUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-2 text-left text-xs font-normal text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors"
                  onClick={() => handleSort('time')}
                >
                  <div className="flex items-center gap-1">
                    Time
                    {sortBy === 'time' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ChevronsUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-2 text-left text-xs font-normal text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors"
                  onClick={() => handleSort('tradeSize')}
                >
                  <div className="flex items-center gap-1">
                    Trade Size
                    {sortBy === 'tradeSize' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ChevronsUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-2 text-left text-xs font-normal text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors"
                  onClick={() => handleSort('multiplier')}
                >
                  <div className="flex items-center gap-1">
                    Multiplier
                    {sortBy === 'multiplier' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ChevronsUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-2 text-left text-xs font-normal text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors"
                  onClick={() => handleSort('entryPrice')}
                >
                  <div className="flex items-center gap-1">
                    Entry Price
                    {sortBy === 'entryPrice' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ChevronsUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-2 text-left text-xs font-normal text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors"
                  onClick={() => handleSort('result')}
                >
                  <div className="flex items-center gap-1">
                    Result
                    {sortBy === 'result' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ChevronsUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="text-xs font-normal text-zinc-200">
              {positionTab === 'history' ? (
                sortedHistory.length > 0 ? (
                  sortedHistory.map((item, index) => (
                    <tr
                      key={item.id}
                      className={cn(
                        'border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors',
                        index % 2 === 0 && 'bg-zinc-950/30'
                      )}
                    >
                      <td className="px-4 py-3 text-zinc-100">{item.gameName}</td>
                      <td className="px-4 py-3">{item.time}</td>
                      <td className="px-4 py-3">${item.bought.usd.toFixed(2)}</td>
                      <td className="px-4 py-3 font-semibold text-zinc-100">
                        {(item.sold.usd / item.bought.usd).toFixed(1)}x
                      </td>
                      <td className="px-4 py-3">${item.bought.usd.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'rounded px-2 py-1 text-xs font-normal',
                            item.pnl.usd >= 0
                              ? 'bg-trading-positive/20 text-trading-positive'
                              : 'bg-trading-negative/20 text-trading-negative'
                          )}
                        >
                          {item.pnl.usd >= 0 ? 'Won' : 'Lost'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                      No history available
                    </td>
                  </tr>
                )
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                    Top 100 coming soon
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}
