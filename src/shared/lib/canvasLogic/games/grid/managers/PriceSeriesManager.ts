import type { PriceData } from '../types';
import { Manager } from '../../../core/Manager';
import { updateMsPerPointEstimate } from '../utils/priceMetrics';
import { getWorldXForTimestamp, getTimestampForWorldX, formatTimestampLabel } from '../utils/gridGameUtils';
import { defaultPriceSeriesManagerConfig } from '../../../config/defaultConfig';

export interface PriceSeriesManagerConfig {
  maxDataPoints: number;
  pixelsPerPoint: number;
  smoothingFactor?: number;
}

export interface PriceSeriesConversionHelpers {
  getWorldXForTimestamp: (timestamp: number) => number | null;
  getTimestampForWorldX: (worldX: number) => number | null;
  formatTimestampLabel: (timestamp: number, includeMillis?: boolean) => string;
}

/**
 * Manages price data series, smoothing, and timestamp/world coordinate conversions
 */
export class PriceSeriesManager extends Manager {
  private priceData: PriceData[] = [];
  private totalDataPoints: number = 0;
  private dataOffset: number = 0;
  private msPerPointEstimate: number = 500;
  private readonly config: Required<PriceSeriesManagerConfig>;
  
  // Frozen reference point for stable conversions when camera is not following
  private frozenReferenceWorldX: number | null = null;
  private frozenReferenceTimestamp: number | null = null;

  constructor(config: PriceSeriesManagerConfig) {
    super();
    this.config = {
      ...defaultPriceSeriesManagerConfig,
      ...config,
    };
    this.initialized = true;
  }

  /**
   * Add price data point with smoothing applied
   */
  public addPriceData(data: PriceData): void {
    // Apply smoothing
    const previousEntry = this.priceData[this.priceData.length - 1];
    if (previousEntry) {
      const smoothFactor = this.config.smoothingFactor;
      data.price = previousEntry.price * (1 - smoothFactor) + data.price * smoothFactor;
    }

    // Update msPerPoint estimate
    const previousTimestamp =
      typeof previousEntry?.timestamp === 'number' ? previousEntry.timestamp : undefined;
    const nextTimestamp =
      typeof data.timestamp === 'number' ? data.timestamp : undefined;
    this.msPerPointEstimate = updateMsPerPointEstimate({
      currentEstimate: this.msPerPointEstimate,
      lastTimestamp: previousTimestamp,
      nextTimestamp,
      smoothingFactor: 0.9,
      maxDeltaMs: 60_000,
      minEstimate: 1,
    });

    this.priceData.push(data);
    this.totalDataPoints++;

    // Trim data if exceeding max points
    if (this.priceData.length > this.config.maxDataPoints) {
      this.priceData.shift();
      this.dataOffset++;
    }
  }

  /**
   * Get current price data array (copy)
   */
  public getPriceData(): PriceData[] {
    return [...this.priceData];
  }

  /**
   * Get total number of data points processed
   */
  public getTotalDataPoints(): number {
    return this.totalDataPoints;
  }

  /**
   * Get data offset (number of points trimmed)
   */
  public getDataOffset(): number {
    return this.dataOffset;
  }

  /**
   * Get milliseconds per point estimate
   */
  public getMsPerPointEstimate(): number {
    return this.msPerPointEstimate;
  }

  /**
   * Get latest price data point
   */
  public getLatestPriceData(): PriceData | null {
    return this.priceData.length > 0 ? this.priceData[this.priceData.length - 1] : null;
  }

  /**
   * Check if reference point is frozen (camera not following)
   */
  private isFrozen(): boolean {
    return this.frozenReferenceWorldX !== null && this.frozenReferenceTimestamp !== null;
  }

  /**
   * Freeze reference point (called when camera stops following)
   * This prevents timestamp-to-worldX conversions from drifting
   */
  public freezeReferencePoint(): void {
    if (this.priceData.length === 0) return;
    
    const lastPoint = this.priceData[this.priceData.length - 1];
    if (!lastPoint?.timestamp) return;
    
    this.frozenReferenceWorldX = (this.totalDataPoints - 1) * this.config.pixelsPerPoint;
    this.frozenReferenceTimestamp = lastPoint.timestamp;
  }

  /**
   * Unfreeze reference point (called when camera starts following)
   */
  public unfreezeReferencePoint(): void {
    this.frozenReferenceWorldX = null;
    this.frozenReferenceTimestamp = null;
  }

  /**
   * Get conversion helpers for timestamp/world coordinate conversions
   */
  public getConversionHelpers(): PriceSeriesConversionHelpers {
    return {
      getWorldXForTimestamp: (timestamp: number) => this.getWorldXForTimestamp(timestamp),
      getTimestampForWorldX: (worldX: number) => this.getTimestampForWorldX(worldX),
      formatTimestampLabel: (timestamp: number, includeMillis?: boolean) =>
        formatTimestampLabel(timestamp, includeMillis),
    };
  }

  /**
   * Get world X position for the latest data point
   */
  public getCurrentWorldX(): number {
    return (this.totalDataPoints - 1) * this.config.pixelsPerPoint;
  }

  /**
   * Get world X position for a given timestamp
   */
  public getWorldXForTimestamp(timestamp: number): number | null {
    // Use frozen reference point if available (camera not following)
    if (this.isFrozen()) {
      const deltaMs = timestamp - this.frozenReferenceTimestamp!;
      const offsetPoints = deltaMs / Math.max(1, this.msPerPointEstimate);
      return this.frozenReferenceWorldX! + offsetPoints * this.config.pixelsPerPoint;
    }
    
    // Otherwise use current reference point (camera following)
    return getWorldXForTimestamp(
      timestamp,
      this.priceData,
      this.totalDataPoints,
      this.config.pixelsPerPoint,
      this.msPerPointEstimate
    );
  }

  /**
   * Get timestamp for a given world X position
   */
  public getTimestampForWorldX(worldX: number): number | null {
    // Use frozen reference point if available (camera not following)
    if (this.isFrozen()) {
      const deltaPoints = (worldX - this.frozenReferenceWorldX!) / this.config.pixelsPerPoint;
      return this.frozenReferenceTimestamp! + deltaPoints * this.msPerPointEstimate;
    }
    
    // Otherwise use current reference point (camera following)
    return getTimestampForWorldX(
      worldX,
      this.priceData,
      this.totalDataPoints,
      this.config.pixelsPerPoint,
      this.msPerPointEstimate
    );
  }

  /**
   * Format timestamp label
   */
  public formatTimestampLabel(timestamp: number, includeMillis: boolean = false): string {
    return formatTimestampLabel(timestamp, includeMillis);
  }

  /**
   * Check if we have enough data for rendering
   */
  public hasEnoughData(): boolean {
    return this.priceData.length >= 2;
  }

  /**
   * Clear all price data
   */
  public clear(): void {
    this.priceData = [];
    this.totalDataPoints = 0;
    this.dataOffset = 0;
    this.msPerPointEstimate = 500;
  }
}

