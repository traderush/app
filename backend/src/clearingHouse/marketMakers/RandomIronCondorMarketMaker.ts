import { ClearingHouseAPI } from '../ClearingHouseAPI';
import {
  IRON_CONDOR_PRODUCT_ID,
  buildIronCondorOrderbookConfig,
  getIronCondorOrderData,
} from '../products/ironCondor';
import {
  IRON_CONDOR_TIMEFRAMES,
} from '../setup/ironCondorBootstrap';
import {
  Order,
  PlaceOrderPayload,
  TimeWindow,
  UpdateOrderPayload,
} from '../core/types';
import { TimeFrame } from '../../config/timeframeConfig';

const MAKER_ID = 'mm_iron_condor';
const TARGET_COLLATERAL = 1_000;
const TARGET_BALANCE = 1_000_000_000;
const ORDER_SIZE = 1;
interface TrackedOrder {
  order: Order;
  bucket: number;
  timeframe: TimeFrame;
  columnIndex: number;
}

export class RandomIronCondorMarketMaker {
  private readonly orders = new Map<string, Map<string, TrackedOrder>>();
  private readonly configs = new Map<string, ReturnType<typeof buildIronCondorOrderbookConfig>>();
  private readonly placementGuards = new Map<string, Map<string, number>>();
  private priceListener?: (payload: { orderbookId: string; price: number; ts: number }) => void;
  private running = false;

  constructor(private readonly api: ClearingHouseAPI) {}

  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;

    this.bootstrapBalance();
    this.seedOrderbooks();
    this.attachPriceListener();
  }

  stop(): void {
    if (!this.running) {
      return;
    }
    this.running = false;
    if (this.priceListener) {
      this.api.clearingHouse.off('price_update', this.priceListener);
      this.priceListener = undefined;
    }
  }

  private bootstrapBalance(): void {
    const snapshot = this.api.ensureUser(MAKER_ID);
    if (snapshot.balance < TARGET_BALANCE) {
      this.api.deposit(MAKER_ID, TARGET_BALANCE - snapshot.balance);
    }
  }

  private seedOrderbooks(): void {
    const basePrice = this.getBasePrice();
    for (const timeframe of IRON_CONDOR_TIMEFRAMES) {
      const config = buildIronCondorOrderbookConfig(timeframe);
      this.configs.set(config.orderbookId, config);
      const buckets = new Map<string, TrackedOrder>();
      this.orders.set(config.orderbookId, buckets);

    const columns = this.columnCount(config);
    const priceStep = config.priceStep;
    const anchorPrice = this.alignPrice(basePrice, priceStep);

      for (
        let bucket = config.priceWindow.min;
        bucket <= config.priceWindow.max;
        bucket += 1
      ) {
        for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
          const order = this.placeOrder(
            config.orderbookId,
            timeframe,
            bucket,
            columnIndex,
            anchorPrice
          );
          if (order) {
            buckets.set(this.orderKey(bucket, columnIndex), {
              order,
              bucket,
              timeframe,
              columnIndex,
            });
          }
        }
      }
    }
  }

  private attachPriceListener(): void {
    this.priceListener = ({ orderbookId, price }) => {
      this.updateOrders(orderbookId, price);
    };
    this.api.clearingHouse.on('price_update', this.priceListener);
  }

  private updateOrders(orderbookId: string, price: number): void {
    const tracked = this.orders.get(orderbookId);
    const config = this.configs.get(orderbookId);
    if (!tracked || !config) {
      return;
    }

    const columns = this.columnCount(config);
    const priceStep = config.priceStep;
    const anchorPrice = this.alignPrice(price, priceStep);
    const timeframe = config.timeframeMs as TimeFrame;

    const desiredKeys = new Set<string>();
    for (let bucket = config.priceWindow.min; bucket <= config.priceWindow.max; bucket += 1) {
      for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
        const key = this.orderKey(bucket, columnIndex);
        desiredKeys.add(key);
        if (!tracked.has(key)) {
          const order = this.placeOrder(
            orderbookId,
            timeframe,
            bucket,
            columnIndex,
            anchorPrice
          );
          if (order) {
            tracked.set(key, {
              order,
              bucket,
              timeframe,
              columnIndex,
            });
          }
        }
      }
    }

    for (const [orderKey, record] of Array.from(tracked.entries())) {
      try {
        const updated = this.updateOrder(
          record.order,
          record.bucket,
          record.columnIndex,
          price
        );
        if (updated) {
          tracked.set(orderKey, {
            order: updated,
            bucket: record.bucket,
            timeframe: record.timeframe,
            columnIndex: record.columnIndex,
          });
          continue;
        }
      } catch (error) {
        // fall through to reseed
      }

      this.reseedOrder(
        orderbookId,
        record.bucket,
        record.columnIndex,
        record.timeframe,
        price
      );
    }

    for (const [orderKey, record] of Array.from(tracked.entries())) {
      if (!desiredKeys.has(orderKey)) {
        try {
          this.api.cancelOrder({ orderId: record.order.id, makerId: MAKER_ID });
        } catch (error) {
          // ignore
        }
        tracked.delete(orderKey);
      }
    }
  }

  private placeOrder(
    orderbookId: string,
    timeframe: TimeFrame,
    bucket: number,
    columnIndex: number,
    anchorPrice: number,
    multiplierOverride?: number
  ): Order | undefined {
    const config = this.configs.get(orderbookId) ?? buildIronCondorOrderbookConfig(timeframe);
    this.configs.set(orderbookId, config);

    const now = Date.now();
    const fillWindow = this.computeFillWindow(
      config,
      now,
      config.placeOrdersBuffer,
      columnIndex
    );
    if (!fillWindow) {
      return undefined;
    }

    const key = this.orderKey(bucket, columnIndex);
    if (!this.reservePlacement(orderbookId, key, config.timeframeMs, now)) {
      return undefined;
    }

    const payload: PlaceOrderPayload = {
      orderbookId,
      productTypeId: IRON_CONDOR_PRODUCT_ID,
      makerId: MAKER_ID,
      size: ORDER_SIZE,
      collateralRequired: TARGET_COLLATERAL,
      data: this.createOrderData(
        anchorPrice,
        bucket,
        config.priceStep,
        columnIndex,
        multiplierOverride
      ),
      fillWindow,
      triggerWindow: fillWindow,
      priceBucket: bucket,
    };

    try {
      const order = this.api.placeOrder(payload, now);
      this.releasePlacement(orderbookId, key);
      return order;
    } catch (error) {
      if (!this.shouldHoldPlacementGuard(error)) {
        this.releasePlacement(orderbookId, key);
      }
      return undefined;
    }
  }

  private updateOrder(
    order: Order,
    bucket: number,
    columnIndex: number,
    price: number
  ): Order | undefined {
    const config = this.configs.get(order.orderbookId);
    if (!config) {
      return undefined;
    }

    const anchorPrice = this.alignPrice(price, config.priceStep);
    const existingData = getIronCondorOrderData(order);
    const data = this.createOrderData(
      anchorPrice,
      bucket,
      config.priceStep,
      columnIndex,
      existingData?.multiplier
    );

    const payload: UpdateOrderPayload = {
      orderId: order.id,
      makerId: MAKER_ID,
      data,
      priceBucket: bucket,
      collateralRequired: TARGET_COLLATERAL,
      size: ORDER_SIZE,
    };

    try {
      return this.api.updateOrder(payload, Date.now());
    } catch (error) {
      return undefined;
    }
  }

  private reservePlacement(
    orderbookId: string,
    key: string,
    ttlMs: number,
    now: number
  ): boolean {
    const buffer = this.ensurePlacementBuffer(orderbookId);
    this.prunePlacementBuffer(buffer, now);
    const expiresAt = buffer.get(key);
    if (expiresAt && expiresAt > now) {
      return false;
    }
    buffer.set(key, now + Math.max(ttlMs, 250));
    return true;
  }

  private releasePlacement(orderbookId: string, key: string): void {
    const buffer = this.placementGuards.get(orderbookId);
    if (!buffer) {
      return;
    }
    buffer.delete(key);
    if (!buffer.size) {
      this.placementGuards.delete(orderbookId);
    }
  }

  private ensurePlacementBuffer(orderbookId: string): Map<string, number> {
    let buffer = this.placementGuards.get(orderbookId);
    if (!buffer) {
      buffer = new Map();
      this.placementGuards.set(orderbookId, buffer);
    }
    return buffer;
  }

  private prunePlacementBuffer(buffer: Map<string, number>, now: number): void {
    for (const [key, expiresAt] of buffer.entries()) {
      if (expiresAt <= now) {
        buffer.delete(key);
      }
    }
  }

  private shouldHoldPlacementGuard(error: unknown): boolean {
    const message = error instanceof Error ? error.message : undefined;
    return message === 'maker_duplicate_price_range';
  }

  private reseedOrder(
    orderbookId: string,
    bucket: number,
    columnIndex: number,
    timeframe: TimeFrame,
    price: number
  ): void {
    const tracked = this.orders.get(orderbookId);
    if (!tracked) {
      return;
    }
    const config = this.configs.get(orderbookId);
    if (!config) {
      return;
    }

    const key = this.orderKey(bucket, columnIndex);
    const existing = tracked.get(key);
    const existingData = existing ? getIronCondorOrderData(existing.order) : undefined;
    if (existing) {
      try {
        this.api.cancelOrder({ orderId: existing.order.id, makerId: MAKER_ID });
      } catch (error) {
        // ignore cancellation errors
      }
      tracked.delete(key);
    }

    const replacement = this.placeOrder(
      orderbookId,
      timeframe,
      bucket,
      columnIndex,
      this.alignPrice(price, config.priceStep),
      existingData?.multiplier
    );
    if (replacement) {
      tracked.set(key, {
        order: replacement,
        bucket,
        timeframe,
        columnIndex,
      });
    }
  }

  private computeFillWindow(
    config: ReturnType<typeof buildIronCondorOrderbookConfig>,
    now: number,
    bufferMultiplier: number,
    columnIndex: number
  ): TimeWindow | undefined {
    const bufferMs = bufferMultiplier * config.timeframeMs;
    const baseStart = now + config.timeframeMs * columnIndex;
    const start = Math.max(baseStart, now + bufferMs);
    const latestAllowedEnd = now + config.timeWindow.horizonMs;
    const end = Math.min(start + config.timeframeMs, latestAllowedEnd);
    if (end <= start) {
      return undefined;
    }
    return { start, end };
  }

  private orderKey(bucket: number, columnIndex: number): string {
    return `${bucket}:${columnIndex}`;
  }

  private createOrderData(
    anchorPrice: number,
    bucket: number,
    priceStep: number,
    columnIndex: number,
    multiplierOverride?: number
  ) {
    const bucketOffset = bucket * priceStep;
    const startRange = anchorPrice + bucketOffset;
    const endRange = startRange + priceStep;
    const multiplier =
      typeof multiplierOverride === 'number'
        ? multiplierOverride
        : this.randomMultiplier();
    return {
      startRange,
      endRange,
      multiplier,
      columnIndex,
      anchorPrice,
    };
  }

  private randomMultiplier(): number {
    return 0.5 + Math.random() * 1.5;
  }

  private getBasePrice(): number {
    const price = this.api.clearingHouse.getCurrentPrice();
    return price > 0 ? price : 100;
  }

  private alignPrice(price: number, priceStep: number): number {
    if (!isFinite(priceStep) || priceStep <= 0) {
      return price;
    }
    return Math.round(price / priceStep) * priceStep;
  }

  private columnCount(config: ReturnType<typeof buildIronCondorOrderbookConfig>): number {
    return Math.max(1, Math.round(config.timeWindow.horizonMs / config.timeframeMs));
  }
}
