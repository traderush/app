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
   * Get conversion helpers for timestamp/world coordinate conversions
   */
  public getConversionHelpers(): PriceSeriesConversionHelpers {
    return {
      getWorldXForTimestamp: (timestamp: number) => {
        return getWorldXForTimestamp(
          timestamp,
          this.priceData,
          this.totalDataPoints,
          this.config.pixelsPerPoint,
          this.msPerPointEstimate
        );
      },
      getTimestampForWorldX: (worldX: number) => {
        return getTimestampForWorldX(
          worldX,
          this.priceData,
          this.totalDataPoints,
          this.config.pixelsPerPoint,
          this.msPerPointEstimate
        );
      },
      formatTimestampLabel: (timestamp: number, includeMillis?: boolean) => {
        return formatTimestampLabel(timestamp, includeMillis);
      },
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

