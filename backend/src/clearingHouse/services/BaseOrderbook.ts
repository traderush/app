import { EventEmitter } from 'events';
import { PriceFeedService } from './PriceFeedService';
import { BalanceService } from './BalanceService';

/**
 * Base orderbook class for managing financial derivatives contracts
 */
export abstract class BaseOrderbook<_TContract, TTimeframe> extends EventEmitter {
  protected timeframe: TTimeframe;
  protected priceFeedService: PriceFeedService | null = null;
  protected balanceService: BalanceService | null = null;
  protected currentPrice: number = 0;
  protected lastUpdateTime: number = 0;
  
  constructor(timeframe: TTimeframe) {
    super();
    this.timeframe = timeframe;
  }

  /**
   * Set dependencies
   */
  setDependencies(priceFeedService: PriceFeedService, balanceService: BalanceService): void {
    this.priceFeedService = priceFeedService;
    this.balanceService = balanceService;
  }

  /**
   * Handle price update
   */
  abstract onPriceUpdate(price: number, timestamp: number): void;

  /**
   * Clear all data
   */
  abstract clear(): void;
}