import { OrderbookId } from '../core/types';
import { ClearingHouseService } from './ClearingHouseService';

/**
 * Generates synthetic prices for every orderbook and forwards updates to the
 * clearing house without advancing the clearing house clock.
 */
export class PriceService {
  private readonly intervals = new Map<OrderbookId, NodeJS.Timeout>();
  private readonly lastPrices = new Map<OrderbookId, number>();
  private running = false;

  constructor(private readonly clearingHouse: ClearingHouseService) {}

  start(): boolean {
    if (this.running) {
      return true;
    }

    const orderbooks = this.clearingHouse.orderbooks.list();
    let startedAny = false;

    for (const orderbook of orderbooks) {
      const started = this.startOrderbook(orderbook.config.orderbookId);
      startedAny = startedAny || started;
    }

    this.running = startedAny;
    return startedAny;
  }

  stop(): void {
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals.clear();
    this.lastPrices.clear();
    this.running = false;
  }

  registerOrderbook(orderbookId: OrderbookId): void {
    if (!this.running) {
      return;
    }
    this.startOrderbook(orderbookId);
  }

  isRunning(): boolean {
    return this.running;
  }

  private startOrderbook(orderbookId: OrderbookId): boolean {
    if (this.intervals.has(orderbookId)) {
      return true;
    }

    const orderbook = this.clearingHouse.orderbooks.get(orderbookId);
    if (!orderbook) {
      return false;
    }

    const { priceStep, timeframeMs } = orderbook.config;

    const interval = setInterval(() => {
      const price = this.nextPrice(orderbookId, priceStep);
      this.clearingHouse.handlePriceUpdate(orderbookId, price, Date.now());
    }, timeframeMs);

    this.intervals.set(orderbookId, interval);

    const initialPrice = this.nextPrice(orderbookId, priceStep);
    this.clearingHouse.handlePriceUpdate(orderbookId, initialPrice, Date.now());

    return true;
  }

  private nextPrice(orderbookId: OrderbookId, priceStep: number): number {
    const base = this.lastPrices.get(orderbookId) ?? this.clearingHouse.getCurrentPrice(orderbookId) ?? 100;
    const variance = priceStep * 2;
    const delta = (Math.random() - 0.5) * variance;
    const next = Math.max(0.01, base + delta);
    this.lastPrices.set(orderbookId, next);
    return next;
  }
}
