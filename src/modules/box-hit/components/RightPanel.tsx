'use client';

import React, { memo, useEffect, useState } from 'react';
import { Edit3 } from 'lucide-react';

import { DEFAULT_TRADE_AMOUNT, QUICK_TRADE_AMOUNTS } from '@/modules/box-hit/constants';
import { useUIStore } from '@/shared/state';

interface RightPanelProps {
  isTradingMode: boolean;
  onTradingModeChange: (tradingMode: boolean) => void;
  selectedCount: number;
  selectedMultipliers: number[];
  currentBTCPrice: number;
  averagePositionPrice: number | null;
  tradeAmount: number;
  onTradeAmountChange: (amount: number) => void;
}

function RightPanel({
  isTradingMode,
  onTradingModeChange,
  selectedCount,
  selectedMultipliers,
  currentBTCPrice,
  averagePositionPrice,
  tradeAmount,
  onTradeAmountChange,
}: RightPanelProps) {
  const signatureColor = useUIStore((state) => state.signatureColor);

  useEffect(() => {
    if (tradeAmount === 0) {
      onTradeAmountChange(DEFAULT_TRADE_AMOUNT);
    }
  }, [tradeAmount, onTradeAmountChange]);

  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [showLiquidityToggle, setShowLiquidityToggle] = useState(false);
  const [showFeeToggle, setShowFeeToggle] = useState(false);
  const [feeAmount, setFeeAmount] = useState(0.01);
  const [liquidityAmount, setLiquidityAmount] = useState(0);

  const handleTradeAmountClick = (amount: number) => {
    onTradeAmountChange(amount);
    setShowWarning(false);
  };

  const handleCustomTradeAmount = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(event.target.value) || 0;
    onTradeAmountChange(value);
    setShowWarning(false);
  };

  const handleQuickAmountKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'ArrowLeft' && index > 0) {
      setActiveCell(index - 1);
    }
    if (event.key === 'ArrowRight' && index < QUICK_TRADE_AMOUNTS.length) {
      setActiveCell(index + 1);
    }
    if (event.key === 'Enter' && index < QUICK_TRADE_AMOUNTS.length) {
      handleTradeAmountClick(QUICK_TRADE_AMOUNTS[index]);
    }
  };


  return (
    <aside className="w-[400px] flex-shrink-0 bg-zinc-950/60 pr-0">
      <div className="space-y-0 p-4">

        <div className="pb-4 pt-2">

          <div className="-mx-4 flex items-center justify-center gap-2 bg-trading-negative/10 px-3 py-2">
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-trading-negative/20">
              <span className="text-xs font-bold text-trading-negative">i</span>
            </div>
            <span className="text-[12px] text-trading-negative">
              Your trades will be live after selecting each box
            </span>
          </div>
        </div>

        <div>
          <div className="mb-4">
            <div className="rounded-t-lg border border-zinc-800 bg-surface-900 px-3 py-1">
              <div className="text-xs text-zinc-400">Trade amount</div>
              <div className="flex items-center justify-between">
                <input
                  type="number"
                  value={tradeAmount}
                  onChange={handleCustomTradeAmount}
                  className="w-20 border-none bg-transparent text-lg font-medium text-zinc-100 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
                <div className="text-xs text-zinc-400">USDC</div>
              </div>
            </div>

            <div className="grid h-6 grid-cols-5 overflow-hidden rounded-b-lg border border-t-0 border-zinc-800 bg-zinc-900/60">
              {QUICK_TRADE_AMOUNTS.map((amount, index) => (
                <button
                  key={amount}
                  onClick={() => handleTradeAmountClick(amount)}
                  onKeyDown={(event) => handleQuickAmountKeyDown(event, index)}
                  onFocus={() => setActiveCell(index)}
                  onBlur={() => setActiveCell(null)}
                  className={[
                    'flex items-center justify-center text-xs font-medium transition-colors',
                    index === 0 ? 'rounded-bl-lg' : '',
                    index === QUICK_TRADE_AMOUNTS.length - 1 ? 'rounded-br-none' : '',
                    index < QUICK_TRADE_AMOUNTS.length - 1 ? 'border-r border-zinc-700' : '',
                    tradeAmount === amount
                      ? 'bg-zinc-700 text-white'
                      : 'bg-transparent text-zinc-200 hover:bg-zinc-700 hover:text-white',
                    activeCell === index ? 'ring-1 ring-zinc-500' : '',
                  ].join(' ')}
                  tabIndex={0}
                >
                  {amount}
                </button>
              ))}
              <button
                onKeyDown={(event) => handleQuickAmountKeyDown(event, QUICK_TRADE_AMOUNTS.length)}
                onFocus={() => setActiveCell(QUICK_TRADE_AMOUNTS.length)}
                onBlur={() => setActiveCell(null)}
                className={[
                  'flex items-center justify-center text-xs font-medium transition-colors',
                  'rounded-br-lg',
                  activeCell === QUICK_TRADE_AMOUNTS.length
                    ? 'bg-zinc-700 text-white'
                    : 'bg-transparent text-zinc-200 hover:bg-zinc-700 hover:text-white',
                  activeCell === QUICK_TRADE_AMOUNTS.length ? 'ring-1 ring-zinc-500' : '',
                ].join(' ')}
                tabIndex={0}
              >
                <Edit3 size={12} />
              </button>
            </div>
          </div>

          <div className="mb-4 flex">
            <div className="flex-1">
              <div className="text-xs text-white">Boxes Selected</div>
              <div className="font-medium">
                <span style={{ color: signatureColor, fontSize: '28px' }}>{selectedCount}</span>
                <span className="ml-1 text-xs text-zinc-400" style={{ fontWeight: 400 }}>
                  Active
                </span>
              </div>
            </div>

            <div className="mx-4 w-px bg-zinc-700" />

            <div className="flex-1">
              <div className="text-xs text-white">Potential Payout</div>
              <div className="font-medium">
                <span style={{ color: signatureColor, fontSize: '28px' }}>
                  {selectedCount > 0 && tradeAmount > 0 && selectedMultipliers.length > 0
                    ? Math.round(
                        tradeAmount *
                          selectedMultipliers.reduce((sum, multiplier) => sum + multiplier, 0),
                      )
                    : '0'}
                </span>
                <span className="ml-1 text-xs text-zinc-400" style={{ fontWeight: 400 }}>
                  USDC
                </span>
              </div>
            </div>
          </div>

          <div className="mb-4 space-y-2 rounded-lg border border-zinc-800/80 bg-surface-850 px-3 py-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Current Price</span>
              <span className="text-zinc-300">
                {currentBTCPrice
                  ? `$${currentBTCPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : '...'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Avg Position Price</span>
              <span className="text-zinc-300">
                {selectedCount > 0
                  ? averagePositionPrice && averagePositionPrice > 0
                    ? `$${averagePositionPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    : `$${currentBTCPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                  : '-'}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              if (!isTradingMode) {
                if (tradeAmount === 0) {
                  setShowWarning(true);
                  setTimeout(() => setShowWarning(false), 3000);
                } else {
                  onTradingModeChange(true);
                }
                return;
              }
              onTradingModeChange(false);
            }}
            className={[
              'h-10 w-full rounded-lg font-medium text-brand-foreground transition-colors hover:opacity-90',
              tradeAmount === 0 && !isTradingMode ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
              isTradingMode ? 'bg-danger' : '',
            ].join(' ')}
            style={
              isTradingMode
                ? undefined
                : {
                    backgroundColor: signatureColor,
                  }
            }
            disabled={tradeAmount === 0 && !isTradingMode}
          >
            {isTradingMode ? 'Exit Trading' : 'Start Trading'}
          </button>

          <div className="mt-1 flex items-center justify-between">
            <button
              onClick={() => setShowLiquidityToggle((value) => !value)}
              className="flex items-center gap-1 text-xs text-zinc-400 transition-colors hover:text-zinc-300"
            >
              <span>⊹</span>
              <span>General liquidity available</span>
            </button>
            <button
              onClick={() => setShowFeeToggle((value) => !value)}
              className="flex items-center gap-1 text-xs text-zinc-400 transition-colors hover:text-zinc-300"
            >
              <span>⛐</span>
              <span>{feeAmount.toFixed(2)} Fee applies</span>
            </button>
          </div>

          {(showLiquidityToggle || showFeeToggle) && (
            <div className="mt-2 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">⊹</span>
                <input
                  type="number"
                  value={liquidityAmount}
                  onChange={(event) =>
                    setLiquidityAmount(Number.parseFloat(event.target.value) || 0)
                  }
                  className="w-20 border-b border-zinc-700 bg-transparent px-2 py-1 text-xs text-white outline-none focus:border-zinc-500"
                  placeholder="0.00"
                  step="0.01"
                />
                <span className="text-xs text-zinc-400">USDC</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">⛐</span>
                <input
                  type="number"
                  value={feeAmount}
                  onChange={(event) => setFeeAmount(Number.parseFloat(event.target.value) || 0)}
                  className="w-20 border-b border-zinc-700 bg-transparent px-2 py-1 text-xs text-white outline-none focus:border-zinc-500"
                  placeholder="0.00"
                  step="0.01"
                />
                <span className="text-xs text-zinc-400">USDC</span>
              </div>
            </div>
          )}

          {showWarning && (
            <div
              className="mt-2 rounded border border-trading-negative/20 bg-trading-negative/10 px-3 py-2 text-center text-xs text-trading-negative"
            >
              Please enter a trade amount to start trading
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default memo(RightPanel);
