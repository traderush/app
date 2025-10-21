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
export const MARKET_MAKER_BALANCE = 1_000_000_000_000_000;
const LIQUIDITY_ORDER_SIZE = 1000;
const LIQUIDITY_MULTIPLIER_BASE = 5;
const LIQUIDITY_MULTIPLIER_JITTER = 4;
const FLOAT_EPSILON = 1e-8;

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

    let priceStart = snapUp(priceMin, template.priceStep);
    let priceEnd = snapDown(priceMax, template.priceStep);

    priceStart = normalizePrice(priceStart, template.priceStep, priceMax, priceMin);
    priceEnd = normalizePrice(priceEnd, template.priceStep, priceMax, priceMin);

    if (priceStart > priceEnd + FLOAT_EPSILON) {
      return;
    }

    const span = priceEnd - priceStart;
    const priceStepCount = span <= FLOAT_EPSILON
      ? 0
      : Math.max(0, Math.round(span / template.priceStep));

    const earliestStart = now + template.placeOrdersBounds.timeBuffer;
    const latestStart = now + template.placeOrdersBounds.timeLimit;
    const firstWindowStart = alignUp(earliestStart, template.timeframe);
    const lastWindowStart = alignDown(latestStart, template.timeframe);

    if (firstWindowStart > lastWindowStart) {
      return;
    }

    for (let priceIndex = 0; priceIndex <= priceStepCount; priceIndex++) {
      const priceLevel = normalizePrice(
        priceStart + priceIndex * template.priceStep,
        template.priceStep,
        priceMax,
        priceMin,
      );

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
  return Math.floor((value + FLOAT_EPSILON) / step) * step;
}

function alignUp(value: number, step: number): number {
  if (step <= 0) {
    return value;
  }
  return Math.ceil((value - FLOAT_EPSILON) / step) * step;
}

function snapDown(value: number, step: number): number {
  if (step <= 0) {
    return value;
  }
  return alignDown(value, step);
}

function snapUp(value: number, step: number): number {
  if (step <= 0) {
    return value;
  }
  return alignUp(value, step);
}

function normalizePrice(value: number, step: number, ceiling: number, floor: number = -Infinity): number {
  const bounded = Math.min(Math.max(value, floor), ceiling);
  const decimals = Math.min(8, Math.max(0, step.toString().split('.')[1]?.length ?? 0) + 2);
  return Number(bounded.toFixed(decimals));
}
