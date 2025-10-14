'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import RightPanel from '@/games/box-hit/RightPanel';
import PositionsTable from '@/games/box-hit/PositionsTable';
import CustomSlider from '@/components/CustomSlider';
import { cleanupSoundManager } from '@/lib/sound/SoundManager';
import { useGameStore, useUIStore } from '@/stores';
import { useUserStore } from '@/stores/userStore';
import ErrorBoundary from '@/components/ErrorBoundary';
import { logger } from '@/utils/logger';
import Canvas from '@/components/canvas/Canvas';

/** Centralized trading colors */
const TRADING_COLORS = {
  positive: '#2fe3ac',  // Green for positive values (gains, up movements)
  negative: '#ec397a',  // Red for negative values (losses, down movements)
} as const;

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
  
  // Get signature color from UI store
  const signatureColor = useUIStore((state) => state.signatureColor);
  
  // Zustand stores - get only the actions we need
  const updateGameSettings = useGameStore((state) => state.updateGameSettings);
  
  // Zustand setter functions
  const setShowProbabilities = (show: boolean) => updateGameSettings({ showProbabilities: show });
  const setShowOtherPlayers = (show: boolean) => updateGameSettings({ showOtherPlayers: show });
  const setMinMultiplier = (mult: number) => updateGameSettings({ minMultiplier: mult });
  const setTimeframe = (ms: number) => updateGameSettings({ timeframe: ms });
  const setSelectedAsset = (asset: 'BTC' | 'ETH' | 'SOL' | 'DEMO') => updateGameSettings({ selectedAsset: asset });
  
  // Toggle favorite asset (now uses Zustand store)
  const toggleFavorite = (asset: 'BTC' | 'ETH' | 'SOL' | 'DEMO', event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent dropdown from closing
    toggleFavoriteAsset(asset);
  };
  
  // Helper function to format volume in billions
  const formatVolumeInBillions = (volume: number): string => {
    const billions = volume / 1_000_000_000;
    return `${billions.toFixed(2)}B`;
  };

  // Asset data with live prices and 24h stats
  const assetData = {
    DEMO: {
      name: 'Demo Asset',
      symbol: 'DEMO',
      icon: 'https://framerusercontent.com/images/dWPrOABO15xb2dkrxTZj3Z6cAU.png?width=256&height=256',
      price: 100.00, // Fixed demo price
      change24h: 2.50,
      volume24h: '45.20B'
    },
    BTC: {
      name: 'Bitcoin',
      symbol: 'BTC',
      icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/d8/fd/f6/d8fdf69a-e716-1018-1740-b344df03476a/AppIcon-0-0-1x_U007epad-0-11-0-sRGB-85-220.png/460x0w.webp',
      price: 65000, // Static for now
      change24h: 2.5,
      volume24h: '45.20B'
    },
    ETH: {
      name: 'Ethereum',
      symbol: 'ETH',
      icon: 'https://static1.tokenterminal.com//ethereum/logo.png?logo_hash=fd8f54cab23f8f4980041f4e74607cac0c7ab880',
      price: 3420,
      change24h: 1.8,
      volume24h: '25.30B'
    },
    SOL: {
      name: 'Solana',
      symbol: 'SOL',
      icon: 'https://avatarfiles.alphacoders.com/377/377220.png',
      price: 142.50,
      change24h: -0.5,
      volume24h: '8.45B'
    }
  };
  
  // UserStore integration for mock backend PnL tracking
  const addTrade = useUserStore((state) => state.addTrade);
  const settleTrade = useUserStore((state) => state.settleTrade);
  
  // Get individual values to avoid object recreation on every render
  const balance = useUserStore((state) => state.balance);
  const activeTradesCount = useUserStore((state) => state.activeTrades.length);
  const tradeHistoryCount = useUserStore((state) => state.tradeHistory.length);
  const totalProfit = useUserStore((state) => state.stats.totalProfit);

  // Debug userStore state changes (only when values actually change)
  useEffect(() => {
    console.log('📊 Mock Backend - UserStore state changed:', {
      balance,
      activeTradesCount,
      tradeHistoryCount,
      totalProfit
    });
  }, [balance, activeTradesCount, tradeHistoryCount, totalProfit]);
  
  // Local state for UI-specific data (not part of game logic)
  const [selectedCount, setSelectedCount] = useState(0); // Number of boxes selected
  const [bestMultiplier, setBestMultiplier] = useState(0); // Best multiplier among selected boxes
  const [selectedMultipliers, setSelectedMultipliers] = useState<number[]>([]); // Array of multipliers for selected boxes
  const [averagePositionPrice, setAveragePositionPrice] = useState<number | null>(null);
  
  // Use Zustand store for game settings - subscribe to individual values
  const minMultiplier = useGameStore((state) => state.gameSettings.minMultiplier);
  const showOtherPlayers = useGameStore((state) => state.gameSettings.showOtherPlayers);
  const zoomLevel = useGameStore((state) => state.gameSettings.zoomLevel);
  const showProbabilities = useGameStore((state) => state.gameSettings.showProbabilities);
  const gameBetAmount = useGameStore((state) => state.gameSettings.betAmount);
  const timeframe = useGameStore((state) => state.gameSettings.timeframe);
  const selectedAsset = useGameStore((state) => state.gameSettings.selectedAsset);
  
  // UI store for dropdowns and preferences
  const favoriteAssets = useUIStore((state) => state.favoriteAssets);
  const isAssetDropdownOpen = useUIStore((state) => state.isAssetDropdownOpen);
  const toggleFavoriteAsset = useUIStore((state) => state.toggleFavoriteAsset);
  const setAssetDropdownOpen = useUIStore((state) => state.setAssetDropdownOpen);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.asset-dropdown')) {
        setAssetDropdownOpen(false);
      }
    };
    
    if (isAssetDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAssetDropdownOpen, setAssetDropdownOpen]);
  
  // Toast notification state - support up to 5 stacked toasts with animation states
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; timestamp: number; isVisible: boolean; type: 'success' | 'error' | 'info' | 'warning' }>>([]);
  
  // Function to show a toast notification
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Date.now(); // Unique ID for the toast
    const newToast = { id, message, type, timestamp: Date.now(), isVisible: true };
    
    setToasts(prev => {
      const updated = [...prev, newToast];
      // Keep only the latest 5 toasts
      if (updated.length > 5) {
        return updated.slice(-5);
      }
      return updated;
    });
    
    // Start fade out after 2.5 seconds, then remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.map(toast => 
        toast.id === id ? { ...toast, isVisible: false } : toast
      ));
    }, 2500);
    
    // Remove toast completely after fade out completes
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  }, []);
  
  // Function to hide a toast notification manually
  const hideToast = useCallback((id: number) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, isVisible: false } : toast
    ));
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 300); // Allow time for fade-out animation
  }, []);
  
  // Bet amount state - synced with right panel
  const [betAmount, setBetAmount] = useState(200);
  const [isCanvasStarted, setIsCanvasStarted] = useState(false); // Controls mock backend canvas
  const [mockBackendPositions, setMockBackendPositions] = useState<Map<string, any>>(new Map());
  const [mockBackendContracts, setMockBackendContracts] = useState<any[]>([]);
  const [mockBackendHitBoxes, setMockBackendHitBoxes] = useState<string[]>([]);
  const [mockBackendMissedBoxes, setMockBackendMissedBoxes] = useState<string[]>([]);
  const [mockBackendCurrentPrice, setMockBackendCurrentPrice] = useState(100);
  
  // Mock backend selection stats (updated immediately when boxes are selected)
  const [mockBackendSelectedCount, setMockBackendSelectedCount] = useState(0);
  const [mockBackendSelectedMultipliers, setMockBackendSelectedMultipliers] = useState<number[]>([]);
  const [mockBackendBestMultiplier, setMockBackendBestMultiplier] = useState(0);
  const [mockBackendSelectedAveragePrice, setMockBackendSelectedAveragePrice] = useState<number | null>(null);
  
  // Keep track of previous positions using a ref to avoid infinite loops
  const previousPositionsRef = useRef<Map<string, any>>(new Map());
  const previousCountRef = useRef(0); // For toast notification logic
  
  // Handle mock backend positions and contracts update
  // Keep this callback stable (no dependencies) to ensure Canvas always calls it properly
  const handleMockBackendPositionsChange = useCallback((positions: Map<string, any>, contracts: any[], hitBoxes: string[], missedBoxes: string[]) => {
    console.log('🔄 ClientView: Received from Canvas:', { 
      activePositionsSize: positions.size,
      positions: Array.from(positions.entries()),
      hitBoxes, 
      missedBoxes,
      contractsCount: contracts.length
    });

    // Track new positions in userStore
    const previousPositions = previousPositionsRef.current;

    // Find new positions that weren't in the previous state
    positions.forEach((position, positionId) => {
      if (!previousPositions.has(positionId)) {
        console.log('➕ New position detected, adding trade to userStore:', {
          positionId,
          contractId: position.contractId,
          amount: betAmount
        });

        // Add trade to userStore
        const tradeId = `trade_${position.contractId}`;
        addTrade({
          id: tradeId,
          contractId: position.contractId,
          amount: betAmount,
          placedAt: new Date(),
        });
      }
    });

    // Track hit positions (settle as wins)
    hitBoxes.forEach((contractId) => {
      // Find the position for this contract
      const position = Array.from(positions.values()).find(p => p.contractId === contractId);
      if (position) {
        const contract = contracts.find(c => c.contractId === contractId);
      if (contract) {
          const payout = betAmount * (contract.returnMultiplier || 1);

          console.log('✅ Position hit, settling trade as win:', {
            contractId,
            amount: betAmount,
            payout,
            multiplier: contract.returnMultiplier
          });

          // Find the trade ID by contractId (since we use contractId as the key)
          const tradeId = `trade_${contractId}`;
          settleTrade(tradeId, 'win', payout);
        }
      }
    });

    // Track missed positions (settle as losses)
    missedBoxes.forEach((contractId) => {
      console.log('❌ Position missed, settling trade as loss:', {
        contractId,
        amount: betAmount
      });

      // Find the trade ID by contractId (since we use contractId as the key)
      const tradeId = `trade_${contractId}`;
      settleTrade(tradeId, 'loss', 0);
    });

    setMockBackendPositions(positions);
    setMockBackendContracts(contracts);
    setMockBackendHitBoxes(hitBoxes);
    setMockBackendMissedBoxes(missedBoxes);

    // Update the ref for next comparison
    previousPositionsRef.current = new Map(positions);
  }, [betAmount, addTrade, settleTrade]);

  // Handle mock backend selection changes (immediate feedback when boxes are selected)
  const handleMockBackendSelectionChange = useCallback((count: number, best: number, multipliers: number[], averagePrice?: number | null) => {
    console.log('📊 ClientView: Selection changed from Canvas:', {
      count,
      bestMultiplier: best,
      multipliers,
      averagePrice
    });
    setMockBackendSelectedCount(count);
    setMockBackendBestMultiplier(best);
    setMockBackendSelectedMultipliers(multipliers);
    setMockBackendSelectedAveragePrice(averagePrice || null);

    // Update previous count for future comparisons
    previousCountRef.current = count;
  }, []);

  // Mock backend position count and multipliers for PositionsTable
  const mockBackendPositionCount = useMemo(() => mockBackendPositions.size, [mockBackendPositions]);
  const mockBackendMultipliers = useMemo(() => {
    const mults: number[] = [];
    
    mockBackendPositions.forEach((position) => {
      const contract = mockBackendContracts.find(c => c.contractId === position.contractId);
      if (contract) {
        mults.push(contract.returnMultiplier || 1);
      }
    });
    return mults;
  }, [mockBackendPositions, mockBackendContracts]);

  // Mock backend average position price
  const mockBackendSelectedAveragePriceCalc = useMemo(() => {
    if (mockBackendPositions.size === 0) return null;
    let total = 0;
    mockBackendPositions.forEach((position) => {
      total += betAmount; // Assuming betAmount is the "price" for simplicity
    });
    const average = total / mockBackendPositions.size;
    return average;
  }, [mockBackendPositions, mockBackendContracts, mockBackendMultipliers, mockBackendPositionCount, betAmount]);
  
  // Debug: Log what will be passed to PositionsTable
  useEffect(() => {
    console.log('📊 ClientView: PositionsTable props:', {
      mockBackendPositionsSize: mockBackendPositions.size,
      mockBackendContractsLength: mockBackendContracts.length,
      mockBackendHitBoxesLength: mockBackendHitBoxes.length,
      mockBackendMissedBoxesLength: mockBackendMissedBoxes.length,
      mockBackendPositionCount,
      mockBackendMultipliers: mockBackendMultipliers.length
    });
  }, [mockBackendPositions, mockBackendContracts, mockBackendHitBoxes, mockBackendMissedBoxes, mockBackendPositionCount, mockBackendMultipliers]);

  const handleTradingModeChange = useCallback((tradingMode: boolean) => {
    // Control canvas start/stop
      setIsCanvasStarted(tradingMode);
  }, []);

      return (
      <>
      <div className="relative flex h-full w-full bg-zinc-950 text-white">
        {/* Left side with header and canvas */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar - Only over Canvas */}
          <div className="relative z-10 flex h-16 w-full items-center justify-between border-b border-zinc-800 bg-[#09090B] px-6">
            {/* Left side: Asset info */}
            <div className="flex items-center gap-4">
              {/* Asset Icon */}
              <div className="rounded-lg overflow-hidden" style={{ width: '28px', height: '28px' }}>
                <img 
                src={assetData[selectedAsset].icon} 
                alt={assetData[selectedAsset].name} 
                  className="w-full h-full object-cover"
                />
              </div>
              
            {/* Asset Selector Dropdown */}
              <div className="relative asset-dropdown">
                <div 
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setAssetDropdownOpen(!isAssetDropdownOpen)}
                title="Select asset"
                >
                  <div className="text-white leading-none" style={{ fontSize: '18px', fontWeight: 500 }}>
                  {assetData[selectedAsset].symbol}
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
                    {Object.entries(assetData).map(([key, asset]) => (
                      <div
                        key={key}
                        className={`flex items-center gap-4 px-4 py-3 transition-colors ${
                          key === 'DEMO' 
                            ? `cursor-pointer hover:bg-zinc-800/50 ${selectedAsset === key ? 'bg-zinc-800/50' : ''}`
                            : `cursor-pointer hover:bg-zinc-800/50 ${selectedAsset === key ? 'bg-zinc-800/50' : ''} opacity-50`
                        }`}
                        onClick={() => {
                        if (key === 'DEMO') {
                          setSelectedAsset(key as 'BTC' | 'ETH' | 'SOL' | 'DEMO');
                          setAssetDropdownOpen(false);
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
                          className="flex-shrink-0 p-1 rounded transition-colors cursor-pointer hover:bg-zinc-700/50"
                        >
                          <svg 
                            className={`w-4 h-4 transition-colors ${
                              favoriteAssets.has(key as 'BTC' | 'ETH' | 'SOL' | 'DEMO') 
                                ? 'text-yellow-400 fill-current' 
                                : 'text-zinc-500 fill-none'
                            }`} 
                            fill="currentColor" 
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={favoriteAssets.has(key as 'BTC' | 'ETH' | 'SOL' | 'DEMO') ? 0 : 1.5}
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </button>
                        
                        {/* Asset icon */}
                        <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                          <img 
                            src={asset.icon} 
                            alt={asset.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        {/* Asset info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium">{asset.symbol}</div>
                          <div className="text-zinc-400" style={{ fontSize: '12px' }}>{asset.name}</div>
                        </div>
                        
                        {/* Price and change */}
                        <div className="text-right flex-shrink-0 mr-3">
                          <div className="text-white text-sm font-medium">
                            {asset.price 
                              ? asset.price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                              : <span className="text-zinc-500">--</span>
                            }
                          </div>
                          <div 
                            style={{ 
                              color: asset.change24h >= 0 ? TRADING_COLORS.positive : TRADING_COLORS.negative,
                              fontSize: '12px',
                              fontWeight: 500
                            }}
                          >
                            {asset.change24h !== 0 
                              ? `${asset.change24h >= 0 ? '+' : ''}${asset.change24h.toFixed(2)}%`
                              : <span className="text-zinc-500">--</span>
                            }
                          </div>
                        </div>
                        
                        {/* Volume text */}
                        <div className="text-zinc-400 flex-shrink-0" style={{ fontSize: '12px' }}>
                          Vol: {asset.volume24h}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Current Value */}
              <div className="text-white leading-none" style={{ fontSize: '28px', fontWeight: 500 }}>
                ${(selectedAsset === 'DEMO' ? mockBackendCurrentPrice : assetData[selectedAsset].price).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              </div>
              
              {/* 24h Change */}
              <div className="leading-none">
                <div className="text-zinc-400 leading-none" style={{ fontSize: '12px' }}>24h Change</div>
                <div className="font-medium leading-none" style={{ 
                  fontSize: '18px',
                  color: (selectedAsset === 'DEMO' ? 2.5 : assetData[selectedAsset].change24h) >= 0 ? TRADING_COLORS.positive : TRADING_COLORS.negative
                }}>
                  {(selectedAsset === 'DEMO' ? 2.5 : assetData[selectedAsset].change24h) >= 0 ? '+' : ''}{(selectedAsset === 'DEMO' ? 2.5 : assetData[selectedAsset].change24h).toFixed(2)}%
                </div>
              </div>
              
              {/* 24h Volume */}
              <div className="leading-none">
                <div className="text-zinc-400 leading-none" style={{ fontSize: '12px' }}>24h Volume</div>
                <div className="text-white leading-none" style={{ fontSize: '18px' }}>
                  {selectedAsset === 'DEMO' ? '45.20B' : assetData[selectedAsset].volume24h}
                </div>
              </div>
            </div>
            
            {/* Right side: Probabilities, User icon and Multiplier filter */}
            <div className="flex items-center gap-6">
              {/* Probabilities Checkbox - Toggle for Heatmap Overlay */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showProbabilities"
                  checked={showProbabilities}
                onChange={(e) => {
                  console.log('🔥 Show Probabilities toggled:', e.target.checked);
                  setShowProbabilities(e.target.checked);
                }}
                  className="w-3 h-3 rounded cursor-pointer"
                  style={{
                    borderColor: showProbabilities ? '#0F0F0F' : 'transparent',
                    backgroundColor: showProbabilities ? signatureColor : 'transparent',
                    borderRadius: '4px',
                    borderWidth: '1px',
                    padding: '0px',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    outline: showProbabilities ? `1px solid ${signatureColor}` : `1px solid #52525B`,
                    outlineOffset: '1px'
                  }}
                />
                <label 
                  htmlFor="showProbabilities" 
                  className="text-zinc-400 cursor-pointer select-none"
                  style={{ fontSize: '12px' }}
                >
                  Heatmap
                </label>
              </div>

              {/* Other Players Checkbox - Toggle for Other Players */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showOtherPlayers"
                  checked={showOtherPlayers}
                onChange={(e) => {
                  console.log('🔧 Show Other Players toggled:', e.target.checked);
                  setShowOtherPlayers(e.target.checked);
                }}
                  className="w-3 h-3 rounded cursor-pointer"
                  style={{
                    borderColor: showOtherPlayers ? '#0F0F0F' : 'transparent',
                    backgroundColor: showOtherPlayers ? signatureColor : 'transparent',
                    borderRadius: '4px',
                    borderWidth: '1px',
                    padding: '0px',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    outline: showOtherPlayers ? `1px solid ${signatureColor}` : `1px solid #52525B`,
                    outlineOffset: '1px'
                  }}
                />
                <label 
                  htmlFor="showOtherPlayers" 
                  className="text-zinc-400 cursor-pointer select-none"
                  style={{ fontSize: '12px' }}
                >
                  Show Players
                </label>
              </div>
              
            {/* Multiplier Filter Slider */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Multiplier:</span>
                    <CustomSlider
                      min={1.0}
                      max={15.0}
                      step={0.1}
                      value={minMultiplier}
                      onChange={setMinMultiplier}
                className="w-24"
              />
              <span className="text-xs font-medium text-white">{minMultiplier.toFixed(1)}x</span>

                {/* Timeframe Selector */}
              <div className="flex gap-1 ml-4">
                {[500, 1000, 2000, 4000, 10000].map((ms) => {
                  const isSelected = timeframe === ms;
                  const label = ms === 500 ? '0.5s' : ms < 1000 ? `${ms}ms` : `${ms/1000}s`;
                  return (
                  <button
                      key={ms}
                      onClick={() => setTimeframe(ms)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        isSelected
                          ? 'text-white'
                          : 'text-zinc-400 hover:text-white'
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
                </div>
            </div>
          </div>
          
          {/* Canvas Area */}
          <div className="flex-1">
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
                showToast('⚠️ Game canvas error occurred. Please refresh if issues persist.');
              }}
            >
              {/* Show Canvas component controlled by Start Trading button */}
                <div className="w-full h-[520px] overflow-hidden" style={{ backgroundColor: '#0E0E0E' }}>
                  <Canvas 
                    externalControl={true}
                    externalIsStarted={isCanvasStarted}
                    onExternalStartChange={setIsCanvasStarted}
                    externalTimeframe={timeframe}
                    onPositionsChange={handleMockBackendPositionsChange}
                    onSelectionChange={handleMockBackendSelectionChange}
                    betAmount={betAmount}
                    onPriceUpdate={setMockBackendCurrentPrice}
                    showProbabilities={showProbabilities}
                  showOtherPlayers={showOtherPlayers}
                    minMultiplier={minMultiplier}
                  />
                </div>
            </ErrorBoundary>
          
          <PositionsTable 
              selectedCount={mockBackendPositionCount}
              selectedMultipliers={mockBackendMultipliers}
            betAmount={betAmount}
              currentBTCPrice={mockBackendCurrentPrice}
            onPositionHit={(positionId) => {
              // Handle position hit - this will be called when a box is hit
              logger.info('Position hit', { positionId }, 'GAME');
            }}
            onPositionMiss={(positionId) => {
              // Handle position missed - this will be called when a box is missed
              logger.info('Position missed', { positionId }, 'GAME');
            }}
              hitBoxes={mockBackendHitBoxes}
              missedBoxes={mockBackendMissedBoxes}
              realPositions={mockBackendPositions}
              contracts={mockBackendContracts}
            />
          </div>
        </div>
        
        {/* Right: betting panel only */}
        <RightPanel 
          isTradingMode={isCanvasStarted}
          onTradingModeChange={handleTradingModeChange}
          selectedCount={mockBackendSelectedCount}
          bestMultiplier={mockBackendBestMultiplier}
          selectedMultipliers={mockBackendSelectedMultipliers}
          currentBTCPrice={mockBackendCurrentPrice}
          averagePositionPrice={mockBackendSelectedAveragePrice || null}
          betAmount={betAmount}
          onBetAmountChange={setBetAmount}
          dailyHigh={mockBackendCurrentPrice + 2}
          dailyLow={mockBackendCurrentPrice - 2}
        />
      </div>
      
      {/* Toast Notifications - Stacked from bottom-right, oldest on top, newest on bottom */}
      <div className="fixed bottom-4 right-4 z-50 space-y-3">
        {toasts.map((toast, index) => (
          <div 
            key={toast.id}
            className={`bg-[#171717] border border-zinc-700 rounded-lg px-5 py-4 shadow-lg flex items-center gap-4 transition-all duration-300 ease-in-out transform ${
              toast.isVisible 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-2'
            }`}
            style={{ zIndex: 1000 + index }} // Ensure correct stacking order
          >
            <div className="flex-shrink-0">
              {toast.type === 'success' && <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              {toast.type === 'error' && <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              {toast.type === 'info' && <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              {toast.type === 'warning' && <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
            </div>
            <div className="flex-grow text-sm text-zinc-200">{toast.message}</div>
            <button onClick={() => hideToast(toast.id)} className="flex-shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>
        </>
    );
}