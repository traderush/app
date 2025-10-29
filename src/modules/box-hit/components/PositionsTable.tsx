'use client';

import React, { useMemo, useState } from 'react';
import { useUIStore, useUserStore } from '@/shared/state';

interface PositionsTableProps {
  currentBTCPrice: number;
}

const getProbabilityClass = (value: string) => {
  const numericValue = Number.parseFloat(value);
  if (Number.isNaN(numericValue)) {
    return 'text-trading-negative';
  }
  return numericValue >= 50 ? 'text-trading-positive' : 'text-trading-negative';
};

const getEquityClass = (equity: string) =>
  equity === '$0.00' ? 'text-trading-negative' : 'text-trading-positive';

const getProgressWidth = (progress: string) => {
  const numericValue = Number.parseFloat(progress);
  if (Number.isNaN(numericValue)) {
    return '0%';
  }
  return `${Math.min(Math.max(numericValue, 0), 100)}%`;
};

const PositionsTable = React.memo(function PositionsTable({ currentBTCPrice }: PositionsTableProps) {
  const [activeTab, setActiveTab] = useState<'positions' | 'history'>('positions');
  const signatureColor = useUIStore((state) => state.signatureColor);
  const activeTrades = useUserStore((state) => state.activeTrades);
  const tradeHistory = useUserStore((state) => state.tradeHistory);

  const activePositions = useMemo(() => {
    return activeTrades.map((trade) => ({
      id: trade.id,
      time: trade.placedAt.toLocaleTimeString(),
      size: trade.amount,
      equity: `$${trade.amount.toFixed(2)}`,
      hit: 'Pending',
      prog: '0%',
      entry: currentBTCPrice.toFixed(2),
      tradeAmount: trade.amount,
      selectedMultipliers: [1.0],
      multiplier: 1.0,
      contractId: trade.contractId,
    }));
  }, [activeTrades, currentBTCPrice]);

  const historyPositions = useMemo(() => {
    return tradeHistory
      .filter((trade) => trade.result && trade.settledAt)
      .slice(-10)
      .map((trade) => ({
        id: trade.id,
        time: new Date(trade.settledAt!).toLocaleTimeString(),
        size: trade.amount,
        equity: trade.result === 'win' ? `$${(trade.payout || 0).toFixed(2)}` : '$0.00',
        hit: trade.result === 'win' ? 'Won' : 'Lost',
        prog: '100%',
        entry: currentBTCPrice.toFixed(2),
        result: trade.result === 'win' ? ('Won' as const) : ('Lost' as const),
        tradeAmount: trade.amount,
        selectedMultipliers: [1.0],
        multiplier: trade.result === 'win' ? (trade.payout || 0) / trade.amount : 0,
        contractId: trade.contractId,
      }));
  }, [tradeHistory, currentBTCPrice]);

  return (
    <div className="border-t border-zinc-800/80">
      <div className="flex items-center">
        <button
          onClick={() => setActiveTab('positions')}
          className={`relative px-3 py-2 text-[14px] font-medium transition-colors ${
            activeTab === 'positions' ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-300'
          }`}
        >
          Positions ({activePositions.length})
          {activeTab === 'positions' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-100" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`relative px-3 py-2 text-[14px] font-medium transition-colors ${
            activeTab === 'history' ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-300'
          }`}
        >
          Position History ({historyPositions.length})
          {activeTab === 'history' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-100" />
          )}
        </button>
      </div>

      <div className="mx-0 border-b border-surface-950" />

      {activeTab === 'positions' && (
        <div className="h-64 overflow-x-auto pb-3">
          <div className="h-full overflow-x-auto overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-background text-zinc-400 shadow-[0_1px_0_0_rgba(39,39,42,1),0_-1px_0_0_rgba(39,39,42,1)]">
                <tr className="[&>th]:border-t [&>th]:border-b [&>th]:border-zinc-800 [&>th]:px-3 [&>th]:py-1 text-left">
                  <th className="text-[12px] font-normal">Time</th>
                  <th className="text-[12px] font-normal">Trade Size</th>
                  <th className="text-[12px] font-normal">Multiplier</th>
                  <th className="text-[12px] font-normal">Equity</th>
                  <th className="text-[12px] font-normal">Probability of Hit</th>
                  <th className="text-[12px] font-normal">Trade Progression</th>
                  <th className="text-[12px] font-normal">Entry Price</th>
                </tr>
              </thead>
              <tbody className="text-[12px] font-normal text-zinc-200">
                {activePositions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-500">
                      No active positions yet.
                    </td>
                  </tr>
                ) : (
                  activePositions.map((position, index) => (
                    <tr
                      key={position.id}
                      className={`border-t border-zinc-800/70 [&>td]:px-3 [&>td]:py-2 ${
                        (index + 1) % 2 === 0 ? 'bg-neutral-900' : ''
                      }`}
                    >
                      <td>{position.time}</td>
                      <td>${position.size.toFixed(2)}</td>
                      <td className="font-medium" style={{ color: signatureColor }}>
                        {position.multiplier.toFixed(1)}x
                      </td>
                      <td className="text-trading-positive">{position.equity}</td>
                      <td className={getProbabilityClass(position.hit)}>{position.hit}</td>
                      <td>
                        <div className="relative h-4 w-24">
                          <div
                            className="h-4 bg-gradient-to-r from-brand/0 to-brand"
                            style={{ width: getProgressWidth(position.prog) }}
                          />
                          <span className="absolute left-1 top-1/2 -translate-y-1/2 transform text-[12px] font-normal text-white">
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
        <div className="h-64 overflow-x-auto pb-3">
          <div className="h-full overflow-x-auto overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-background text-zinc-400 shadow-[0_1px_0_0_rgba(39,39,42,1),0_-1px_0_0_rgba(39,39,42,1)]">
                <tr className="[&>th]:border-t [&>th]:border-b [&>th]:border-zinc-800 [&>th]:px-3 [&>th]:py-1 text-left">
                  <th className="text-[12px] font-normal">Time</th>
                  <th className="text-[12px] font-normal">Trade Size</th>
                  <th className="text-[12px] font-normal">Multiplier</th>
                  <th className="text-[12px] font-normal">Equity</th>
                  <th className="text-[12px] font-normal">Probability of Hit</th>
                  <th className="text-[12px] font-normal">Trade Progression</th>
                  <th className="text-[12px] font-normal">Entry Price</th>
                  <th className="text-[12px] font-normal">Result</th>
                </tr>
              </thead>
              <tbody className="text-[12px] font-normal text-zinc-200">
                {historyPositions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-zinc-500">
                      No completed trades yet.
                    </td>
                  </tr>
                ) : (
                  historyPositions.map((position, index) => (
                    <tr
                      key={position.id}
                      className={`border-t border-zinc-800/70 [&>td]:px-3 [&>td]:py-2 ${
                        (index + 1) % 2 === 0 ? 'bg-neutral-900' : ''
                      }`}
                    >
                      <td>{position.time}</td>
                      <td>${position.size.toFixed(2)}</td>
                      <td className="font-medium" style={{ color: signatureColor }}>
                        {position.multiplier.toFixed(1)}x
                      </td>
                      <td className={getEquityClass(position.equity)}>{position.equity}</td>
                      <td className={getProbabilityClass(position.hit)}>{position.hit}</td>
                      <td>
                        <div className="relative h-4 w-24">
                          <div
                            className="h-4 bg-gradient-to-r from-brand/0 to-brand"
                            style={{ width: getProgressWidth(position.prog) }}
                          />
                          <span className="absolute left-1 top-1/2 -translate-y-1/2 transform text-[12px] font-normal text-white">
                            {position.prog}
                          </span>
                        </div>
                      </td>
                      <td>{position.entry}</td>
                      <td>
                        <span
                          className={`rounded px-2 py-1 text-xs font-normal ${
                            position.result === 'Won'
                              ? 'bg-trading-positive/20 text-trading-positive'
                              : 'bg-trading-negative/20 text-trading-negative'
                          }`}
                        >
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
