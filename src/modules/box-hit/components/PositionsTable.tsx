'use client';
import React, { useMemo, useState } from 'react';
import { useUIStore, useUserStore } from '@/shared/state';
import { COLORS } from '@/shared/constants/theme';


interface PositionsTableProps {
  currentBTCPrice: number;
}

// PositionsTable component for displaying trading positions

const PositionsTable = React.memo(function PositionsTable({ currentBTCPrice }: PositionsTableProps) {
  const [activeTab, setActiveTab] = useState<'positions' | 'history'>('positions');
  const signatureColor = useUIStore((state) => state.signatureColor);
  
  // Get tradingStore data for accurate positions tracking
  const activeTrades = useUserStore((state) => state.activeTrades);
  const tradeHistory = useUserStore((state) => state.tradeHistory);
  
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
        time: new Date(trade.settledAt!).toLocaleTimeString(),
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
    <div className="border-t  border-zinc-800/80">
      {/* Menu Tabs */}
      <div className="flex items-center">
        <button
          onClick={() => setActiveTab('positions')}
          className={`px-3 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'positions' 
              ? 'text-zinc-100' 
              : 'text-zinc-400 hover:text-zinc-300'
          }`}
          style={{ fontSize: '14px', fontWeight: '500' }}
        >
          Positions ({activePositions.length})
          {activeTab === 'positions' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-100"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-3 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'history' 
              ? 'text-zinc-100' 
              : 'text-zinc-400 hover:text-zinc-300'
          }`}
          style={{ fontSize: '14px', fontWeight: '500' }}
        >
          Position History ({historyPositions.length})
          {activeTab === 'history' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-100"></div>
          )}
        </button>
      </div>
      
      {/* Full-width border line under menu */}
      <div className="border-b mx-0" style={{ borderColor: '#0E0E0E' }}></div>

      {/* Content based on active tab */}
              {activeTab === 'positions' && (
          <div className="overflow-x-auto pb-3" style={{ height: '256px' }}>
            <div className="h-full overflow-y-auto overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-zinc-400 sticky top-0 z-10" style={{ 
                  backgroundColor: '#09090B',
                  boxShadow: '0 1px 0 0 rgb(39 39 42), 0 -1px 0 0 rgb(39 39 42)'
                }}>
                  <tr className="[&>th]:py-1 [&>th]:px-3 text-left [&>th]:border-t [&>th]:border-b [&>th]:border-zinc-800">
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Time</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Bet Size</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Multiplier</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Equity</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Probability of Hit</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Trade Progression</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Entry Price</th>
                  </tr>
                </thead>
            <tbody className="text-zinc-200" style={{ fontSize: '12px', fontWeight: '400' }}>
              {activePositions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-zinc-500">
                    No active positions. Select boxes to start trading.
                  </td>
                </tr>
              ) : (
                  activePositions.map((position, i) => (
                    <tr key={position.id} className="[&>td]:py-2 [&>td]:px-3 border-t border-zinc-800/70" style={{ backgroundColor: (i + 1) % 2 === 0 ? '#18181B' : 'transparent' }}>
                      <td>{position.time}</td>
                      <td>${position.size.toFixed(2)}</td>
                      <td className="font-medium" style={{ color: signatureColor }}>{position.multiplier.toFixed(1)}x</td>
                      <td style={{ color: position.equity.includes('-') ? COLORS.trading.negative : COLORS.trading.positive }}>{position.equity}</td>
                      <td style={{ color: parseFloat(position.hit) >= 50 ? COLORS.trading.positive : COLORS.trading.negative }}>{position.hit}</td>
                    <td>
                      <div className="h-4 w-24 relative">
                        <div 
                          className="h-4" 
                          style={{ 
                              width: position.prog,
                            background: `linear-gradient(to right, rgba(250, 86, 22, 0) 0%, rgba(250, 86, 22, 1) 100%)`
                          }} 
                        />
                        <span className="absolute left-1 top-1/2 transform -translate-y-1/2 text-xs text-white font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>
                            {position.prog}
                        </span>
                      </div>
                    </td>
                      <td>{position.entry}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
            </div>
          </div>
        )}

      {activeTab === 'history' && (
        <div className="overflow-x-auto pb-3" style={{ height: '256px' }}>
          <div className="h-full overflow-y-auto overflow-x-auto">
            <table className="w-full text-sm">
                              <thead className="text-zinc-400 sticky top-0 z-10" style={{ 
                  backgroundColor: '#09090B',
                  boxShadow: '0 1px 0 0 rgb(39 39 42), 0 -1px 0 0 rgb(39 39 42)'
                }}>
                  <tr className="[&>th]:py-1 [&>th]:px-3 text-left [&>th]:border-t [&>th]:border-b [&>th]:border-zinc-800">
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Time</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Bet Size</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Multiplier</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Equity</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Probability of Hit</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Trade Progression</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Entry Price</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Result</th>
                  </tr>
                </thead>
                        <tbody className="text-zinc-200" style={{ fontSize: '12px', fontWeight: '400' }}>
              {historyPositions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-zinc-500">
                    No completed trades yet.
                  </td>
                </tr>
              ) : (
                  historyPositions.map((position, i) => (
                    <tr key={position.id} className="[&>td]:py-2 [&>td]:px-3 border-t border-zinc-800/70" style={{ backgroundColor: (i + 1) % 2 === 0 ? '#18181B' : 'transparent' }}>
                      <td>{position.time}</td>
                      <td>${position.size.toFixed(2)}</td>
                      <td className="font-medium" style={{ color: signatureColor }}>{position.multiplier.toFixed(1)}x</td>
                      <td style={{ color: position.equity === '$0.00' ? COLORS.trading.negative : COLORS.trading.positive }}>{position.equity}</td>
                      <td style={{ color: parseFloat(position.hit) >= 50 ? COLORS.trading.positive : COLORS.trading.negative }}>{position.hit}</td>
                    <td>
                      <div className="h-4 w-24 relative">
                        <div 
                          className="h-4" 
                          style={{ 
                              width: position.prog,
                            background: `linear-gradient(to right, rgba(250, 86, 22, 0) 0%, rgba(250, 86, 22, 1) 100%)`
                        }} 
                        />
                        <span className="absolute left-1 top-1/2 transform -translate-y-1/2 text-xs text-white font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>
                            {position.prog}
                        </span>
                      </div>
                    </td>
                      <td>{position.entry}</td>
                    <td>
                      <span className="px-2 py-1 rounded text-xs font-normal" style={{ 
                        fontSize: '12px', 
                        fontWeight: '400',
                          backgroundColor: position.result === 'Won' ? `${COLORS.trading.positive}20` : `${COLORS.trading.negative}20`,
                          color: position.result === 'Won' ? COLORS.trading.positive : COLORS.trading.negative
                      }}>
                          {position.result}
                      </span>
                    </td>
                  </tr>
                  ))
              )}
            </tbody>
            </table>
            </div>
          </div>
        )}
    </div>
  );
});

export default PositionsTable;
