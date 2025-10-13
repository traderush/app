import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useGameIntegration } from '@/hooks/useGameIntegration';
import { useUIStore, useSignatureColor } from '@/stores';

interface GameCanvasProps {
  rows?: number;
  cols?: number;
  tickMs?: number;
  live?: boolean;
  minMultiplier?: number;
  onSelectionChange?: (count: number, best: number, multipliers: number[], averagePrice?: number | null) => void;
  onPriceUpdate?: (price: number) => void;
  isTradingMode?: boolean;
  realBTCPrice?: number;
  showProbabilities?: boolean;
  showOtherPlayers?: boolean;
  signatureColor?: string;
  zoomLevel?: number;
}

export function GameCanvas({
  rows = 6,
  cols = 8,
  tickMs = 2000,
  live = false,
  minMultiplier = 1.0,
  onSelectionChange,
  onPriceUpdate,
  isTradingMode = false,
  realBTCPrice = 0,
  showProbabilities = false,
  showOtherPlayers = false,
  signatureColor = '#FA5616',
  zoomLevel = 1.0,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { signatureColor: contextColor } = useSignatureColor();
  const effectiveSignatureColor = signatureColor || contextColor;

  // Use our Zustand-integrated hook
  const {
    gridCells,
    selectedCells,
    currentPrice,
    isGameActive,
    gameSettings,
    showGrid,
    hoveredCell,
    handleCellSelection,
    handleCellHit,
    handleCellMiss,
    startGame,
    stopGame,
    setHoveredCell,
    setShowGrid,
  } = useGameIntegration({
    rows,
    cols,
    tickMs,
    live,
    minMultiplier,
    onSelectionChange,
    onPriceUpdate,
  });

  // Canvas size and rendering
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 520 });

  // Update canvas size on resize
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Render canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Set canvas size
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    // Draw background
    ctx.fillStyle = '#09090B';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    if (!showGrid) return;

    // Calculate cell dimensions
    const cellWidth = canvasSize.width / cols;
    const cellHeight = canvasSize.height / rows;

    // Draw grid cells
    gridCells.forEach((cell) => {
      const x = cell.x * cellWidth;
      const y = cell.y * cellHeight;

      // Determine cell color based on state
      let fillColor = '#1a1a1a';
      let borderColor = '#333';

      switch (cell.state) {
        case 'selected':
          fillColor = effectiveSignatureColor;
          borderColor = effectiveSignatureColor;
          break;
        case 'hit':
          fillColor = '#2fe3ac';
          borderColor = '#2fe3ac';
          break;
        case 'missed':
          fillColor = '#ec397a';
          borderColor = '#ec397a';
          break;
        case 'empty':
        default:
          fillColor = '#1a1a1a';
          borderColor = '#333';
          break;
      }

      // Highlight hovered cell (hoveredCell is a string cellId in the store)
      if (hoveredCell === cell.id) {
        fillColor = `${effectiveSignatureColor}40`;
        borderColor = effectiveSignatureColor;
      }

      // Draw cell
      ctx.fillStyle = fillColor;
      ctx.fillRect(x, y, cellWidth, cellHeight);

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cellWidth, cellHeight);

      // Draw multiplier text
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `${cell.mult}x`,
        x + cellWidth / 2,
        y + cellHeight / 2
      );
    });

    // Draw price indicator
    if (currentPrice > 0) {
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`BTC: $${currentPrice.toLocaleString()}`, 10, 25);
    }

    // Draw game status
    ctx.fillStyle = isGameActive ? '#2fe3ac' : '#ec397a';
    ctx.fillText(isGameActive ? 'LIVE' : 'STOPPED', 10, 45);
  }, [
    canvasSize,
    gridCells,
    selectedCells,
    currentPrice,
    isGameActive,
    showGrid,
    hoveredCell,
    cols,
    rows,
    effectiveSignatureColor,
  ]);

  // Re-render when dependencies change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Handle mouse events
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const cellWidth = canvasSize.width / cols;
    const cellHeight = canvasSize.height / rows;

    const cellX = Math.floor(x / cellWidth);
    const cellY = Math.floor(y / cellHeight);

    if (cellX >= 0 && cellX < cols && cellY >= 0 && cellY < rows) {
      const cellId = `cell_${cellY}_${cellX}`;
      setHoveredCell(cellId);
    } else {
      setHoveredCell(null);
    }
  }, [canvasSize, cols, rows, setHoveredCell]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const cellWidth = canvasSize.width / cols;
    const cellHeight = canvasSize.height / rows;

    const cellX = Math.floor(x / cellWidth);
    const cellY = Math.floor(y / cellHeight);

    if (cellX >= 0 && cellX < cols && cellY >= 0 && cellY < rows) {
      const cellId = `cell_${cellY}_${cellX}`;
      handleCellSelection(cellId);
    }
  }, [canvasSize, cols, rows, handleCellSelection]);

  return (
    <div className="relative w-full h-full bg-zinc-900 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        style={{ imageRendering: 'pixelated' }}
      />
      
      {/* Game controls overlay */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => setShowGrid(!showGrid)}
          className="px-3 py-1 text-xs bg-zinc-800 text-zinc-300 rounded hover:bg-zinc-700 transition-colors"
        >
          {showGrid ? 'Hide Grid' : 'Show Grid'}
        </button>
        
        <button
          onClick={isGameActive ? stopGame : startGame}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            isGameActive
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isGameActive ? 'Stop' : 'Start'}
        </button>
      </div>

      {/* Selection info */}
      {selectedCells.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-zinc-800 text-zinc-300 px-3 py-2 rounded">
          <div className="text-sm">
            Selected: {selectedCells.length} cells
          </div>
          <div className="text-xs text-zinc-400">
            Best: {Math.max(...selectedCells.map(cell => cell.mult))}x
          </div>
        </div>
      )}
    </div>
  );
}
