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
import { TRADING_COLORS, ASSET_DATA, TIMEFRAME_OPTIONS } from '@/lib/constants/trading';
import { Contract, Position } from '@/types/game';
import { handleCanvasError } from '@/lib/errorHandler';


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
  const [mockBackendCurrentPrice, setMockBackendCurrentPrice] = useState(100);
  const [mockBackendSelectedCount, setMockBackendSelectedCount] = useState(0);
  const [mockBackendSelectedMultipliers, setMockBackendSelectedMultipliers] = useState<number[]>([]);
  const [mockBackendBestMultiplier, setMockBackendBestMultiplier] = useState(0);
  const [mockBackendSelectedAveragePrice, setMockBackendSelectedAveragePrice] = useState<number | null>(null);

  // Keep track of previous positions using a ref to avoid infinite loops
  const previousPositionsRef = useRef<Map<string, Position>>(new Map());
  const previousCountRef = useRef(0);

  // Optimized store subscriptions - single selectors to reduce re-renders
  const gameSettings = useGameStore((state) => state.gameSettings);
  const uiState = useUIStore((state) => ({
    favoriteAssets: state.favoriteAssets,
    isAssetDropdownOpen: state.isAssetDropdownOpen,
    signatureColor: state.signatureColor
  }));
  
  // Destructure for easier access
  const { minMultiplier, showOtherPlayers, showProbabilities, timeframe, selectedAsset } = gameSettings;
  const { favoriteAssets, isAssetDropdownOpen, signatureColor } = uiState;

  // Simplified store actions - direct access for better performance
  const updateGameSettings = useGameStore.getState().updateGameSettings;
  const toggleFavoriteAsset = useUIStore.getState().toggleFavoriteAsset;
  const setAssetDropdownOpen = useUIStore.getState().setAssetDropdownOpen;
  const addTrade = useUserStore.getState().addTrade;
  const settleTrade = useUserStore.getState().settleTrade;
  
  // Memoized setter functions for stable references
  const setShowProbabilities = useCallback((show: boolean) => updateGameSettings({ showProbabilities: show }), [updateGameSettings]);
  const setShowOtherPlayers = useCallback((show: boolean) => updateGameSettings({ showOtherPlayers: show }), [updateGameSettings]);
  const setMinMultiplier = useCallback((mult: number) => updateGameSettings({ minMultiplier: mult }), [updateGameSettings]);
  const setTimeframe = useCallback((ms: number) => updateGameSettings({ timeframe: ms }), [updateGameSettings]);
  const setSelectedAsset = useCallback((asset: 'BTC' | 'ETH' | 'SOL' | 'DEMO') => updateGameSettings({ selectedAsset: asset }), [updateGameSettings]);
  
  const toggleFavorite = useCallback((asset: 'BTC' | 'ETH' | 'SOL' | 'DEMO', event: React.MouseEvent) => {
    event.stopPropagation();
    toggleFavoriteAsset(asset);
  }, [toggleFavoriteAsset]);

  // Handle mock backend positions and contracts update
  const handleMockBackendPositionsChange = useCallback((positions: Map<string, Position>, contracts: Contract[], hitBoxes: string[], missedBoxes: string[]) => {
    try {
      // Track new positions in userStore
      const previousPositions = previousPositionsRef.current;

      // Find new positions that weren't in the previous state
      positions.forEach((position, positionId) => {
        if (!previousPositions.has(positionId)) {
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
        const position = Array.from(positions.values()).find(p => p.contractId === contractId);
        if (position) {
          const contract = contracts.find(c => c.contractId === contractId);
          if (contract) {
            const payout = betAmount * (contract.returnMultiplier || 1);
            const tradeId = `trade_${contractId}`;
            settleTrade(tradeId, 'win', payout);
          }
        }
      });

      // Track missed positions (settle as losses)
      missedBoxes.forEach((contractId) => {
        const tradeId = `trade_${contractId}`;
        settleTrade(tradeId, 'loss', 0);
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
  }, [betAmount, addTrade, settleTrade]);

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
        setAssetDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAssetDropdownOpen, setAssetDropdownOpen]);

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
                src={ASSET_DATA[selectedAsset].icon} 
                alt={ASSET_DATA[selectedAsset].name} 
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
                  {ASSET_DATA[selectedAsset].symbol}
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
                          className="flex-shrink-0 p-0.5 rounded transition-colors cursor-pointer hover:bg-zinc-700/50"
                        >
                          <svg 
                            className={`w-3.5 h-3.5 transition-colors ${
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
                              color: asset.change24h >= 0 ? TRADING_COLORS.positive : TRADING_COLORS.negative,
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
                ${(selectedAsset === 'DEMO' ? mockBackendCurrentPrice : ASSET_DATA[selectedAsset].price).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              </div>
              
              {/* 24h Change */}
              <div className="leading-none">
                <div className="text-zinc-400 leading-none" style={{ fontSize: '12px' }}>24h Change</div>
                <div className="font-medium leading-none" style={{ 
                  fontSize: '18px',
                  color: (selectedAsset === 'DEMO' ? 2.5 : ASSET_DATA[selectedAsset].change24h) >= 0 ? TRADING_COLORS.positive : TRADING_COLORS.negative
                }}>
                  {(selectedAsset === 'DEMO' ? 2.5 : ASSET_DATA[selectedAsset].change24h) >= 0 ? '+' : ''}{(selectedAsset === 'DEMO' ? 2.5 : ASSET_DATA[selectedAsset].change24h).toFixed(2)}%
                </div>
              </div>
              
              {/* 24h Volume */}
              <div className="leading-none">
                <div className="text-zinc-400 leading-none" style={{ fontSize: '12px' }}>24h Volume</div>
                <div className="text-white leading-none" style={{ fontSize: '18px' }}>
                  {selectedAsset === 'DEMO' ? '45.20B' : ASSET_DATA[selectedAsset].volume24h}
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
                      // Update mock backend current price through the hook
                      // This will be handled by the Canvas component directly
                    }}
                    showProbabilities={showProbabilities}
                    showOtherPlayers={showOtherPlayers}
                    minMultiplier={minMultiplier}
                  />
                </div>
            </ErrorBoundary>
          
          <PositionsTable 
            betAmount={betAmount}
            currentBTCPrice={mockBackendCurrentPrice}
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
      {/* Toast notifications are now handled by the centralized GlobalToast component */}
        </>
    );
}