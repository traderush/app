import { randomUUID } from "crypto";
import { ClearingHouseCommandType, type ClearingHouseApp } from "./app/clearing-house-app";
import type { Order } from "./core/orders";
import type { OrderbookConfig } from "./core/ephemeral-orderbook";
import type { IronCondorOrderData } from "./core/products/iron-condor";
import {
  Asset,
  type AccountId,
  type OrderId,
  type OrderbookId,
  type Timestamp,
} from "./domain/primitives";

export const MARKET_MAKER_ID = "market_maker_trillion" as AccountId;
export const MARKET_MAKER_BALANCE = 1_000_000_000_000;
const LIQUIDITY_ORDER_SIZE = 10;
const LIQUIDITY_MULTIPLIER_BASE = 5;
const LIQUIDITY_MULTIPLIER_JITTER = 4;

export type MarketMakerOrderbookTemplate = Omit<OrderbookConfig, "id">;
export type MarketMakerOrderbook = { id: OrderbookId; template: MarketMakerOrderbookTemplate };

interface PlacedOrderInfo {
  orderId: OrderId;
  windowEnd: Timestamp;
}

export interface MarketMaker {
  setOrderbooks(orderbooks: MarketMakerOrderbook[]): void;
  handleMarketUpdate(asset: Asset, price: number, time: Timestamp): Promise<void>;
}

export function createMarketMaker(app: ClearingHouseApp): MarketMaker {
  return new ContinuousMarketMaker(app);
}

class ContinuousMarketMaker implements MarketMaker {
  private readonly placedOrders = new Map<OrderbookId, Map<string, PlacedOrderInfo>>();
  private orderbooks: MarketMakerOrderbook[] = [];
  private updateQueue: Promise<void> = Promise.resolve();

  constructor(private readonly app: ClearingHouseApp) {}

  setOrderbooks(orderbooks: MarketMakerOrderbook[]): void {
    this.orderbooks = [...orderbooks];
    const validIds = new Set(orderbooks.map((entry) => entry.id));
    for (const id of [...this.placedOrders.keys()]) {
      if (!validIds.has(id)) {
        this.placedOrders.delete(id);
      }
    }
  }

  async handleMarketUpdate(asset: Asset, price: number, time: Timestamp): Promise<void> {
    if (this.orderbooks.length === 0) {
      return;
    }

    const nextUpdate = this.updateQueue.then(() => this.applyUpdate(asset, price, time));
    this.updateQueue = nextUpdate.catch(() => {});
    await nextUpdate;
  }

  private async applyUpdate(asset: Asset, price: number, time: Timestamp): Promise<void> {
    for (const orderbook of this.orderbooks) {
      if (orderbook.template.symbol !== asset) {
        continue;
      }

      this.pruneCache(orderbook.id, time);
      await this.ensureLiquidity(orderbook, price, time);
    }
  }

  private async ensureLiquidity(orderbook: MarketMakerOrderbook, price: number, now: Timestamp): Promise<void> {
    const { template } = orderbook;
    const cache = this.getCache(orderbook.id);

    const priceMin = price - template.placeOrdersBounds.priceMinusBound;
    const priceMax = price + template.placeOrdersBounds.pricePlusBound;
    const priceStart = alignDown(priceMin, template.priceStep);
    const priceEnd = alignDown(priceMax, template.priceStep);

    const earliestStart = now + template.placeOrdersBounds.timeBuffer;
    const latestStart = now + template.placeOrdersBounds.timeLimit;
    const firstWindowStart = alignUp(earliestStart, template.timeframe);
    const lastWindowStart = alignDown(latestStart, template.timeframe);

    if (firstWindowStart > lastWindowStart) {
      return;
    }

    for (let priceLevel = priceStart; priceLevel <= priceEnd; priceLevel += template.priceStep) {
      for (let windowStart = firstWindowStart; windowStart <= lastWindowStart; windowStart += template.timeframe) {
        const windowEnd = (windowStart + template.timeframe) as Timestamp;
        const key = this.toCacheKey(priceLevel, windowStart);
        if (cache.has(key)) {
          continue;
        }

        const order = this.buildOrder(template, priceLevel, windowStart as Timestamp, windowEnd, now);
        const orderId = await this.placeOrder(orderbook.id, template, order);
        cache.set(key, { orderId, windowEnd });
      }
    }
  }

  private async placeOrder(
    orderbookId: OrderbookId,
    template: MarketMakerOrderbookTemplate,
    order: Order<IronCondorOrderData>,
  ): Promise<OrderId> {
    return await this.app.dispatchCommand({
      type: ClearingHouseCommandType.PlaceOrder,
      accountId: MARKET_MAKER_ID,
      orderbookId,
      productTypeId: template.productTypeId,
      order: order as unknown as Order<Record<string, unknown>>,
    }) as OrderId;
  }

  private buildOrder(
    template: MarketMakerOrderbookTemplate,
    price: number,
    windowStart: Timestamp,
    windowEnd: Timestamp,
    timePlaced: Timestamp,
  ): Order<IronCondorOrderData> {
    const orderId = randomUUID() as OrderId;
    return {
      id: orderId,
      makerId: MARKET_MAKER_ID,
      data: {
        multiplier: this.generateMultiplier(),
        startRange: price,
        endRange: price + template.priceStep,
      },
      sizeTotal: LIQUIDITY_ORDER_SIZE,
      sizeRemaining: LIQUIDITY_ORDER_SIZE,
      timePlaced,
      pendingPositions: [],
      triggerWindow: {
        start: windowStart,
        end: windowEnd,
      },
    };
  }

  private pruneCache(orderbookId: OrderbookId, now: Timestamp): void {
    const cache = this.placedOrders.get(orderbookId);
    if (!cache) {
      return;
    }

    for (const [key, info] of cache) {
      if (info.windowEnd <= now) {
        cache.delete(key);
      }
    }

    if (cache.size === 0) {
      this.placedOrders.delete(orderbookId);
    }
  }

  private getCache(orderbookId: OrderbookId): Map<string, PlacedOrderInfo> {
    let cache = this.placedOrders.get(orderbookId);
    if (!cache) {
      cache = new Map();
      this.placedOrders.set(orderbookId, cache);
    }
    return cache;
  }

  private toCacheKey(price: number, windowStart: number): string {
    return `${price}:${windowStart}`;
  }

  private generateMultiplier(): number {
    const min = Math.max(1, LIQUIDITY_MULTIPLIER_BASE - LIQUIDITY_MULTIPLIER_JITTER);
    const max = LIQUIDITY_MULTIPLIER_BASE + LIQUIDITY_MULTIPLIER_JITTER;
    const value = min + Math.random() * (max - min);
    return Math.round(value * 100) / 100;
  }
}

function alignDown(value: number, step: number): number {
  if (step <= 0) {
    return value;
  }
  return Math.floor(value / step) * step;
}

function alignUp(value: number, step: number): number {
  if (step <= 0) {
    return value;
  }
  const remainder = value % step;
  if (remainder === 0) {
    return value;
  }
  return value + (step - remainder);
}
