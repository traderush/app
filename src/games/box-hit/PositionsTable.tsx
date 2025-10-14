'use client';
import React, { useState, useMemo } from 'react';
import { useUIStore, useUserStore } from '@/stores';

/** centralized trading colors */
const TRADING_COLORS = {
  positive: '#2fe3ac',  // Green for positive values (gains, up movements)
  negative: '#ec397a',  // Red for negative values (losses, down movements)
} as const;

interface PositionsTableProps {
  selectedCount: number;
  selectedMultipliers: number[];
  betAmount: number;
  currentBTCPrice: number;
  onPositionHit?: (positionId: string) => void;
  onPositionMiss?: (positionId: string) => void;
  hitBoxes?: string[]; // Array of contract IDs that were successfully hit
  missedBoxes?: string[]; // Array of contract IDs that were missed
  realPositions?: Map<string, any>; // Real backend positions (for mock backend mode)
  contracts?: any[]; // Backend contracts (for mock backend mode)
}

// Stable empty array to prevent infinite loops
const EMPTY_ARRAY: number[] = [];
const EMPTY_STRING_ARRAY: string[] = [];

const PositionsTable = React.memo(function PositionsTable({ 
  selectedCount, 
  selectedMultipliers, 
  betAmount, 
  currentBTCPrice, 
  onPositionHit, 
  onPositionMiss, 
  hitBoxes = EMPTY_STRING_ARRAY, 
  missedBoxes = EMPTY_STRING_ARRAY, 
  realPositions, 
  contracts = EMPTY_ARRAY as any[] 
}: PositionsTableProps) {
  const [activeTab, setActiveTab] = useState<'positions' | 'history'>('positions');
  const signatureColor = useUIStore((state) => state.signatureColor);
  
  // Get userStore data for accurate positions tracking
  const activeTrades = useUserStore((state) => state.activeTrades);
  const tradeHistory = useUserStore((state) => state.tradeHistory);
  const balance = useUserStore((state) => state.balance);
  
  // Convert userStore data to positions format for display
  const activePositions = useMemo(() => {
    return activeTrades.map(trade => ({
      id: trade.id,
      time: trade.placedAt.toLocaleTimeString(),
      size: trade.amount,
      equity: `$${trade.amount.toFixed(2)}`, // Will be updated when settled
      hit: 'Pending',
      prog: '0%',
      entry: currentBTCPrice.toFixed(2),
      betAmount: trade.amount,
      selectedMultipliers: [1.0], // Default multiplier
      multiplier: 1.0,
      contractId: trade.contractId
    }));
  }, [activeTrades, currentBTCPrice]);

  // Convert trade history to history positions (last 10)
  const historyPositions = useMemo(() => {
    return tradeHistory
      .filter(trade => trade.result && trade.settledAt)
      .slice(-10) // Last 10 trades
      .map(trade => ({
        id: trade.id,
        time: trade.settledAt!.toLocaleTimeString(),
        size: trade.amount,
        equity: trade.result === 'win' ? `$${(trade.payout || 0).toFixed(2)}` : `$0.00`,
        hit: trade.result === 'win' ? 'Won' : 'Lost',
        prog: '100%',
        entry: currentBTCPrice.toFixed(2),
        result: trade.result === 'win' ? 'Won' as const : 'Lost' as const,
        betAmount: trade.amount,
        selectedMultipliers: [1.0],
        multiplier: trade.result === 'win' ? (trade.payout || 0) / trade.amount : 0,
        contractId: trade.contractId
      }));
  }, [tradeHistory, currentBTCPrice]);

  return (
    <div>
      {/* Menu Tabs */}
      <div className="flex items-center">
        <button
          onClick={() => setActiveTab('positions')}
          className={`px-4 py-2 text-sm font-medium rounded-l-lg border-b-2 transition-colors ${
            activeTab === 'positions'
              ? 'text-white border-blue-500 bg-blue-500/10'
              : 'text-zinc-400 border-transparent hover:text-white hover:border-zinc-600'
          }`}
        >
          Positions ({activePositions.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium rounded-r-lg border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'text-white border-blue-500 bg-blue-500/10'
              : 'text-zinc-400 border-transparent hover:text-white hover:border-zinc-600'
          }`}
        >
          History ({historyPositions.length})
        </button>
      </div>

      {/* Positions Table */}
      <div className="mt-4 bg-zinc-900/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-zinc-800/50">
              <tr>
                <th className="px-3 py-2 text-left text-zinc-400 font-medium">Time</th>
                <th className="px-3 py-2 text-left text-zinc-400 font-medium">Size</th>
                <th className="px-3 py-2 text-left text-zinc-400 font-medium">Equity</th>
                <th className="px-3 py-2 text-left text-zinc-400 font-medium">Hit</th>
                <th className="px-3 py-2 text-left text-zinc-400 font-medium">Prog</th>
                <th className="px-3 py-2 text-left text-zinc-400 font-medium">Entry</th>
              </tr>
            </thead>
            <tbody>
              {activeTab === 'positions' ? (
                activePositions.length > 0 ? (
                  activePositions.map((position) => (
                    <tr key={position.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/20">
                      <td className="px-3 py-2 text-zinc-300">{position.time}</td>
                      <td className="px-3 py-2 text-zinc-300">${position.size.toFixed(2)}</td>
                      <td className="px-3 py-2 text-zinc-300">{position.equity}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400">
                          {position.hit}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-zinc-300">{position.prog}</td>
                      <td className="px-3 py-2 text-zinc-300">{position.entry}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                      No active positions
                    </td>
                  </tr>
                )
              ) : (
                historyPositions.length > 0 ? (
                  historyPositions.map((position) => (
                    <tr key={position.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/20">
                      <td className="px-3 py-2 text-zinc-300">{position.time}</td>
                      <td className="px-3 py-2 text-zinc-300">${position.size.toFixed(2)}</td>
                      <td className="px-3 py-2 text-zinc-300">{position.equity}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          position.result === 'Won' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {position.hit}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-zinc-300">{position.prog}</td>
                      <td className="px-3 py-2 text-zinc-300">{position.entry}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                      No trade history
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-zinc-900/50 rounded-lg p-3">
          <div className="text-xs text-zinc-400 mb-1">Active Positions</div>
          <div className="text-lg font-semibold text-white">{activePositions.length}</div>
        </div>
        <div className="bg-zinc-900/50 rounded-lg p-3">
          <div className="text-xs text-zinc-400 mb-1">Total Balance</div>
          <div className="text-lg font-semibold text-white">${balance.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
});

export default PositionsTable;