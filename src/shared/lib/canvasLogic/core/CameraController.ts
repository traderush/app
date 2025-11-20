import type { Camera } from './WorldCoordinateSystem';
import type { PriceData } from '../games/grid/types';
import { GameType } from '@/shared/types';

export interface CameraControllerConfig {
  pixelsPerPoint: number;
  cameraOffsetRatio: number;
  width: number;
  visiblePriceRange: number;
  horizontalScale: number;
}

export interface FollowPriceUpdateOptions {
  isFollowingPrice: boolean;
  smoothingFactorX: number;
  smoothingFactorY: number;
  gameType: GameType;
  currentWorldX: number;
  latestPrice: number;
  visiblePriceRange: number;
}

/**
 * Manages camera positioning and automatic snapping to price line
 */
export class CameraController {
  private cameraSnapInterval: ReturnType<typeof setInterval> | null = null;
  
  constructor(
    private camera: Camera,
    private getPriceData: () => PriceData[],
    private getTotalDataPoints: () => number,
    private getConfig: () => CameraControllerConfig
  ) {}

  /**
   * Snap camera to the current price line position
   * Uses the price line's X and Y coordinates to center the view
   */
  snapToPrice(): void {
    const data = this.getPriceData();
    
    // Need at least 2 data points
    if (data.length < 2) {
      return;
    }

    const latestData = data[data.length - 1];
    if (
      !latestData ||
      typeof latestData.price !== 'number' ||
      isNaN(latestData.price)
    ) {
      return;
    }

    const config = this.getConfig();
    const latestPrice = Math.max(0, latestData.price);

    // Calculate where the price line currently is
    const lineEndWorldX = (this.getTotalDataPoints() - 1) * config.pixelsPerPoint;
    const lineEndWorldY = latestPrice;

    // Calculate camera position with offset (to position the line nicely on screen)
    const horizontalScale = Math.max(config.horizontalScale, 0.0001);
    const targetOffsetX = (config.width * config.cameraOffsetRatio) / horizontalScale;
    const newTargetX = lineEndWorldX - targetOffsetX;
    
    // Snap camera to the price line position
    this.camera.x = Math.max(0, newTargetX);
    this.camera.y = lineEndWorldY;
    this.camera.targetX = this.camera.x;
    this.camera.targetY = this.camera.y;
    this.camera.smoothX = this.camera.x;
    this.camera.smoothY = this.camera.y;
  }

  /**
   * Start the interval that snaps camera to price
   * @param intervalMs - Interval in milliseconds (default: 2000ms)
   */
  startAutoSnap(intervalMs: number = 2000): void {
    // Clear any existing interval
    if (this.cameraSnapInterval) {
      clearInterval(this.cameraSnapInterval);
    }
    
    // Snap immediately on start
    this.snapToPrice();
    
    this.cameraSnapInterval = setInterval(() => {
      this.snapToPrice();
    }, intervalMs);
  }

  /**
   * Stop the camera snap interval
   */
  stopAutoSnap(): void {
    if (this.cameraSnapInterval) {
      clearInterval(this.cameraSnapInterval);
      this.cameraSnapInterval = null;
    }
  }

  /**
   * Reset camera to follow price (legacy method for backward compatibility)
   * @param width - Canvas width
   * @param priceData - Array of price data
   * @param totalDataPoints - Total data points
   * @param config - Camera configuration
   */
  resetToFollowPrice(
    width: number,
    priceData: PriceData[],
    totalDataPoints: number,
    config: {
      pixelsPerPoint: number;
      cameraOffsetRatio: number;
      visiblePriceRange: number;
      horizontalScale: number;
    }
  ): void {
    if (priceData.length > 0) {
      const latest = priceData[priceData.length - 1];
      const latestPrice = typeof latest.price === 'number'
        ? Math.max(0, latest.price)
        : 0;

      // Align horizontal camera target with the latest data point
      const dataPoints = Math.max(1, totalDataPoints);
      const pixelsPerPoint = config.pixelsPerPoint;
      const cameraOffsetRatio = config.cameraOffsetRatio ?? 0;
      const horizontalScale = Math.max(config.horizontalScale, 0.0001);
      const targetOffsetX = (width * cameraOffsetRatio) / horizontalScale;
      const lineEndWorldX = (dataPoints - 1) * pixelsPerPoint;
      const targetX = Math.max(0, lineEndWorldX - targetOffsetX);

      this.camera.targetX = targetX;
      this.camera.x = targetX;
      this.camera.smoothX = targetX;

      // Snap vertical position to the latest price while respecting current visible range
      const minVisibleY = config.visiblePriceRange > 0
        ? config.visiblePriceRange / 2
        : latestPrice;
      const targetY = Math.max(minVisibleY, latestPrice);

      this.camera.targetY = targetY;
      this.camera.y = targetY;
      this.camera.smoothY = targetY;
    }
  }

  /**
   * Initialize camera to default position (used when no price data is available)
   */
  initializeCameraPosition(): void {
    // Set initial camera position
    if (this.camera.x === 0 && this.camera.y === 100) {
      this.camera.targetX = 0;
      this.camera.targetY = 100;
      this.camera.smoothX = 0;
      this.camera.smoothY = 100;
    }
  }

  /**
   * Update camera to follow price with smoothing
   * This method handles the continuous camera smoothing logic
   */
  updateFollowPrice(options: FollowPriceUpdateOptions): void {
    const {
      isFollowingPrice,
      smoothingFactorX,
      smoothingFactorY,
      gameType,
      currentWorldX,
      latestPrice,
      visiblePriceRange,
    } = options;

    const config = this.getConfig();

    // Only update camera targets if following price
    if (isFollowingPrice) {
      const horizontalScale = Math.max(config.horizontalScale, 0.0001);
      const targetOffsetX = (config.width * config.cameraOffsetRatio) / horizontalScale;
      const newTargetX = currentWorldX - targetOffsetX;
      this.camera.targetX = Math.max(0, newTargetX);

      // Always follow the latest price vertically to keep movement visible
      this.camera.targetY = latestPrice;

      // Special handling for SKETCH game type
      if (gameType === GameType.SKETCH) {
        this.camera.smoothY = latestPrice;
        this.camera.y = latestPrice;
      }
    }

    // Only apply smoothing if following price
    if (isFollowingPrice) {
      // Initialize smooth values if needed
      if (this.camera.smoothX === 0 && this.camera.targetX > 0) {
        this.camera.smoothX = this.camera.targetX;
      }
      if (this.camera.smoothY === 0 && this.camera.targetY > 0) {
        this.camera.smoothY = this.camera.targetY;
      }

      // Apply smoothing to X position
      this.camera.smoothX =
        this.camera.smoothX * smoothingFactorX +
        this.camera.targetX * (1 - smoothingFactorX);

      // Skip Y smoothing for sketch since we set it directly above
      if (gameType !== GameType.SKETCH) {
        this.camera.smoothY =
          this.camera.smoothY * smoothingFactorY +
          this.camera.targetY * (1 - smoothingFactorY);
        this.camera.y = Math.max(visiblePriceRange / 2, this.camera.smoothY);
      }

      // Use smooth X directly to prevent jitter from rounding
      this.camera.x = this.camera.smoothX;
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopAutoSnap();
  }
}

