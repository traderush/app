'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSignatureColor } from '@/contexts/SignatureColorContext';
import { GameCanvas } from '@/components/game/GameCanvas';
import RightPanel from '@/games/box-hit/RightPanel';
import PositionsTable from '@/games/box-hit/PositionsTable';
import { cleanupSoundManager } from '@/lib/sound/SoundManager';
import { useGameStore, usePriceStore, useUIStore } from '@/stores';

export default function ClientViewZustand() {
  const { signatureColor } = useSignatureColor();
  
  // Zustand stores
  const { gameSettings, updateGameSettings } = useGameStore();
  const { priceData, isConnected } = usePriceStore();
  const { settings: uiSettings } = useUIStore();

  // Local state for UI
  const [selectedCount, setSelectedCount] = useState(0);
  const [bestMultiplier, setBestMultiplier] = useState(0);
  const [selectedMultipliers, setSelectedMultipliers] = useState<number[]>([]);
  const [averagePositionPrice, setAveragePositionPrice] = useState<number | null>(null);
  const [currentBTCPrice, setCurrentBTCPrice] = useState<number | null>(null);
  const [minMultiplier, setMinMultiplier] = useState(1.0);
  const [showOtherPlayers, setShowOtherPlayers] = useState(true);
  const [isTradingMode, setIsTradingMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [showProbabilities, setShowProbabilities] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<'BTC' | 'ETH' | 'SOL'>('BTC');

  // Cleanup sound manager on unmount
  useEffect(() => {
    return () => {
      cleanupSoundManager();
    };
  }, []);

  // Handle selection changes from GameCanvas
  const handleSelectionChange = useCallback((
    count: number, 
    best: number, 
    multipliers: number[], 
    averagePrice?: number | null
  ) => {
    setSelectedCount(count);
    setBestMultiplier(best);
    setSelectedMultipliers(multipliers);
    setAveragePositionPrice(averagePrice || null);
  }, []);

  // Handle price updates
  const handlePriceUpdate = useCallback((price: number) => {
    setCurrentBTCPrice(price);
  }, []);

  // Update game settings when local state changes
  useEffect(() => {
    updateGameSettings({
      minMultiplier,
      showOtherPlayers,
      isTradingMode,
      zoomLevel,
      showProbabilities,
      selectedAsset,
    });
  }, [
    minMultiplier,
    showOtherPlayers,
    isTradingMode,
    zoomLevel,
    showProbabilities,
    selectedAsset,
    updateGameSettings,
  ]);

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Main game area */}
      <div className="flex-1 flex">
        {/* Game canvas */}
        <div className="flex-1 p-4">
          <GameCanvas
            rows={6}
            cols={8}
            tickMs={2000}
            live={false}
            minMultiplier={minMultiplier}
            onSelectionChange={handleSelectionChange}
            onPriceUpdate={handlePriceUpdate}
            isTradingMode={isTradingMode}
            realBTCPrice={currentBTCPrice || 0}
            showProbabilities={showProbabilities}
            showOtherPlayers={showOtherPlayers}
            signatureColor={signatureColor}
            zoomLevel={zoomLevel}
          />
        </div>

        {/* Right panel */}
        <div className="w-80 bg-zinc-800 border-l border-zinc-700">
          <RightPanel
            selectedCount={selectedCount}
            bestMultiplier={bestMultiplier}
            selectedMultipliers={selectedMultipliers}
            averagePositionPrice={averagePositionPrice}
            currentBTCPrice={currentBTCPrice}
            minMultiplier={minMultiplier}
            onMinMultiplierChange={setMinMultiplier}
            showOtherPlayers={showOtherPlayers}
            onShowOtherPlayersChange={setShowOtherPlayers}
            isTradingMode={isTradingMode}
            onTradingModeChange={setIsTradingMode}
            zoomLevel={zoomLevel}
            onZoomLevelChange={setZoomLevel}
            showProbabilities={showProbabilities}
            onShowProbabilitiesChange={setShowProbabilities}
            selectedAsset={selectedAsset}
            onSelectedAssetChange={setSelectedAsset}
            signatureColor={signatureColor}
          />
        </div>
      </div>

      {/* Positions table */}
      <div className="h-64 bg-zinc-800 border-t border-zinc-700">
        <PositionsTable
          selectedCount={selectedCount}
          bestMultiplier={bestMultiplier}
          selectedMultipliers={selectedMultipliers}
          averagePositionPrice={averagePositionPrice}
          currentBTCPrice={currentBTCPrice}
          minMultiplier={minMultiplier}
          signatureColor={signatureColor}
          // These props might not be used in the current implementation
          onPositionHit={() => {}}
          onPositionMiss={() => {}}
          hitBoxes={[]}
          missedBoxes={[]}
        />
      </div>

      {/* Status bar */}
      <div className="h-8 bg-zinc-800 border-t border-zinc-700 flex items-center justify-between px-4 text-xs text-zinc-400">
        <div className="flex items-center gap-4">
          <span>WebSocket: {isConnected ? 'Connected' : 'Disconnected'}</span>
          <span>Price Updates: {priceData.length} points</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Asset: {selectedAsset}</span>
          <span>Mode: {isTradingMode ? 'Trading' : 'Simulation'}</span>
        </div>
      </div>
    </div>
  );
}
