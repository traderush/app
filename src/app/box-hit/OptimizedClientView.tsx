'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useGameStore, usePriceStore } from '@/stores';
import { useConnectionStatus } from '@/contexts/ConnectionContext';
import { useSignatureColor } from '@/contexts/SignatureColorContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import RightPanel from '@/games/box-hit/RightPanel';
import PositionsTable from '@/games/box-hit/PositionsTable';
import {
  GameControls,
  WebSocketManager,
  SoundManager,
  PriceDisplay,
  GameStats,
  OptimizedBoxHitCanvas
} from '@/games/box-hit/components';

/**
 * Optimized ClientView component - Split from the original 2814-line monolith
 * into focused, performant components with proper memoization and optimization
 */
export default function OptimizedClientView() {
  // State management
  const [isTradingMode, setIsTradingMode] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [bestMultiplier, setBestMultiplier] = useState(0);
  const [selectedMultipliers, setSelectedMultipliers] = useState<number[]>([]);
  const [currentBTCPrice, setCurrentBTCPrice] = useState(0);
  const [averagePositionPrice, setAveragePositionPrice] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState(200);
  const [isConnected, setIsConnected] = useState(false);

  // Context hooks
  const { signatureColor } = useSignatureColor();
  const { setWebSocketConnected, setConnectedExchanges, setLastUpdateTime, setCurrentPrices } = useConnectionStatus();
  
  // Store hooks
  const { 
    gameSettings, 
    updateGameSettings, 
    updateGameStats,
    gameStats
  } = useGameStore();

  const { 
    priceData,
    isConnected: priceConnected,
    currentPrices
  } = usePriceStore();

  // Memoized callbacks
  const handleTradingModeChange = useCallback((tradingMode: boolean) => {
    setIsTradingMode(tradingMode);
    updateGameSettings({ isTradingMode: tradingMode });
  }, [updateGameSettings]);

  const handleBetAmountChange = useCallback((amount: number) => {
    setBetAmount(amount);
  }, []);

  const handleSelectionChange = useCallback((count: number, best: number, multipliers: number[], averagePrice?: number | null) => {
    setSelectedCount(count);
    setBestMultiplier(best);
    setSelectedMultipliers(multipliers);
    if (averagePrice !== undefined) {
      setAveragePositionPrice(averagePrice);
    }
  }, []);

  const handlePriceUpdate = useCallback((price: number) => {
    setCurrentBTCPrice(price);
    setCurrentPrices(prev => ({ ...prev, btc: price }));
    setLastUpdateTime(Date.now());
  }, [setCurrentPrices, setLastUpdateTime]);

  const handleConnectionStatusChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
    setWebSocketConnected(connected);
  }, [setWebSocketConnected]);

  // Memoized computed values
  const latestPrice = useMemo(() => {
    return priceData.length > 0 ? priceData[priceData.length - 1].p : currentBTCPrice;
  }, [priceData, currentBTCPrice]);

  const priceChange = useMemo(() => {
    if (priceData.length < 2) return 0;
    const current = priceData[priceData.length - 1].p;
    const previous = priceData[priceData.length - 2].p;
    return current - previous;
  }, [priceData]);

  // Initialize price from store
  useEffect(() => {
    if (priceData.length > 0) {
      setCurrentBTCPrice(priceData[priceData.length - 1].p);
    }
  }, [priceData]);

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-zinc-950 text-white">
        {/* Main Game Area */}
        <div className="flex-1 flex flex-col">
          {/* Game Canvas */}
          <div className="flex-1 relative">
            <OptimizedBoxHitCanvas
              rows={6}
              cols={8}
              tickMs={2000}
              leftChartFraction={0.25}
              live={false}
              minMultiplier={1.0}
              onSelectionChange={handleSelectionChange}
              onPriceUpdate={handlePriceUpdate}
              isTradingMode={isTradingMode}
              realBTCPrice={currentBTCPrice}
              showProbabilities={gameSettings.showProbabilities}
              showOtherPlayers={gameSettings.showOtherPlayers}
              signatureColor={signatureColor}
              zoomLevel={gameSettings.zoomLevel}
            />
          </div>

          {/* Positions Table */}
          <div className="h-48 border-t border-zinc-800">
            <PositionsTable />
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-80 border-l border-zinc-800 bg-zinc-900/50">
          <div className="h-full flex flex-col">
            {/* Price Display */}
            <div className="p-4 border-b border-zinc-800">
              <PriceDisplay
                currentPrice={latestPrice}
                previousPrice={latestPrice - priceChange}
                isLive={isConnected}
                exchange="Composite"
              />
            </div>

            {/* Game Controls */}
            <div className="p-4 border-b border-zinc-800">
              <GameControls
                isTradingMode={isTradingMode}
                onTradingModeChange={handleTradingModeChange}
                selectedCount={selectedCount}
                bestMultiplier={bestMultiplier}
                selectedMultipliers={selectedMultipliers}
                currentBTCPrice={currentBTCPrice}
                averagePositionPrice={averagePositionPrice}
                betAmount={betAmount}
                onBetAmountChange={handleBetAmountChange}
              />
            </div>

            {/* Game Stats */}
            <div className="p-4 border-b border-zinc-800">
              <GameStats />
            </div>

            {/* Right Panel Content */}
            <div className="flex-1 p-4">
              <RightPanel
                isTradingMode={isTradingMode}
                onTradingModeChange={handleTradingModeChange}
                selectedCount={selectedCount}
                bestMultiplier={bestMultiplier}
                selectedMultipliers={selectedMultipliers}
                currentBTCPrice={currentBTCPrice}
                averagePositionPrice={averagePositionPrice}
                betAmount={betAmount}
                onBetAmountChange={handleBetAmountChange}
              />
            </div>
          </div>
        </div>

        {/* Background Services */}
        <WebSocketManager
          onPriceUpdate={handlePriceUpdate}
          onConnectionStatusChange={handleConnectionStatusChange}
        />
        <SoundManager
          onSoundEnabledChange={(enabled) => updateGameSettings({ soundEnabled: enabled })}
        />
      </div>
    </ErrorBoundary>
  );
}
