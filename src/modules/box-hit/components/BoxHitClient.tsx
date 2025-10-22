'use client';

import Image from 'next/image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CustomSlider from '@/shared/ui/CustomSlider';
import ErrorBoundary from '@/shared/ui/ErrorBoundary';
import { cleanupSoundManager } from '@/shared/lib/sound/SoundManager';
import { COLORS } from '@/shared/constants/theme';
import { logger } from '@/shared/utils/logger';
import { handleCanvasError } from '@/shared/lib/errorHandler';
import { useGameStore, useUIStore, usePriceStore, useUserStore } from '@/shared/state';
import type { Contract, Position } from '@/shared/types/game';

import { ASSET_DATA, DEFAULT_BET_AMOUNT, TIMEFRAME_OPTIONS } from '@/modules/box-hit/constants';
import Canvas from '@/shared/ui/canvas/Canvas';
import PositionsTable from '@/modules/box-hit/components/PositionsTable';
import RightPanel from '@/modules/box-hit/components/RightPanel';


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
  const [betAmount, setBetAmount] = useState(DEFAULT_BET_AMOUNT);
  const [isCanvasStarted, setIsCanvasStarted] = useState(false);
  
  // Mock backend state
  const [_mockBackendPositions, setMockBackendPositions] = useState<Map<string, Position>>(new Map());
  const [_mockBackendContracts, setMockBackendContracts] = useState<Contract[]>([]);
  const [_mockBackendHitBoxes, setMockBackendHitBoxes] = useState<string[]>([]);
  const [_mockBackendMissedBoxes, setMockBackendMissedBoxes] = useState<string[]>([]);
  const [mockBackendSelectedCount, setMockBackendSelectedCount] = useState(0);
  const [mockBackendSelectedMultipliers, setMockBackendSelectedMultipliers] = useState<number[]>([]);
  const [mockBackendSelectedAveragePrice, setMockBackendSelectedAveragePrice] = useState<number | null>(null);
  
  // Keep track of previous positions using a ref to avoid infinite loops
  const previousPositionsRef = useRef<Map<string, Position>>(new Map());
  const previousCountRef = useRef(0);

  // Consolidated store subscriptions to prevent object recreation on every render
  const gameSettings = useGameStore((state) => state.gameSettings);
  const favoriteAssets = useUIStore((state) => state.favoriteAssets);
  const isAssetDropdownOpen = useUIStore((state) => state.isAssetDropdownOpen);
  const signatureColor = useUIStore((state) => state.signatureColor);
  
  // Destructure for easier access
  const { minMultiplier, showOtherPlayers, showProbabilities, timeframe, selectedAsset } = gameSettings;
  
  // Get real-time price from trading store
  const currentPrice = usePriceStore((state) => state.stats.currentPrice);
  
  // Memoized expensive computations to prevent unnecessary recalculations
  const selectedAssetData = useMemo(() => ASSET_DATA[selectedAsset], [selectedAsset]);
  const favoriteAssetsArray = useMemo(() => Array.from(favoriteAssets), [favoriteAssets]);
  // Store actions - use refs to completely avoid dependency cycles
  const updateGameSettingsRef = useRef(useGameStore.getState().updateGameSettings);
  const toggleFavoriteAssetRef = useRef(useUIStore.getState().toggleFavoriteAsset);
  const setAssetDropdownOpenRef = useRef(useUIStore.getState().setAssetDropdownOpen);
  const addTradeRef = useRef(useUserStore.getState().addTrade);
  const settleTradeRef = useRef(useUserStore.getState().settleTrade);

  // Update refs when store actions change - run only once
  useEffect(() => {
    updateGameSettingsRef.current = useGameStore.getState().updateGameSettings;
    toggleFavoriteAssetRef.current = useUIStore.getState().toggleFavoriteAsset;
    setAssetDropdownOpenRef.current = useUIStore.getState().setAssetDropdownOpen;
    addTradeRef.current = useUserStore.getState().addTrade;
    settleTradeRef.current = useUserStore.getState().settleTrade;
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
  const handleMockBackendSelectionChange = useCallback((count: number, _bestMultiplier: number, multipliers: number[], averagePrice?: number | null) => {
    try {
    setMockBackendSelectedCount(count);
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

      return (
      <>
      <div className="relative flex h-full w-full bg-zinc-950 text-white">
        {/* Left side with header and canvas */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar - Only over Canvas */}
          <div className="relative z-10 flex h-16 w-full items-center justify-between border-b border-zinc-800 px-6" style={{ backgroundColor: COLORS.background.primary }}>
            {/* Left side: Asset info */}
            <div className="flex items-center gap-4">
              {/* Asset Icon */}
              <div className="relative h-7 w-7 overflow-hidden rounded-lg">
                <Image
                  src={selectedAssetData.icon}
                  alt={selectedAssetData.name}
                  fill
                  sizes="28px"
                  className="object-cover"
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
                        <div className="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded">
                          <Image
                            src={asset.icon}
                            alt={asset.name}
                            fill
                            sizes="28px"
                            className="object-cover"
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
              
              {/* Current Value */}
                <div className="text-white leading-none" style={{ fontSize: '28px', fontWeight: 500 }}>
                ${(selectedAsset === 'DEMO' ? currentPrice : selectedAssetData.price).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              </div>
              
              {/* 24h Change */}
              <div className="leading-none">
                <div className="text-zinc-400 leading-none" style={{ fontSize: '12px' }}>24h Change</div>
                <div className="font-medium leading-none" style={{ 
                  fontSize: '18px',
                  color: (selectedAsset === 'DEMO' ? 2.5 : selectedAssetData.change24h) >= 0 ? COLORS.trading.positive : COLORS.trading.negative
                }}>
                  {(selectedAsset === 'DEMO' ? 2.5 : selectedAssetData.change24h) >= 0 ? '+' : ''}{(selectedAsset === 'DEMO' ? 2.5 : selectedAssetData.change24h).toFixed(2)}%
                </div>
              </div>
              
              {/* 24h Volume */}
              <div className="leading-none">
                <div className="text-zinc-400 leading-none" style={{ fontSize: '12px' }}>24h Volume</div>
                <div className="text-white leading-none" style={{ fontSize: '18px' }}>
                  {selectedAsset === 'DEMO' ? '45.20B' : selectedAssetData.volume24h}
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
                onChange={(e) => setShowProbabilities(e.target.checked)}
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
                onChange={(e) => setShowOtherPlayers(e.target.checked)}
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
                {TIMEFRAME_OPTIONS.map((ms) => {
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
                handleCanvasError(error, { 
                  action: 'Canvas rendering',
                  metadata: { errorInfo }
                });
              }}
            >
              {/* Show Canvas component controlled by Start Trading button */}
                <div className="w-full h-[520px] overflow-hidden" style={{ backgroundColor: COLORS.background.secondary }}>
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
                      usePriceStore.getState().updateStats({
                        currentPrice: price,
                        lastUpdate: Date.now(),
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
          
          <PositionsTable currentBTCPrice={currentPrice} />
          </div>
        </div>
        
        {/* Right: betting panel only */}
        <RightPanel 
          isTradingMode={isCanvasStarted}
          onTradingModeChange={handleTradingModeChange}
          selectedCount={mockBackendSelectedCount}
          selectedMultipliers={mockBackendSelectedMultipliers}
          currentBTCPrice={currentPrice}
          averagePositionPrice={mockBackendSelectedAveragePrice || null}
          betAmount={betAmount}
          onBetAmountChange={setBetAmount}
          dailyHigh={currentPrice + 2}
          dailyLow={currentPrice - 2}
        />
      </div>
      {/* Toast notifications are now handled by the centralized GlobalToast component */}
        </>
    );
}
