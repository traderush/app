import { ProductTypeHooks } from './product';
import {
  Order,
  OrderId,
  OrderStatus,
  PositionRef,
  OrderbookConfig,
  Timestamp,
} from './types';

interface PriceBucket {
  bucketId: number;
  orderIds: OrderId[];
}

interface TimeColumn {
  start: Timestamp;
  end: Timestamp;
  priceBuckets: Map<number, PriceBucket>;
}

interface AdvanceResult {
  droppedOrderIds: OrderId[];
}

export class EphemeralOrderbook {
  readonly config: OrderbookConfig;
  private readonly productHooks: ProductTypeHooks;
  private readonly orders = new Map<OrderId, Order>();
  private readonly columns: TimeColumn[] = [];
  private readonly columnLookup = new Map<number, TimeColumn>();
  private readonly orderPlacement = new Map<
    OrderId,
    { columnStart: number; priceBucket: number }
  >();
  private lastObservedTime = 0;

  constructor(config: OrderbookConfig, productHooks: ProductTypeHooks) {
    this.config = config;
    this.productHooks = productHooks;
  }

  snapshot(): Order[] {
    return Array.from(this.orders.values()).map((order) => ({ ...order }));
  }

  place(
    order: Order,
    now: Timestamp
  ): { success: true; order: Order } | { success: false; reason: string } {
    this.lastObservedTime = Math.max(this.lastObservedTime, now);
    const validation = this.validatePlacement(
      order,
      now,
      this.config.placeOrdersBuffer
    );
    if (!validation.success) {
      return validation;
    }

    this.insertOrder(order, now);
    return { success: true, order };
  }

  update(
    orderId: OrderId,
    updater: (order: Order) => Order,
    now: Timestamp
  ): { success: boolean; order?: Order; reason?: string } {
    this.lastObservedTime = Math.max(this.lastObservedTime, now);
    const existing = this.orders.get(orderId);
    if (!existing) {
      return { success: false, reason: 'order_not_found' };
    }

    if (existing.cancelOnly) {
      return { success: false, reason: 'order_cancel_only' };
    }

    const candidate = updater({ ...existing });
    const validation = this.validatePlacement(
      candidate,
      now,
      this.config.updateOrdersBuffer
    );
    if (!validation.success) {
      return validation;
    }

    candidate.version = existing.version + 1;
    this.insertOrder(candidate, now, existing);
    return { success: true, order: candidate };
  }

  mutate(orderId: OrderId, mutator: (order: Order) => void): Order | undefined {
    const existing = this.orders.get(orderId);
    if (!existing) {
      return undefined;
    }
    const clone = { ...existing };
    mutator(clone);
    clone.version = existing.version + 1;
    this.orders.set(orderId, clone);
    this.reindexOrder(clone, this.lastObservedTime || clone.fillWindow.start);
    return clone;
  }

  cancel(orderId: OrderId, _reason: string): { success: boolean; order?: Order; reason?: string } {
    const existing = this.orders.get(orderId);
    if (!existing) {
      return { success: false, reason: 'order_not_found' };
    }
    existing.status = OrderStatus.CANCELLED;
    existing.cancelOnly = true;
    existing.sizeRemaining = 0;
    existing.version += 1;
    this.orders.set(orderId, existing);
    this.removeFromCurrentColumn(orderId);
    return { success: true, order: { ...existing } };
  }

  markCancelOnly(orderId: OrderId, now: Timestamp): void {
    const existing = this.orders.get(orderId);
    if (!existing) {
      return;
    }
    existing.cancelOnly = true;
    existing.version += 1;
    if (existing.fillWindow.end <= now) {
      existing.status = OrderStatus.EXPIRED;
    }
    this.orders.set(orderId, existing);
    this.removeFromCurrentColumn(orderId);
  }

  attachPendingPosition(orderId: OrderId, position: PositionRef): void {
    const existing = this.orders.get(orderId);
    if (!existing) {
      throw new Error(`Order ${orderId} not found`);
    }
    existing.pendingPositions.push(position);
    existing.version += 1;
    this.orders.set(orderId, existing);
  }

  resolvePendingPosition(orderId: OrderId, positionId: string): void {
    const existing = this.orders.get(orderId);
    if (!existing) {
      return;
    }
    existing.pendingPositions = existing.pendingPositions.filter(
      (ref) => ref.positionId !== positionId
    );
    existing.version += 1;
    this.orders.set(orderId, existing);
  }

  ordersWithPendingPositions(now: Timestamp): Order[] {
    const results: Order[] = [];
    for (const order of this.orders.values()) {
      if (!order.pendingPositions.length) {
        continue;
      }
      if (order.triggerWindow.start <= now && now <= order.triggerWindow.end) {
        results.push({ ...order });
      }
    }
    return results;
  }

  pendingPositionsDue(order: Order, now: Timestamp): PositionRef[] {
    return order.pendingPositions.filter(
      (ref) => ref.triggerWindow.start <= now && now <= ref.triggerWindow.end
    );
  }

  advance(now: Timestamp): AdvanceResult {
    this.lastObservedTime = Math.max(this.lastObservedTime, now);
    this.ensureColumnsCover(now);
    const dropped: OrderId[] = [];
    const requeue: Order[] = [];

    while (this.columns.length && this.columns[0].end <= now) {
      const column = this.columns.shift()!;
      this.columnLookup.delete(column.start);
      for (const bucket of column.priceBuckets.values()) {
        for (const orderId of bucket.orderIds) {
          this.orderPlacement.delete(orderId);
          const order = this.orders.get(orderId);
          if (!order) {
            continue;
          }
          if (order.triggerWindow.end < now) {
            dropped.push(order.id);
          } else {
            requeue.push(order);
          }
        }
      }
    }

    for (const order of this.orders.values()) {
      if (order.triggerWindow.end < now) {
        if (!dropped.includes(order.id)) {
          dropped.push(order.id);
        }
      } else if (order.fillWindow.end < now && !order.cancelOnly) {
        this.markCancelOnly(order.id, now);
      }
    }

    for (const orderId of dropped) {
      this.orders.delete(orderId);
      this.removeFromCurrentColumn(orderId);
    }

    for (const order of requeue) {
      if (!this.orders.has(order.id) || order.cancelOnly) {
        continue;
      }
      this.reindexOrder(order, now);
    }

    this.ensureColumnsCover(now);
    return { droppedOrderIds: dropped };
  }

  getById(orderId: OrderId): Order | undefined {
    const order = this.orders.get(orderId);
    return order ? { ...order } : undefined;
  }

  private validatePlacement(
    order: Order,
    now: Timestamp,
    bufferMultiplier: number
  ): { success: true } | { success: false; reason: string } {
    const bufferMs = bufferMultiplier * this.config.timeframeMs;
    if (order.fillWindow.start < now + bufferMs) {
      return { success: false, reason: 'fill_window_too_soon' };
    }
    if (order.fillWindow.end <= order.fillWindow.start) {
      return { success: false, reason: 'invalid_fill_window' };
    }
    if (order.fillWindow.end > now + this.config.timeWindow.horizonMs) {
      return { success: false, reason: 'fill_window_out_of_range' };
    }
    if (
      order.priceBucket < this.config.priceWindow.min ||
      order.priceBucket > this.config.priceWindow.max
    ) {
      return { success: false, reason: 'price_bucket_out_of_range' };
    }
    return { success: true };
  }

  private insertOrder(order: Order, now: Timestamp, previous?: Order): void {
    this.orders.set(order.id, { ...order });
    if (previous) {
      this.removeFromCurrentColumn(previous.id);
    }
    this.reindexOrder(order, now);
  }

  private reindexOrder(order: Order, referenceTs: Timestamp): void {
    const anchor = Math.max(referenceTs, this.columns[0]?.start ?? referenceTs);
    const column = this.getColumnForTimestamp(anchor);
    if (!column) {
      return;
    }

    this.placeIntoColumn(order, column);
  }

  private placeIntoColumn(order: Order, column: TimeColumn): void {
    this.removeFromCurrentColumn(order.id);
    const priceBucket = this.ensureBucket(column, order.priceBucket);
    priceBucket.orderIds.push(order.id);
    if (this.productHooks.orderComparator) {
      priceBucket.orderIds.sort((aId, bId) => {
        const a = this.orders.get(aId)!;
        const b = this.orders.get(bId)!;
        return this.productHooks.orderComparator!(a, b);
      });
    }
    this.orderPlacement.set(order.id, {
      columnStart: column.start,
      priceBucket: order.priceBucket,
    });
  }

  private removeFromCurrentColumn(orderId: OrderId): void {
    const placement = this.orderPlacement.get(orderId);
    if (!placement) {
      return;
    }
    const column = this.columnLookup.get(placement.columnStart);
    if (!column) {
      this.orderPlacement.delete(orderId);
      return;
    }
    const bucket = column.priceBuckets.get(placement.priceBucket);
    if (bucket) {
      const index = bucket.orderIds.indexOf(orderId);
      if (index >= 0) {
        bucket.orderIds.splice(index, 1);
      }
      if (!bucket.orderIds.length) {
        column.priceBuckets.delete(placement.priceBucket);
      }
    }
    this.orderPlacement.delete(orderId);
  }

  private ensureBucket(column: TimeColumn, bucketId: number): PriceBucket {
    let bucket = column.priceBuckets.get(bucketId);
    if (!bucket) {
      bucket = { bucketId, orderIds: [] };
      column.priceBuckets.set(bucketId, bucket);
    }
    return bucket;
  }

  private alignToFrame(ts: Timestamp): Timestamp {
    const timeframe = this.config.timeframeMs;
    if (timeframe <= 0) {
      return ts;
    }
    return Math.floor(ts / timeframe) * timeframe;
  }

  private ensureColumnsCover(now: Timestamp): void {
    const timeframe = this.config.timeframeMs;
    const horizon = this.config.timeWindow.horizonMs;
    const baseNow = Math.max(this.lastObservedTime, now);

    if (!this.columns.length) {
      const start = this.alignToFrame(baseNow);
      this.buildColumns(start, start + horizon);
      return;
    }

    const desiredEnd = this.alignToFrame(baseNow + horizon) + timeframe;
    let lastEnd = this.columns[this.columns.length - 1].end;
    while (lastEnd < desiredEnd) {
      this.appendColumn(lastEnd);
      lastEnd = this.columns[this.columns.length - 1].end;
    }
  }

  private buildColumns(start: Timestamp, end: Timestamp): void {
    for (let ts = start; ts < end; ts += this.config.timeframeMs) {
      this.appendColumn(ts);
    }
  }

  private appendColumn(start: Timestamp): void {
    const column: TimeColumn = {
      start,
      end: start + this.config.timeframeMs,
      priceBuckets: new Map(),
    };
    this.columns.push(column);
    this.columnLookup.set(column.start, column);
  }

  private getColumnForTimestamp(referenceTs: Timestamp): TimeColumn | undefined {
    this.ensureColumnsCover(referenceTs);
    if (!this.columns.length) {
      return undefined;
    }

    const baseStart = this.columns[0].start;
    const timeframe = this.config.timeframeMs;
    const clamped = Math.max(referenceTs, baseStart);
    const offset = Math.floor((clamped - baseStart) / timeframe);
    let columnIndex = Math.min(
      Math.max(offset, 0),
      this.columns.length - 1
    );
    let column = this.columns[columnIndex];
    while (
      column &&
      clamped >= column.end &&
      columnIndex + 1 < this.columns.length
    ) {
      column = this.columns[++columnIndex];
    }
    return column;
  }
}
