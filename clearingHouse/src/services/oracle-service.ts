// ClockModule removed - using clearing house app directly
import type { Timestamp } from "../domain/primitives";
import { Asset } from "../domain/primitives";

export interface OracleUpdate {
  symbol: string;
  price: number;
  sourceTs?: Timestamp;
  oracleSeq?: number;
}

export interface OracleSnapshot extends OracleUpdate {
  ts: Timestamp;
}

export class OracleService {
  private readonly supportedAssets = [Asset.BTC, Asset.USD]
  private updateInterval?: NodeJS.Timeout;
  private isRunning: boolean = false;
  private price: number = 100;
  // Controls how "wild" the price moves are per tick.
  // Interpreted as a fraction of the current price (e.g. 0.01 = up to ±1%).
  private volatility: number = 30;

  constructor(
    private readonly sendPriceUpdate: (symbol: Asset, price: number, time: Timestamp) => void | Promise<void>
  ) { }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Oracle is already running');
    }

    this.isRunning = true;
    this.startPriceUpdates();
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Oracle is not running');
    }

    this.isRunning = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
  }

  private async updatePriceAndTime(symbol: Asset, price: number, time: Timestamp): Promise<void> {
    await this.sendPriceUpdate(symbol, price, time);
  }

  private startPriceUpdates(): void {
    this.updateInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.generatePriceUpdates();
      }
    }, 100);
  }

  private async generatePriceUpdates(): Promise<void> {
    for (const asset of this.supportedAssets) {
      if (asset === Asset.USD) {
        continue;
      }
      // Random walk around the current price with configurable volatility.
      // Max absolute step is roughly: currentPrice * volatility.
      const maxStep = this.price * this.volatility;
      const randomFactor = Math.random() * 2 - 1; // in range [-1, 1]
      this.price = this.price + randomFactor * maxStep;
      await this.updatePriceAndTime(asset, this.price, new Date().getTime() as Timestamp);
    }
  }
}
