'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import RightPanel from '@/modules/box-hit/components/RightPanel';
import PositionsTable from '@/modules/box-hit/components/PositionsTable';
import CustomSlider from '@/shared/ui/CustomSlider';
import { cleanupSoundManager } from '@/shared/lib/sound/SoundManager';
import { useGameStore, useUIStore } from '@/shared/state';
import { useUserStore } from '@/shared/state/userStore';
import ErrorBoundary from '@/shared/ui/ErrorBoundary';
import { logger } from '@/shared/utils/logger';
import Canvas from '@/shared/ui/canvas/Canvas';
import { ASSETS, DEFAULT_BET_AMOUNT, TRADING_COLORS } from './constants';
import type { AssetInfo, AssetKey } from './constants';
import { useToasts } from './hooks/useToasts';
import type { BoxHitContract, BoxHitPositionMap } from '@/shared/types/boxHit';

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
  const { toasts, showToast, hideToast } = useToasts();
  
  // Zustand stores - get only the actions we need
  const updateGameSettings = useGameStore((state) => state.updateGameSettings);
  
  // UserStore integration for mock backend PnL tracking
  const addTrade = useUserStore((state) => state.addTrade);
  const settleTrade = useUserStore((state) => state.settleTrade);
  
  // Get individual values to avoid object recreation on every render
  // Use Zustand store for game settings - individual subscriptions to prevent infinite loops
  const minMultiplier = useGameStore((state) => state.gameSettings.minMultiplier);
  const showOtherPlayers = useGameStore((state) => state.gameSettings.showOtherPlayers);
  const showProbabilities = useGameStore((state) => state.gameSettings.showProbabilities);
  const timeframe = useGameStore((state) => state.gameSettings.timeframe);
  const selectedAsset = useGameStore((state) => state.gameSettings.selectedAsset);
  
  // UI store for dropdowns and preferences - stable subscription to prevent infinite loops
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
  
  type CanvasContract = BoxHitContract;
  
  // Bet amount state - synced with right panel
  const [betAmount, setBetAmount] = useState(DEFAULT_BET_AMOUNT);
  const [isCanvasStarted, setIsCanvasStarted] = useState(false); // Controls mock backend canvas
  const [mockBackendCurrentPrice, setMockBackendCurrentPrice] = useState(100);
  
  // Mock backend selection stats (updated immediately when boxes are selected)
  const [mockBackendSelectedCount, setMockBackendSelectedCount] = useState(0);
  const [mockBackendSelectedMultipliers, setMockBackendSelectedMultipliers] = useState<number[]>([]);
  const [mockBackendSelectedAveragePrice, setMockBackendSelectedAveragePrice] = useState<number | null>(null);

  const assetEntries = useMemo(
    () => Object.entries(ASSETS) as Array<[AssetKey, AssetInfo]>,
    [],
  );
  const selectedAssetKey = selectedAsset as AssetKey;
  const selectedAssetInfo = ASSETS[selectedAssetKey];
  const displayPrice = selectedAssetKey === 'DEMO'
    ? mockBackendCurrentPrice
    : selectedAssetInfo.price;
  const displayChange = selectedAssetKey === 'DEMO'
    ? 2.5
    : selectedAssetInfo.change24h;
  const displayVolume = selectedAssetKey === 'DEMO'
    ? '45.20B'
    : selectedAssetInfo.volume24h;

  const handleShowProbabilitiesChange = useCallback(
    (value: boolean) => updateGameSettings({ showProbabilities: value }),
    [updateGameSettings],
  );

  const handleShowOtherPlayersChange = useCallback(
    (value: boolean) => updateGameSettings({ showOtherPlayers: value }),
    [updateGameSettings],
  );

  const handleMinMultiplierChange = useCallback(
    (value: number) => updateGameSettings({ minMultiplier: value }),
    [updateGameSettings],
  );

  const handleTimeframeChange = useCallback(
    (value: number) => updateGameSettings({ timeframe: value }),
    [updateGameSettings],
  );

  const handleAssetSelect = useCallback(
    (asset: AssetKey) => {
      updateGameSettings({ selectedAsset: asset });
      setAssetDropdownOpen(false);
    },
    [setAssetDropdownOpen, updateGameSettings],
  );

  const handleToggleFavorite = useCallback(
    (asset: AssetKey, event: React.MouseEvent) => {
      event.stopPropagation();
      toggleFavoriteAsset(asset);
    },
    [toggleFavoriteAsset],
  );

  // Keep track of previous positions using a ref to avoid infinite loops
  const previousPositionsRef = useRef<BoxHitPositionMap>(new Map());
  
  // Handle mock backend positions and contracts update
  // Keep this callback stable (no dependencies) to ensure Canvas always calls it properly
  const handleMockBackendPositionsChange = useCallback(
    (
      positions: BoxHitPositionMap,
      contracts: CanvasContract[],
      _hitBoxes: string[],
      _missedBoxes: string[],
    ) => {
      const previousPositions = previousPositionsRef.current;

      positions.forEach((position, positionKey) => {
        const tradeId = position.tradeId ?? positionKey;
        if (!previousPositions.has(tradeId)) {
          addTrade({
            id: tradeId,
            contractId: position.contractId,
            amount: position.amount ?? betAmount,
            placedAt: new Date(position.timestamp ?? Date.now()),
          });
        }

        const previous = previousPositions.get(tradeId);
        if (position.result && position.result !== previous?.result) {
          const contract = contracts.find((c) => c.contractId === position.contractId);
          const wager = position.amount ?? previous?.amount ?? betAmount;
          const resolvedPayout = position.result === 'win'
            ? (typeof position.payout === 'number'
              ? position.payout
              : contract
                ? wager * (contract.returnMultiplier || 1)
                : wager)
            : 0;
          settleTrade(tradeId, position.result, resolvedPayout);
        }
      });

      previousPositionsRef.current = new Map(
        Array.from(positions.entries()).map(([key, value]) => {
          const tradeKey = value.tradeId ?? key;
          return [tradeKey, value];
        }),
      );
    },
    [addTrade, betAmount, settleTrade],
  );

  // Handle mock backend selection changes (immediate feedback when boxes are selected)
  const handleMockBackendSelectionChange = useCallback(
    (count: number, _best: number, multipliers: number[], averagePrice?: number | null) => {
      setMockBackendSelectedCount(count);
      setMockBackendSelectedMultipliers(multipliers);
      setMockBackendSelectedAveragePrice(averagePrice ?? null);
    },
    []
  );

  // Mock backend position count and multipliers for PositionsTable

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
              <div className="relative rounded-lg overflow-hidden" style={{ width: '28px', height: '28px' }}>
                <Image
                  src={selectedAssetInfo.icon}
                  alt={selectedAssetInfo.name}
                  fill
                  className="object-cover"
                  sizes="28px"
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
                  {selectedAssetInfo.symbol}
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
                    {assetEntries.map(([key, asset]) => (
                      <div
                        key={key}
                        className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                          key === 'DEMO' 
                            ? `cursor-pointer hover:bg-zinc-800/50 ${selectedAsset === key ? 'bg-zinc-800/50' : ''}`
                            : `cursor-pointer hover:bg-zinc-800/50 ${selectedAsset === key ? 'bg-zinc-800/50' : ''} opacity-50`
                        }`}
                        onClick={() => {
                          if (key === 'DEMO') {
                            handleAssetSelect(key);
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
                          onClick={(e) => handleToggleFavorite(key, e)}
                          className="flex-shrink-0 p-0.5 rounded transition-colors cursor-pointer hover:bg-zinc-700/50"
                        >
                          <svg 
                            className={`w-3.5 h-3.5 transition-colors ${
                              favoriteAssets.has(key) 
                                ? 'text-yellow-400 fill-current' 
                                : 'text-zinc-500 fill-none'
                            }`} 
                            fill="currentColor" 
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={favoriteAssets.has(key) ? 0 : 1.5}
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </button>
                        
                        {/* Asset icon */}
                        <div className="relative w-7 h-7 rounded overflow-hidden flex-shrink-0">
                          <Image
                            src={asset.icon}
                            alt={asset.name}
                            fill
                            className="object-cover"
                            sizes="28px"
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
                            {asset.price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          </div>
                          <div 
                            style={{ 
                              color: asset.change24h >= 0 ? TRADING_COLORS.positive : TRADING_COLORS.negative,
                              fontSize: '11px',
                              fontWeight: 500
                            }}
                          >
                            {`${asset.change24h >= 0 ? '+' : ''}${asset.change24h.toFixed(2)}%`}
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
                ${displayPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              </div>
              
              {/* 24h Change */}
              <div className="leading-none">
                <div className="text-zinc-400 leading-none" style={{ fontSize: '12px' }}>24h Change</div>
                <div className="font-medium leading-none" style={{ 
                  fontSize: '18px',
                  color: displayChange >= 0 ? TRADING_COLORS.positive : TRADING_COLORS.negative
                }}>
                  {displayChange >= 0 ? '+' : ''}{displayChange.toFixed(2)}%
                </div>
              </div>
              
              {/* 24h Volume */}
              <div className="leading-none">
                <div className="text-zinc-400 leading-none" style={{ fontSize: '12px' }}>24h Volume</div>
                <div className="text-white leading-none" style={{ fontSize: '18px' }}>
                  {displayVolume}
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
                  handleShowProbabilitiesChange(e.target.checked);
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
                  handleShowOtherPlayersChange(e.target.checked);
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
                      onChange={handleMinMultiplierChange}
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
                      onClick={() => handleTimeframeChange(ms)}
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
          
          <PositionsTable currentBTCPrice={mockBackendCurrentPrice} />
          </div>
        </div>
        
        {/* Right: betting panel only */}
          <RightPanel 
          isTradingMode={isCanvasStarted}
          onTradingModeChange={handleTradingModeChange}
          selectedCount={mockBackendSelectedCount}
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
