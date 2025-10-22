import { useCallback, useEffect, useMemo } from 'react';
import { useGameStore } from '@/shared/state/gameStore';
import { usePriceStore } from '@/shared/state/priceStore';
import { useUIStore } from '@/shared/state/uiStore';

/**
 * Custom hook that integrates ClientView with Zustand stores
 * This provides a bridge between the existing ClientView logic and our new store architecture
 */
export function useGameIntegration({
  rows = 6,
  cols = 8,
  tickMs = 2000,
  live = false,
  minMultiplier = 1.0,
  onSelectionChange,
  onPriceUpdate,
}: {
  rows?: number;
  cols?: number;
  tickMs?: number;
  live?: boolean;
  minMultiplier?: number;
  onSelectionChange?: (count: number, best: number, multipliers: number[], averagePrice?: number | null) => void;
  onPriceUpdate?: (price: number) => void;
}) {
  // Get state from stores
  const {
    gridCells,
    gameSettings,
    gameStats,
    isGameActive,
    currentTime,
    hoveredCell,
    showGrid,
    showStats,
    setGridCells,
    updateCell,
    toggleCellSelection,
    clearSelection,
    addPosition,
    updatePosition,
    removePosition,
    updateGameSettings,
    setGameActive,
    setCurrentTime,
    setSelectedCells,
    setHoveredCell,
    setShowGrid,
    setShowStats,
    hitCell,
    missCell,
    processGameTick,
    resetGame,
    getSelectedCells,
    getActivePositions,
    getTotalPotentialPayout,
    getGameProgress,
  } = useGameStore();

  const {
    isConnected,
    updateConfig,
    startSimulation,
    stopSimulation,
    getLatestPrice,
    getPriceHistory,
    getPriceRange,
    getAveragePrice,
    isPriceIncreasing,
  } = usePriceStore();

  const { settings: uiSettings } = useUIStore();

  // Initialize game grid
  const initializeGrid = useCallback(() => {
    const cells = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Calculate multiplier based on position (higher = more risk/reward)
        const mult = minMultiplier + (row * 0.1) + (col * 0.05);
        cells.push({
          id: `cell_${row}_${col}`,
          x: col,
          y: row,
          state: 'empty' as const,
          mult: Math.round(mult * 100) / 100,
        });
      }
    }
    setGridCells(cells);
  }, [rows, cols, minMultiplier, setGridCells]);

  // Initialize price data
  const initializePriceData = useCallback(() => {
    updateConfig({ tickMs, live });
    
    if (live) {
      // Connect to real price feeds
      // This would integrate with the price store's WebSocket connections
    } else {
      // Start simulation
      startSimulation();
    }
  }, [tickMs, live, updateConfig, startSimulation]);

  // Handle cell selection
  const handleCellSelection = useCallback((cellId: string) => {
    toggleCellSelection(cellId);
    
    // Get updated selection data
    const selectedCells = getSelectedCells();
    const count = selectedCells.length;
    const best = count > 0 ? Math.max(...selectedCells.map(cell => cell.mult)) : 0;
    const multipliers = selectedCells.map(cell => cell.mult);
    
    // Notify parent component
    onSelectionChange?.(count, best, multipliers, getLatestPrice());
  }, [toggleCellSelection, getSelectedCells, onSelectionChange, getLatestPrice]);

  // Handle cell hit/miss
  const handleCellHit = useCallback((cellId: string) => {
    hitCell(cellId);
    
    // Play hit sound if enabled
    if (uiSettings.soundEnabled) {
      void import('@/shared/lib/sound/SoundManager').then(async ({ playHitSound }) => {
        await playHitSound();
      });
    }
  }, [hitCell, uiSettings.soundEnabled]);

  const handleCellMiss = useCallback((cellId: string) => {
    missCell(cellId);
  }, [missCell]);

  // Update game settings
  const updateGameConfig = useCallback((newSettings: Partial<typeof gameSettings>) => {
    updateGameSettings(newSettings);
  }, [updateGameSettings]);

  // Start/stop game
  const startGame = useCallback(() => {
    setGameActive(true);
    if (!live) {
      startSimulation();
    }
  }, [setGameActive, startSimulation, live]);

  const stopGame = useCallback(() => {
    setGameActive(false);
    if (!live) {
      stopSimulation();
    }
  }, [setGameActive, stopSimulation, live]);

  // Process game tick
  const processTick = useCallback(() => {
    processGameTick();
    
    // Update current time
    const now = Date.now();
    setCurrentTime(now);
    
    // Update price data if in live mode
    if (live && isConnected) {
      const latestPrice = getLatestPrice();
      onPriceUpdate?.(latestPrice);
    }
  }, [processGameTick, setCurrentTime, live, isConnected, getLatestPrice, onPriceUpdate]);

  // Initialize on mount
  useEffect(() => {
    initializeGrid();
    initializePriceData();
  }, [initializeGrid, initializePriceData]);

  // Game tick processing
  useEffect(() => {
    if (!isGameActive) return;

    const interval = setInterval(processTick, tickMs);
    return () => clearInterval(interval);
  }, [isGameActive, processTick, tickMs]);

  // Computed values
  const gameState = useMemo(() => ({
    // Grid state
    gridCells,
    selectedCells: getSelectedCells(),
    activePositions: getActivePositions(),
    totalPotentialPayout: getTotalPotentialPayout(),
    gameProgress: getGameProgress(),
    
    // Price state
    currentPrice: getLatestPrice(),
    priceHistory: getPriceHistory(300000), // 5 minutes
    priceRange: getPriceRange(300000),
    averagePrice: getAveragePrice(300000),
    isPriceIncreasing: isPriceIncreasing(300000),
    
    // Game state
    isGameActive,
    currentTime,
    gameSettings,
    gameStats,
    
    // UI state
    showGrid,
    showStats,
    hoveredCell,
  }), [
    gridCells,
    getSelectedCells,
    getActivePositions,
    getTotalPotentialPayout,
    getGameProgress,
    getLatestPrice,
    getPriceHistory,
    getPriceRange,
    getAveragePrice,
    isPriceIncreasing,
    isGameActive,
    currentTime,
    gameSettings,
    gameStats,
    showGrid,
    showStats,
    hoveredCell,
  ]);

  return {
    // State
    ...gameState,
    
    // Actions
    handleCellSelection,
    handleCellHit,
    handleCellMiss,
    updateGameConfig,
    startGame,
    stopGame,
    processTick,
    clearSelection,
    resetGame,
    
    // Store actions (for advanced usage)
    setGridCells,
    updateCell,
    addPosition,
    updatePosition,
    removePosition,
    setSelectedCells,
    setHoveredCell,
    setShowGrid,
    setShowStats,
  };
}
