'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** centralized trading colors */
const TRADING_COLORS = {
  positive: '#2fe3ac',  // Green for positive values (gains, up movements)
  negative: '#ec397a',  // Red for negative values (losses, down movements)
} as const;

/** helpers */
type Pt = { t: number; p: number };

type GridCell = {
  row: number;
  col: number;
  state: 'empty' | 'selected' | 'hit' | 'missed';
  multiplier: number;
  price: number;
  timestamp: number;
};

type GridPosition = {
  offsetX: number;
  offsetY: number;
};

type TrackedPlayer = {
  id: string;
  name: string;
  avatar: string;
  type: 'leaderboard' | 'watchlist';
};

interface GameCanvasProps {
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

const GameCanvas = React.memo(function GameCanvas({
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
  zoomLevel = 1.0,
}: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Canvas size management
  const [size, setSize] = useState({ w: 1200, h: 520 });
  
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const el = hostRef.current!;
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    if (hostRef.current) ro.observe(hostRef.current);
    return () => ro.disconnect();
  }, []);

  // Grid system state
  const [gridCells, setGridCells] = useState<GridCell[]>([]);
  const [gridPosition, setGridPosition] = useState<GridPosition>({ offsetX: 0, offsetY: 0 });
  
  // Price data
  const [series, setSeries] = useState<Pt[]>([]);
  const [center, setCenter] = useState(117_500);
  
  // Animation state
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Performance optimization refs
  const animationFrameRef = useRef<number>();
  const collisionCache = useRef<Map<string, { result: number; frame: number }>>(new Map());
  const frameCount = useRef(0);

  // Grid scroll position
  const [gridScrollOffset, setGridScrollOffset] = useState(0);
  
  // Auto-follow mode
  const [autoFollow, setAutoFollow] = useState(true);

  // Player tracking state
  const [trackedPlayers, setTrackedPlayers] = useState<TrackedPlayer[]>([]);
  const [trackedPlayerSelections, setTrackedPlayerSelections] = useState<{ [key: string]: Set<string> }>({});
  const [randomPlayerCounts, setRandomPlayerCounts] = useState<{ [key: string]: number }>({});
  const [availablePlayerCounts, setAvailablePlayerCounts] = useState<number[]>([]);
  const [availableTrackedSelections, setAvailableTrackedSelections] = useState<Set<string>>(new Set());

  // Image loading for player avatars
  const [loadedImages, setLoadedImages] = useState<{ [key: string]: HTMLImageElement }>({});

  // Memoized calculations
  const cellW = useMemo(() => size.w / cols, [size.w, cols]);
  const cellH = useMemo(() => size.h / rows, [size.h, rows]);
  const NOW_X = useMemo(() => size.w * leftChartFraction, [size.w, leftChartFraction]);

  // Price grid lines calculation
  const priceGridLines = useMemo(() => {
    const lines: number[] = [];
    const step = 10; // $10 increments
    const start = Math.floor(center / step) * step;
    
    for (let i = -20; i <= 20; i++) {
      lines.push(start + (i * step));
    }
    return lines;
  }, [center]);

  // Animation loop
  const animate = useCallback(() => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, size.w, size.h);

    // Draw grid cells
    gridCells.forEach(cell => {
      const x = cell.col * cellW - gridPosition.offsetX;
      const y = cell.row * cellH - gridPosition.offsetY;
      
      // Skip cells that are off-screen
      if (x < -cellW || x > size.w || y < -cellH || y > size.h) return;

      // Draw cell background
      ctx.fillStyle = cell.state === 'selected' ? 'rgba(250,86,22,0.2)' : 'rgba(39,39,42,0.3)';
      ctx.fillRect(x, y, cellW, cellH);

      // Draw cell border
      ctx.strokeStyle = cell.state === 'selected' ? signatureColor : 'rgba(82,82,91,0.8)';
      ctx.lineWidth = cell.state === 'selected' ? 2 : 1;
      ctx.strokeRect(x, y, cellW, cellH);

      // Draw multiplier text
      ctx.fillStyle = '#e5e5e5';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${cell.multiplier.toFixed(1)}x`, x + cellW/2, y + cellH/2 + 4);
    });

    // Draw NOW line
    ctx.strokeStyle = signatureColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(NOW_X, 0);
    ctx.lineTo(NOW_X, size.h);
    ctx.stroke();

      // Continue animation
      animationFrameRef.current = requestAnimationFrame(animate);
    } catch (error) {
      console.error('Animation error:', error);
      // Stop animation on error to prevent infinite error loop
    }
  }, [size, gridCells, gridPosition, cellW, cellH, NOW_X, signatureColor]);

  // Start animation loop
  useEffect(() => {
    if (!document.hidden) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animate]);

  // Handle mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    setGridPosition(prev => ({
      offsetX: prev.offsetX + deltaX,
      offsetY: prev.offsetY + deltaY
    }));
    
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle cell clicks
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (isDragging) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor((x + gridPosition.offsetX) / cellW);
    const row = Math.floor((y + gridPosition.offsetY) / cellH);

    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      // Toggle cell selection
      setGridCells(prev => {
        const newCells = [...prev];
        const cellIndex = newCells.findIndex(cell => cell.row === row && cell.col === col);
        
        if (cellIndex >= 0) {
          const cell = newCells[cellIndex];
          newCells[cellIndex] = {
            ...cell,
            state: cell.state === 'selected' ? 'empty' : 'selected'
          };
        } else {
          // Create new cell
          newCells.push({
            row,
            col,
            state: 'selected',
            multiplier: 1.5 + Math.random() * 3, // Random multiplier between 1.5x and 4.5x
            price: center + (Math.random() - 0.5) * 1000, // Random price around center
            timestamp: Date.now()
          });
        }

        // Notify parent of selection change
        const selectedCells = newCells.filter(cell => cell.state === 'selected');
        const multipliers = selectedCells.map(cell => cell.multiplier);
        const best = multipliers.length > 0 ? Math.max(...multipliers) : 0;
        
        onSelectionChange?.(selectedCells.length, best, multipliers, center);

        return newCells;
      });
    }
  }, [isDragging, gridPosition, cellW, cellH, cols, rows, center, onSelectionChange]);

  return (
    <div 
      ref={hostRef} 
      className="w-full h-full relative"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleCanvasClick}
    >
      <canvas
        ref={canvasRef}
        width={size.w}
        height={size.h}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />
      
      {/* Grid overlay for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 left-2 text-xs text-zinc-400 bg-black/50 px-2 py-1 rounded">
          Grid: {gridCells.length} cells | Pos: ({gridPosition.offsetX.toFixed(0)}, {gridPosition.offsetY.toFixed(0)})
        </div>
      )}
    </div>
  );
});

export default GameCanvas;
