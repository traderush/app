'use client';

import React, { memo, useEffect, useState } from 'react';
import clsx from 'clsx';

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
    <aside className="border border-zinc-800 p-2 pt-3 rounded-md" style={{ backgroundColor: '#0D0D0D' }}>
      <div className='flex flex-col gap-3'>
        {/* Mode selector */}
        <div className="relative border-b border-zinc-800 px-2">
          <div className="flex items-center gap-6">
            <button
              type="button"
              className="relative pb-2 text-sm font-medium text-white transition-colors hover:text-zinc-200"
            >
              Test Mode
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
            </button>
            <button
              type="button"
              disabled
              className="pb-2 text-sm font-medium text-zinc-500 cursor-not-allowed"
            >
              Live Mode
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 bg-trading-negative/10 px-3 py-2">
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-trading-negative/20">
            <span className="text-xs font-bold text-trading-negative">i</span>
          </div>
          <span className="text-[12px] text-trading-negative">
            Your trades will be live after selecting each box
          </span>
        </div>

        <div>
          <div className="mb-4 flex flex-col gap-2">
            {/* Top bar with minus, value, and plus - in its own bubble */}
            <div className="flex items-center justify-between rounded-md bg-surface-900 px-3 py-3">
              <button
                type="button"
                onClick={() => {
                  let currentIndex = QUICK_TRADE_AMOUNTS.indexOf(tradeAmount as typeof QUICK_TRADE_AMOUNTS[number]);
                  // If not found, find the closest value
                  if (currentIndex === -1) {
                    currentIndex = QUICK_TRADE_AMOUNTS.findIndex((amount) => amount > tradeAmount) - 1;
                    if (currentIndex < 0) {
                      currentIndex = QUICK_TRADE_AMOUNTS.length - 1;
                    }
                  }
                  // Go to previous value, but don't go below minimum
                  if (currentIndex > 0) {
                    onTradeAmountChange(QUICK_TRADE_AMOUNTS[currentIndex - 1]);
                  }
                }}
                disabled={tradeAmount === QUICK_TRADE_AMOUNTS[0]}
                className={clsx(
                  "flex h-8 w-8 items-center justify-center rounded-md bg-transparent text-white transition-colors",
                  tradeAmount === QUICK_TRADE_AMOUNTS[0]
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-zinc-800"
                )}
              >
                <span className="text-lg font-medium">−</span>
              </button>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-white">{tradeAmount}</span>
                <span className="text-sm text-zinc-400">$</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  let currentIndex = QUICK_TRADE_AMOUNTS.indexOf(tradeAmount as typeof QUICK_TRADE_AMOUNTS[number]);
                  // If not found, find the closest value
                  if (currentIndex === -1) {
                    currentIndex = QUICK_TRADE_AMOUNTS.findIndex((amount) => amount > tradeAmount);
                    if (currentIndex < 0) {
                      currentIndex = 0;
                    }
                  }
                  // Go to next value, but don't go above maximum
                  if (currentIndex < QUICK_TRADE_AMOUNTS.length - 1) {
                    onTradeAmountChange(QUICK_TRADE_AMOUNTS[currentIndex + 1]);
                  }
                }}
                disabled={tradeAmount === QUICK_TRADE_AMOUNTS[QUICK_TRADE_AMOUNTS.length - 1]}
                className={clsx(
                  "flex h-8 w-8 items-center justify-center rounded-md bg-transparent text-white transition-colors",
                  tradeAmount === QUICK_TRADE_AMOUNTS[QUICK_TRADE_AMOUNTS.length - 1]
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-zinc-800"
                )}
              >
                <span className="text-lg font-medium">+</span>
              </button>
            </div>
            
            {/* Bottom row with quick amount buttons - each in its own bubble */}
            <div className="flex items-center gap-2">
              {QUICK_TRADE_AMOUNTS.map((amount, index) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => handleTradeAmountClick(amount)}
                  onKeyDown={(event) => handleQuickAmountKeyDown(event, index)}
                  onFocus={() => setActiveCell(index)}
                  onBlur={() => setActiveCell(null)}
                        className={[
                          'flex flex-1 h-7 items-center justify-center rounded-md px-3 text-xs font-medium transition-colors',
                          tradeAmount === amount
                            ? 'bg-[#171717] text-zinc-300'
                            : 'bg-[#171717] text-zinc-500 hover:text-zinc-300',
                          activeCell === index ? 'ring-1 ring-zinc-500' : '',
                        ].join(' ')}
                  tabIndex={0}
                >
                  ${amount}
                </button>
              ))}
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
              'h-10 w-full rounded-md font-medium text-brand-foreground transition-colors hover:opacity-90 mb-2',
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


          {showWarning && (
            <div
              className="mt-2 rounded-md border border-trading-negative/20 bg-trading-negative/10 px-3 py-2 text-center text-xs text-trading-negative"
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
