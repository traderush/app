import { GameType } from '@/shared/types';
import type { GridGameConfig } from '../games/grid/types';
import type { ViewportManagerConfig } from '../games/grid/managers/ViewportManager';
import type { PriceSeriesManagerConfig } from '../games/grid/managers/PriceSeriesManager';

/**
 * Default configuration values for GridGame
 */
export const defaultGridGameConfig: Required<Omit<GridGameConfig, 'theme' | 'width' | 'height' | 'dpr'>> = {
  fps: 60,
  multipliers: ['2X', '5X', '10X', '25X', '50X', '100X'],
  pixelsPerPoint: 5,
  pricePerPixel: 0.8,
  verticalMarginRatio: 0.1,
  cameraOffsetRatio: 0.2,
  smoothingFactorX: 0.95, // High smoothing for fluid camera movement
  smoothingFactorY: 0.92, // Smooth Y-axis following
  lineEndSmoothing: 0.88,
  animationDuration: 300, // Quick, responsive animations
  maxDataPoints: 500,
  showMultiplierOverlay: true,
  externalDataSource: false,
  visibleSquares: [],
  showDashedGrid: true, // Enable unified grid system for better performance
  debugMode: false,
  gameType: GameType.GRID,
  showProbabilities: false,
  showOtherPlayers: false,
  minMultiplier: 1.0,
  zoomLevel: 1.2,
};

/**
 * Default configuration values for ViewportManager
 */
export const defaultViewportManagerConfig: Required<Omit<ViewportManagerConfig, 'height' | 'verticalMarginRatio' | 'gameType'>> = {
  basePriceRange: 12,
  smoothingFactor: 0.85,
  sketchVisibleBoxes: 30,
  defaultVisibleBoxes: 10,
  minVisibleRange: 0.5,
  maxVisibleRange: 500,
};

/**
 * Default configuration values for PriceSeriesManager
 */
export const defaultPriceSeriesManagerConfig: Required<Omit<PriceSeriesManagerConfig, 'maxDataPoints' | 'pixelsPerPoint'>> = {
  smoothingFactor: 0.85,
};

