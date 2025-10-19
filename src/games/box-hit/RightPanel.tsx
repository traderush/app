'use client';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Filter, ChevronRight, ExternalLink } from 'lucide-react';
import { useUIStore } from '@/stores';
import {
  QUICK_BET_AMOUNTS,
  MOCK_LEADERBOARD,
  PANEL_COLORS as TRADING_COLORS,
  VOLATILITY_STATES,
} from '@/games/box-hit/constants';

/**
 * Props for the RightPanel component
 * 
 * @property isTradingMode - Whether trading mode is currently active
 * @property onTradingModeChange - Callback when trading mode changes
 * @property selectedCount - Number of boxes currently selected
 * @property selectedMultipliers - Array of all multipliers for selected boxes
 * @property currentBTCPrice - Current live BTC price
 * @property averagePositionPrice - Average BTC price of selected box positions
 * @property betAmount - Current bet amount in USDC
 * @property onBetAmountChange - Callback when bet amount changes
 * @property dailyHigh - 24-hour high price
 * @property dailyLow - 24-hour low price
 * @property activeTab - Currently active tab ('copy' - Mock Backend mode)
 * @property onActiveTabChange - Callback when active tab changes
 */
interface RightPanelProps {
  isTradingMode: boolean;
  onTradingModeChange: (tradingMode: boolean) => void;
  selectedCount: number;
  selectedMultipliers: number[]; // Array of multipliers for selected boxes
  currentBTCPrice: number; // Current live BTC price
  averagePositionPrice: number | null; // Average BTC price of selected boxes
  betAmount: number; // Current bet amount
  onBetAmountChange: (amount: number) => void; // Callback when bet amount changes
  dailyHigh: number; // 24h high price
  dailyLow: number; // 24h low price
  activeTab?: 'place' | 'copy';
  onActiveTabChange?: (tab: 'place' | 'copy') => void;
}

function RightPanel({ isTradingMode, onTradingModeChange, selectedCount, selectedMultipliers, currentBTCPrice, averagePositionPrice, betAmount, onBetAmountChange, dailyHigh, dailyLow, activeTab: externalActiveTab, onActiveTabChange }: RightPanelProps) {
  const signatureColor = useUIStore((state) => state.signatureColor);

  const [internalActiveTab, setInternalActiveTab] = useState<'place' | 'copy'>('copy');
  const [showWarning, setShowWarning] = useState(false);
  const [showLiquidityToggle, setShowLiquidityToggle] = useState(false);
  const [showFeeToggle, setShowFeeToggle] = useState(false);
  const [feeAmount, setFeeAmount] = useState(0.01);
  const [liquidityAmount, setLiquidityAmount] = useState(0);
  const [volatilityIndex, setVolatilityIndex] = useState(0);

  const activeTab = externalActiveTab ?? internalActiveTab;

  const setActiveTab = useCallback(
    (tab: 'place' | 'copy') => {
      if (onActiveTabChange) {
        onActiveTabChange(tab);
      } else {
        setInternalActiveTab(tab);
      }
    },
    [onActiveTabChange],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setVolatilityIndex((prev) => (prev + 1) % VOLATILITY_STATES.length);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const handleBetAmountClick = useCallback(
    (amount: number) => {
      onBetAmountChange(amount);
      setShowWarning(false);
    },
    [onBetAmountChange],
  );

  const handleCustomBetAmount = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(0, parseFloat(event.target.value) || 0);
      onBetAmountChange(value);
      setShowWarning(false);
    },
    [onBetAmountChange],
  );

  const selectionActive = selectedCount > 0 && betAmount > 0 && selectedMultipliers.length > 0;
  const totalMultiplier = useMemo(
    () => selectedMultipliers.reduce((sum, multiplier) => sum + multiplier, 0),
    [selectedMultipliers],
  );
  const potentialPayout = useMemo(
    () => (selectionActive ? Math.round(betAmount * totalMultiplier) : 0),
    [betAmount, selectionActive, totalMultiplier],
  );
  const payoutPerDollar = selectionActive ? `$${totalMultiplier.toFixed(2)}` : '$0.00';
  const canStartTrading = betAmount > 0;

  const volatilityLabel = VOLATILITY_STATES[volatilityIndex];
  const volatilityColor = useMemo(() => {
    if (volatilityLabel === 'Low') return TRADING_COLORS.positive;
    if (volatilityLabel === 'High') return TRADING_COLORS.negative;
    return '#facc15';
  }, [volatilityLabel]);

  return (
    <aside className="w-[400px] border-l border-zinc-800/80 bg-zinc-950/60 pr-0 flex-shrink-0">
      <div className="space-y-0 p-4">
        {/* First Section: Daily High/Low BTC Price */}
        <div>
          {/* Daily High/Low Display */}
          <div className="flex">
            {/* Left container for Daily High */}
            <div className="flex-1" style={{ background: `linear-gradient(to right, transparent 0%, ${TRADING_COLORS.positive}20 50%, transparent 100%)` }}>
              <div className="text-xs text-zinc-400 px-3">Daily High</div>
              <div className="font-medium px-3" style={{ fontSize: '18px', lineHeight: '18px', color: dailyHigh > 0 ? TRADING_COLORS.positive : '#71717a' }}>
                {dailyHigh > 0 ? `$${dailyHigh.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '...'}
              </div>
            </div>
            
            {/* Separator */}
            <div className="w-px bg-zinc-700"></div>
            
            {/* Right container for Daily Low */}
            <div className="flex-1" style={{ background: `linear-gradient(to left, transparent 0%, ${TRADING_COLORS.negative}20 50%, transparent 100%)` }}>
              <div className="text-xs text-zinc-400 px-3">Daily Low</div>
              <div className="font-medium px-3" style={{ fontSize: '18px', lineHeight: '18px', color: dailyLow > 0 ? TRADING_COLORS.negative : '#71717a' }}>
                {dailyLow > 0 ? `$${dailyLow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '...'}
              </div>
            </div>
          </div>
          
          {/* Bottom border line - Full width */}
          <div className="border-t border-zinc-800/80 -mx-4 px-4 mt-3"></div>
        </div>

        {/* Second Section: Trading Controls */}
        <div className="pb-4 pt-2">
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
          <div className="flex items-center justify-center gap-2 px-3 py-2 -mx-4" style={{ backgroundColor: `${TRADING_COLORS.negative}10` }}>
            <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: `${TRADING_COLORS.negative}20` }}>
              <span className="text-xs font-bold" style={{ color: TRADING_COLORS.negative }}>i</span>
            </div>
            <span style={{ fontSize: '12px', color: TRADING_COLORS.negative }}>Your trades will be live after selecting each box</span>
          </div>
        </div>

        {/* Betting Controls Section */}
        <div className="pb-4">
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
            <div className="grid grid-cols-4 h-6 rounded-b-lg overflow-hidden border border-t-0 border-zinc-800 bg-zinc-900/60">
              {QUICK_BET_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleBetAmountClick(amount)}
                  className={`
                    flex items-center justify-center text-xs font-medium transition-colors
                    border-r border-zinc-700 last:border-r-0
                    ${betAmount === amount 
                      ? 'bg-zinc-700 text-white' 
                      : 'bg-transparent text-zinc-200 hover:bg-zinc-700 hover:text-white'
                    }
                  `}
                >
                  {amount}
                </button>
          ))}
            </div>

            <div className="text-xs text-zinc-400 mt-2">
              Payout per $1:
              <span style={{ color: '#FFF', marginLeft: '4px' }}>
                {payoutPerDollar}
              </span>
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
                  {potentialPayout}
                </span>
                <span className="text-xs text-zinc-400 ml-1" style={{ fontWeight: 400 }}>USDC</span>
              </div>
            </div>
          </div>
          


          {/* Action Button */}
          <button
            onClick={() => {
              if (!isTradingMode && !canStartTrading) {
                setShowWarning(true);
                setTimeout(() => setShowWarning(false), 3000);
                return;
              }

              onTradingModeChange(!isTradingMode);
            }}
            className={`w-full h-10 rounded-lg font-medium transition-colors hover:opacity-90 text-[#09090B] ${
              !canStartTrading && !isTradingMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
            style={{ backgroundColor: isTradingMode ? '#DD4141' : signatureColor }}
            disabled={!canStartTrading && !isTradingMode}
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
              color: TRADING_COLORS.negative,
              backgroundColor: `${TRADING_COLORS.negative}10`,
              border: `1px solid ${TRADING_COLORS.negative}20`
            }}>
              Please enter a bet amount to start trading
            </div>
          )}
        </div>

        {/* Game Statistics and Options Section */}
        <div>

                                <div className="flex">
                        <div className="flex-1">
                          <div className="text-xs text-zinc-400">Volatility Index</div>
                          <div className="flex items-center gap-1">
                            <div className="font-medium" style={{ fontSize: '18px', color: volatilityColor }}>
                              {volatilityLabel}
                            </div>
                            <ChevronRight size={16} className="text-zinc-400" />
                          </div>
                        </div>
                        <div className="w-px bg-zinc-700 mx-4"></div>
                        <div className="flex-1">
                          <div className="text-xs text-zinc-400">Avg Position Price</div>
                          <div className="font-medium text-zinc-100" style={{ fontSize: '18px' }}>
                            {selectedCount > 0 ? (
                              typeof averagePositionPrice === 'number' && averagePositionPrice > 0
                                ? `~$${averagePositionPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                                : (currentBTCPrice && currentBTCPrice > 0 
                                    ? `$${currentBTCPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    : <span className="text-zinc-500">...</span>
                                  )
                            ) : (
                              currentBTCPrice && currentBTCPrice > 0 
                                ? `$${currentBTCPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
                                : <span className="text-zinc-500">...</span>
                            )}
                          </div>
                        </div>
                      </div>
        </div>
        
        {/* Additional spacing under Volatility Index and Avg Position Price */}
        <div className="pb-4"></div>

        {/* Separator - Full width border */}
        <div className="border-t border-zinc-800/80 -mx-4 px-4 my-0"></div>

                {/* Leaderboard Section */}
        <div className="py-0">
          <div className="mb-3 pt-2">
            <div className="flex items-center justify-between pb-2">
              <span className="text-zinc-300 font-medium" style={{ fontSize: '14px' }}>Leaderboard</span>
              <div className="flex items-center gap-3">
                <button className="text-zinc-400 hover:text-zinc-200 transition-colors" style={{ fontSize: '12px' }}>
                  View All
                </button>
                <button className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors" style={{ fontSize: '12px' }}>
                  <Filter size={14} />
                  Filter
                </button>
              </div>
            </div>
            {/* Full width border under leaderboard title */}
            <div className="border-b border-zinc-800/80 -mx-4 px-4"></div>
          </div>

          <div className="space-y-0">
            {MOCK_LEADERBOARD.map((item, index) => (
              <div 
                key={item.rank} 
                className="flex items-center justify-between py-2 px-3"
                style={{ backgroundColor: (index + 1) % 2 === 0 ? '#18181B' : 'transparent' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400 w-6" style={{ fontSize: '12px' }}>#{item.rank}</span>
                  <ExternalLink size={14} className="text-zinc-500 hover:text-zinc-400 cursor-pointer transition-colors" />
                  <span className="text-zinc-300 ml-0.5" style={{ fontSize: '12px' }}>{item.player}</span>
                </div>
                <span className="font-normal" style={{ 
                  fontSize: '12px',
                  color: item.isPositive ? TRADING_COLORS.positive : TRADING_COLORS.negative
                }}>
                  {item.pnl}
                </span>
              </div>
            ))}
          </div>
          
          {/* Bottom border line - Full width */}
          <div className="border-t border-zinc-800/80 -mx-4 px-4 mt-3"></div>
        </div>
      </div>
    </aside>
  );
}

// Memoize component to prevent unnecessary re-renders
export default memo(RightPanel);
