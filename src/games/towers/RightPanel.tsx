'use client';
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Filter, ChevronRight, Edit3, ExternalLink } from 'lucide-react';
import { useUIStore } from '@/stores';

const ORANGE = '#FA5616';

/** centralized trading colors */
const TRADING_COLORS = {
  positive: '#2fe3ac',  // Green for positive values (gains, up movements)
  negative: '#ec397a',  // Red for negative values (losses, down movements)
} as const;

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
}

export default function RightPanel({ isTradingMode, onTradingModeChange, selectedCount, bestMultiplier, selectedMultipliers, currentBTCPrice, averagePositionPrice, betAmount, onBetAmountChange }: RightPanelProps) {

  const [activeTab, setActiveTab] = useState<'place' | 'copy'>('place');
  const signatureColor = useUIStore((state) => state.signatureColor);
  
  // Ensure bet amount is never 0 by default
  useEffect(() => {
    if (betAmount === 0) {
      onBetAmountChange(200);
    }
  }, [betAmount, onBetAmountChange]);

  // Cycle through volatility index values for demo
  useEffect(() => {
    const interval = setInterval(() => {
      setVolatilityIndex(prev => (prev + 1) % 3);
    }, 8000); // Change every 8 seconds

    return () => clearInterval(interval);
  }, []);
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [showLiquidityToggle, setShowLiquidityToggle] = useState(false);
  const [showFeeToggle, setShowFeeToggle] = useState(false);
  const [feeAmount, setFeeAmount] = useState(0.01);
  const [liquidityAmount, setLiquidityAmount] = useState(0);
  const [volatilityIndex, setVolatilityIndex] = useState(0);

  const leaderboardData = [
    { rank: 1, player: 'Dc4q...5X4i', pnl: '+$12,512.51', isPositive: true },
    { rank: 2, player: 'Kj8m...9Y2p', pnl: '+$8,743.29', isPositive: true },
    { rank: 3, player: 'Xw2n...7H6q', pnl: '+$6,891.45', isPositive: true },
    { rank: 4, player: 'Lp5v...3M8r', pnl: '+$4,567.12', isPositive: true },
    { rank: 5, player: 'Qr9t...1B4s', pnl: '+$3,234.78', isPositive: true },
    { rank: 6, player: 'Fh6u...8C2w', pnl: '+$2,156.34', isPositive: true },
    { rank: 7, player: 'Gm7i...5E9x', pnl: '+$1,789.56', isPositive: true },
    { rank: 8, player: 'Vk4o...2A7z', pnl: '+$1,234.89', isPositive: true },
    { rank: 9, player: 'Bw3l...6N1y', pnl: '+$987.43', isPositive: true },
    { rank: 10, player: 'Hj8p...4Q5t', pnl: '+$654.21', isPositive: true },
  ];

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
    <aside className="border-l border-zinc-800/80 bg-zinc-950/60 pr-0">
      <div className="space-y-0 p-4">
        {/* First Section: Daily High/Low BTC Price */}
        <div>
          {/* Daily High/Low Display */}
          <div className="flex">
            {/* Left container for Daily High */}
            <div className="flex-1" style={{ background: `linear-gradient(to right, transparent 0%, ${TRADING_COLORS.positive}20 50%, transparent 100%)` }}>
              <div className="text-xs text-zinc-400 px-3">Daily High</div>
              <div className="font-medium px-3" style={{ fontSize: '18px', lineHeight: '18px', color: TRADING_COLORS.positive }}>
                $112,450.00
              </div>
            </div>
            
            {/* Separator */}
            <div className="w-px bg-zinc-700"></div>
            
            {/* Right container for Daily Low */}
            <div className="flex-1" style={{ background: `linear-gradient(to left, transparent 0%, ${TRADING_COLORS.negative}20 50%, transparent 100%)` }}>
              <div className="text-xs text-zinc-400 px-3">Daily Low</div>
              <div className="font-medium px-3" style={{ fontSize: '18px', lineHeight: '18px', color: TRADING_COLORS.negative }}>
                $111,200.00
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
              onClick={() => setActiveTab('place')}
              className={`pb-2 px-3 text-sm font-medium transition-colors ${
                activeTab === 'place' 
                  ? 'text-white border-b-2 border-white' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Place Trade
            </button>
            <button
              onClick={() => setActiveTab('copy')}
              className={`pb-2 px-3 text-sm font-medium transition-colors ${
                activeTab === 'copy' 
                  ? 'text-white border-b-2 border-white' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
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
                onClick={() => {/* TODO: Open custom input popover */}}
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

            <div className="text-xs text-zinc-400 mt-2">
              Payout per $1:
              <span style={{ color: '#FFF', marginLeft: '4px' }}>
                {selectedCount > 0 && betAmount > 0 && selectedMultipliers.length > 0
                  ? `$${(selectedMultipliers.reduce((sum, mult) => sum + mult, 0)).toFixed(2)}`
                  : '$0.00'
                }
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
            {isTradingMode ? 'Exit Trade Mode' : 'Start Trading'}
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
                            <div className="font-medium" style={{ fontSize: '18px' }}>
                              {volatilityIndex === 0 && <span style={{ color: TRADING_COLORS.positive }}>Low</span>}
                              {volatilityIndex === 1 && <span className="text-yellow-400">Normal</span>}
                              {volatilityIndex === 2 && <span style={{ color: TRADING_COLORS.negative }}>High</span>}
                            </div>
                            <ChevronRight size={16} className="text-zinc-400" />
                          </div>
                        </div>
                        <div className="w-px bg-zinc-700 mx-4"></div>
                        <div className="flex-1">
                          <div className="text-xs text-zinc-400">Avg Position Price</div>
                          <div className="font-medium text-zinc-100" style={{ fontSize: '18px' }}>
                            {selectedCount > 0 ? (
                              averagePositionPrice ? `~$${Math.round(averagePositionPrice).toLocaleString()}` : 'Calculating...'
                            ) : (
                              `$${currentBTCPrice ? currentBTCPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : 'Loading...'}`
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
            {leaderboardData.map((item, i) => (
              <div 
                key={item.rank} 
                className="flex items-center justify-between py-2 px-3"
                style={{ backgroundColor: (i + 1) % 2 === 0 ? '#18181B' : 'transparent' }}
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
