'use client';
import React, { useState, useEffect, memo } from 'react';
import { TrendingUp, TrendingDown, Edit3 } from 'lucide-react';
import { useAppStore } from '@/stores';
import { COLORS } from '@/styles/theme';

const ORANGE = '#FA5616';


/**
 * Props for the RightPanel component
 * 
 * @property isTradingMode - Whether trading mode is currently active
 * @property onTradingModeChange - Callback when trading mode changes
 * @property selectedCount - Number of boxes currently selected
 * @property bestMultiplier - Highest multiplier among selected boxes
 * @property selectedMultipliers - Array of all multipliers for selected boxes
 * @property currentBTCPrice - Current live BTC price
 * @property averagePositionPrice - Average BTC price of selected box positions
 * @property betAmount - Current bet amount in USDC
 * @property onBetAmountChange - Callback when bet amount changes
 * @property activeTab - Currently active tab ('copy' - Mock Backend mode)
 * @property onActiveTabChange - Callback when active tab changes
 */
interface RightPanelProps {
  isTradingMode: boolean;
  onTradingModeChange: (tradingMode: boolean) => void;
  selectedCount: number;
  bestMultiplier: number;
  selectedMultipliers: number[]; // Array of multipliers for selected boxes
  currentBTCPrice: number; // Current live BTC price
  averagePositionPrice: number | null; // Average BTC price of selected boxes
  betAmount: number; // Current bet amount
  onBetAmountChange: (amount: number) => void; // Callback when bet amount changes
  activeTab?: 'place' | 'copy';
  onActiveTabChange?: (tab: 'place' | 'copy') => void;
}

function RightPanel({ isTradingMode, onTradingModeChange, selectedCount, bestMultiplier, selectedMultipliers, currentBTCPrice, averagePositionPrice, betAmount, onBetAmountChange, activeTab: externalActiveTab, onActiveTabChange }: RightPanelProps) {

  const [internalActiveTab, setInternalActiveTab] = useState<'place' | 'copy'>('copy');
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  const setActiveTab = (tab: 'place' | 'copy') => {
    if (onActiveTabChange) {
      onActiveTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };
  
  const signatureColor = useAppStore((state) => state.signatureColor);
  
  // Ensure bet amount is never 0 by default
  useEffect(() => {
    if (betAmount === 0) {
      onBetAmountChange(200);
    }
  }, [betAmount, onBetAmountChange]);

  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [showLiquidityToggle, setShowLiquidityToggle] = useState(false);
  const [showFeeToggle, setShowFeeToggle] = useState(false);
  const [feeAmount, setFeeAmount] = useState(0.01);
  const [liquidityAmount, setLiquidityAmount] = useState(0);

  const quickBetAmounts = [10, 50, 100, 250];

  const handleBetAmountClick = (amount: number) => {
    onBetAmountChange(amount);
    setShowWarning(false);
  };

  const handleCustomBetAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    onBetAmountChange(value);
    setShowWarning(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowLeft' && index > 0) {
      setActiveCell(index - 1);
    } else if (e.key === 'ArrowRight' && index < quickBetAmounts.length) {
      setActiveCell(index + 1);
    } else if (e.key === 'Enter') {
      if (index < quickBetAmounts.length) {
        handleBetAmountClick(quickBetAmounts[index]);
      }
    }
  };

  return (
    <aside className="w-full rounded-lg border border-zinc-800 overflow-hidden flex-shrink-0" style={{ backgroundColor: '#0E0E0E' }}>
      <div className="p-4">

        {/* Second Section: Trading Controls */}
        <div className="pb-4">
          {/* Navigation Tabs */}
          <div className="flex border-b border-zinc-800 mb-3">
            <button
              onClick={() => setActiveTab('copy')}
              className={`pb-2 px-3 text-sm font-medium transition-colors ${
                activeTab === 'copy' 
                  ? 'text-white border-b-2 border-white' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Mock Backend
            </button>
            <button
              disabled
              className="pb-2 px-3 text-sm font-medium transition-colors text-zinc-600 cursor-not-allowed opacity-50"
              title="Test Mode coming soon"
            >
              Test Mode
            </button>
          </div>

          {/* Warning Box */}
          <div className="flex items-center justify-center gap-2 px-3 py-2 -mx-4" style={{ backgroundColor: `${COLORS.trading.negative}10` }}>
            <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: `${COLORS.trading.negative}20` }}>
              <span className="text-xs font-bold" style={{ color: COLORS.trading.negative }}>i</span>
            </div>
            <span style={{ fontSize: '12px', color: COLORS.trading.negative }}>Your trades will be live after selecting each box</span>
          </div>
        </div>

        {/* Betting Controls Section */}
        <div>
          {/* Bet Amount Component */}
          <div className="mb-4">
            {/* Active Value Display */}
            <div className="rounded-t-lg border border-zinc-800 bg-[#171717] px-3 py-1">
              {/* Label inside the box */}
              <div className="text-xs text-zinc-400">Bet amount</div>
              
              {/* Input and Currency */}
              <div className="flex items-center justify-between">
                <input
                  type="number"
                  value={betAmount}
                  onChange={handleCustomBetAmount}
                  className="text-lg text-zinc-100 font-medium bg-transparent border-none outline-none w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
                <div className="text-xs text-zinc-400">USDC</div>
              </div>
            </div>

            {/* Preset Amounts Grid */}
            <div className="grid grid-cols-5 h-6 rounded-b-lg overflow-hidden border border-t-0 border-zinc-800 bg-zinc-900/60">
              {quickBetAmounts.map((amount, index) => (
                <button
                  key={amount}
                  onClick={() => handleBetAmountClick(amount)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onFocus={() => setActiveCell(index)}
                  onBlur={() => setActiveCell(null)}
                  className={`
                    flex items-center justify-center text-xs font-medium transition-colors
                    ${index === 0 ? 'rounded-bl-lg' : ''}
                    ${index === quickBetAmounts.length - 1 ? 'rounded-br-none' : ''}
                    ${index < quickBetAmounts.length - 1 ? 'border-r border-zinc-700' : ''}
                    ${betAmount === amount 
                      ? 'bg-zinc-700 text-white' 
                      : 'bg-transparent text-zinc-200 hover:bg-zinc-700 hover:text-white'
                    }
                    ${activeCell === index ? 'ring-1 ring-zinc-500' : ''}
                  `}
                  tabIndex={0}
                >
                  {amount}
                </button>
          ))}
              <button
                onClick={() => {/* Custom input popover - placeholder for future feature */}}
                onKeyDown={(e) => handleKeyDown(e, quickBetAmounts.length)}
                onFocus={() => setActiveCell(quickBetAmounts.length)}
                onBlur={() => setActiveCell(null)}
                className={`
                  flex items-center justify-center text-xs font-medium transition-colors
                  rounded-br-lg
                  ${activeCell === quickBetAmounts.length 
                    ? 'bg-zinc-700 text-white' 
                    : 'bg-transparent text-zinc-200 hover:bg-zinc-700 hover:text-white'
                  }
                  ${activeCell === quickBetAmounts.length ? 'ring-1 ring-zinc-500' : ''}
                `}
                tabIndex={0}
              >
                <Edit3 size={12} />
              </button>
            </div>

          </div>

          {/* Summary Statistics */}
          <div className="flex mb-4">
            <div className="flex-1">
              <div className="text-xs text-white">Boxes Selected</div>
              <div className="font-medium">
                <span style={{ color: signatureColor, fontSize: '28px' }}>{selectedCount}</span>
                <span className="text-xs text-zinc-400 ml-1" style={{ fontWeight: 400 }}>Active</span>
              </div>
            </div>
            
            {/* Vertical Separator */}
            <div className="w-px bg-zinc-700 mx-4"></div>
            
            <div className="flex-1">
              <div className="text-xs text-white">Potential Payout</div>
              <div className="font-medium">
                <span style={{ color: signatureColor, fontSize: '28px' }}>
                  {selectedCount > 0 && betAmount > 0 && selectedMultipliers.length > 0
                    ? Math.round(betAmount * selectedMultipliers.reduce((sum, mult) => sum + mult, 0))
                    : '0'
                  }
                </span>
                <span className="text-xs text-zinc-400 ml-1" style={{ fontWeight: 400 }}>USDC</span>
              </div>
            </div>
          </div>
          


          {/* Action Button */}
          <button
            onClick={() => {
              if (!isTradingMode) {
                if (betAmount === 0) {
                  setShowWarning(true);
                  setTimeout(() => setShowWarning(false), 3000);
                } else {
                  onTradingModeChange(true);
                }
              } else {
                onTradingModeChange(false);
              }
            }}
            className={`w-full h-10 rounded-lg font-medium transition-colors hover:opacity-90 text-[#09090B] ${
              betAmount === 0 && !isTradingMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
            style={{ 
              backgroundColor: isTradingMode ? '#DD4141' : signatureColor 
            }}
            disabled={betAmount === 0 && !isTradingMode}
          >
            {isTradingMode ? 'Exit Trading' : 'Start Trading'}
          </button>
          
          {/* Fee and Liquidity Row */}
          <div className="mt-1 flex items-center justify-between">
            {/* Left side: General liquidity */}
            <button 
              onClick={() => setShowLiquidityToggle(!showLiquidityToggle)}
              className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors flex items-center gap-1"
            >
              <span>⊹</span>
              <span>General liquidity available</span>
            </button>
            
            {/* Right side: Fee */}
            <button 
              onClick={() => setShowFeeToggle(!showFeeToggle)}
              className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors flex items-center gap-1"
            >
              <span>⛐</span>
              <span>{feeAmount.toFixed(2)} Fee applies</span>
            </button>
          </div>
          
          {/* Toggle Section - Both open together */}
          {(showLiquidityToggle || showFeeToggle) && (
            <div className="mt-2 flex items-center gap-4">
              {/* Liquidity Input */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">⊹</span>
                <input
                  type="number"
                  value={liquidityAmount}
                  onChange={(e) => setLiquidityAmount(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 bg-transparent border-b border-zinc-700 text-xs text-white focus:outline-none focus:border-zinc-500"
                  placeholder="0.00"
                  step="0.01"
                />
                <span className="text-xs text-zinc-400">USDC</span>
              </div>
              
              {/* Fee Input */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">⛐</span>
                <input
                  type="number"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 bg-transparent border-b border-zinc-700 text-xs text-white focus:outline-none focus:border-zinc-500"
                  placeholder="0.00"
                  step="0.01"
                />
                <span className="text-xs text-zinc-400">USDC</span>
              </div>
            </div>
          )}
          
          {/* Warning Message */}
          {showWarning && (
            <div className="mt-2 text-center text-xs rounded px-3 py-2" style={{
              color: COLORS.trading.negative,
              backgroundColor: `${COLORS.trading.negative}10`,
              border: `1px solid ${COLORS.trading.negative}20`
            }}>
              Please enter a bet amount to start trading
            </div>
          )}
        </div>

      </div>
    </aside>
  );
}

// Memoize component to prevent unnecessary re-renders
export default memo(RightPanel);
