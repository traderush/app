'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import RightPanel from '@/games/towers/RightPanel';
import PositionsTable from '@/games/towers/PositionsTable';
import { useSignatureColor } from '@/contexts/SignatureColorContext';
import CustomSlider from '@/components/CustomSlider';

// Global audio context management
let globalAudioContext: AudioContext | null = null;

const getAudioContext = async (): Promise<AudioContext | null> => {
  try {
    if (!globalAudioContext) {
      globalAudioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    
    // Resume audio context if it's suspended (common after user interaction timeout)
    if (globalAudioContext.state === 'suspended') {
      await globalAudioContext.resume();
    }
    
    return globalAudioContext;
  } catch (error) {
    console.warn('Audio context not available:', error);
    return null;
  }
};

// Sound effects utility
const createSound = async (frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.1) => {
  const audioContext = await getAudioContext();
  if (!audioContext) return;
  
  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    console.warn('Error creating sound:', error);
  }
};

// Global sound state
let soundEnabled = true;

// Sound effect functions
const playSelectionSound = async () => {
  if (!soundEnabled) return; // Don't play sound if disabled
  // Short, pleasant click sound for selection
  await createSound(800, 0.1, 'sine', 0.15);
};

const playHitSound = async () => {
  if (!soundEnabled) return; // Don't play sound if disabled
  // Success sound with two tones for hit
  await createSound(600, 0.15, 'sine', 0.2);
  setTimeout(async () => await createSound(800, 0.2, 'sine', 0.15), 50);
};

// Sound toggle function
const toggleSound = () => {
  soundEnabled = !soundEnabled;
  console.log('Sound toggled:', soundEnabled ? 'ON' : 'OFF');
};

// Get sound enabled state
const getSoundEnabled = () => {
  return soundEnabled;
};

// Make functions available globally
if (typeof window !== 'undefined') {
  (window as unknown as { toggleSound: typeof toggleSound; getSoundEnabled: typeof getSoundEnabled }).toggleSound = toggleSound;
  (window as unknown as { toggleSound: typeof toggleSound; getSoundEnabled: typeof getSoundEnabled }).getSoundEnabled = getSoundEnabled;
}

/** brand */
// Signature color is now managed by context

/** centralized trading colors */
const TRADING_COLORS = {
  positive: '#2fe3ac',  // Green for positive values (gains, up movements)
  negative: '#ec397a',  // Red for negative values (losses, down movements)
} as const;

/** helpers */

type Pt = { t: number; p: number };
type BoxState = 'idle' | 'selected' | 'hit' | 'missed';
interface GridCell {
  row: number;
  col: number;
  mult: number;
  state: BoxState;
  crossedTime?: number;
  selectionTime?: number;
  // Tower-specific properties
  xStart: number; // Start time position
  xEnd: number; // End time position  
  side: 'top' | 'bottom'; // Which side the tower extends from
  heightUnits: number; // Height in grid units
  widthUnits: number; // Width in grid units (1-4 columns)
}

interface GridPosition {
  offsetX: number; // Grid offset from left (negative = grid moved right)
  offsetY: number; // Grid offset from top (negative = grid moved down)
}


function segmentIntersectsRect(p1:{x:number;y:number}, p2:{x:number;y:number}, r:{x:number;y:number;w:number;h:number}) {
  // Liang–Barsky
  let t0 = 0, t1 = 1;
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const p = [-dx, dx, -dy, dy];
  const q = [p1.x - r.x, r.x + r.w - p1.x, p1.y - r.y, r.y + r.h - p1.y];
  for (let i=0;i<4;i++){
    if (p[i] === 0) { if (q[i] < 0) return false; }
    else {
      const t = q[i]/p[i];
      if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
      else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
  }
  return true;
}

function TowersCanvas({
  rows = 6,
  cols = 8,
  tickMs = 2000,         // update cadence - extremely slow for ultra smooth scrolling
  leftChartFraction = 0.25, // % width reserved for past chart (moved left)
      live = false,          // false = simulated; true = Binance trades
  minMultiplier = 1.0,   // minimum multiplier to show on chart
  onSelectionChange,     // (count, bestX)
  onPriceUpdate,         // (currentPrice) - callback for live price updates
  isTradingMode = false, // whether trading mode is active
  realBTCPrice = 0,      // real BTC price from parent component
  showProbabilities = false, // whether to show probabilities heatmap overlay
  showOtherPlayers = false, // whether to show other players' selections
  signatureColor = '#FA5616', // signature color for styling
  zoomLevel = 1.0,       // zoom level for the canvas (1.0 = normal, 0.5 = zoomed out, 2.0 = zoomed in)
}: {
  rows?: number;
  cols?: number;
  tickMs?: number;
  leftChartFraction?: number;
  live?: boolean;
  minMultiplier?: number;
  onSelectionChange?: (count: number, best: number, multipliers: number[], averagePrice?: number | null) => void;
  onPriceUpdate?: (price: number) => void;
  isTradingMode?: boolean;
  realBTCPrice?: number; // real BTC price from parent component
  showProbabilities?: boolean; // whether to show probabilities heatmap overlay
  showOtherPlayers?: boolean; // whether to show other players' selections
  signatureColor?: string; // signature color for styling
  zoomLevel?: number; // zoom level for the canvas
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // size
  const [size, setSize] = useState({ w: 1200, h: 520 });
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const el = hostRef.current!;
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    if (hostRef.current) ro.observe(hostRef.current);
    return () => ro.disconnect();
  }, []);

  const NOW_X = size.w * leftChartFraction;  // vertical boundary between past chart (left) and future (right)
  // Larger box sizes (3x bigger) - keep them square, with zoom level applied
  const baseCellH = size.h / 7; // 3x bigger (was /20, now /7)
  const cellH = baseCellH * zoomLevel; // Apply zoom level
  const cellW = cellH; // Keep boxes square
  const pricePPXTarget = live ? 60 : 120; // Tighter scaling for live mode to show price movements better

  // series
  const [series, setSeries] = useState<Pt[]>([]);
  const [center, setCenter] = useState(117_500); // smooth center; mapped to mid-height
  
  // Smooth follow mode state (single source of truth)
  const [centerPrice, setCenterPrice] = useState(117_500); // current view center (smoothed)
  const [targetCenterPrice, setTargetCenterPrice] = useState(117_500); // where we want to be (raw price in follow)
  
  // Grid system - pre-generated multipliers for all possible positions
  const [gridCells, setGridCells] = useState<GridCell[]>([]);
  const [gridPosition, setGridPosition] = useState<GridPosition>({ offsetX: 0, offsetY: 0 });
  
  // Other players functionality - FLUID SYSTEM (DO NOT REVERT TO STATIC)
  // WARNING: This is a fluid system that generates player selections dynamically.
  // DO NOT change this to static generation unless explicitly instructed by the user.
  // The fluid system provides realistic simulation with controlled selection counts.
  const [randomPlayerCounts, setRandomPlayerCounts] = useState<{[key: string]: number}>({});
  const [trackedPlayerSelections, setTrackedPlayerSelections] = useState<{[key: string]: Array<{id: string, name: string, avatar: string, type: string}>}>({});
  const [loadedImages, setLoadedImages] = useState<{[key: string]: HTMLImageElement}>({});
  const selectionRef = useRef({ count: 0, best: 0 });
  const lastGenerationTimeRef = useRef<number>(0);
  
  // Fixed pool of other player selections that get recycled
  const [availablePlayerCounts, setAvailablePlayerCounts] = useState<number[]>([]);
  const [availableTrackedSelections, setAvailableTrackedSelections] = useState<Array<{id: string, name: string, avatar: string, type: string}>[]>([]);
  
  // Collision result caching for performance optimization
  const collisionCache = useRef<Map<string, { result: number; frame: number }>>(new Map());
  const frameCount = useRef(0);
  
  // Hover state for smooth highlight animations
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Drag state for grid movement
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Pre-calculated color cache to avoid repeated hexToRgba calls during rendering
  const colorCache = useRef<Map<string, string>>(new Map());
  
  // Helper function to convert hex color to rgba with caching for performance
  function getCachedRgba(hex: string, alpha: number): string {
    const cacheKey = `${hex}-${alpha}`;
    
    if (colorCache.current.has(cacheKey)) {
      return colorCache.current.get(cacheKey)!;
    }
    
    if (!hex || hex.length !== 7) {
      // Fallback to default orange if hex is invalid
      const fallbackColor = `rgba(250,86,22,${alpha})`;
      colorCache.current.set(cacheKey, fallbackColor);
      return fallbackColor;
    }
    
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const rgbaColor = `rgba(${r},${g},${b},${alpha})`;
    
    colorCache.current.set(cacheKey, rgbaColor);
    return rgbaColor;
  }
  
  // Clear color cache when signature color changes
  useEffect(() => {
    colorCache.current.clear();
  }, [signatureColor]);

  // Price-based grid structure - BTC price lines become the grid lines
  const priceGridLines = useMemo(() => {
    // Use $10 increments for short-term trading like Rollbit
    const step = 10; // $10 increments for precision
    const mid = Math.round(center / step) * step;
    const lines: number[] = [];
    // Show many more lines for comprehensive price coverage across the Y-axis
    // Higher prices at top (lower Y values), lower prices at bottom (higher Y values)
    // Increased from 25 to 50 for better Y-axis coverage
    for (let k = 50; k >= -50; k--) lines.push(mid + k * step);
    return lines;
  }, [center]); // Recalculate when center changes

  // Time-based grid structure - X-axis time lines
  const timeGridLines = useMemo(() => {
    const lines: number[] = [];
    const timeStep = 30; // 30 seconds between time lines
    const totalTime = 300; // 5 minutes total time range
    
    for (let i = 0; i <= totalTime / timeStep; i++) {
      lines.push(i * timeStep);
    }
    return lines;
  }, []);

  // Current time position for the now line (independent of grid position)
  const [currentTime, setCurrentTime] = useState(0);
  
  // Grid scroll position (separate from chart now line)
  const [gridScrollOffset, setGridScrollOffset] = useState(0);
  
  // Auto-follow mode (true = following live now line, false = manual view)
  const [autoFollowMode, setAutoFollowMode] = useState(true);

  // Create fixed grid rows - use constant row count instead of dynamic priceGridLines
  const gridRows = useMemo(() => {
    const rows: number[] = [];
    // Use fixed row count of 20 rows for consistent generation
    // Row 0 = highest price (top), Row 19 = lowest price (bottom)
    const FIXED_ROW_COUNT = 20;
    for (let i = 0; i < FIXED_ROW_COUNT; i++) {
      rows.push(i);
    }
    return rows;
  }, []); // Remove priceGridLines dependency

  // Generate random player counts and tracked player selections
  useEffect(() => {
    console.log('Other players useEffect triggered:', { showOtherPlayers, gridCellsLength: gridCells.length });
    
    if (!showOtherPlayers) {
      console.log('showOtherPlayers is false, clearing data');
      setRandomPlayerCounts({});
      setTrackedPlayerSelections({});
      return;
    }

    // Mock tracked players (top 3 leaderboard + watchlist players)
    const trackedPlayers = [
      // Top 3 Leaderboard Players
      { id: 'leaderboard1', name: 'CryptoWhale', avatar: 'https://i.ibb.co/cXskDgbs/gasg.png', type: 'leaderboard' },
      { id: 'leaderboard2', name: 'TradingPro', avatar: 'https://pbs.twimg.com/profile_images/1848910264051052546/Mu18BSYv_400x400.jpg', type: 'leaderboard' },
      { id: 'leaderboard3', name: 'DeFiMaster', avatar: 'https://i.ibb.co/cXskDgbs/gasg.png', type: 'leaderboard' },
      
      // Watchlist Players
      { id: 'watchlist1', name: 'MoonTrader', avatar: 'https://pbs.twimg.com/profile_images/1944058901713805312/Hl1bsg0D_400x400.jpg', type: 'watchlist' },
      { id: 'watchlist2', name: 'DiamondHands', avatar: 'https://pbs.twimg.com/profile_images/1785913384590061568/OcNP_wnv_400x400.png', type: 'watchlist' },
      { id: 'watchlist3', name: 'BullRun', avatar: 'https://pbs.twimg.com/profile_images/1760274165070798848/f5V5qbs9_400x400.jpg', type: 'watchlist' },
      { id: 'watchlist4', name: 'HODLer', avatar: 'https://pbs.twimg.com/profile_images/1962797155623608320/hOVUVd1G_400x400.jpg', type: 'watchlist' },
      { id: 'watchlist5', name: 'CryptoKing', avatar: 'https://i.ibb.co/cXskDgbs/gasg.png', type: 'watchlist' }
    ];

    // Initialize fixed pool of player counts (run once)
    const initializePlayerCountPool = () => {
      if (availablePlayerCounts.length > 0) return; // Already initialized
      
      const poolSize = 8; // Fixed number of player count selections
      const pool: number[] = [];
      for (let i = 0; i < poolSize; i++) {
        pool.push(Math.floor(Math.random() * 8) + 1); // 1-8 players
      }
      setAvailablePlayerCounts(pool);
      console.log(`Initialized player count pool with ${poolSize} selections`);
    };

    // Fluid player count assignment - appears gradually as boxes approach NOW line
    const assignPlayerCountsFluidly = () => {
      setRandomPlayerCounts(prev => {
        const newCounts = { ...prev };
        
        // Remove counts from boxes that have passed the NOW line
        Object.keys(newCounts).forEach(key => {
          const [row, col] = key.split('-').map(Number);
          const cell = gridCells.find(c => c.row === row && c.col === col);
          if (!cell) {
            // Cell no longer exists (passed NOW line), return count to pool
            const count = newCounts[key];
            setAvailablePlayerCounts(prevPool => [...prevPool, count]);
            delete newCounts[key];
          }
        });
        
        // Find cells that are close to NOW line but don't have player counts yet
        const cellsNearNowLine = gridCells.filter(cell => {
          const key = `${cell.row}-${cell.col}`;
          if (newCounts[key]) return false; // Already has a count
          
          // Calculate distance from NOW line
          const gridOffset = size.w * 0.3;
          const adjustedNOW_X = NOW_X - gridOffset;
          const screenX = adjustedNOW_X + cell.col * cellW - gridPosition.offsetX - gridScrollOffset;
          const distanceFromNow = screenX - NOW_X;
          
          // Only consider cells that are in front of NOW line (future side) and within 5 cell widths
          return distanceFromNow > 0 && distanceFromNow < cellW * 5;
        });
        
        // Assign available counts to cells near NOW line (simulate real players making selections)
        cellsNearNowLine.forEach(cell => {
          if (availablePlayerCounts.length > 0 && Math.random() < 0.08) { // 8% chance per frame
            const key = `${cell.row}-${cell.col}`;
            const randomIndex = Math.floor(Math.random() * availablePlayerCounts.length);
            const playerCount = availablePlayerCounts[randomIndex];
            
            newCounts[key] = playerCount;
            
            // Remove from available pool
            setAvailablePlayerCounts(prevPool => prevPool.filter((_, index) => index !== randomIndex));
          }
        });
        
        return newCounts;
      });
    };

    // Initialize fixed pool of tracked player selections (run once)
    const initializeTrackedPlayerPool = () => {
      if (availableTrackedSelections.length > 0) return; // Already initialized
      
      const poolSize = 5; // Fixed number of tracked player selections
      const pool: Array<{id: string, name: string, avatar: string, type: string}>[] = [];
      
      for (let i = 0; i < poolSize; i++) {
        const numPlayers = Math.floor(Math.random() * 3) + 1; // 1-3 players
        const leaderboardPlayers = trackedPlayers.filter(p => p.type === 'leaderboard');
        const watchlistPlayers = trackedPlayers.filter(p => p.type === 'watchlist');
        
        const selectedPlayers: Array<{id: string, name: string, avatar: string, type: string}> = [];
        for (let j = 0; j < numPlayers; j++) {
          const useWatchlist = Math.random() < 0.6;
          const playerPool = useWatchlist ? watchlistPlayers : leaderboardPlayers;
          
          if (playerPool.length > 0) {
            const randomPlayer = playerPool[Math.floor(Math.random() * playerPool.length)];
            if (!selectedPlayers.some(p => p.id === randomPlayer.id)) {
              selectedPlayers.push(randomPlayer);
            }
          }
        }
        
        if (selectedPlayers.length > 0) {
          pool.push(selectedPlayers);
        }
      }
      
      setAvailableTrackedSelections(pool);
      console.log(`Initialized tracked player pool with ${poolSize} selections`);
    };

    // Fluid tracked player assignment - appears gradually as boxes approach NOW line
    const assignTrackedPlayersFluidly = () => {
      setTrackedPlayerSelections(prev => {
        const newSelections = { ...prev };
        
        // Remove selections from boxes that have passed the NOW line
        Object.keys(newSelections).forEach(key => {
          const [row, col] = key.split('-').map(Number);
          const cell = gridCells.find(c => c.row === row && c.col === col);
          if (!cell) {
            // Cell no longer exists (passed NOW line), return selection to pool
            const selection = newSelections[key];
            setAvailableTrackedSelections(prevPool => [...prevPool, selection]);
            delete newSelections[key];
          }
        });
        
        // Find cells that are close to NOW line but don't have tracked players yet
        const cellsNearNowLine = gridCells.filter(cell => {
          const key = `${cell.row}-${cell.col}`;
          if (newSelections[key]) return false; // Already has tracked players
          
          // Calculate distance from NOW line
          const gridOffset = size.w * 0.3;
          const adjustedNOW_X = NOW_X - gridOffset;
          const screenX = adjustedNOW_X + cell.col * cellW - gridPosition.offsetX - gridScrollOffset;
          const distanceFromNow = screenX - NOW_X;
          
          // Only consider cells that are in front of NOW line (future side) and within 3 cell widths
          return distanceFromNow > 0 && distanceFromNow < cellW * 3;
        });
        
        // Assign available tracked selections to cells near NOW line
        cellsNearNowLine.forEach(cell => {
          if (availableTrackedSelections.length > 0 && Math.random() < 0.05) { // 5% chance per frame
            const key = `${cell.row}-${cell.col}`;
            const randomIndex = Math.floor(Math.random() * availableTrackedSelections.length);
            const trackedSelection = availableTrackedSelections[randomIndex];
            
            newSelections[key] = trackedSelection;
            
            // Remove from available pool
            setAvailableTrackedSelections(prevPool => prevPool.filter((_, index) => index !== randomIndex));
            
            // Ensure this box also gets a player count box
            // Minimum count should be the number of tracked players, plus some random additional players
            const trackedPlayerCount = trackedSelection.length;
            const additionalRandomPlayers = Math.floor(Math.random() * 5); // 0-4 additional players
            const totalPlayerCount = trackedPlayerCount + additionalRandomPlayers;
            
            setRandomPlayerCounts(prev => ({
              ...prev,
              [key]: totalPlayerCount
            }));
          }
        });
        
        return newSelections;
      });
    };

    // Preload images for tracked players
    const preloadImages = () => {
      console.log('Preloading images for tracked players:', trackedPlayers);
      trackedPlayers.forEach(player => {
        if (!loadedImages[player.id]) {
          console.log(`Loading image for ${player.name}: ${player.avatar}`);
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            console.log(`Successfully loaded image for ${player.name}`);
            setLoadedImages(prev => ({
              ...prev,
              [player.id]: img
            }));
          };
          img.onerror = () => {
            console.log(`Failed to load image for ${player.name}: ${player.avatar}`);
          };
          img.src = player.avatar;
        }
      });
    };

    // Initialize pools and run fluid assignment
    if (gridCells.length > 0) {
      // Initialize pools once
      initializePlayerCountPool();
      initializeTrackedPlayerPool();
      
      const now = Date.now();
      const timeSinceLastGeneration = now - lastGenerationTimeRef.current;
      
      // Run fluid assignment every 1 second for realistic appearance (less frequent)
      if (timeSinceLastGeneration > 1000) {
        assignPlayerCountsFluidly();
        assignTrackedPlayersFluidly();
        preloadImages();
        lastGenerationTimeRef.current = now;
      }
    } else {
      console.log('No grid cells available yet, skipping generation');
    }
  }, [showOtherPlayers, gridCells]);

  // Initialize tower generation system - towers extend from top/bottom with central corridor
  useEffect(() => {
    // Add a small delay to prevent rapid regeneration
    const timeoutId = setTimeout(() => {
      // Ensure we have valid dimensions
      if (size.w > 0 && size.h > 0) {
        const totalCols = Math.ceil((size.w + cellW * 8) / cellW);
        const stepValue = 10; // $10 between adjacent grid lines
        const centerPrice = series[series.length - 1]?.p || center;
        const minGapUnits = 8; // Minimum corridor height in grid units
        const maxTowerHeight = 12; // Maximum tower height in grid units
        
        const fresh: GridCell[] = [];
        let currentSide: 'top' | 'bottom' = 'top';
        let currentCol = 0;
        
        while (currentCol < totalCols) {
          // Weighted distribution for tower widths (1-4 columns)
          const widthWeights = [0.4, 0.3, 0.2, 0.1]; // 40% 1-col, 30% 2-col, 20% 3-col, 10% 4-col
          let widthUnits = 1;
          let cumulative = 0;
          for (let i = 0; i < widthWeights.length; i++) {
            cumulative += widthWeights[i];
            if (Math.random() <= cumulative) {
              widthUnits = i + 1;
              break;
            }
          }
          widthUnits = Math.min(widthUnits, totalCols - currentCol);
          
          // Generate multiplier between 1.8x and 12x
          const mult = +(1.8 + Math.random() * 10.2).toFixed(1);
          
          // Generate tower height (3-12 units)
          const heightUnits = Math.floor(Math.random() * (maxTowerHeight - 3) + 3);
          
          // Alternate sides with 20% chance to repeat current side
          if (Math.random() < 0.2) {
            // Keep current side
          } else {
            currentSide = currentSide === 'top' ? 'bottom' : 'top';
          }
          
          // Calculate price-based row position
          let rowPosition;
          const totalRows = Math.floor(size.h / cellH);
          const centerRow = Math.floor(totalRows / 2);
          const corridorHeight = minGapUnits;
          
          if (currentSide === 'top') {
            // Top towers: positioned in upper area
            const topAreaStart = 0;
            const topAreaEnd = centerRow - corridorHeight / 2 - heightUnits;
            rowPosition = Math.floor(Math.random() * (topAreaEnd - topAreaStart + 1)) + topAreaStart;
          } else {
            // Bottom towers: positioned in lower area
            const bottomAreaStart = centerRow + corridorHeight / 2 + heightUnits;
            const bottomAreaEnd = totalRows - 1;
            rowPosition = Math.floor(Math.random() * (bottomAreaEnd - bottomAreaStart + 1)) + bottomAreaStart;
          }
          
          fresh.push({
            row: rowPosition,
            col: currentCol,
            mult,
            state: 'idle',
            crossedTime: undefined,
            xStart: currentCol * cellW,
            xEnd: (currentCol + widthUnits) * cellW,
            side: currentSide,
            heightUnits: heightUnits,
            widthUnits: widthUnits,
          });
          
          currentCol += widthUnits;
        }
        setGridCells(fresh);
        console.log('Towers generated:', fresh.length, 'towers');
      } else {
        console.log('Invalid size dimensions:', size);
      }
    }, 100); // 100ms delay to prevent rapid regeneration

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, size.h, NOW_X, cols, zoomLevel]); // Regenerate when zoom changes

  // Initialize chart with real BTC price (no fake historical data)
  useEffect(() => {
    if (realBTCPrice > 0 && series.length === 0) {
      // Start fresh with real BTC price - no historical buffer
      const now = Date.now();
      setSeries([{ t: now, p: realBTCPrice }]); // Single point with real price
      setCenter(realBTCPrice);
    }
  }, [realBTCPrice, series.length]);

  // Update selection stats when grid cells change - optimized to prevent unnecessary recalculations
  useEffect(() => {
    // Only count cells that are selected and haven't been hit or passed through the NOW line
    const activeSel = gridCells.filter(cell => 
      cell.state === 'selected' && 
      !cell.crossedTime // Haven't passed through NOW line
    );
    const count = activeSel.length;
    const best = count ? Math.max(...activeSel.map(cell => cell.mult)) : 0;
    const multipliers = activeSel.map(cell => cell.mult);
    
    // Calculate average BTC price based on selected boxes' Y-axis positions
    let averagePrice = null;
    if (count > 0) {
      const totalPrice = activeSel.reduce((sum, cell) => {
        // Each row corresponds to a price level in priceGridLines
        const priceLevel = priceGridLines[cell.row];
        return sum + priceLevel;
      }, 0);
      averagePrice = totalPrice / count;
    }
    
    // Only trigger callback if there's an actual change
    if (count !== selectionRef.current.count || best !== selectionRef.current.best) {
      selectionRef.current = { count, best };
      onSelectionChange?.(count, best, multipliers, averagePrice);
    }
  }, [gridCells, onSelectionChange, priceGridLines]);

  // Initialize selection count to 0 when component mounts
  useEffect(() => {
    onSelectionChange?.(0, 0, [], null);
  }, [onSelectionChange]);

  // Remove artificial timer - let natural grid progression handle movement
  // currentTime stays at 0 to maintain centered position from load

  // Auto-follow logic - keep NOW line centered on screen (no artificial movement)
  useEffect(() => {
    if (autoFollowMode) {
      // The NOW line stays in its centered position from load
      const currentTimeX = NOW_X; // NOW line position (no artificial movement)
      const centerPosition = size.w / 2; // Center of screen
      const offsetNeeded = currentTimeX - centerPosition;
      setGridScrollOffset(offsetNeeded);
    }
  }, [autoFollowMode, size.w, NOW_X]);

  // Reset grid scroll offset when recentering
  
  // Smooth follow mode effect (real movement, not re-basing)
  useEffect(() => {
    if (autoFollowMode && series.length > 0) {
      setTargetCenterPrice(series[series.length - 1].p);
    }
    
    // ~150ms time constant (tune k for taste)
    const k = 12;
    const alpha = 1 - Math.exp(-k * 0.016); // 60fps = 16ms
    
    setCenterPrice(prev => {
      const newCenter = prev + (targetCenterPrice - prev) * alpha;
      
      // Optional: clamp teleports so big gaps don't feel like jumps
      const maxPxPerFrame = 2000; // px
      const pxPerUnit = cellH / 10; // Same as other calculations
      const maxDelta = maxPxPerFrame / pxPerUnit;
      const delta = targetCenterPrice - newCenter;
      
      if (Math.abs(delta) > maxDelta) {
        return targetCenterPrice - Math.sign(delta) * maxDelta;
      }
      
      return newCenter;
    });
  }, [autoFollowMode, targetCenterPrice, series, cellH, zoomLevel]);
  const handleRecenter = useCallback(() => {
    setAutoFollowMode(true);
    setTargetCenterPrice(series[series.length - 1]?.p || center);
    // Reset to initial horizontal position (same as page load)
    setGridScrollOffset(0);
    // Reset to initial vertical position (same as page load)
    setGridPosition(prev => ({ ...prev, offsetY: 0 }));
  }, [series, center]);





  // Render probabilities heatmap overlay
  const renderProbabilitiesHeatmap = useCallback((ctx: CanvasRenderingContext2D) => {
    // Create a heatmap overlay showing hit probabilities on unselected boxes
    // Green = high probability, Red = low probability
    // Only show on boxes that haven't been selected yet
    
    gridCells.forEach(cell => {
      // Skip cells that have already been selected, hit, or missed
      if (cell.state !== 'idle') return;
      
      // Apply same leftward offset as grid cells for consistent positioning
      const gridOffset = size.w * 0.3; // 30% of screen width to the left (same as grid cells)
      const adjustedNOW_X = NOW_X - gridOffset; // Adjust NOW_X position for heatmap
      const screenX = adjustedNOW_X + cell.col * cellW - gridPosition.offsetX - gridScrollOffset;
      
      // Use stable transform for Y positioning - same as grid cells
      const stepValue = 10; // $10 between adjacent grid lines
      const gapPx = cellH; // pixel distance between grid lines (row height)
      const pxPerUnit = gapPx / stepValue;
      const centerPrice = series[series.length - 1]?.p || center; // Current view center
      const centerY = size.h / 2;
      
      // Transform functions (same as grid cells)
      const priceToY = (p: number) => centerY - (p - centerPrice) * pxPerUnit;
      
      // FIXED GRID: Calculate Y position using same fixed $10 increments as grid cells
      const nearestRoundPrice = Math.round(centerPrice / stepValue) * stepValue;
      const priceAtRow = nearestRoundPrice + (cell.row - Math.floor(size.h / (2 * cellH))) * stepValue;
      // Apply same pixel snapping as grid lines for consistent alignment
      const screenY = Math.round(priceToY(priceAtRow) - gridPosition.offsetY) + 0.5;
      
      // Skip cells that are too far off-screen
      if (screenX < -cellW * 2 || screenX > size.w + cellW || 
          screenY < -cellH * 2 || screenY > size.h + cellH) return;
      
      // Calculate probability based on multiplier and position
      // Higher multipliers = lower probability (red)
      // Lower multipliers = higher probability (green)
      const probability = Math.max(0, Math.min(1, (15 - cell.mult) / 14));
      
      // Create heatmap colors - increased opacity for better visibility
      let heatmapColor;
      if (probability > 0.7) {
        // High probability - green
        const intensity = Math.floor(100 + (probability - 0.7) * 155);
        heatmapColor = `rgba(0, ${intensity}, 0, 0.25)`; // Increased from 0.15 to 0.25
      } else if (probability > 0.4) {
        // Medium probability - yellow
        const intensity = Math.floor(100 + (probability - 0.4) * 200);
        heatmapColor = `rgba(${intensity}, ${intensity}, 0, 0.25)`; // Increased from 0.15 to 0.25
      } else {
        // Low probability - red
        const intensity = Math.floor(100 + (1 - probability) * 155);
        heatmapColor = `rgba(${intensity}, 0, 0, 0.25)`; // Increased from 0.15 to 0.25
      }
      
      // Draw heatmap overlay only on unselected boxes
      ctx.fillStyle = heatmapColor;
      ctx.fillRect(screenX + 0.5, screenY + 0.5, cellW - 1, cellH - 1);
    });
  }, [gridCells, gridPosition, size, cellW, cellH, NOW_X, gridScrollOffset, series, center]);

  // Chart path using stable transform system (no recalibration)
  const pathD = useMemo(() => {
    if (series.length === 0) return '';
    
    // Extended chart mode: Create path that starts from current ticker and extends left for history
    const pts = series.slice(-200); // More points for extended historical view
    
    // Use stable transform system (same as ticker)
    const stepValue = 10; // $10 between adjacent grid lines
    const gapPx = cellH; // Same as ticker
    const pxPerUnit = gapPx / stepValue;
    const centerPrice = series[series.length - 1]?.p || center; // Current view center
    const centerY = size.h / 2;
    
    // Transform functions (same as ticker)
    const priceToY = (p: number) => centerY - (p - centerPrice) * pxPerUnit;
    
    // Create smooth path with interpolation for extended historical movements
    let path = '';
    for (let i = 0; i < pts.length; i++) {
      const pt = pts[i];
      // Chart positioned more to the left to show more future boxes ahead
      // Move chart left by 30% of screen width to see further ahead
      const chartOffset = size.w * 0.3; // 30% of screen width to the left
      const chartStartX = NOW_X - chartOffset; // Start chart more to the left
      const chartWidth = chartStartX + size.w; // Extend from left position
      const x = chartStartX - (pts.length - 1 - i) * (chartWidth / pts.length);
      
      // Use stable transform instead of basePrice calculation
      // Apply same pixel snapping as grid lines for consistent alignment
      const y = Math.round(priceToY(pt.p) - gridPosition.offsetY) + 0.5;
      
      if (i === 0) {
        path += `M ${x} ${y}`;
      } else {
        // Add intermediate points for smooth curves
        const prevPt = pts[i - 1];
        const prevX = chartStartX - (pts.length - 1 - (i - 1)) * (chartWidth / pts.length);
        
        // Previous point also uses stable transform
        // Apply same pixel snapping as grid lines for consistent alignment
        const prevY = Math.round(priceToY(prevPt.p) - gridPosition.offsetY) + 0.5;
        
        // Use quadratic curves for smooth interpolation
        const midX = (prevX + x) / 2;
        const midY = (prevY + y) / 2;
        path += ` Q ${midX} ${midY} ${x} ${y}`;
      }
    }
    return path;
  }, [series, size.w, size.h, NOW_X, center, gridPosition.offsetY, cellH]);





  // click select/deselect (ignore resolved)
  const toggleCell = (row: number, col: number) => {
    // Only allow cell selection if trading mode is active
    if (!isTradingMode) {
      return;
    }
    
    setGridCells(prev => {
      const updated = prev.map(cell => {
        if (cell.row !== row || cell.col !== col) return cell;
        if (cell.state === 'hit' || cell.state === 'missed') return cell;
        const newState: BoxState = cell.state === 'selected' ? 'idle' : 'selected';
        
        // Play sound effect when selecting a box
        if (newState === 'selected') {
          playSelectionSound();
        }
        
        return { 
          ...cell, 
          state: newState,
          selectionTime: newState === 'selected' ? Date.now() : undefined
        };
      });
      
      // Update selection count and best multiplier (only active selections)
      const activeSelectedCells = updated.filter(cell => 
        cell.state === 'selected' && !cell.crossedTime
      );
      const count = activeSelectedCells.length;
      const best = activeSelectedCells.length > 0 ? Math.max(...activeSelectedCells.map(cell => cell.mult)) : 0;
      const multipliers = activeSelectedCells.map(cell => cell.mult);
      
      // Update parent component
      onSelectionChange?.(count, best, multipliers, undefined);
      
      return updated;
    });
  };



  // Unified animation loop for maximum fluidity - after all calculations
  useEffect(() => {
    if (series.length < 1 || realBTCPrice <= 0) return; // Only animate when we have real data
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Pause animation when tab is hidden to prevent crashes
    if (document.hidden) return;
    
    let animationId: number;
    let lastTime = 0;
    let lastChartUpdate = 0; // Time-based chart update control
    const lastBoxGeneration = 0; // Time-based box generation control
    
    // Pre-calculate constants for stable movement - balanced scrolling speed
    const pixelsPerSecond = size.w / 0.8; // Move across screen in 0.8 seconds (balanced speed)
    const baseSpeed = pixelsPerSecond / 60; // Convert to pixels per frame at 60 FPS
    
    const animate = (currentTime: number) => {
      const timeDelta = currentTime - lastTime;
      
      // Use a fixed time step for consistent movement speed regardless of trading mode
      const fixedTimeStep = 16; // Always 60 FPS for consistent movement speed
      if (timeDelta < fixedTimeStep) {
        animationId = requestAnimationFrame(animate);
        return;
      }
      
      // Increment frame counter for collision caching
      frameCount.current++;
      
      // Clean up old collision cache entries (older than 10 frames)
      if (frameCount.current % 10 === 0) {
        for (const [key, value] of collisionCache.current.entries()) {
          if (frameCount.current - value.frame > 10) {
            collisionCache.current.delete(key);
          }
        }
      }
      
                          // Calculate movement using fixed time step for consistency
                    const dx = baseSpeed * (fixedTimeStep / 1000);
                    const now = Date.now();
                    
                    // Update price series with real BTC price data - optimized for short-term trading
                    if (live && realBTCPrice > 0) {
                      // Use real BTC price for chart updates - ultra-frequent for short-term trading
                      if (now - lastChartUpdate > 100) { // Update every 100ms for short-term responsiveness
                        const newPrice = realBTCPrice;
                        
                        setSeries(s => {
                          const next = [...s, { t: now, p: newPrice }];
                          // Keep more points for smoother short-term movement
                          const maxPts = Math.max(120, Math.round(NOW_X / 2));
                          return next.slice(-maxPts);
                        });
                        
                        // More responsive center transition for short-term movements
                        setCenter(prev => {
                          const diff = newPrice - prev;
                          return prev + diff * 0.2; // More responsive for short-term trading
                        });
                        
                        lastChartUpdate = now;
                      }
                    }
      
           // Update grid position to maintain chart tick in center
           setGridPosition(prev => {
             const newOffsetX = prev.offsetX + dx; // Grid moves left
             
             // Calculate new Y offset using stable transform system
             const currentPrice = series[series.length - 1]?.p;
             let newOffsetY = prev.offsetY;
             
             if (currentPrice) {
               // Use stable transform to calculate chart Y position
               const centerY = size.h / 2;
               const pxPerUnit = cellH / 10;
               const actualChartY = centerY - (currentPrice - centerPrice) * pxPerUnit;
               
               // Calculate the ideal Y position to keep chart tick centered
               const idealChartY = size.h / 2; // Center of screen
               const yOffsetNeeded = actualChartY - idealChartY;
               
               // Smoothly adjust Y offset to center the chart tick - balanced responsiveness
               newOffsetY = prev.offsetY + yOffsetNeeded * 0.15; // Balanced responsiveness
             }
              
             // Use the currentPrice we already calculated above
             if (currentPrice) {
               // Find the closest price level in our grid
               const closestPriceLevel = priceGridLines.reduce((closest, price) => {
                 return Math.abs(price - currentPrice) < Math.abs(closest - currentPrice) ? price : closest;
               });
               
               // Find the grid row for this price level
               const priceRowIndex = priceGridLines.indexOf(closestPriceLevel);
               const gridY = priceRowIndex * cellH - prev.offsetY; // Use prev.offsetY to avoid stale closure
             
             // Update grid cells for efficient hit detection at chart position and NOW line crossing
             // Update grid cells for efficient hit detection at chart position and NOW line crossing
             // Only update if there are actual changes to prevent performance issues
             setGridCells(prevCells => {
               let hasChanges = false;
               const updatedCells = prevCells.map(cell => {
                 // Calculate screen position for this cell using stable transform
                 const screenX = NOW_X + cell.col * cellW - newOffsetX;
                 
                 // Use EXACT same coordinate system as cell rendering for accurate hit detection
                 const stepValue = 10; // $10 between adjacent grid lines
                 const gapPx = cellH; // pixel distance between grid lines (row height)
                 const pxPerUnit = gapPx / stepValue;
                 const centerPrice = series[series.length - 1]?.p || center; // Current view center
                 const centerY = size.h / 2;
                 
                 // Transform functions (same as cell rendering)
                 const priceToY = (p: number) => centerY - (p - centerPrice) * pxPerUnit;
                 
                 // Calculate Y position using EXACT same method as cell rendering
                 // Find the nearest price that ends in 0 to the current center (same as rendering)
                 const nearestRoundPrice = Math.round(centerPrice / stepValue) * stepValue;
                 const priceAtRow = nearestRoundPrice + (cell.row - Math.floor(size.h / (2 * cellH))) * stepValue;
                 // Apply same pixel snapping as cell rendering for consistent alignment
                 const screenY = Math.round(priceToY(priceAtRow) - gridPosition.offsetY) + 0.5;
                 
                 let newState = cell.state;
                 let newCrossedTime = cell.crossedTime;
                 
                 // HIT DETECTION: Check if chart line intersects with selected cells
                 if (cell.state === 'selected' && !cell.crossedTime) {
                   // Check cells that are at the NOW line (chart position)
                   const distanceFromChart = Math.abs(screenX - NOW_X);
                   
                   if (distanceFromChart < cellW * 1.5) { // Check within 1.5 cell widths of chart
                     // Check if price line intersects with this cell
                     if (series.length > 1) {
                       // Get the most recent price line segment at the chart position
                       const i2 = series.length - 1, i1 = i2 - 1;
                       
                       // Use EXACT same coordinate system as cell rendering for accurate hit detection
                       const stepValue = 10; // $10 between adjacent grid lines
                       const gapPx = cellH; // pixel distance between grid lines (row height)
                       const pxPerUnit = gapPx / stepValue; // shared scale factor
                       
                       // Use same centerPrice as cell rendering (not series-based)
                       const centerY = size.h / 2;
                       
                       // Transform functions (same as cell rendering)
                       const priceToY = (p: number) => centerY - (p - centerPrice) * pxPerUnit;
                       
                       // Calculate Y positions using EXACT same method as cell rendering
                       const p1Y = Math.round(priceToY(series[i1].p) - gridPosition.offsetY) + 0.5;
                       const p2Y = Math.round(priceToY(series[i2].p) - gridPosition.offsetY) + 0.5;
                       
                       const p1 = { x: NOW_X - 6, y: p1Y };
                       const p2 = { x: NOW_X - 2, y: p2Y };
                       
                       // Create cell rectangle using EXACT same coordinates as rendering
                       const rect = { x: screenX, y: screenY, w: cellW, h: cellH };
                       
                       // Check collision between price line and cell
                       const isHit = segmentIntersectsRect(p1, p2, rect);
                       
                       if (isHit) {
                         newState = 'hit';
                         newCrossedTime = now;
                         hasChanges = true;
                         
                         // Play hit sound effect
                         playHitSound();
                       }
                     }
                   }
                 }
                 
                 // NOW LINE CROSSING: Mark cells as crossed when they pass the NOW line
                 if (screenX + cellW < NOW_X && !cell.crossedTime) {
                   newCrossedTime = now;
                   
                   // If selected cell hasn't been hit yet, mark as missed
                   if (cell.state === 'selected' && newState !== 'hit') {
                     newState = 'missed';
                     hasChanges = true;
                   } else if (cell.state === 'idle') {
                     // Idle cells are marked as missed when they cross
                     newState = 'missed';
                     hasChanges = true;
                   }
                 }
                 
                 // Only create new object if there are actual changes
                 if (cell.state !== newState || cell.crossedTime !== newCrossedTime) {
                   hasChanges = true;
                   return { ...cell, state: newState, crossedTime: newCrossedTime };
                 }
                 
                 return cell; // Return original cell if no changes
               });
               
               // Only update state if there are actual changes
               if (hasChanges) {
                 return updatedCells;
               }
               
               return prevCells; // Return original cells if no changes
             });
             
             return { offsetX: newOffsetX, offsetY: newOffsetY };
                       }
            
            return { offsetX: newOffsetX, offsetY: newOffsetY };
         });
         
         // Generate new grid cells and clean up old ones - optimized to prevent excessive updates
         setGridCells(prevCells => {
           const now = Date.now();
           
           // Clean up cells that have crossed and faded out
           const filtered = prevCells.filter(cell => {
             if (cell.crossedTime) {
               const timeSinceCrossed = now - cell.crossedTime;
               return timeSinceCrossed < 2000; // Keep for 2 seconds after crossing
             }
             return true;
           });
           
           // Create a map of ALL existing cells (including filtered ones) to preserve their state
           const existingCellsMap = new Map();
           prevCells.forEach(cell => {
             const key = `${cell.row},${cell.col}`;
             existingCellsMap.set(key, cell);
           });
           
           // Start with the filtered cells (cells that haven't crossed or are still visible)
           const result = [...filtered];
           
           // Find the rightmost column
           const rightmostCol = Math.max(...result.map(cell => cell.col), 0);
           
           // Calculate how many new columns we need for smooth movement
           const currentOffsetX = gridPosition.offsetX + dx; // Use current offset
           const rightmostScreenX = NOW_X + rightmostCol * cellW - currentOffsetX;
           const spaceToFill = size.w - rightmostScreenX;
           const columnsNeeded = Math.ceil(spaceToFill / cellW) + 8; // Keep 8 columns ahead for smooth movement
           
           // Generate new columns if needed
           if (columnsNeeded > 0) {
             // Use grid rows for proper spacing
             
             for (let c = 0; c < columnsNeeded; c++) {
               const newCol = rightmostCol + c + 1;
               
               // Generate cells for each grid row
               gridRows.forEach((rowIndex) => {
                 const cellKey = `${rowIndex},${newCol}`;
                 
                 // Check if cell already exists and preserve its state
                 if (existingCellsMap.has(cellKey)) {
                   const existingCell = existingCellsMap.get(cellKey);
                   result.push(existingCell);
                 } else {
                   // Generate new cell with random multiplier
                   const mult = +(1.0 + Math.random() * 14.0).toFixed(1);
                   
                   result.push({
                     row: rowIndex,
                     col: newCol,
                     mult,
                     state: 'idle',
                     crossedTime: undefined,
                     xStart: newCol * cellW,
                     xEnd: (newCol + 1) * cellW,
                     side: 'top' as const,
                     heightUnits: 1,
                     widthUnits: 1,
                   });
                 }
               });
             }
           }
           
           // Generate new rows at top and bottom as needed
           const currentPrice = series[series.length - 1]?.p;
           if (currentPrice) {
             // Find the closest price level in our grid
             const closestPriceLevel = priceGridLines.reduce((closest, price) => {
               return Math.abs(price - currentPrice) < Math.abs(closest - currentPrice) ? price : closest;
             });
             const priceRowIndex = priceGridLines.indexOf(closestPriceLevel);
             const gridY = priceRowIndex * cellH - gridPosition.offsetY;
             
                         // Use fixed row count - no need for dynamic row calculation
            const FIXED_ROW_COUNT = 20;
            
            // Ensure we have exactly FIXED_ROW_COUNT rows (0 to FIXED_ROW_COUNT-1)
            const existingRows = new Set(result.map(cell => cell.row));
            const minRow = Math.min(...result.map(cell => cell.row), 0);
            const maxRow = Math.max(...result.map(cell => cell.row), FIXED_ROW_COUNT - 1);
            
            // Add missing rows to ensure we have the full range
            for (let rowIndex = 0; rowIndex < FIXED_ROW_COUNT; rowIndex++) {
              if (!existingRows.has(rowIndex)) {
                // Add missing row for all existing columns
                const existingCols = new Set(result.map(cell => cell.col));
                for (const col of existingCols) {
                  const cellKey = `${rowIndex},${col}`;
                  
                  // Check if cell already exists and preserve its state
                  if (existingCellsMap.has(cellKey)) {
                    const existingCell = existingCellsMap.get(cellKey);
                    result.push(existingCell);
                  } else {
                    // Generate new cell with random multiplier
                    const mult = +(1.0 + Math.random() * 14.0).toFixed(1);
                    result.push({
                      row: rowIndex,
                      col: col,
                      mult,
                      state: 'idle',
                      crossedTime: undefined,
                      xStart: col * cellW,
                      xEnd: (col + 1) * cellW,
                      side: 'top' as const,
                      heightUnits: 1,
                      widthUnits: 1,
                    });
                  }
                }
              }
            }
           }
           
           return result;
         });
      
             // Render everything in the same frame
       // Clear canvas
       ctx.clearRect(0, 0, size.w, size.h);

       // Draw probabilities heatmap overlay if enabled
       if (showProbabilities) {
         renderProbabilitiesHeatmap(ctx);
       }
       
       // Pre-calculate common values to avoid repeated calculations
       const renderTime = Date.now();
       const isAnyCellSelected = gridCells.some(cell => cell.state === 'selected');
       
               // Performance optimization: batch render selected cells first, then others
        const selectedCells = isAnyCellSelected ? gridCells.filter(cell => cell.state === 'selected') : [];
        const otherCells = gridCells.filter(cell => cell.state !== 'selected');

        // Draw Y-axis grid lines FIRST (before cells) so they're visible underneath
        // Use FIXED $10 increments that always end in 0 (no recalculation)
        const stepValue = 10; // $10 between adjacent grid lines
        const gapPx = cellH; // pixel distance between grid lines (row height)
        const pxPerUnit = gapPx / stepValue;
        const centerPrice = series[series.length - 1]?.p || center; // Current view center
        const centerY = size.h / 2;
        
        // Transform functions (same as grid cells)
        const priceToY = (p: number) => centerY - (p - centerPrice) * pxPerUnit;
        const yToPrice = (y: number) => centerPrice + (centerY - y) / pxPerUnit;
        
        // FIXED GRID: Always show prices ending in 0 (112,120; 112,130; 112,140; etc.)
        // Find the nearest price that ends in 0 to the current center
        const nearestRoundPrice = Math.round(centerPrice / stepValue) * stepValue;
        
        // Use fixed number of grid lines for consistency
        const numGridLines = 20; // Fixed row count
        
        // Draw FIXED grid lines that always end in 0
        for (let i = 0; i < numGridLines; i++) {
          // Calculate price for this grid line - ALWAYS ends in 0
          const priceAtLine = nearestRoundPrice + (i - Math.floor(numGridLines / 2)) * stepValue;
          
          // Calculate Y position using stable transform
          const gridY = priceToY(priceAtLine) - gridPosition.offsetY;
          
          // Skip lines that are too far off-screen
          if (gridY < -50 || gridY > size.h + 50) continue;
          
          // Draw grid line
          const ySnap = Math.round(gridY) + 0.5;
          ctx.strokeStyle = 'rgba(255,255,255,0.05)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, ySnap);
          ctx.lineTo(size.w, ySnap);
          ctx.stroke();
          
          // Draw price label (only for visible lines) - ALWAYS ends in 0
          if (ySnap >= 20 && ySnap <= size.h - 20) {
            ctx.fillStyle = 'rgba(161, 161, 170, 0.6)';
            ctx.font = '10px sans-serif';
            ctx.fillText(`$${priceAtLine.toLocaleString()}`, 22, ySnap - 4);
          }
        }

        // Draw towers using same selection and styling as grid boxes
        gridCells.forEach(cell => {
        // Calculate screen position based on grid position and offsets + grid scroll
        // Apply same leftward offset as chart, ticker, and time grid for consistency
        const gridOffset = size.w * 0.3; // 30% of screen width to the left (same as other elements)
        const adjustedNOW_X = NOW_X - gridOffset; // Adjust NOW_X position for grid cells
        const screenX = adjustedNOW_X + cell.col * cellW - gridPosition.offsetX - gridScrollOffset;
        
        // Use stable transform for Y positioning - align with FIXED grid lines
        const stepValue = 10; // $10 between adjacent grid lines
        const gapPx = cellH; // pixel distance between grid lines (row height)
        const pxPerUnit = gapPx / stepValue;
        const centerPrice = series[series.length - 1]?.p || center; // Current view center
        const centerY = size.h / 2;
        
        // Transform functions (same as grid lines)
        const priceToY = (p: number) => centerY - (p - centerPrice) * pxPerUnit;
        
        // FIXED GRID: Calculate Y position using same fixed $10 increments as grid lines
        // Find the nearest price that ends in 0 to the current center
        const nearestRoundPrice = Math.round(centerPrice / stepValue) * stepValue;
        
        // Calculate Y position based on row index and FIXED transform
        // Row 0 = highest price (top), Row N = lowest price (bottom)
        const priceAtRow = nearestRoundPrice + (cell.row - Math.floor(size.h / (2 * cellH))) * stepValue;
        // Apply same pixel snapping as grid lines for consistent alignment
        const screenY = Math.round(priceToY(priceAtRow) - gridPosition.offsetY) + 0.5;
         
        // Skip cells that are too far off-screen - performance optimization
        if (screenX < -cellW * 3 || screenX > size.w + cellW * 3 || 
            screenY < -cellH * 3 || screenY > size.h + cellH * 3) return;
         
        const sel = cell.state === 'selected';
        const hit = cell.state === 'hit';
        const miss = cell.state === 'missed';

                 // Calculate opacity - use stable time reference
         let opacity = 1;
         if (miss && cell.crossedTime) {
           const timeSinceCrossed = renderTime - cell.crossedTime;
           if (timeSinceCrossed > 0) {
             const fadeProgress = Math.min(timeSinceCrossed / 2000, 1);
             opacity = 0.5 * (1 - fadeProgress);
           }
         }

                 // Cell fill with hover effect
         if (hit) {
           ctx.fillStyle = getCachedRgba(signatureColor, 0.28 * opacity);
         } else if (sel) {
           ctx.fillStyle = getCachedRgba(signatureColor, 0.18 * opacity);
         } else if (showProbabilities) {
           // If probabilities are enabled, use a very transparent fill so heatmap shows through
           ctx.fillStyle = `rgba(14,14,14,${0.05 * opacity})`;
         } else {
           ctx.fillStyle = '#0e0e0e';
         }

        // Calculate tower dimensions
        const towerWidth = cell.widthUnits * cellW; // Width based on widthUnits
        let towerHeight = cell.heightUnits * cellH; // Height in pixels
        
        // Calculate tower position - extend from top/bottom
        let towerY;
        const corridorCenterY = size.h / 2;
        const corridorHeight = 8 * cellH; // Central corridor height in pixels
        const corridorTop = corridorCenterY - corridorHeight / 2;
        const corridorBottom = corridorCenterY + corridorHeight / 2;
        
        if (cell.side === 'top') {
          // Top towers: extend upward from their row position
          towerY = screenY - towerHeight;
          // Ensure they don't overlap with corridor
          if (towerY + towerHeight > corridorTop) {
            towerHeight = corridorTop - towerY;
          }
        } else {
          // Bottom towers: extend downward from their row position
          towerY = screenY;
          // Ensure they don't overlap with corridor
          if (towerY < corridorBottom) {
            towerY = corridorBottom;
            towerHeight = Math.min(towerHeight, size.h - corridorBottom);
          }
        }
        
        // Draw tower fill - use same styling as grid boxes
        if (hit) {
          ctx.fillStyle = getCachedRgba(signatureColor, 0.28 * opacity);
        } else if (sel) {
          ctx.fillStyle = getCachedRgba(signatureColor, 0.18 * opacity);
        } else {
          ctx.fillStyle = '#0e0e0e'; // Same as grid boxes
        }
        ctx.fillRect(screenX + 0.5, towerY, towerWidth, towerHeight);
         
        // Draw tower border - use same styling as grid boxes
        let borderColor = '#2b2b2b';
        let borderWidth = 0.6;
        
        if (hit || sel) {
          borderColor = signatureColor;
          borderWidth = (hoveredCell && hoveredCell.row === cell.row && hoveredCell.col === cell.col) ? 1.5 : 1;
        } else if (hoveredCell && hoveredCell.row === cell.row && hoveredCell.col === cell.col) {
          borderColor = 'rgba(255,255,255,0.4)';
          borderWidth = 1.2;
        }
        
        // Apply fade effect to borders
        if (miss && cell.crossedTime) {
          const timeSinceCrossed = now - cell.crossedTime;
          if (timeSinceCrossed > 0) {
            const fadeProgress = Math.min(timeSinceCrossed / 2000, 1);
            const borderOpacity = 0.3 * (1 - fadeProgress);
            borderColor = borderColor.replace(')', `,${borderOpacity})`).replace('rgb', 'rgba');
          }
        }
        
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.setLineDash([]); // Solid lines
        ctx.strokeRect(screenX + 0.5, towerY, towerWidth, towerHeight);

                 // Selection outline animation - growing from center with fade in effect
         if (sel) {
           // Calculate animation progress based on selection time
           const selectionTime = cell.selectionTime || renderTime;
           const timeSinceSelection = renderTime - selectionTime;
           const animationDuration = 800; // 800ms animation duration
           const animationProgress = Math.min(timeSinceSelection / animationDuration, 1);
          
          // Easing function for smooth animation
          const easeOut = 1 - Math.pow(1 - animationProgress, 3);
          
          // Growing outline effect - start closer to borders, not from center
          const outlineWidth = 2;
          const growProgress = easeOut;
          
          // Start from 30% size instead of 0% for more natural appearance
          const minSize = 0.3; // Start at 30% of full size
          const sizeRange = 1 - minSize; // Remaining 70% to grow
          const currentSize = minSize + (sizeRange * growProgress);
          
          const currentWidth = towerWidth * currentSize;
          const currentHeight = towerHeight * currentSize;
          const offsetX = (towerWidth - currentWidth) / 2;
          const offsetY = (towerHeight - currentHeight) / 2;
          
          // Fade in effect
          const fadeProgress = Math.min(animationProgress * 2, 1); // Fade in faster than grow
          const outlineOpacity = 0.8 * fadeProgress;
          const fillOpacity = 0.18 * fadeProgress; // Match the original selected fill opacity
          
          // Draw growing solid outline (replaces the default border)
          ctx.strokeStyle = getCachedRgba(signatureColor, outlineOpacity);
          ctx.lineWidth = outlineWidth;
          ctx.setLineDash([]); // Solid lines
          
          // Animated rectangle that grows from center
          ctx.strokeRect(
            screenX + offsetX + 0.5, 
            towerY + offsetY, 
            currentWidth - 1, 
            currentHeight - 1
          );
          
          // Draw growing fill (replaces the default selected fill)
          ctx.fillStyle = getCachedRgba(signatureColor, fillOpacity);
          ctx.fillRect(
            screenX + offsetX + 0.5, 
            towerY + offsetY, 
            currentWidth - 1, 
            currentHeight - 1
          );
        }

        // Multiplier text with hover effect and filtering
        let textColor = sel ? `rgba(255,255,255,${opacity})` : `rgba(255,255,255,${0.12 * opacity})`;
         
        if (hoveredCell && hoveredCell.row === cell.row && hoveredCell.col === cell.col) {
          textColor = sel ? `rgba(255,255,255,${opacity})` : `rgba(255,255,255,${0.25 * opacity})`;
        }
         
        // Handle filtered cells - show placeholder text
        if (cell.mult < minMultiplier) {
          textColor = 'rgba(255,255,255,0.05)'; // Very faint text
        }
         
        // Make text more visible when probabilities are enabled
        if (showProbabilities && cell.state === 'idle') {
          textColor = `rgba(255,255,255,${0.8 * opacity})`; // Much brighter text
        }
         
        ctx.fillStyle = textColor;
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Draw text centered in tower
        const textX = screenX + towerWidth / 2;
        const textY = towerY + towerHeight / 2;
        
        if (cell.mult < minMultiplier) {
          ctx.fillText('--', textX, textY + 4);
        } else {
          ctx.fillText(`${cell.mult.toFixed(1)}x`, textX, textY + 4);
        }

         // New other players functionality - STACKED SYSTEM
         if (showOtherPlayers) {
           const cellKey = `${cell.row}-${cell.col}`;
           const rectSize = 18; // Size for both number and player boxes
           const overlapAmount = 2; // 2px overlap between boxes
           
           // Calculate total elements in stack (tracked players + number box if present)
           const trackedPlayers = trackedPlayerSelections[cellKey] || [];
           const hasPlayerCount = randomPlayerCounts[cellKey] ? 1 : 0;
           const totalElements = trackedPlayers.length + hasPlayerCount;
           
           if (totalElements > 0) {
             // Calculate total stack width for positioning
             const stackWidth = (totalElements * rectSize) - ((totalElements - 1) * overlapAmount);
             const startX = screenX + towerWidth - stackWidth - 4; // Start from right edge, accounting for stack width
             const rectY = towerY + 4; // 4px from top edge
             
             // Calculate fade opacity for other player elements (same as grid cells)
             let otherPlayerOpacity = 1;
             if (miss && cell.crossedTime) {
               const timeSinceCrossed = renderTime - cell.crossedTime;
               if (timeSinceCrossed > 0) {
                 const fadeProgress = Math.min(timeSinceCrossed / 2000, 1);
                 otherPlayerOpacity = 0.5 * (1 - fadeProgress);
               }
             }
             
             // Draw elements so leftmost appears on top (draw rightmost first, leftmost last)
             
             // 1. Draw number box first (rightmost, will be behind others)
             if (randomPlayerCounts[cellKey]) {
               const basePlayerCount = randomPlayerCounts[cellKey];
               // Ensure minimum count is at least the number of tracked players
               const playerCount = Math.max(basePlayerCount, trackedPlayers.length);
               const numberBoxX = startX + (trackedPlayers.length * (rectSize - overlapAmount));
               
               // Rectangle background (match grid cell background) with fade
               ctx.fillStyle = `rgba(14,14,14,${otherPlayerOpacity})`;
               ctx.beginPath();
               ctx.roundRect(numberBoxX, rectY, rectSize, rectSize, 4);
               ctx.fill();
               
               // Rectangle border (match grid cell border styling) with fade
               let borderColor = '#2b2b2b';
               let borderWidth = 0.6;
               if (sel) {
                 borderColor = signatureColor;
                 borderWidth = 1;
               }
               ctx.strokeStyle = `rgba(${borderColor === '#2b2b2b' ? '43,43,43' : signatureColor.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(',')},${otherPlayerOpacity})`;
               ctx.lineWidth = borderWidth;
               ctx.stroke();
               
               // Player count text (match grid cell text styling) with fade
               let textColor = 'rgba(255,255,255,0.12)';
               if (sel) {
                 textColor = `rgba(255,255,255,${opacity})`;
               }
               // Apply fade to text color
               const textOpacity = textColor.includes('0.12') ? 0.12 * otherPlayerOpacity : parseFloat(textColor.split(',')[3].replace(')', '')) * otherPlayerOpacity;
               ctx.fillStyle = `rgba(255,255,255,${textOpacity})`;
               ctx.font = '14px sans-serif';
               ctx.textAlign = 'center';
               ctx.textBaseline = 'middle';
               ctx.fillText(playerCount.toString(), numberBoxX + rectSize / 2, rectY + rectSize / 2);
             }
             
             // 2. Draw tracked player boxes from right to left (so leftmost appears on top)
             for (let i = trackedPlayers.length - 1; i >= 0; i--) {
               const player = trackedPlayers[i];
               const boxX = startX + (i * (rectSize - overlapAmount));
              
                // Draw rectangular box background (match grid cell background) with fade
                ctx.fillStyle = `rgba(14,14,14,${otherPlayerOpacity})`;
                ctx.beginPath();
                ctx.roundRect(boxX, rectY, rectSize, rectSize, 4);
                ctx.fill();
                
                // Draw box border (match grid cell border styling) with fade
                let borderColor = '#2b2b2b';
                let borderWidth = 0.6;
                if (sel) {
                  borderColor = signatureColor;
                  borderWidth = 1;
                }
                ctx.strokeStyle = `rgba(${borderColor === '#2b2b2b' ? '43,43,43' : signatureColor.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(',')},${otherPlayerOpacity})`;
                ctx.lineWidth = borderWidth;
                ctx.stroke();
              
              // Draw profile image if loaded, otherwise fallback to letter
              const img = loadedImages[player.id];
              if (img) {
                // Draw the preloaded image inside the box with fade
                ctx.save();
                ctx.globalAlpha = otherPlayerOpacity;
                ctx.beginPath();
                ctx.roundRect(boxX + 1, rectY + 1, rectSize - 2, rectSize - 2, 3);
                ctx.clip();
                ctx.drawImage(img, boxX + 1, rectY + 1, rectSize - 2, rectSize - 2);
                ctx.restore();
              } else {
                // Fallback to first letter if image not loaded yet (match grid cell text styling) with fade
                let textColor = 'rgba(255,255,255,0.12)';
                if (sel) {
                  textColor = `rgba(255,255,255,${opacity})`;
                }
                // Apply fade to text color
                const textOpacity = textColor.includes('0.12') ? 0.12 * otherPlayerOpacity : parseFloat(textColor.split(',')[3].replace(')', '')) * otherPlayerOpacity;
                ctx.fillStyle = `rgba(255,255,255,${textOpacity})`;
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(player.name.charAt(0).toUpperCase(), boxX + rectSize / 2, rectY + rectSize / 2);
              }
            }
          }
        }

        // Draw hit/miss status
        if (hit) {
          ctx.fillStyle = `rgba(229,229,229,${opacity})`;
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText('HIT', screenX + towerWidth - 8, towerY + towerHeight - 8);
        } else if (miss) {
          ctx.fillStyle = `rgba(156,163,175,${opacity})`;
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText('MISS', screenX + towerWidth - 8, towerY + towerHeight - 8);
        }
      });

      

      // Draw time-based grid lines (X-axis) - part of the grid element, moves with grid
      timeGridLines.forEach((timeSeconds) => {
        // Apply same leftward offset as chart and ticker for better future visibility
        const timeOffset = size.w * 0.3; // 30% of screen width to the left (same as chart/ticker)
        const adjustedNOW_X = NOW_X - timeOffset; // Adjust NOW_X position for grid lines
        
        // Calculate X position based on adjusted time (time moves from right to left) + grid scroll offset
        const timeX = adjustedNOW_X - (timeSeconds * (size.w / 300)) - gridScrollOffset;
        
        if (timeX < -50 || timeX > size.w + 50) return; // Skip off-screen lines
        
        // Special styling for 0:00 line (current time reference)
        const isCurrentTime = timeSeconds === 0;
        
        // Time grid line - make 0:00 line more prominent with signature color and dashed style
        if (isCurrentTime) {
          // 0:00 line: signature color with 60% opacity, dashed, prominent
          ctx.strokeStyle = signatureColor + '99'; // Add 60% opacity (99 in hex = 60%)
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 4]); // Dashed pattern: 8px dash, 4px gap
        } else {
          // Other time lines: subtle white
          ctx.strokeStyle = 'rgba(255,255,255,0.03)';
          ctx.lineWidth = 1;
          ctx.setLineDash([]); // Solid line
        }
        
        ctx.beginPath();
        ctx.moveTo(timeX, 0);
        ctx.lineTo(timeX, size.h);
        ctx.stroke();
        
        // Time label at the top - make 0:00 label more prominent
        if (timeX > 50 && timeX < size.w - 50) {
          const minutes = Math.floor(timeSeconds / 60);
          const seconds = timeSeconds % 60;
          const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          
          ctx.fillStyle = isCurrentTime ? 'rgba(255,255,255,0.9)' : 'rgba(161, 161, 170, 0.5)';
          ctx.font = isCurrentTime ? '11px sans-serif' : '9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(timeLabel, timeX, 15);
        }
      });





      // Draw price path - part of the grid element, moves with grid
      if (pathD) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([]); // Solid line for chart
        
        // Apply grid scroll offset to chart path
        ctx.save();
        ctx.translate(-gridScrollOffset, 0);
        
        // Ensure chart is drawn across full width without clipping
        const path = new Path2D(pathD);
        ctx.stroke(path);
        
        ctx.restore();
      }

      // Draw current price ticker - part of the grid element, moves with grid
      if (series.length > 0) {
        // Current price ticker - use independent smooth positioning system
        const currentPrice = series[series.length - 1].p;
        
                 // Use shared scale: both grid and ticker use the same linear mapping
         // This eliminates jumping by allowing ticker to move continuously between grid lines
         
         // Grid parameters (same as grid lines)
         const stepValue = 10; // $10 between adjacent grid lines
         const gapPx = cellH; // pixel distance between grid lines (row height)
         
         // Linear mapping function (shared between grid and ticker)
         const pxPerUnit = gapPx / stepValue;
         
         // STABLE TRANSFORM SYSTEM: No more recalibration via basePrice
         const centerY = size.h / 2; // vertical screen center (CSS px)
         const centerPrice = series[series.length - 1]?.p || center; // Current view center

         // Transform used by grid, chart, ticker, cursor, labels—EVERYTHING
         const priceToY = (p: number) => centerY - (p - centerPrice) * pxPerUnit;
         const yToPrice = (y: number) => centerPrice + (centerY - y) / pxPerUnit;

                 // Ticker positioning using stable transform (no recalibration)
        // Apply same pixel snapping as grid lines for consistent alignment
        const tickerY = Math.round(priceToY(currentPrice) - gridPosition.offsetY) + 0.5;
        
        // Apply grid scroll offset to price ticker
        ctx.save();
        ctx.translate(-gridScrollOffset, 0);
        
        // Apply same leftward offset as chart for better future visibility
        const tickerOffset = size.w * 0.3; // 30% of screen width to the left (same as chart)
        const tickerX = NOW_X - tickerOffset; // Position ticker more to the left
        
        // Signature color dot with 4px radius
        ctx.fillStyle = signatureColor;
        ctx.beginPath();
        ctx.arc(tickerX - 2, tickerY, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Price label background with signature color fill and 4px radius
        ctx.fillStyle = signatureColor;
        ctx.strokeStyle = signatureColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(tickerX - 81, tickerY - 10, 62, 20, 4);
        ctx.fill();
        ctx.stroke();
        
        // Price text with web app background color and proper positioning
        ctx.fillStyle = '#0f0f23'; // Web app background color
        ctx.font = '500 12px Geist, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle'; // Center text vertically
        ctx.letterSpacing = '0.5px';
        ctx.fillText(`$${Math.round(series[series.length - 1].p).toLocaleString()}`, tickerX - 50, tickerY);
        
        ctx.restore();
      }
      
      // Update animation state
      lastTime = currentTime;
      animationId = requestAnimationFrame(animate);
    };
    
         // Start animation loop
     animationId = requestAnimationFrame(animate);
     
     return () => {
       if (animationId) {
         cancelAnimationFrame(animationId);
       }
     };
   }, [series, size.w, size.h, NOW_X, cellW, cellH, rows, cols, center, pricePPXTarget, tickMs, priceGridLines, timeGridLines, currentTime, gridScrollOffset, autoFollowMode, gridRows, pathD, live, realBTCPrice, isTradingMode, showProbabilities, showOtherPlayers, randomPlayerCounts, trackedPlayerSelections, loadedImages, signatureColor, gridPosition.offsetX, gridPosition.offsetY, gridCells, hoveredCell, minMultiplier, renderProbabilitiesHeatmap]);



  // Canvas mouse down handling for drag start
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Always start dragging - this allows dragging from anywhere on the canvas
    setIsDragging(true);
    setDragStart({ x, y });

    // Check if clicking on a cell for selection (but still allow dragging)
    const clickedCell = gridCells.find(cell => {
      // Apply same leftward offset as rendering for consistent positioning
      const gridOffset = size.w * 0.3; // 30% of screen width to the left (same as rendering)
      const adjustedNOW_X = NOW_X - gridOffset; // Adjust NOW_X position for click detection
      const screenX = adjustedNOW_X + cell.col * cellW - gridPosition.offsetX - gridScrollOffset;
      
      // Use stable transform for Y positioning - same as FIXED rendering
      const stepValue = 10; // $10 between adjacent grid lines
      const gapPx = cellH; // pixel distance between grid lines (row height)
      const pxPerUnit = gapPx / stepValue;
      const centerPrice = series[series.length - 1]?.p || center; // Current view center
      const centerY = size.h / 2;
      
      // Transform functions (same as rendering)
      const priceToY = (p: number) => centerY - (p - centerPrice) * pxPerUnit;
      
      // FIXED GRID: Calculate Y position using same fixed $10 increments
      const nearestRoundPrice = Math.round(centerPrice / stepValue) * stepValue;
      const priceAtRow = nearestRoundPrice + (cell.row - Math.floor(size.h / (2 * cellH))) * stepValue;
      const screenY = priceToY(priceAtRow) - gridPosition.offsetY;
    
      const isInXRange = x >= screenX && x <= screenX + cellW;
      const isInYRange = y >= screenY && y <= screenY + cellH;
      
      return isInXRange && isInYRange;
    });

    if (clickedCell) {
      // Clicking on a cell - toggle selection
      if (clickedCell.state === 'idle' || clickedCell.state === 'selected') {
        toggleCell(clickedCell.row, clickedCell.col);
      }
    }
  };

  // Canvas mouse move handling for hover effects and dragging
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    if (isDragging) {
      // Handle grid dragging - more responsive and works from anywhere
      const deltaX = x - dragStart.x;
      const deltaY = y - dragStart.y;
      
      // Only update if there's actual movement (prevents jitter)
      if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
        // When dragging, switch to manual mode
        if (autoFollowMode) {
          setAutoFollowMode(false);
        }
        
        // Update grid scroll offset for manual navigation (reverse direction for natural feel)
        setGridScrollOffset(prev => prev - deltaX);
        
        // Update center price directly (invert screen Y grows downward)
        const pxPerUnit = cellH / 10;
        setCenterPrice(prev => prev - deltaY / pxPerUnit);
        
        setGridPosition(prev => ({
          offsetX: prev.offsetX - deltaX,
          offsetY: prev.offsetY - deltaY
        }));
        
        setDragStart({ x, y });
      }
    } else {
      // Handle hover effects
      const hovered = gridCells.find(cell => {
        // Apply same leftward offset as rendering for consistent positioning
        const gridOffset = size.w * 0.3; // 30% of screen width to the left (same as rendering)
        const adjustedNOW_X = NOW_X - gridOffset; // Adjust NOW_X position for hover detection
        const screenX = adjustedNOW_X + cell.col * cellW - gridPosition.offsetX - gridScrollOffset;
        
        // Use stable transform for Y positioning - same as FIXED rendering
        const stepValue = 10; // $10 between adjacent grid lines
        const gapPx = cellH; // pixel distance between grid lines (row height)
        const pxPerUnit = gapPx / stepValue;
        const centerPrice = series[series.length - 1]?.p || center; // Current view center
        const centerY = size.h / 2;
        
        // Transform functions (same as rendering)
        const priceToY = (p: number) => centerY - (p - centerPrice) * pxPerUnit;
        
        // FIXED GRID: Calculate Y position using same fixed $10 increments
        const nearestRoundPrice = Math.round(centerPrice / stepValue) * stepValue;
        const priceAtRow = nearestRoundPrice + (cell.row - Math.floor(size.h / (2 * cellH))) * stepValue;
        const screenY = priceToY(priceAtRow) - gridPosition.offsetY;
        
        const isInXRange = x >= screenX && x <= screenX + cellW;
        const isInYRange = y >= screenY && y <= screenY + cellH;
        
        return isInXRange && isInYRange;
      });

      setHoveredCell(hovered ? { row: hovered.row, col: hovered.col } : null);
    }
  };

  // Canvas mouse up handling for drag end
  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  // Don't render canvas until grid cells are ready
  if (gridCells.length === 0) {
    return (
      <div ref={hostRef} className="relative w-full h-[520px] overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#0E0E0E' }}>
        <div className="text-zinc-400 text-sm">Loading towers grid...</div>
      </div>
    );
  }

  return (
    <div ref={hostRef} className="relative w-full h-[520px] overflow-hidden" style={{ backgroundColor: '#0E0E0E' }}>
             <style jsx>{`
         .slider::-webkit-slider-thumb {
           appearance: none;
           height: 16px;
           width: 16px;
           border-radius: 50%;
           background: ${signatureColor};
           cursor: pointer;
         }
         .slider::-moz-range-thumb {
           appearance: none;
           height: 16px;
           width: 16px;
           border-radius: 50%;
           background: ${signatureColor};
           border: none;
           height: 16px;
           width: 16px;
           border-radius: 50%;
           background: ${signatureColor};
           cursor: pointer;
         }
       `}</style>
             
      
              <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full cursor-pointer"
          width={size.w}
          height={size.h}
          onMouseMove={handleCanvasMouseMove}
          onMouseDown={handleCanvasMouseDown}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        />

        {/* Live/Manual Status Indicator with Recenter Button - Top Right */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {/* Recenter Button - Only show when in manual mode, positioned to the left of status */}
          {!autoFollowMode && (
            <button
              onClick={handleRecenter}
              className="px-2 py-1 rounded text-xs font-medium flex items-center transition-colors cursor-pointer"
              style={{
                backgroundColor: '#1E3A8A',
                color: '#60A5FA',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                height: '24px' // Match the height of the status indicator
              }}
              title="Manual view - click to center on current time"
            >
              Recenter
            </button>
          )}

          {/* Status Indicator */}
          <div className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1" style={{ 
            backgroundColor: autoFollowMode ? '#0E2923' : '#2A1A0E', 
            color: autoFollowMode ? '#10AE80' : '#F7931A' 
          }}>
            <div className="w-3 h-3 rounded-full" style={{ 
              backgroundColor: autoFollowMode ? '#10AE80' : '#F7931A', 
              border: `2px solid ${autoFollowMode ? '#134335' : '#4A2F1A'}` 
            }}></div>
            {autoFollowMode ? "Live" : "Manual"}
          </div>
        </div>
    </div>
  );
  }

export default function ClientView() {
  const { signatureColor } = useSignatureColor();
  const [selectedCount, setSelectedCount] = useState(0);
  const [bestMultiplier, setBestMultiplier] = useState(0);
  const [selectedMultipliers, setSelectedMultipliers] = useState<number[]>([]);
  const [averagePositionPrice, setAveragePositionPrice] = useState<number | null>(null);
  const [currentBTCPrice, setCurrentBTCPrice] = useState<number | null>(null); // Current BTC price for display - null until we get real data
  const [btc24hChange, setBtc24hChange] = useState(0); // 24h price change percentage
  const [isPriceUpdating, setIsPriceUpdating] = useState(false); // Loading state for price updates
  const [minMultiplier, setMinMultiplier] = useState(1.0); // Minimum multiplier filter
  const [showOtherPlayers, setShowOtherPlayers] = useState(true); // Toggle for showing other players
  const [isTradingMode, setIsTradingMode] = useState(false); // Trading mode state
  const [zoomLevel, setZoomLevel] = useState(1.0); // 1.0 = normal, 0.5 = zoomed out, 2.0 = zoomed in
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false); // WebSocket connection status
  const [showProbabilities, setShowProbabilities] = useState(false); // Probabilities heatmap overlay
  const [wsConnectionFailures, setWsConnectionFailures] = useState<Record<string, number>>({}); // Track connection failures
  
  // Initialize audio context on first user interaction
  useEffect(() => {
    const initializeAudio = async () => {
      await getAudioContext();
    };
    
    // Initialize audio on any user interaction
    const handleUserInteraction = () => {
      initializeAudio();
      // Remove listeners after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
    
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);
  
  // Asset selection state
  const [selectedAsset, setSelectedAsset] = useState<'BTC' | 'ETH' | 'SOL'>('BTC');
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const [favoriteAssets, setFavoriteAssets] = useState<Set<'BTC' | 'ETH' | 'SOL'>>(new Set(['BTC'])); // BTC is favorited by default
  
  // Toggle favorite asset
  const toggleFavorite = (asset: 'BTC' | 'ETH' | 'SOL', event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent dropdown from closing
    setFavoriteAssets(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(asset)) {
        newFavorites.delete(asset);
      } else {
        newFavorites.add(asset);
      }
      return newFavorites;
    });
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.asset-dropdown')) {
        setIsAssetDropdownOpen(false);
      }
    };
    
    if (isAssetDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAssetDropdownOpen]);
  
  // Asset data with mock prices and 24h changes
  const assetData = {
    BTC: {
      name: 'Bitcoin',
      symbol: 'BTC',
      icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/d8/fd/f6/d8fdf69a-e716-1018-1740-b344df03476a/AppIcon-0-0-1x_U007epad-0-11-0-sRGB-85-220.png/460x0w.webp',
      price: currentBTCPrice || 111589,
      change24h: 0.677,
      volume24h: '63.12M'
    },
    ETH: {
      name: 'Ethereum',
      symbol: 'ETH',
      icon: 'https://static1.tokenterminal.com//ethereum/logo.png?logo_hash=fd8f54cab23f8f4980041f4e74607cac0c7ab880',
      price: 4300.9,
      change24h: 0.207,
      volume24h: '45.8M'
    },
    SOL: {
      name: 'Solana',
      symbol: 'SOL',
      icon: 'https://avatarfiles.alphacoders.com/377/377220.png',
      price: 213.74,
      change24h: 3.621,
      volume24h: '12.3M'
    }
  };
  
  
  // Toast notification state - support up to 5 stacked toasts with animation states
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; timestamp: number; isVisible: boolean }>>([]);
  
  // Ref to track the previous count to detect actual new selections
  const previousCountRef = useRef<number>(0);
  
  // Ref to track individual selection events for reliable position tracking
  const selectionEventsRef = useRef<Set<string>>(new Set());
  
  // Ref to track the last known selection state to detect actual changes
  const lastKnownSelectionRef = useRef<string>('');
  

  
  // Debounce selection updates to prevent performance issues
  const selectionUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Bet amount state - synced with right panel
  const [betAmount, setBetAmount] = useState(200);
  
  // Multi-exchange BTC price index system
  const wsRefs = useRef<{ [key: string]: WebSocket | null }>({});
  const reconnectTimeoutRefs = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});
  const exchangePricesRef = useRef<{ [key: string]: number }>({});
  const lastCompositePriceRef = useRef<number>(0);
  const priceHistoryRef = useRef<Array<{ time: number; price: number }>>([]);
  const compositeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Exchange weights for composite index (can be adjusted based on reliability/volume)
  const exchangeWeights = useMemo(() => ({
    'binance': 0.4,    // 40% weight - most reliable
    'coinbase': 0.3,   // 30% weight - major US exchange
    'kraken': 0.3      // 30% weight - major global exchange
  }), []);

  // Calculate composite BTC price from multiple exchanges
  const calculateCompositePrice = useCallback(() => {
    const prices = Object.values(exchangePricesRef.current);
    if (prices.length === 0) return null;
    
    // Calculate weighted average based on exchange weights
    let totalWeight = 0;
    let weightedSum = 0;
    
    Object.entries(exchangeWeights).forEach(([exchange, weight]) => {
      const price = exchangePricesRef.current[exchange];
      if (price && price > 0) {
        weightedSum += price * weight;
        totalWeight += weight;
      }
    });
    
    if (totalWeight === 0) return null;
    
    // Return weighted average with 2 decimal precision for smooth chart movement
    const compositePrice = Math.round((weightedSum / totalWeight) * 100) / 100;
    
    // Add small smoothing to prevent extreme jumps
    if (lastCompositePriceRef.current > 0) {
      const diff = compositePrice - lastCompositePriceRef.current;
      const maxJump = lastCompositePriceRef.current * 0.01; // Max 1% jump
      if (Math.abs(diff) > maxJump) {
        const smoothedPrice = lastCompositePriceRef.current + (diff > 0 ? maxJump : -maxJump);
        return Math.round(smoothedPrice * 100) / 100;
      }
    }
    
    return compositePrice;
  }, [exchangeWeights]);

  // Connect to multiple exchanges for composite price index
  const connectWebSockets = useCallback(() => {
    const exchanges = [
      {
        name: 'binance',
        url: 'wss://stream.binance.com:9443/ws/btcusdt@trade',
        weight: exchangeWeights.binance
      },
      {
        name: 'coinbase',
        url: 'wss://ws-feed.exchange.coinbase.com',
        weight: exchangeWeights.coinbase
      },
      {
        name: 'kraken',
        url: 'wss://ws.kraken.com',
        weight: exchangeWeights.kraken
      }
    ];

    exchanges.forEach(exchange => {
      if (wsRefs.current[exchange.name]?.readyState === WebSocket.OPEN) return;
      
      // Skip exchanges that have failed too many times
      if (wsConnectionFailures[exchange.name] >= 5) {
        console.warn(`⚠️ Skipping ${exchange.name} - too many connection failures`);
        return;
      }
      
      console.log(`Connecting to ${exchange.name} WebSocket for live BTC prices...`);
      
      try {
        const ws = new WebSocket(exchange.url);
        
        // Set connection timeout
        const connectionTimeout = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            console.warn(`⏰ ${exchange.name} WebSocket connection timeout`);
            ws.close();
          }
        }, 10000); // 10 second timeout
        
        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          
          // Reset failure count on successful connection
          setWsConnectionFailures(prev => ({
            ...prev,
            [exchange.name]: 0
          }));
          
          console.log(`✅ ${exchange.name} WebSocket connected successfully`);
          
          // Subscribe to BTC price feed (different for each exchange)
          if (exchange.name === 'coinbase') {
            ws.send(JSON.stringify({
              type: 'subscribe',
              product_ids: ['BTC-USD'],
              channels: ['ticker']
            }));
          } else if (exchange.name === 'kraken') {
            ws.send(JSON.stringify({
              event: 'subscribe',
              pair: ['XBT/USD'],
              subscription: { name: 'ticker' }
            }));
          }
          // Binance doesn't need subscription - it starts streaming immediately
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            let price = 0;
            
            // Parse price from different exchange formats
            if (exchange.name === 'binance' && data.p) {
              price = parseFloat(data.p);
            } else if (exchange.name === 'coinbase' && data.price) {
              price = parseFloat(data.price);
            } else if (exchange.name === 'kraken' && data[1] && data[1].c) {
              price = parseFloat(data[1].c[0]); // Close price from ticker
            }
            
            if (price > 0) {
              exchangePricesRef.current[exchange.name] = price;
              setIsWebSocketConnected(true);
              setIsPriceUpdating(false);
            }
          } catch (error) {
            console.error(`${exchange.name} WebSocket parse error:`, error);
          }
        };
        
        ws.onclose = () => {
          clearTimeout(connectionTimeout);
          console.log(`❌ ${exchange.name} WebSocket disconnected, attempting to reconnect...`);
          
          // Auto-reconnect after 1 second
          reconnectTimeoutRefs.current[exchange.name] = setTimeout(() => {
            connectWebSockets();
          }, 1000);
        };
        
        ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          
          // Track connection failures
          setWsConnectionFailures(prev => ({
            ...prev,
            [exchange.name]: (prev[exchange.name] || 0) + 1
          }));
          
          console.error(`${exchange.name} WebSocket connection failed:`, {
            exchange: exchange.name,
            url: exchange.url,
            readyState: ws.readyState,
            error: error,
            failureCount: (wsConnectionFailures[exchange.name] || 0) + 1
          });
          // Don't close immediately, let onclose handle reconnection
        };
        
        wsRefs.current[exchange.name] = ws;
      } catch (error) {
        console.error(`Failed to connect to ${exchange.name}:`, error);
      }
    });
  }, [exchangeWeights]);

  const handleSelectionChange = useCallback((count: number, best: number, multipliers: number[], averagePrice?: number | null) => {
    // Always update the state first
    setSelectedCount(count);
    setBestMultiplier(best);
    setSelectedMultipliers(multipliers);
    setAveragePositionPrice(averagePrice || null);
    
    // Only show toast when count actually increases (new box selected by user)
    if (count > previousCountRef.current && count > 0) {
      const newToastId = Date.now(); // Use timestamp as unique ID
      const newToast = {
        id: newToastId,
        message: "Trade Placed successfully",
        timestamp: Date.now(),
        isVisible: true
      };
      
      setToasts(prev => {
        const updated = [...prev, newToast];
        // Archive oldest toasts if we exceed 5, keeping only the latest 5
        if (updated.length > 5) {
          return updated.slice(-5);
        }
        return updated;
      });
      
      // Start fade out after 2.5 seconds, then remove after 3 seconds
      setTimeout(() => {
        setToasts(prev => prev.map(toast => 
          toast.id === newToastId ? { ...toast, isVisible: false } : toast
        ));
      }, 2500);
      
      // Remove toast completely after fade out completes
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== newToastId));
      }, 3000);
    }
    
    // Update the previous count for next comparison
    previousCountRef.current = count;
  }, []);

  const handleTradingModeChange = useCallback((tradingMode: boolean) => {
    setIsTradingMode(tradingMode);
  }, []);

  // Initialize multi-exchange WebSocket connections on mount
  useEffect(() => {
    connectWebSockets();
    
    return () => {
      // Clean up all exchange connections
      Object.entries(reconnectTimeoutRefs.current).forEach(([exchange, timeout]) => {
        if (timeout) {
          clearTimeout(timeout);
        }
      });
      Object.entries(wsRefs.current).forEach(([exchange, ws]) => {
        if (ws) {
          ws.close();
        }
      });
    };
  }, [connectWebSockets]);
  
  // Handle tab visibility changes to prevent crashes when switching tabs
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden - pause expensive operations
        console.log('Tab hidden, pausing operations');
      } else {
        // Tab is visible again - resume operations
        console.log('Tab visible, resuming operations');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Composite price calculation timer - runs every 500ms
  useEffect(() => {
    // Start timer for composite price calculation
    compositeTimerRef.current = setInterval(() => {
      // Only run when tab is visible to prevent background crashes
      if (!document.hidden) {
        const compositePrice = calculateCompositePrice();
        if (compositePrice) {
          const timestamp = Date.now();
          
          // Update current price
          setCurrentBTCPrice(compositePrice);
          lastCompositePriceRef.current = compositePrice;
          
          // Store price history for chart (keep last 100 points)
          priceHistoryRef.current.push({ time: timestamp, price: compositePrice });
          if (priceHistoryRef.current.length > 100) {
            priceHistoryRef.current = priceHistoryRef.current.slice(-100);
          }
          
          // Calculate 24h change if we have enough data
          if (priceHistoryRef.current.length > 1) {
            const oldestPrice = priceHistoryRef.current[0].price;
            const change = ((compositePrice - oldestPrice) / oldestPrice) * 100;
            setBtc24hChange(change);
          }
        }
      }
    }, 500); // Update every 500ms
    
    return () => {
      if (compositeTimerRef.current) {
        clearInterval(compositeTimerRef.current);
      }
    };
  }, [calculateCompositePrice]);
  

  // Update slider background when minMultiplier changes
  useEffect(() => {
    const slider = document.querySelector('.multiplier-slider') as HTMLInputElement;
    if (slider) {
      const percentage = ((minMultiplier - 1) / 14) * 100;
      slider.style.background = `linear-gradient(to right, ${signatureColor} 0%, ${signatureColor} ${percentage}%, #52525B ${percentage}%, #52525B 100%)`;
    }
  }, [minMultiplier, signatureColor]);

  // Set initial slider background
  useEffect(() => {
    const slider = document.querySelector('.multiplier-slider') as HTMLInputElement;
    if (slider) {
      const percentage = ((minMultiplier - 1) / 14) * 100;
      slider.style.background = `linear-gradient(to right, ${signatureColor} 0%, ${signatureColor} ${percentage}%, #52525B ${percentage}%, #52525B 100%)`;
    }
  }, [signatureColor, minMultiplier]);

      return (
      <>
        <style jsx>{`
          .multiplier-slider {
            -webkit-appearance: none;
            appearance: none;
            width: 96px;
            height: 8px;
            border-radius: 4px;
            background: #52525B;
            outline: none;
            cursor: pointer;
          }
          
          .multiplier-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            height: 16px;
            width: 20px;
            border-radius: 8px;
            background: white;
            cursor: pointer;
            border: 2px solid ${signatureColor};
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
          
          .multiplier-slider::-moz-range-thumb {
            height: 16px;
            width: 20px;
            border-radius: 8px;
            background: white;
            cursor: pointer;
            border: 2px solid ${signatureColor};
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
        `}</style>
        <div className="grid grid-cols-[minmax(0,1fr)_400px] h-[calc(100vh-56px-56px-24px)]">
        {/* Left: Towers Game + positions table */}
        <div className="min-w-0">
          {/* Live Market Header with Asset Selection */}
          <div className="flex items-center justify-between p-4 gap-4">
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
                  onClick={() => setIsAssetDropdownOpen(!isAssetDropdownOpen)}
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
                  <div className="absolute top-full left-0 mt-2 w-80 bg-[#171717] border border-zinc-700 rounded-lg shadow-lg z-50">
                    {Object.entries(assetData).map(([key, asset]) => (
                      <div
                        key={key}
                        className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-zinc-800 transition-colors ${
                          selectedAsset === key ? 'bg-zinc-800' : ''
                        }`}
                        onClick={() => {
                          setSelectedAsset(key as 'BTC' | 'ETH' | 'SOL');
                          setIsAssetDropdownOpen(false);
                        }}
                      >
                        {/* Star icon for favorites - clickable */}
                        <button
                          onClick={(e) => toggleFavorite(key as 'BTC' | 'ETH' | 'SOL', e)}
                          className="flex-shrink-0 p-1 hover:bg-zinc-700 rounded transition-colors"
                        >
                          <svg 
                            className={`w-4 h-4 transition-colors ${
                              favoriteAssets.has(key as 'BTC' | 'ETH' | 'SOL') 
                                ? 'text-yellow-400 fill-current' 
                                : 'text-zinc-500 fill-none'
                            }`} 
                            fill="currentColor" 
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={favoriteAssets.has(key as 'BTC' | 'ETH' | 'SOL') ? 0 : 1.5}
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
                          <div className="text-zinc-400 text-xs">{asset.name}</div>
                        </div>
                        
                        {/* Price and change */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-white text-sm font-medium">
                            {asset.price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          </div>
                          <div 
                            className="text-xs font-medium"
                            style={{ 
                              color: asset.change24h >= 0 ? TRADING_COLORS.positive : TRADING_COLORS.negative
                            }}
                          >
                            {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(3)}%
                          </div>
                        </div>
                        
                        {/* Volume text */}
                        <div className="text-zinc-400 text-xs flex-shrink-0">
                          Vol: {asset.volume24h}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Current Value */}
              <div className="flex items-center gap-2">
                <div className="text-white leading-none" style={{ fontSize: '28px', fontWeight: 500 }}>
                  {assetData[selectedAsset].price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                </div>
                {isPriceUpdating && (
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10AE80', border: '2px solid #134335' }}></div>
                )}
              </div>
              
              {/* Last 24h Change */}
              <div className="leading-none">
                <div className="text-zinc-400 leading-none" style={{ fontSize: '12px' }}>Last 24h</div>
                <div className="font-medium leading-none" style={{ 
                  fontSize: '18px',
                  color: assetData[selectedAsset].change24h >= 0 ? TRADING_COLORS.positive : TRADING_COLORS.negative
                }}>
                  {assetData[selectedAsset].change24h >= 0 ? '+' : ''}{assetData[selectedAsset].change24h.toFixed(3)}%
                </div>
              </div>
              
              {/* Volume 24h */}
              <div className="leading-none">
                <div className="text-zinc-400 leading-none" style={{ fontSize: '12px' }}>Volume 24h</div>
                <div className="text-white leading-none" style={{ fontSize: '18px' }}>{assetData[selectedAsset].volume24h}</div>
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
              
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400 flex-shrink-0" style={{ fontSize: '12px' }}>Min Multiplier:</span>
                  <div className="w-24">
                    <CustomSlider
                      min={1.0}
                      max={15.0}
                      step={0.1}
                      value={minMultiplier}
                      onChange={setMinMultiplier}
                      signatureColor={signatureColor}
                      className="w-full"
                    />
                  </div>
                  <span className="text-white font-medium" style={{ fontSize: '12px' }}>
                    {minMultiplier.toFixed(1)}x
                  </span>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                    className="w-6 h-6 rounded flex items-center justify-center hover:bg-zinc-700 transition-colors"
                    title="Zoom Out"
                  >
                    <svg className="w-3 h-3 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <div className="w-8 h-6 rounded flex items-center justify-center">
                    <span className="text-zinc-400 text-xs">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                  </div>
                  <button
                    onClick={() => setZoomLevel(prev => Math.min(2.0, prev + 0.25))}
                    className="w-6 h-6 rounded flex items-center justify-center hover:bg-zinc-700 transition-colors"
                    title="Zoom In"
                  >
                    <svg className="w-3 h-3 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
            </div>
          </div>
          
          <div className="border-t border-b border-zinc-800">
                         <TowersCanvas 
               live={true} 
               minMultiplier={minMultiplier}
               onSelectionChange={handleSelectionChange}
               isTradingMode={isTradingMode}
               realBTCPrice={assetData[selectedAsset].price}
               showProbabilities={showProbabilities}
               showOtherPlayers={showOtherPlayers}
               signatureColor={signatureColor}
               zoomLevel={zoomLevel}
             />
          </div>
          
          <PositionsTable 
            selectedCount={selectedCount}
            selectedMultipliers={selectedMultipliers}
            betAmount={betAmount}
            currentBTCPrice={assetData[selectedAsset].price}
            onPositionHit={(positionId) => {
              // Handle position hit - this will be called when a box is hit
              console.log('Position hit:', positionId);
            }}
            onPositionMiss={(positionId) => {
              // Handle position missed - this will be called when a box is missed
              console.log('Position missed:', positionId);
            }}
            hitBoxes={[]} // TODO: Connect to actual hit detection
            missedBoxes={[]} // TODO: Connect to actual hit detection
          />
        </div>
        
        {/* Right: betting panel only */}
        <RightPanel 
          isTradingMode={isTradingMode}
          onTradingModeChange={handleTradingModeChange}
          selectedCount={selectedCount}
          bestMultiplier={bestMultiplier}
          selectedMultipliers={selectedMultipliers}
          currentBTCPrice={assetData[selectedAsset].price}
          averagePositionPrice={averagePositionPrice}
          betAmount={betAmount}
          onBetAmountChange={setBetAmount}
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
            style={{ fontSize: '12px' }}
          >
            {/* Success Icon - Smaller with #13AD80 color */}
            <div className="w-4 h-4 rounded-full bg-[#13AD80] flex items-center justify-center flex-shrink-0">
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            {/* Message */}
            <span className="text-white font-normal">Trade Placed successfully</span>
            
            {/* Close Button */}
            <button 
              onClick={() => {
                // Start fade out animation
                setToasts(prev => prev.map(t => 
                  t.id === toast.id ? { ...t, isVisible: false } : t
                ));
                // Remove after animation completes
                setTimeout(() => {
                  setToasts(prev => prev.filter(t => t.id !== toast.id));
                }, 300);
              }}
              className="ml-2 text-zinc-400 hover:text-zinc-300 transition-colors flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
        </>
    );
}
