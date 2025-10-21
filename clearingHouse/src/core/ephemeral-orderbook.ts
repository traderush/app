// future: implement update & cancel orders

import { randomUUID } from "crypto";
import {
  Asset,
  type AccountId,
  type Duration,
  type OrderbookId,
  type OrderId,
  type OrdersBounds,
  type PositionId,
  type ProductTypeId,
  type Timestamp,
  type TimeWindow,
} from "../domain/primitives";
import type {
  BalanceChanges,
  BalanceService,
  CollateralLockChange
} from "../services/balance-service";
import type { Order, PositionRef } from "./orders";
import type { Position } from "./positions";
import type { ProductRuntime } from "./products/types";

export type OrderComparator = (a: Order<any>, b: Order<any>) => number;



export interface OrderbookConfig {
  id?: OrderbookId;
  productTypeId: ProductTypeId;
  timeframe: Duration;
  priceStep: number;
  placeOrdersBounds: OrdersBounds;
  updateOrdersBounds: OrdersBounds;
  cancelOrdersBounds: OrdersBounds;
  symbol: string;
}

export interface PriceBucket<TOrderData extends object = Record<string, unknown>> {
  key: number;
  price: number;
  orders: Order<TOrderData>[];
}

export interface TimeColumn<TOrderData extends object = Record<string, unknown>> {
  windowStart: Timestamp;
  windowEnd: Timestamp;
  priceBuckets: Map<number, PriceBucket<TOrderData>>;
}


interface IndexedOrderLocation {
  columnKey: Timestamp;
  bucketKey: number;
}

interface TimeColumnNode {
  column: TimeColumn;
  timewindow: TimeWindow;
  next: TimeColumnNode | null;
  prev: TimeColumnNode | null;
}

export interface FillOrderContext {
  now: Timestamp;
  price: number;
  userId: AccountId;
  positionId?: PositionId;
  triggerWindow?: TimeWindow;
}

export interface AccountBalanceSnapshot {
  accountId: AccountId;
  asset: Asset;
  balance: number;
  locked: number;
  delta?: number;
  reason?: string;
  context?: Record<string, unknown>;
}

export interface TradeInfo {
  orderId: OrderId;
  positionId: PositionId;
  makerId: AccountId;
  takerId: AccountId;
  fillSize: number;
  fillPrice: number;
  sizeRemaining: number;
}

export interface FillReport<
  TPositionData extends object = Record<string, unknown>
> {
  position: Position<TPositionData>;
  trade: TradeInfo;
  balances: AccountBalanceSnapshot[];
  locks: CollateralLockChange[];
}

export interface SettlementReport {
  orderId: OrderId;
  positionId: PositionId;
  makerId: AccountId;
  takerId: AccountId;
  price: number;
  totalCredit: number;
  balances: AccountBalanceSnapshot[];
}

export interface VerificationReport {
  orderId: OrderId;
  positionId: PositionId;
  makerId: AccountId;
  takerId: AccountId;
  price: number;
  triggerTs: Timestamp;
}

export interface ExpirationReport {
  orderId: OrderId;
  positionId: PositionId;
  makerId: AccountId;
  takerId: AccountId;
  size: number;
}

export class OrderPlacementError extends Error {
  constructor(message: string, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = "OrderPlacementError";
  }
}

export class EphemeralOrderbook<
  TOrderData extends object = Record<string, unknown>,
  TPositionData extends object = Record<string, unknown>,
  TRuntime extends ProductRuntime<TOrderData, TPositionData> = ProductRuntime<TOrderData, TPositionData>
> {
  constructor(
    private readonly runtime: TRuntime,
    public readonly config: OrderbookConfig,
    private readonly balanceService: BalanceService,
    private time: Timestamp,
    private price: number,
  ) { }

  head: TimeColumnNode | null = null;
  tail: TimeColumnNode | null = null;
  columnIndex = new Map<Timestamp, TimeColumnNode>();
  orderIndex = new Map<OrderId, IndexedOrderLocation>();
  orders = new Map<OrderId, Order<TOrderData>>();
  positions = new Map<PositionId, Position<TPositionData>>();
  cancelOnlyOrders = new Set<OrderId>();

  updatePriceAndTime(price: number, now: Timestamp): {
    settlements: SettlementReport[];
    verificationHits: VerificationReport[];
    expirations: ExpirationReport[];
  } {
    // drop old columns first
    this.time = now;
    const expirations: ExpirationReport[] = [];
    while (this.head && this.time >= this.head.timewindow.end) {
      expirations.push(...this.advance());
    }

    this.price = price;
    const settlements: SettlementReport[] = [];
    const verificationHits: VerificationReport[] = [];

    const column = this.head?.column;
    if (!column) {
      return { settlements, verificationHits, expirations };
    }

    const bucketKey = this.toBucketKey(price);
    const priceBucket = column.priceBuckets.get(bucketKey);
    if (!priceBucket) {
      return { settlements, verificationHits, expirations };
    }

    for (const order of priceBucket.orders) {
      if (!order.id || this.cancelOnlyOrders.has(order.id)) {
        continue;
      }

      if (order.triggerWindow.start > this.time || order.triggerWindow.end <= this.time) {
        continue;
      }

      const triggeredSettlements: Array<{
        position: Position<TPositionData>;
        payout: BalanceChanges;
      }> = [];

      const settledPositionIds = new Set<PositionId>();

      for (const pending of order.pendingPositions) {
        const position = this.positions.get(pending.positionId);
        if (!position) {
          continue;
        }

        const triggerWindow = pending.triggerWindow ?? order.triggerWindow;
        if (!this.runtime.verifyHit(order as Order<TOrderData>, position, price, this.time, triggerWindow)) {
          continue;
        }


        const payout = this.runtime.payout(order as Order<TOrderData>, position, price);
        triggeredSettlements.push({ position, payout });
        settledPositionIds.add(position.id);
      }

      if (triggeredSettlements.length === 0) {
        continue;
      }

      const makerHasFunds = this.canMakerCoverSettlements(order as Order<TOrderData>, triggeredSettlements.map(item => item.payout));
      if (!makerHasFunds) {
        this.handleMakerInsolvency(order as Order<TOrderData>);
        continue;
      }

      for (const { position, payout } of triggeredSettlements) {
        const balances = this.applyBalanceChanges(
          payout,
          {
            reason: "payout_settlement",
            orderId: order.id,
            orderbookId: this.config.id,
            positionId: position.id,
            makerId: order.makerId,
            takerId: position.userId,
            price,
          },
          this.collectAccountsFromChanges(payout),
        );

        const totalCredit = payout.credits.reduce((sum, credit) => sum + credit.amount, 0);

        verificationHits.push({
          orderId: order.id,
          positionId: position.id,
          makerId: order.makerId,
          takerId: position.userId,
          price,
          triggerTs: this.time,
        });

        settlements.push({
          orderId: order.id,
          positionId: position.id,
          makerId: order.makerId,
          takerId: position.userId,
          price,
          totalCredit,
          balances,
        });
      }

      if (settledPositionIds.size > 0) {
        if (order.pendingPositions.length > 0) {
          let writeIndex = 0;
          for (const ref of order.pendingPositions) {
            if (!settledPositionIds.has(ref.positionId)) {
              order.pendingPositions[writeIndex++] = ref;
            }
          }
          if (writeIndex < order.pendingPositions.length) {
            order.pendingPositions.length = writeIndex;
          }
        }

        for (const positionId of settledPositionIds) {
          this.positions.delete(positionId);
        }

        if (order.sizeRemaining <= 0 && order.pendingPositions.length === 0) {
          this.markOrderInactive(order.id);
        }
      }
    }

    return { settlements, verificationHits, expirations };
  }

  private assertOrderBounds(order: Order<TOrderData>, orderPrice: number, bounds: OrdersBounds): void {
    const now = this.time;
    const windowStart = order.triggerWindow.start;
    const minStart = now + bounds.timeBuffer;
    if (windowStart < minStart) {
      throw new OrderPlacementError("Order trigger window start is earlier than allowed buffer", { windowStart, minStart });
    }

    if (bounds.timeLimit > 0) {
      const maxStart = now + bounds.timeLimit;
      if (windowStart > maxStart) {
        throw new OrderPlacementError("Order trigger window start exceeds placement horizon", { windowStart, maxStart });
      }
    }

    const upperBound = this.price + bounds.pricePlusBound;
    if (orderPrice > upperBound) {
      throw new OrderPlacementError("Order price exceeds upper bound", { orderPrice, upperBound });
    }

    const lowerBound = this.price - bounds.priceMinusBound;
    if (orderPrice < lowerBound) {
      throw new OrderPlacementError("Order price falls below lower bound", { orderPrice, lowerBound });
    }
  }

  placeOrder(order: Order<TOrderData>): OrderId {
    if (!order.id) {
      throw new OrderPlacementError("Order ID is required");
    }

    if (this.orders.has(order.id)) {
      throw new OrderPlacementError(`Order ${order.id} already exists in orderbook`, { orderId: order.id });
    }

    const orderPrice = this.runtime.getOrderPrice(order);
    this.assertOrderBounds(order, orderPrice, this.config.placeOrdersBounds);

    const timeWindowDuration = order.triggerWindow.end - order.triggerWindow.start;
    if (timeWindowDuration <= 0) {
      throw new OrderPlacementError("Order trigger window duration must be positive", { timeWindowDuration });
    }
    if (timeWindowDuration % this.config.timeframe !== 0) {
      throw new OrderPlacementError(`Time window duration ${timeWindowDuration} is not aligned with timeframe ${this.config.timeframe}`, { timeWindowDuration });
    }

    this.orders.set(order.id, order);
    this.cancelOnlyOrders.delete(order.id);

    const timeColumn = this.getOrCreateTimeColumn(order.triggerWindow);
    const priceBucketKey = this.toBucketKey(orderPrice);
    let priceBucket = timeColumn.priceBuckets.get(priceBucketKey);

    if (!priceBucket) {
      priceBucket = {
        key: priceBucketKey,
        price: priceBucketKey,
        orders: []
      };
      timeColumn.priceBuckets.set(priceBucketKey, priceBucket);
    }

    this.insertOrderIntoBucket(priceBucket, order);

    // Index the order location for efficient lookup
    this.orderIndex.set(order.id, {
      columnKey: timeColumn.windowStart,
      bucketKey: priceBucketKey
    });

    return order.id;
  }

  fillOrder(orderId: OrderId, size: number, accountId: AccountId,): FillReport<TPositionData> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found in orderbook`);
    }

    if (this.cancelOnlyOrders.has(orderId)) {
      throw new Error(`Order ${orderId} is no longer fillable`);
    }

    if (size <= 0) {
      throw new Error(`Fill size must be positive for order ${orderId}`);
    }

    const now = new Date().getTime() as Timestamp;
    this.time = now;

    const effectiveSize = Math.min(size, order.sizeRemaining);
    if (effectiveSize <= 0) {
      throw new Error(`Order ${orderId} has no remaining size`);
    }

    const existingPosition = this.positions.get(`pos_${accountId}_${order.id!}`) as Position<TPositionData>;
    const { position, locks } = this.runtime.updatePosition(
      order as Order<TOrderData>,
      existingPosition,
      effectiveSize,
      this.time,
      this.price,
      accountId
    );

    this.positions.set(position.id, position);

    const previousSize = existingPosition?.size ?? 0;
    const filledDelta = Math.max(0, position.size - previousSize);
    order.sizeRemaining = Math.max(0, order.sizeRemaining - filledDelta);

    this.attachPendingPosition(orderId, {
      positionId: position.id,
    });

    const location = this.orderIndex.get(orderId);
    if (!location) {
      throw new Error(`Order ${orderId} location not found in index`);
    }

    const timeColumnNode = this.columnIndex.get(location.columnKey);
    if (!timeColumnNode) {
      throw new Error(`Time column for order ${orderId} not found`);
    }

    const priceBucket = timeColumnNode.column.priceBuckets.get(location.bucketKey);
    if (!priceBucket) {
      throw new Error(`Price bucket for order ${orderId} not found`);
    }

    const existingIndex = priceBucket.orders.findIndex(o => o.id === orderId);
    if (existingIndex !== -1) {
      priceBucket.orders.splice(existingIndex, 1);
    }

    if (order.sizeRemaining <= 0) {
      this.markOrderInactive(orderId);
    } else {
      this.insertOrderIntoBucket(priceBucket, order);
    }

    const balances = this.applyBalanceChanges(
      {
        credits: [],
        debits: [],
        locks,
      },
      {
        reason: "order_fill",
        orderId,
        orderbookId: this.config.id,
        makerId: order.makerId,
        takerId: accountId,
      },
      locks.map(lock => ({ accountId: lock.accountId, asset: lock.Asset })),
    );

    const trade: TradeInfo = {
      orderId,
      positionId: position.id,
      makerId: order.makerId,
      takerId: accountId,
      fillSize: filledDelta,
      fillPrice: this.price,
      sizeRemaining: order.sizeRemaining,
    };


    return {
      position,
      trade,
      balances,
      locks,
    };
  }

  attachPendingPosition(orderId: OrderId, positionRef: PositionRef): void {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found for pending position`);
    }

    const alreadyAttached = order.pendingPositions.some(ref => ref.positionId === positionRef.positionId);
    if (!alreadyAttached) {
      order.pendingPositions.push(positionRef);
    }
  }

  private advance(): ExpirationReport[] {
    if (!this.head) {
      return [];
    }

    const column = this.head;
    const expirations: ExpirationReport[] = [];

    for (const priceBucket of column.column.priceBuckets.values()) {
      for (const order of priceBucket.orders) {
        this.orderIndex.delete(order.id!);
        if (order.pendingPositions.length > 0) {
          for (const pending of order.pendingPositions) {
            const position = this.positions.get(pending.positionId);
            if (!position) {
              continue;
            }
            expirations.push({
              orderId: order.id!,
              positionId: position.id,
              makerId: order.makerId,
              takerId: position.userId,
              size: position.size,
            });
            this.positions.delete(position.id);
          }
          order.pendingPositions.length = 0;
        }
        this.orders.delete(order.id!);
        this.cancelOnlyOrders.delete(order.id!);
      }
      priceBucket.orders.length = 0;
    }

    this.columnIndex.delete(column.timewindow.start);

    this.head = column.next;
    if (this.head) {
      this.head.prev = null;
    } else {
      this.tail = null;
    }

    return expirations;
  }

  getOrder(orderId: OrderId): Order<any> | undefined {
    return this.orders.get(orderId);
  }

  private getOrCreateTimeColumn(timeWindow: TimeWindow): TimeColumn {
    // Check if time column already exists
    const existingNode = this.columnIndex.get(timeWindow.start);
    if (existingNode) {
      return existingNode.column;
    }

    // Create new time column
    const timeColumn: TimeColumn = {
      windowStart: timeWindow.start,
      windowEnd: timeWindow.end,
      priceBuckets: new Map()
    };

    // Create new node
    const newNode: TimeColumnNode = {
      column: timeColumn,
      timewindow: timeWindow,
      next: null,
      prev: null
    };

    // Add to index
    this.columnIndex.set(timeWindow.start, newNode);

    // Insert into linked list in chronological order
    this.insertTimeColumnNode(newNode);

    return timeColumn;
  }

  private insertTimeColumnNode(newNode: TimeColumnNode): void {
    if (!this.head) {
      // First node
      this.head = newNode;
      this.tail = newNode;
      return;
    }

    // Find insertion point
    let current: TimeColumnNode | null = this.head;
    while (current && current.timewindow.start < newNode.timewindow.start) {
      current = current.next;
    }

    if (!current) {
      // Insert at end
      this.tail!.next = newNode;
      newNode.prev = this.tail;
      this.tail = newNode;
    } else if (current === this.head) {
      // Insert at beginning
      newNode.next = this.head;
      this.head.prev = newNode;
      this.head = newNode;
    } else {
      // Insert in middle
      newNode.next = current;
      newNode.prev = current.prev;
      current.prev!.next = newNode;
      current.prev = newNode;
    }
  }

  private insertOrderIntoBucket(priceBucket: PriceBucket, order: Order<TOrderData>): void {
    const orders = priceBucket.orders as Order<TOrderData>[];
    if (orders.length === 0) {
      orders.push(order);
      return;
    }

    let low = 0;
    let high = orders.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      const comparison = this.runtime.comparator(order as Order<any>, orders[mid] as Order<any>);
      if (comparison < 0) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }

    orders.splice(low, 0, order);
  }

  private markOrderInactive(orderId: OrderId): void {
    this.cancelOnlyOrders.add(orderId);
    this.removeFromIndexes(orderId);

    const order = this.orders.get(orderId);
    if (order && order.pendingPositions.length === 0 && order.sizeRemaining <= 0) {
      this.orders.delete(orderId);
      this.cancelOnlyOrders.delete(orderId);
    }
  }

  private canMakerCoverSettlements(order: Order<TOrderData>, payouts: BalanceChanges[]): boolean {
    const requirements = this.aggregateMakerRequirements(order.makerId, payouts);
    for (const [asset, required] of requirements.entries()) {
      if (required <= 0) {
        continue;
      }

      const balance = this.balanceService.getBalance(order.makerId, asset);
      if (balance < required) {
        return false;
      }
    }

    return true;
  }

  private aggregateMakerRequirements(makerId: AccountId, payouts: BalanceChanges[]): Map<Asset, number> {
    const requirements = new Map<Asset, number>();
    const adjust = (asset: Asset, delta: number) => {
      const current = requirements.get(asset) ?? 0;
      const next = current + delta;
      if (Math.abs(next) < 1e-9) {
        requirements.delete(asset);
      } else {
        requirements.set(asset, next);
      }
    };

    for (const payout of payouts) {
      for (const debit of payout.debits ?? []) {
        if (debit.accountId !== makerId) {
          continue;
        }
        adjust(debit.Asset, debit.amount);
      }

      for (const credit of payout.credits ?? []) {
        if (credit.accountId !== makerId) {
          continue;
        }
        adjust(credit.Asset, -credit.amount);
      }

      for (const lock of payout.locks ?? []) {
        if (lock.accountId !== makerId) {
          continue;
        }
        adjust(lock.Asset, lock.amount);
      }

      for (const unlock of payout.unlocks ?? []) {
        if (unlock.accountId !== makerId) {
          continue;
        }
        adjust(unlock.Asset, -unlock.amount);
      }
    }

    return requirements;
  }

  private handleMakerInsolvency(order: Order<TOrderData>): void {
    if (!order.id) {
      return;
    }


    const unlocks: CollateralLockChange[] = [];

    for (const pending of order.pendingPositions) {
      const position = this.positions.get(pending.positionId);
      if (!position) {
        continue;
      }

      if (position.collateralLocked > 0) {
        unlocks.push({
          accountId: position.userId,
          Asset: Asset.USD,
          amount: position.collateralLocked,
        });
      }

      this.positions.delete(position.id);
    }

    order.pendingPositions.length = 0;
    order.sizeRemaining = 0;

    if (unlocks.length > 0) {
      this.applyBalanceChanges(
        {
          credits: [],
          debits: [],
          unlocks,
        },
        {
          reason: "maker_insufficient_funds",
          orderId: order.id,
          orderbookId: this.config.id,
          makerId: order.makerId,
        },
        unlocks.map(unlock => ({ accountId: unlock.accountId, asset: unlock.Asset })),
      );
    }

    this.removeFromIndexes(order.id);
    this.orders.delete(order.id);
    this.cancelOnlyOrders.delete(order.id);
  }

  private removeFromIndexes(orderId: OrderId): void {
    const location = this.orderIndex.get(orderId);
    if (!location) {
      return;
    }

    const timeColumnNode = this.columnIndex.get(location.columnKey);
    if (timeColumnNode) {
      const priceBucket = timeColumnNode.column.priceBuckets.get(location.bucketKey);
      if (priceBucket) {
        const index = priceBucket.orders.findIndex(o => o.id === orderId);
        if (index !== -1) {
          priceBucket.orders.splice(index, 1);
        }
        if (priceBucket.orders.length === 0) {
          timeColumnNode.column.priceBuckets.delete(location.bucketKey);
        }
      }
    }

    this.orderIndex.delete(orderId);
  }

  private toBucketKey(price: number): number {
    return Math.floor(price / this.config.priceStep) * this.config.priceStep;
  }

  private applyBalanceChanges(
    changes: BalanceChanges,
    metadata: Record<string, unknown>,
    additionalAccounts: Array<{ accountId: AccountId; asset: Asset }> = [],
  ): AccountBalanceSnapshot[] {
    const credits = changes.credits ?? [];
    const debits = changes.debits ?? [];
    const locks = changes.locks ?? [];
    const unlocks = changes.unlocks ?? [];

    const impacted = new Map<string, { accountId: AccountId; asset: Asset }>();
    const deltas = new Map<string, number>();
    const register = (accountId: AccountId, asset: Asset) => {
      const key = `${accountId}:${asset}`;
      if (!impacted.has(key)) {
        impacted.set(key, { accountId, asset });
      }
      if (!deltas.has(key)) {
        deltas.set(key, 0);
      }
    };
    const accumulate = (accountId: AccountId, asset: Asset, delta: number) => {
      const key = `${accountId}:${asset}`;
      register(accountId, asset);
      const next = (deltas.get(key) ?? 0) + delta;
      deltas.set(key, next);
    };

    for (const entry of credits) {
      accumulate(entry.accountId, entry.Asset, entry.amount);
    }
    for (const entry of debits) {
      accumulate(entry.accountId, entry.Asset, -entry.amount);
    }
    for (const entry of locks) {
      accumulate(entry.accountId, entry.Asset, -entry.amount);
    }
    for (const entry of unlocks) {
      accumulate(entry.accountId, entry.Asset, entry.amount);
    }
    for (const extra of additionalAccounts) {
      register(extra.accountId, extra.asset);
    }

    const hasMutations = credits.length > 0 || debits.length > 0 || locks.length > 0 || unlocks.length > 0;

    if (hasMutations) {
      this.balanceService.applyChanges({
        id: randomUUID(),
        ts: this.time,
        changes: {
          credits: [...credits],
          debits: [...debits],
          locks: locks.length ? [...locks] : undefined,
          unlocks: unlocks.length ? [...unlocks] : undefined,
        },
        metadata,
      });
    }

    if (impacted.size === 0) {
      return [];
    }

    const snapshots: AccountBalanceSnapshot[] = [];
    const reason = typeof metadata.reason === "string" ? metadata.reason : undefined;
    for (const { accountId, asset } of impacted.values()) {
      const key = `${accountId}:${asset}`;
      snapshots.push({
        accountId,
        asset,
        balance: this.balanceService.getBalance(accountId, asset),
        locked: this.balanceService.getLocked(accountId, asset),
        delta: deltas.get(key) ?? 0,
        reason,
        context: metadata,
      });
    }

    return snapshots;
  }

  getCurrentPrice(): number {
    return this.price;
  }

  private collectAccountsFromChanges(changes: BalanceChanges): Array<{ accountId: AccountId; asset: Asset }> {
    const credits = changes.credits ?? [];
    const debits = changes.debits ?? [];
    const locks = changes.locks ?? [];
    const unlocks = changes.unlocks ?? [];
    const seen = new Map<string, { accountId: AccountId; asset: Asset }>();
    const register = (accountId: AccountId, asset: Asset) => {
      const key = `${accountId}:${asset}`;
      if (!seen.has(key)) {
        seen.set(key, { accountId, asset });
      }
    };

    for (const entry of credits) {
      register(entry.accountId, entry.Asset);
    }
    for (const entry of debits) {
      register(entry.accountId, entry.Asset);
    }
    for (const entry of locks) {
      register(entry.accountId, entry.Asset);
    }
    for (const entry of unlocks) {
      register(entry.accountId, entry.Asset);
    }

    return [...seen.values()];
  }
}



export type OrderbookStore = Map<ProductTypeId, Map<OrderbookId, EphemeralOrderbook>>;
