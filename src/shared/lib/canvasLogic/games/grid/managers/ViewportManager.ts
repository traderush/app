import type { WorldCoordinateSystem } from '../../../core/WorldCoordinateSystem';
import { Manager } from '../../../core/Manager';
import { computeVisiblePriceRange } from '../utils/priceMetrics';
import type { GameType } from '@/shared/types';
import { defaultViewportManagerConfig } from '../../../config/defaultConfig';

export interface ViewportManagerConfig {
  height: number;
  verticalMarginRatio: number;
  gameType: GameType;
  basePriceRange?: number;
  smoothingFactor?: number;
  sketchVisibleBoxes?: number;
  defaultVisibleBoxes?: number;
  minVisibleRange?: number;
  maxVisibleRange?: number;
}

export interface ViewportUpdateResult {
  viewportHeight: number;
  visiblePriceRange: number;
}

/**
 * Manages viewport calculations including visible price range and viewport dimensions
 */
export class ViewportManager extends Manager {
  private visiblePriceRange: number = 10;
  private readonly config: Required<ViewportManagerConfig>;
  private verticalScale: number = 1;

  constructor(config: ViewportManagerConfig) {
    super();
    this.config = {
      ...defaultViewportManagerConfig,
      ...config,
    };
    this.initialized = true;
  }

  /**
   * Update viewport calculations based on current state
   * @param backendMultipliers - Backend multiplier data
   * @param priceData - Price data array
   * @param world - World coordinate system to update
   * @returns Viewport update result
   */
  public updateViewport(
    backendMultipliers: Record<string, { height: number }>,
    priceData: Array<{ price: number }>,
    world: WorldCoordinateSystem
  ): ViewportUpdateResult {
    // Calculate viewport dimensions
    const verticalMargin = this.config.height * this.config.verticalMarginRatio;
    const viewportTop = verticalMargin;
    const viewportBottom = this.config.height - verticalMargin;
    const viewportHeight = viewportBottom - viewportTop;

    // Calculate visible price range
    const rawPriceRange = computeVisiblePriceRange({
      backendMultipliers,
      priceData,
      gameType: this.config.gameType,
      currentVisibleRange: this.visiblePriceRange,
      basePriceRange: this.config.basePriceRange,
      smoothingFactor: this.config.smoothingFactor,
      sketchVisibleBoxes: this.config.sketchVisibleBoxes,
      defaultVisibleBoxes: this.config.defaultVisibleBoxes,
      minVisibleRange: this.config.minVisibleRange,
      maxVisibleRange: this.config.maxVisibleRange,
    });

    const scale = Math.max(this.verticalScale, 0.0001);
    const scaledRange = rawPriceRange / scale;
    const minRange = this.config.minVisibleRange;
    const maxRange = this.config.maxVisibleRange;
    this.visiblePriceRange = Math.max(minRange, Math.min(scaledRange, maxRange));

    // Update world viewport with smoothed range
    world.updateViewport(viewportHeight, this.visiblePriceRange);

    return {
      viewportHeight,
      visiblePriceRange: this.visiblePriceRange,
    };
  }

  /**
   * Set vertical scale used to keep boxes square with horizontal scaling
   */
  public setVerticalScale(scale: number): void {
    if (Number.isFinite(scale) && scale > 0) {
      this.verticalScale = scale;
    }
  }

  /**
   * Get current visible price range
   */
  public getVisiblePriceRange(): number {
    return this.visiblePriceRange;
  }

  /**
   * Update configuration (especially useful for height changes on resize)
   */
  public updateConfig(config: Partial<ViewportManagerConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Handle resize events
   */
  public resize(width: number, height: number): void {
    this.updateConfig({ height });
  }

  /**
   * Get current configuration
   */
  public getConfig(): Readonly<Required<ViewportManagerConfig>> {
    return this.config;
  }
}

