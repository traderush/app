'use client';

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { useCanvasOptimization } from '@/hooks/useCanvasOptimization';
import { usePerformance } from '@/hooks/usePerformance';

interface OptimizedBoxHitCanvasProps {
  rows?: number;
  cols?: number;
  tickMs?: number;
  leftChartFraction?: number;
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

type BoxState = 'idle' | 'selected' | 'hit' | 'missed';
interface GridCell {
  row: number;
  col: number;
  mult: number;
  state: BoxState;
  crossedTime?: number;
  selectionTime?: number;
}

const OptimizedBoxHitCanvas = React.memo<OptimizedBoxHitCanvasProps>(({
  rows = 6,
  cols = 8,
  tickMs = 2000,
  leftChartFraction = 0.25,
  live = false,
  minMultiplier = 1.0,
  onSelectionChange,
  onPriceUpdate,
  isTradingMode = false,
  realBTCPrice = 0,
  showProbabilities = false,
  showOtherPlayers = false,
  signatureColor = '#FA5616',
  zoomLevel = 1.0
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  
  // Performance optimization hooks
  const performance = usePerformance('OptimizedBoxHitCanvas');
  const canvasOptimization = useCanvasOptimization({
    targetFPS: 60,
    enableDirtyChecking: true,
    enableFrameSkipping: true
  });

  // Memoized grid cells
  const gridCells = useMemo(() => {
    const cells: GridCell[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        cells.push({
          row,
          col,
          mult: minMultiplier + (row * 0.1) + (col * 0.05),
          state: 'idle'
        });
      }
    }
    return cells;
  }, [rows, cols, minMultiplier]);

  // Memoized cell dimensions
  const cellDimensions = useMemo(() => {
    const cellW = (size.w * (1 - leftChartFraction)) / cols;
    const cellH = size.h / rows;
    return { cellW, cellH };
  }, [size.w, size.h, cols, rows, leftChartFraction]);

  // Optimized render function
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas size
    canvas.width = size.w;
    canvas.height = size.h;

    // Apply zoom
    ctx.save();
    ctx.scale(zoomLevel, zoomLevel);

    // Render grid cells
    gridCells.forEach((cell) => {
      const x = cell.col * cellDimensions.cellW;
      const y = cell.row * cellDimensions.cellH;
      
      // Set cell color based on state
      switch (cell.state) {
        case 'selected':
          ctx.fillStyle = signatureColor;
          break;
        case 'hit':
          ctx.fillStyle = '#2fe3ac';
          break;
        case 'missed':
          ctx.fillStyle = '#ec397a';
          break;
        default:
          ctx.fillStyle = '#374151';
      }

      // Draw cell
      ctx.fillRect(x, y, cellDimensions.cellW, cellDimensions.cellH);
      
      // Draw border
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cellDimensions.cellW, cellDimensions.cellH);
      
      // Draw multiplier text
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        cell.mult.toFixed(2) + 'x',
        x + cellDimensions.cellW / 2,
        y + cellDimensions.cellH / 2
      );
    });

    ctx.restore();
  }, [size, gridCells, cellDimensions, signatureColor, zoomLevel]);

  // Handle canvas click
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / zoomLevel;
    const y = (event.clientY - rect.top) / zoomLevel;

    // Find clicked cell
    const clickedCell = gridCells.find(cell => {
      const cellX = cell.col * cellDimensions.cellW;
      const cellY = cell.row * cellDimensions.cellH;
      return x >= cellX && x < cellX + cellDimensions.cellW &&
             y >= cellY && y < cellY + cellDimensions.cellH;
    });

    if (clickedCell) {
      // Toggle cell selection
      clickedCell.state = clickedCell.state === 'selected' ? 'idle' : 'selected';
      
      // Mark canvas as dirty for re-render
      canvasOptimization.markDirty();
      
      // Notify parent of selection change
      if (onSelectionChange) {
        const selectedCells = gridCells.filter(cell => cell.state === 'selected');
        const multipliers = selectedCells.map(cell => cell.mult);
        const bestMultiplier = Math.max(...multipliers, 0);
        onSelectionChange(selectedCells.length, bestMultiplier, multipliers);
      }
    }
  }, [gridCells, cellDimensions, zoomLevel, onSelectionChange, canvasOptimization]);

  // Resize observer
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const el = hostRef.current;
      if (el) {
        setSize({ w: el.clientWidth, h: el.clientHeight });
      }
    });
    
    if (hostRef.current) {
      ro.observe(hostRef.current);
    }
    
    return () => ro.disconnect();
  }, []);

  // Start optimized animation loop
  useEffect(() => {
    canvasOptimization.startAnimationLoop(renderCanvas);
    return () => canvasOptimization.stopAnimationLoop();
  }, [canvasOptimization, renderCanvas]);

  // Performance monitoring
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        const metrics = canvasOptimization.getPerformanceMetrics();
        performance.logMetrics();
        console.log('Canvas Performance:', metrics);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [canvasOptimization, performance]);

  return (
    <div ref={hostRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full cursor-pointer"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
});

OptimizedBoxHitCanvas.displayName = 'OptimizedBoxHitCanvas';

export default OptimizedBoxHitCanvas;
