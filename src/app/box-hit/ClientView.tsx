'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import RightPanel from '@/games/box-hit/RightPanel';
import PositionsTable from '@/games/box-hit/PositionsTable';
import { Filter, ExternalLink, Users, Activity, Clock, ChevronDown, TrendingUp, TrendingDown, Target, User } from 'lucide-react';
import { cleanupSoundManager } from '@/lib/sound/SoundManager';
import { useAppStore, useTradingStore } from '@/stores';
import ErrorBoundary from '@/components/ErrorBoundary';
import { logger } from '@/utils/logger';
import Canvas from '@/components/canvas/Canvas';
import { ASSET_DATA, TIMEFRAME_OPTIONS } from '@/lib/constants/assets';
import { COLORS } from '@/styles/theme';
import { Contract, Position } from '@/types/game';
import { handleCanvasError } from '@/lib/errorHandler';

// Activity Panel Component
const ActivityPanel = () => {
  const [activities, setActivities] = useState([
    { id: 1, player: 'Dc4q...5X4i', action: 'hit', multiplier: '2.5x', amount: '$250', payout: '$625', time: '2s ago', isPositive: true },
    { id: 2, player: 'Kj8m...9Y2p', action: 'hit', multiplier: '1.8x', amount: '$150', payout: '$270', time: '5s ago', isPositive: true },
    { id: 3, player: 'Xw2n...7H6q', action: 'hit', multiplier: '3.0x', amount: '$450', payout: '$1,350', time: '8s ago', isPositive: true },
    { id: 4, player: 'Lp5v...3M8r', action: 'missed', multiplier: '2.2x', amount: '$100', payout: '-$100', time: '12s ago', isPositive: false },
    { id: 5, player: 'Qr9t...1B4s', action: 'missed', multiplier: '2.0x', amount: '$200', payout: '-$200', time: '15s ago', isPositive: false },
    { id: 6, player: 'Fh6u...8C2w', action: 'hit', multiplier: '1.5x', amount: '$300', payout: '$450', time: '18s ago', isPositive: true },
    { id: 7, player: 'Gm7i...5E9x', action: 'hit', multiplier: '1.8x', amount: '$180', payout: '$324', time: '22s ago', isPositive: true },
    { id: 8, player: 'Vk4o...2A7z', action: 'missed', multiplier: '2.8x', amount: '$75', payout: '-$75', time: '25s ago', isPositive: false },
    { id: 9, player: 'Bw3l...6N1y', action: 'missed', multiplier: '2.1x', amount: '$120', payout: '-$120', time: '28s ago', isPositive: false },
    { id: 10, player: 'Hj8p...4Q5t', action: 'hit', multiplier: '1.2x', amount: '$500', payout: '$600', time: '32s ago', isPositive: true },
  ]);

  // Simulate live activity updates
  useEffect(() => {
    const interval = setInterval(() => {
      const amount = Math.floor(Math.random() * 500) + 50;
      const multiplier = Math.random() * 3 + 1;
      const action = Math.random() > 0.5 ? 'hit' : 'missed';
      const isPositive = action === 'hit';
      const payout = action === 'missed' ? `-$${amount}` : `$${Math.floor(amount * multiplier).toLocaleString()}`;
      
      const newActivity = {
        id: Date.now(),
        player: `${Math.random().toString(36).substring(2, 6)}...${Math.random().toString(36).substring(2, 4)}`,
        action,
        multiplier: `${multiplier.toFixed(1)}x`,
        amount: `$${amount}`,
        payout,
        time: 'now',
        isPositive
      };
      
      setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
    }, 3000 + Math.random() * 2000); // Random interval between 3-5 seconds

    return () => clearInterval(interval);
  }, []);

  const getActionIcon = (action: string) => {
    // Use User icon for all actions
    return (
      <User 
        size={16} 
        style={{ 
          color: '#71717a'
        }} 
      />
    );
  };

  const getActionColor = (action: string, isPositive: boolean) => {
    switch (action) {
      case 'won':
        return COLORS.trading.positive;
      case 'lost':
        return COLORS.trading.negative;
      default:
        return '#60A5FA'; // Blue for placed bet
    }
  };

  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden" style={{ backgroundColor: '#0E0E0E' }}>
      <div className="p-4">
        <div className="mb-3">
          <div className="flex items-center justify-between pb-2">
            <span className="text-zinc-300 font-medium" style={{ fontSize: '14px' }}>Live Activity</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-zinc-400" style={{ fontSize: '12px' }}>Live</span>
            </div>
          </div>
          <div className="border-b border-zinc-800/80"></div>
        </div>

        <div className="space-y-1 max-h-80 overflow-y-auto -mx-4">
          {activities.map((activity, i) => (
            <div 
              key={activity.id} 
              className="flex items-center gap-2 py-1 px-4 hover:bg-zinc-800/30 transition-colors"
            >
              <div className="flex-shrink-0">
                {getActionIcon(activity.action)}
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-zinc-300 truncate font-medium" style={{ fontSize: '12px' }}>
                  {activity.player}
                </span>
                <span className="text-zinc-500" style={{ fontSize: '11px' }}>
                  {activity.action}
                </span>
                <span className="text-white font-medium" style={{ fontSize: '12px' }}>
                  {activity.multiplier}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-zinc-500" style={{ fontSize: '10px' }}>
                  {activity.time}
                </span>
                <span className="font-medium" style={{ 
                  fontSize: '12px',
                  color: activity.action === 'hit' ? COLORS.trading.positive : COLORS.trading.negative
                }}>
                  {activity.payout}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


/**
 * Main ClientView component for the BoxHit trading game
 * 
 * Features:
 * - Mock backend trading simulation
 * - Real-time canvas rendering
 * - Comprehensive error handling and user feedback
 * - Zustand state management for game settings
 * - Toast notification system for user interactions
 * 
 * @returns JSX element containing the complete trading interface
 */
export default function ClientView() {
  // Cleanup sound manager on unmount
  useEffect(() => {
    return () => {
      cleanupSoundManager();
    };
  }, []);
  
  // Local state
  const [betAmount, setBetAmount] = useState(200);
  const [isCanvasStarted, setIsCanvasStarted] = useState(false);
  
  // Mock backend state
  const [mockBackendPositions, setMockBackendPositions] = useState<Map<string, Position>>(new Map());
  const [mockBackendContracts, setMockBackendContracts] = useState<Contract[]>([]);
  const [mockBackendHitBoxes, setMockBackendHitBoxes] = useState<string[]>([]);
  const [mockBackendMissedBoxes, setMockBackendMissedBoxes] = useState<string[]>([]);
  const [mockBackendSelectedCount, setMockBackendSelectedCount] = useState(0);
  const [mockBackendSelectedMultipliers, setMockBackendSelectedMultipliers] = useState<number[]>([]);
  const [mockBackendBestMultiplier, setMockBackendBestMultiplier] = useState(0);
  const [mockBackendSelectedAveragePrice, setMockBackendSelectedAveragePrice] = useState<number | null>(null);
  const [isTimeframeDropdownOpen, setIsTimeframeDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Keep track of previous positions using a ref to avoid infinite loops
  const previousPositionsRef = useRef<Map<string, Position>>(new Map());
  const previousCountRef = useRef(0);

  // Consolidated store subscriptions to prevent object recreation on every render
  const gameSettings = useAppStore((state) => state.gameSettings);
  const favoriteAssets = useAppStore((state) => state.favoriteAssets);
  const isAssetDropdownOpen = useAppStore((state) => state.isAssetDropdownOpen);
  const signatureColor = useAppStore((state) => state.signatureColor);
  
  // Destructure for easier access
  const { minMultiplier, showOtherPlayers, showProbabilities, timeframe, selectedAsset } = gameSettings;
  
  // Get real-time price from trading store
  const currentPrice = useTradingStore((state) => state.priceStats.currentPrice);
  
  // Memoized expensive computations to prevent unnecessary recalculations
  const selectedAssetData = useMemo(() => ASSET_DATA[selectedAsset], [selectedAsset]);
  const favoriteAssetsArray = useMemo(() => Array.from(favoriteAssets), [favoriteAssets]);
  const timeframeOption = useMemo(() => 
    TIMEFRAME_OPTIONS.find(option => option === timeframe) || TIMEFRAME_OPTIONS[2], 
    [timeframe]
  );

  // Store actions - use refs to completely avoid dependency cycles
  const updateGameSettingsRef = useRef(useAppStore.getState().updateGameSettings);
  const toggleFavoriteAssetRef = useRef(useAppStore.getState().toggleFavoriteAsset);
  const setAssetDropdownOpenRef = useRef(useAppStore.getState().setAssetDropdownOpen);
  const addTradeRef = useRef(useTradingStore.getState().addTrade);
  const settleTradeRef = useRef(useTradingStore.getState().settleTrade);

  // Update refs when store actions change - run only once
  useEffect(() => {
    updateGameSettingsRef.current = useAppStore.getState().updateGameSettings;
    toggleFavoriteAssetRef.current = useAppStore.getState().toggleFavoriteAsset;
    setAssetDropdownOpenRef.current = useAppStore.getState().setAssetDropdownOpen;
    addTradeRef.current = useTradingStore.getState().addTrade;
    settleTradeRef.current = useTradingStore.getState().settleTrade;
  }, []); // Empty dependency array to run only once
  
  // Memoized setter functions for stable references - no dependencies to prevent infinite loops
  const setShowProbabilities = useCallback((show: boolean) => updateGameSettingsRef.current({ showProbabilities: show }), []);
  const setShowOtherPlayers = useCallback((show: boolean) => updateGameSettingsRef.current({ showOtherPlayers: show }), []);
  const setMinMultiplier = useCallback((mult: number) => updateGameSettingsRef.current({ minMultiplier: mult }), []);
  const setTimeframe = useCallback((ms: number) => updateGameSettingsRef.current({ timeframe: ms }), []);
  const setSelectedAsset = useCallback((asset: 'BTC' | 'ETH' | 'SOL' | 'DEMO') => updateGameSettingsRef.current({ selectedAsset: asset }), []);
  
  const toggleFavorite = useCallback((asset: 'BTC' | 'ETH' | 'SOL' | 'DEMO', event: React.MouseEvent) => {
    event.stopPropagation();
    toggleFavoriteAssetRef.current(asset);
  }, []);
  
  // Handle mock backend positions and contracts update
  const handleMockBackendPositionsChange = useCallback((positions: Map<string, Position>, contracts: Contract[], hitBoxes: string[], missedBoxes: string[]) => {
    try {
    // Track new positions in userStore
    const previousPositions = previousPositionsRef.current;

    // Find new positions that weren't in the previous state
    positions.forEach((position, positionId) => {
      if (!previousPositions.has(positionId)) {
        const tradeId = `trade_${position.contractId}`;
          addTradeRef.current({
          id: tradeId,
          contractId: position.contractId,
          amount: betAmount,
          placedAt: new Date(),
        });
      }
    });

    // Track hit positions (settle as wins)
    hitBoxes.forEach((contractId) => {
      const position = Array.from(positions.values()).find(p => p.contractId === contractId);
      if (position) {
        const contract = contracts.find(c => c.contractId === contractId);
      if (contract) {
          const payout = betAmount * (contract.returnMultiplier || 1);
          const tradeId = `trade_${contractId}`;
            settleTradeRef.current(tradeId, 'win', payout);
        }
      }
    });

    // Track missed positions (settle as losses)
    missedBoxes.forEach((contractId) => {
        const tradeId = `trade_${contractId}`;
        settleTradeRef.current(tradeId, 'loss', 0);
      });

      // Update local state
    setMockBackendPositions(positions);
    setMockBackendContracts(contracts);
    setMockBackendHitBoxes(hitBoxes);
    setMockBackendMissedBoxes(missedBoxes);

    // Update the ref for next comparison
    previousPositionsRef.current = new Map(positions);
    } catch (error) {
      handleCanvasError(error instanceof Error ? error : new Error(String(error)), {
        component: 'ClientView',
        action: 'handleMockBackendPositionsChange'
      });
    }
  }, [betAmount]);

  // Handle mock backend selection changes
  const handleMockBackendSelectionChange = useCallback((count: number, bestMultiplier: number, multipliers: number[], averagePrice?: number | null) => {
    try {
    setMockBackendSelectedCount(count);
      setMockBackendBestMultiplier(bestMultiplier);
    setMockBackendSelectedMultipliers(multipliers);
    setMockBackendSelectedAveragePrice(averagePrice || null);

    // Update previous count for future comparisons
    previousCountRef.current = count;
    } catch (error) {
      handleCanvasError(error instanceof Error ? error : new Error(String(error)), {
        component: 'ClientView',
        action: 'handleMockBackendSelectionChange'
      });
    }
  }, []);

  const handleTradingModeChange = useCallback((tradingMode: boolean) => {
      setIsCanvasStarted(tradingMode);
  }, []);

  const handlePositionHit = useCallback((positionId: string) => {
    logger.info('Position hit', { positionId }, 'GAME');
  }, []);

  const handlePositionMiss = useCallback((positionId: string) => {
    logger.info('Position missed', { positionId }, 'GAME');
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.asset-dropdown') && isAssetDropdownOpen) {
        setAssetDropdownOpenRef.current(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAssetDropdownOpen]);

  // Close timeframe dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.timeframe-dropdown') && isTimeframeDropdownOpen) {
        setIsTimeframeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTimeframeDropdownOpen]);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

      return (
      <>
      <div className="relative flex h-full w-full bg-zinc-950 text-white p-4 gap-4">
        {/* Left side: Canvas + Positions */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Canvas Component */}
          <div className="rounded-lg border border-zinc-800 overflow-hidden" style={{ backgroundColor: '#0E0E0E' }}>
            {/* Canvas Header */}
            <div className="flex h-16 items-center justify-between px-6" style={{ backgroundColor: '#0E0E0E' }}>
            {/* Left side: Asset info */}
            <div className="flex items-center gap-4">
              {/* Asset Icon */}
              <div className="rounded-lg overflow-hidden" style={{ width: '28px', height: '28px' }}>
                <img 
                src={selectedAssetData.icon} 
                alt={selectedAssetData.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              
            {/* Asset Selector Dropdown */}
              <div className="relative asset-dropdown">
                <div 
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setAssetDropdownOpenRef.current(!isAssetDropdownOpen)}
                title="Select asset"
                >
                  <div className="text-white leading-none" style={{ fontSize: '18px', fontWeight: 500 }}>
                  {selectedAssetData.symbol}
                  </div>
                  <svg 
                    className={`w-4 h-4 text-zinc-400 transition-transform ${isAssetDropdownOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
              {/* Dropdown Menu */}
              {isAssetDropdownOpen && (
                  <div 
                    className="absolute top-full left-0 mt-2 border border-zinc-700/50 rounded-lg shadow-2xl z-50" 
                    style={{ 
                    width: '360px',
                      backgroundColor: 'rgba(14, 14, 14, 0.7)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)'
                    }}
                  >
                    {Object.entries(ASSET_DATA).map(([key, asset]) => (
                      <div
                        key={key}
                        className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                          key === 'DEMO' 
                            ? `cursor-pointer hover:bg-zinc-800/50 ${selectedAsset === key ? 'bg-zinc-800/50' : ''}`
                            : `cursor-pointer hover:bg-zinc-800/50 ${selectedAsset === key ? 'bg-zinc-800/50' : ''} opacity-50`
                        }`}
                        onClick={() => {
                        if (key === 'DEMO') {
                          setSelectedAsset(key as 'BTC' | 'ETH' | 'SOL' | 'DEMO');
                          setAssetDropdownOpenRef.current(false);
                        }
                        }}
                      title={
                        key === 'DEMO' 
                          ? `Select ${asset.name}` 
                          : 'Asset selection not available in mock backend mode'
                      }
                      >
                        {/* Star icon for favorites - clickable */}
                        <button
                          onClick={(e) => toggleFavorite(key as 'BTC' | 'ETH' | 'SOL' | 'DEMO', e)}
                          className="flex-shrink-0 p-0.5 rounded transition-colors cursor-pointer hover:bg-zinc-700/50"
                        >
                          <svg 
                            className={`w-3.5 h-3.5 transition-colors ${
                              favoriteAssetsArray.includes(key as 'BTC' | 'ETH' | 'SOL' | 'DEMO') 
                                ? 'text-yellow-400 fill-current' 
                                : 'text-zinc-500 fill-none'
                            }`} 
                            fill="currentColor" 
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={favoriteAssetsArray.includes(key as 'BTC' | 'ETH' | 'SOL' | 'DEMO') ? 0 : 1.5}
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </button>
                        
                        {/* Asset icon */}
                        <div className="w-7 h-7 rounded overflow-hidden flex-shrink-0">
                          <img 
                            src={asset.icon} 
                            alt={asset.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        {/* Asset info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-xs font-medium">{asset.symbol}</div>
                          <div className="text-zinc-400" style={{ fontSize: '11px' }}>{asset.name}</div>
                        </div>
                        
                        {/* Price and change */}
                        <div className="text-right flex-shrink-0 mr-2">
                          <div className="text-white text-xs font-medium">
                            {asset.price 
                              ? asset.price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                              : <span className="text-zinc-500">--</span>
                            }
                          </div>
                          <div 
                            style={{ 
                              color: asset.change24h >= 0 ? COLORS.trading.positive : COLORS.trading.negative,
                              fontSize: '11px',
                              fontWeight: 500
                            }}
                          >
                            {asset.change24h > 0 || asset.change24h < 0
                              ? `${asset.change24h > 0 ? '+' : ''}${asset.change24h.toFixed(2)}%`
                              : <span className="text-zinc-500">--</span>
                            }
                          </div>
                        </div>
                        
                        {/* Volume text */}
                        <div className="text-zinc-400 flex-shrink-0" style={{ fontSize: '11px' }}>
                          Vol: {asset.volume24h}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
               {/* Current Value with 24h Change */}
               <div className="flex items-baseline gap-2">
                 <div className="text-white leading-none" style={{ fontSize: '28px', fontWeight: 500 }}>
                   ${(selectedAsset === 'DEMO' ? currentPrice : selectedAssetData.price).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                 </div>
                 <div className="font-medium leading-none" style={{ 
                   fontSize: '14px',
                   color: (selectedAsset === 'DEMO' ? 2.5 : selectedAssetData.change24h) >= 0 ? COLORS.trading.positive : COLORS.trading.negative
                 }}>
                   {(selectedAsset === 'DEMO' ? 2.5 : selectedAssetData.change24h) >= 0 ? '+' : ''}{(selectedAsset === 'DEMO' ? 2.5 : selectedAssetData.change24h).toFixed(2)}%
                 </div>
               </div>
            </div>
            
            {/* Right side: Controls */}
            <div className="flex items-center gap-4">
              {/* Multiplier Filter Slider */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Multiplier:</span>
                <div className="relative w-24 h-1 bg-zinc-800 rounded cursor-pointer" onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percentage = x / rect.width;
                  const newValue = 1.0 + (percentage * 14.0); // 1.0 to 15.0 range
                  setMinMultiplier(Math.max(1.0, Math.min(15.0, newValue)));
                }}>
                  <div 
                    className="absolute top-0 left-0 h-full"
                    style={{ 
                      width: `${((minMultiplier - 1.0) / 14.0) * 100}%`,
                      backgroundColor: '#727272'
                    }}
                  />
                  <div 
                    className="absolute top-1/2 transform -translate-y-1/2 w-1 h-3"
                    style={{ 
                      left: `${((minMultiplier - 1.0) / 14.0) * 100}%`,
                      backgroundColor: '#727272',
                      marginLeft: '-2px'
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-white">{minMultiplier.toFixed(1)}x</span>
              </div>

              {/* Timeframe Selector Dropdown */}
              <div className="relative timeframe-dropdown">
                <button
                  onClick={() => setIsTimeframeDropdownOpen(!isTimeframeDropdownOpen)}
                  className="flex items-center gap-1 px-3 py-1 text-xs rounded transition-colors"
                  style={{
                    backgroundColor: '#171717',
                    color: 'white'
                  }}
                >
                  <span>{timeframe === 500 ? '0.5s' : timeframe < 1000 ? `${timeframe}ms` : `${timeframe/1000}s`}</span>
                  <ChevronDown size={12} style={{ color: '#727272' }} />
                </button>
                
                {isTimeframeDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 rounded shadow-lg z-50 min-w-[80px]" style={{ backgroundColor: '#171717' }}>
                    {TIMEFRAME_OPTIONS.map((ms) => {
                      const isSelected = timeframe === ms;
                      const label = ms === 500 ? '0.5s' : ms < 1000 ? `${ms}ms` : `${ms/1000}s`;
                      return (
                        <button
                          key={ms}
                          onClick={() => {
                            setTimeframe(ms);
                            setIsTimeframeDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-xs text-left transition-colors ${
                            isSelected
                              ? 'text-white'
                              : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                          }`}
                          style={{
                            backgroundColor: isSelected ? signatureColor : 'transparent'
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Time Display */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg" style={{ backgroundColor: '#171717' }}>
                  <Clock size={14} style={{ color: signatureColor }} />
                  <span className="text-sm" style={{ color: signatureColor }}>
                    {currentTime.toLocaleTimeString('en-US', { 
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                </div>
              </div>

              {/* Heatmap and Players Icon Boxes */}
              <div className="flex items-center gap-2">
                {/* Heatmap Icon Box */}
                <button
                  onClick={() => setShowProbabilities(!showProbabilities)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-200 hover:bg-zinc-900 relative"
                  style={{
                    backgroundColor: '#171717'
                  }}
                  title="Toggle Heatmap Overlay"
                >
                  <Activity 
                    size={16} 
                    style={{
                      color: '#727272'
                    }}
                  />
                  {!showProbabilities && (
                    <div 
                      className="absolute inset-0"
                      style={{
                        zIndex: 999
                      }}
                    >
                      <div 
                        style={{
                          width: '28px',
                          height: '2px',
                          backgroundColor: '#727272',
                          transform: 'rotate(45deg)',
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          marginLeft: '-14px',
                          marginTop: '-1px'
                        }}
                      />
                    </div>
                  )}
                </button>

                {/* Show Players Icon Box */}
                <button
                  onClick={() => setShowOtherPlayers(!showOtherPlayers)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-200 hover:bg-zinc-900 relative"
                  style={{
                    backgroundColor: '#171717'
                  }}
                  title="Toggle Other Players"
                >
                  <Users 
                    size={16} 
                    style={{
                      color: '#727272'
                    }}
                  />
                  {!showOtherPlayers && (
                    <div 
                      className="absolute inset-0"
                      style={{
                        zIndex: 999
                      }}
                    >
                      <div 
                        style={{
                          width: '28px',
                          height: '2px',
                          backgroundColor: '#727272',
                          transform: 'rotate(45deg)',
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          marginLeft: '-14px',
                          marginTop: '-1px'
                        }}
                      />
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
          
            {/* Canvas Area */}
            <ErrorBoundary 
              fallback={
                <div className="h-96 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg">
                  <div className="text-center">
                    <div className="text-red-500 text-lg mb-2">⚠️ Canvas Error</div>
                    <div className="text-zinc-400 text-sm">The game canvas encountered an error. Please refresh the page.</div>
                  </div>
                </div>
              }
              onError={(error, errorInfo) => {
                logger.error('Canvas Error', { error, errorInfo }, 'CANVAS');
                handleCanvasError(error, { 
                  action: 'Canvas rendering',
                  metadata: { errorInfo }
                });
              }}
            >
              <div className="w-full h-[520px] overflow-hidden" style={{ backgroundColor: '#0E0E0E' }}>
                <Canvas 
                  externalControl={true}
                  externalIsStarted={isCanvasStarted}
                  onExternalStartChange={setIsCanvasStarted}
                  externalTimeframe={timeframe}
                  onPositionsChange={handleMockBackendPositionsChange}
                  onSelectionChange={handleMockBackendSelectionChange}
                  betAmount={betAmount}
                  onPriceUpdate={(price) => {
                    // Update real-time price in trading store
                    useTradingStore.getState().updatePriceStats({
                      currentPrice: price,
                      priceChange24h: 0,
                      priceChangePercent24h: 0,
                      volume24h: 0,
                    });
                  }}
                  showProbabilities={showProbabilities}
                  showOtherPlayers={showOtherPlayers}
                  minMultiplier={minMultiplier}
                />
              </div>
            </ErrorBoundary>
          </div>
          
          {/* Positions Table Component */}
          <div className="rounded-lg border border-zinc-800 overflow-hidden" style={{ backgroundColor: '#0E0E0E' }}>
            <PositionsTable 
              betAmount={betAmount}
              currentBTCPrice={currentPrice}
            />
          </div>
        </div>
        
        {/* Right side: Betting Panel + Leaderboard */}
        <div className="w-[400px] flex flex-col gap-4">
          {/* Betting Panel Component */}
          <RightPanel 
            isTradingMode={isCanvasStarted}
            onTradingModeChange={handleTradingModeChange}
            selectedCount={mockBackendSelectedCount}
            bestMultiplier={mockBackendBestMultiplier}
            selectedMultipliers={mockBackendSelectedMultipliers}
            currentBTCPrice={currentPrice}
            averagePositionPrice={mockBackendSelectedAveragePrice || null}
            betAmount={betAmount}
            onBetAmountChange={setBetAmount}
          />
          
          {/* Activity Panel */}
          <ActivityPanel />
        </div>
      </div>
      {/* Toast notifications are now handled by the centralized GlobalToast component */}
      </>
    );
}