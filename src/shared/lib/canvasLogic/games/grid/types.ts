import type { GameConfig } from '../../core/Game';
import type { IronCondorGameType } from '@/shared/types';

/**
 * Price data point with optional timestamp
 */
export interface PriceData {
  price: number;
  timestamp?: number;
}

/**
 * Animation state for square selection/activation
 */
export interface SquareAnimation {
  startTime: number;
  progress: number;
  type?: 'select' | 'activate';
}

/**
 * Configuration options for GridGame
 * 
 * @property multipliers - Array of multiplier strings to display
 * @property pixelsPerPoint - Pixels per data point for horizontal spacing
 * @property pricePerPixel - Price units per pixel for vertical scaling
 * @property verticalMarginRatio - Ratio of vertical margin to total height
 * @property cameraOffsetRatio - Camera offset ratio for positioning
 * @property smoothingFactorX - Horizontal camera smoothing (0-1, higher = more smoothing)
 * @property smoothingFactorY - Vertical camera smoothing (0-1, higher = more smoothing)
 * @property lineEndSmoothing - Price line end point smoothing factor
 * @property animationDuration - Duration of animations in milliseconds
 * @property maxDataPoints - Maximum number of price data points to retain
 * @property showMultiplierOverlay - Whether to show multiplier values on boxes
 * @property externalDataSource - Whether price data comes from external source
 * @property visibleSquares - Array of squares to show (for boxes mode)
 * @property showDashedGrid - Whether to show dashed grid background
 * @property debugMode - Whether to show debug info overlays
 * @property gameType - Game type for rendering adjustments
 * @property showProbabilities - Whether to show probability heatmap overlay
 * @property showOtherPlayers - Whether to show other players' selections
 * @property minMultiplier - Minimum multiplier threshold to display
 * @property zoomLevel - Zoom level for boxes (< 1.0 zooms out, > 1.0 zooms in, default: 1.0)
 */
export interface GridGameConfig extends GameConfig {
  multipliers?: string[];
  pixelsPerPoint?: number;
  pricePerPixel?: number;
  verticalMarginRatio?: number;
  cameraOffsetRatio?: number;
  smoothingFactorX?: number;
  smoothingFactorY?: number;
  lineEndSmoothing?: number;
  animationDuration?: number;
  maxDataPoints?: number;
  showMultiplierOverlay?: boolean;
  externalDataSource?: boolean;
  visibleSquares?: Array<{ gridX: number; gridY: number }>;
  showDashedGrid?: boolean;
  debugMode?: boolean;
  gameType?: IronCondorGameType;
  showProbabilities?: boolean;
  showOtherPlayers?: boolean;
  minMultiplier?: number;
  zoomLevel?: number;
}

/**
 * Box data structure from backend
 */
export interface BackendBox {
  value: number;
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  width: number;
  height: number;
  totalTrades: number;
  userTrade?: number;
  timestampRange?: {
    start: number;
    end: number;
  };
  priceRange?: {
    min: number;
    max: number;
  };
  status?: 'hit' | 'missed';
  isEmpty?: boolean;
  isClickable?: boolean;
}

/**
 * Map of contract IDs to backend box data
 */
export type BackendMultiplierMap = Record<string, BackendBox>;

