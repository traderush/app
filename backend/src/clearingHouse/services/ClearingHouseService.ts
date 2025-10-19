import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { ProductTypeHooks } from '../core/product';
import {
  AccountId,
  ClearingHouseEvent,
  ClockTickContext,
  FillOrderPayload,
  Order,
  OrderId,
  OrderbookId,
  OrderbookConfig,
  PlaceOrderPayload,
  SettlementInstruction,
  Timestamp,
  UpdateOrderPayload,
} from '../core/types';
import { BalanceService } from '../core/BalanceService';
import { InMemorySettlementQueue } from '../core/SettlementQueue';
import { MarginService } from '../core/MarginService';
import { OrderService } from '../core/OrderService';
import { OrderbookStore } from '../core/OrderbookStore';
import { PositionService } from '../core/PositionService';
import { ProductRegistry } from '../core/ProductRegistry';
import { PriceService } from './PriceService';

/**
 * Minimal clearing house facade that provides product registration,
 * orderbook management, and game-facing orchestration.
 */
export class ClearingHouseService extends EventEmitter {
  readonly products: ProductRegistry;
  readonly balances: BalanceService;
  readonly positions: PositionService;
  readonly orderbooks: OrderbookStore;
  readonly margin: MarginService;
  readonly orders: OrderService;
  private readonly settlements: InMemorySettlementQueue;
  private readonly clockSeq = new Map<OrderbookId, number>();
  readonly balanceService: BalanceService;
  private lastObservedPrice = 100;
  private readonly orderbookPrices = new Map<OrderbookId, number>();
  private readonly clockTimers = new Map<OrderbookId, NodeJS.Timeout>();
  private priceService?: PriceService;
  private priceFeedRunning = false;

  constructor() {
    super();
    this.products = new ProductRegistry();
    this.balances = new BalanceService({ defaultStartingBalance: 0 });
    this.positions = new PositionService();
    this.orderbooks = new OrderbookStore(this.products);
    this.margin = new MarginService(this.balances);
    this.orders = new OrderService(this.orderbooks, this.margin, this.positions);
    this.settlements = new InMemorySettlementQueue();
    this.balanceService = this.balances;

    this.bindCoreEvents();
    this.forwardRuntimeEvents();

    this.balanceService.on('balance_event', (event) => {
      this.emit('balance_update', {
        userId: event.accountId,
        balance: event.snapshot.available,
        change: event.delta ?? 0,
        type: event.type,
      });
    });
  }

  initializeUser(accountId: string): void {
    this.balances.ensureAccount(accountId);
  }

  getUserBalance(accountId: string): number {
    return this.balances.snapshotFor(accountId).available;
  }

  registerProductType(hooks: ProductTypeHooks): void {
    this.products.register(hooks);
  }

  createOrderbook(config: OrderbookConfig): void {
    this.orderbooks.create(config);
    this.clockSeq.set(config.orderbookId, 0);
    if (this.priceFeedRunning) {
      this.startClockForOrderbook(config.orderbookId);
      this.priceService?.registerOrderbook(config.orderbookId);
    }
  }

  placeMakerOrder(payload: PlaceOrderPayload, now: number = Date.now()): Order {
    return this.placeOrder(payload, now);
  }

  updateMakerOrder(payload: UpdateOrderPayload, now: number = Date.now()): Order {
    return this.updateOrder(payload, now);
  }

  cancelMakerOrder(
    payload: { orderId: string; makerId: string },
    now: number = Date.now()
  ): Order {
    return this.cancelOrder(payload, now);
  }

  fillOrder(payload: FillOrderPayload): void {
    this.fillOrderInternal(payload);
  }

  clockTick(context: Omit<ClockTickContext, 'clockSeq'>): void {
    this.recordPrice(context.orderbookId, context.price);
    this.processClockTick({ ...context });
    this.executeSettlement();
  }

  getCurrentPrice(orderbookId?: OrderbookId): number {
    return this.getLastKnownPrice(orderbookId);
  }

  getOrderbookConfig(orderbookId: OrderbookId): OrderbookConfig {
    return this.orderbooks.get(orderbookId).config;
  }

  startPriceFeed(): void {
    if (this.priceFeedRunning) {
      this.emit('price_feed_status', { running: true });
      return;
    }

    const orderbooks = this.orderbooks.list();
    if (!orderbooks.length) {
      this.emit('price_feed_status', {
        running: false,
        reason: 'no_orderbooks',
      });
      return;
    }

    if (!this.priceService) {
      this.priceService = new PriceService(this);
    }

    const started = this.priceService.start();
    if (!started || !this.priceService.isRunning()) {
      this.emit('price_feed_status', {
        running: false,
        reason: 'price_service_unavailable',
      });
      return;
    }

    this.priceFeedRunning = true;
    this.startClocks(orderbooks.map((orderbook) => orderbook.config.orderbookId));
    this.emit('price_feed_status', { running: true });
  }

  stopPriceFeed(): void {
    if (!this.priceFeedRunning) {
      return;
    }

    this.stopClocks();
    this.priceService?.stop();
    this.priceFeedRunning = false;
    this.emit('price_feed_status', { running: false });
  }

  destroy(): void {
    this.stopPriceFeed();
    this.removeAllListeners();
  }

  handlePriceUpdate(orderbookId: OrderbookId, price: number, timestamp: number = Date.now()): void {
    this.recordPrice(orderbookId, price);
    this.emit('price_update', { orderbookId, price, ts: timestamp });
  }

  private placeOrder(payload: PlaceOrderPayload, now: Timestamp): Order {
    const result = this.orders.placeOrder(payload, now);
    if (!result.success || !result.order) {
      throw new Error(result.reason ?? 'order_placement_failed');
    }
    return result.order;
  }

  private updateOrder(payload: UpdateOrderPayload, now: Timestamp): Order {
    const result = this.orders.updateOrder(payload, now);
    if (!result.success || !result.order) {
      throw new Error(result.reason ?? 'order_update_failed');
    }
    return result.order;
  }

  private cancelOrder(payload: { orderId: string; makerId: string }, now: Timestamp): Order {
    const result = this.orders.cancelOrder(payload, now);
    if (!result.success || !result.order) {
      throw new Error(result.reason ?? 'order_cancel_failed');
    }
    return result.order;
  }

  private fillOrderInternal(payload: FillOrderPayload): void {
    const result = this.orders.fillOrder(payload);
    if (!result.success || !result.positionId) {
      throw new Error(result.reason ?? 'fill_failed');
    }
  }

  private processClockTick(context: Omit<ClockTickContext, 'clockSeq'>): void {
    const { orderbookId, now, price } = context;
    const seq = (this.clockSeq.get(orderbookId) ?? 0) + 1;
    this.clockSeq.set(orderbookId, seq);

    this.emitEvent({
      type: 'clock_tick',
      orderbookId,
      windowStart: now,
      windowEnd: now + this.orderbooks.get(orderbookId).config.timeframeMs,
      reason: 'tick',
      price,
      clockSeq: seq,
      ts: now,
    });

    this.orderbooks.withLock(orderbookId, seq, (orderbook) => {
      const advanceResult = orderbook.advance(now);
      if (advanceResult.droppedOrderIds.length) {
        advanceResult.droppedOrderIds.forEach((orderId) => {
          this.orders.forgetOrder(orderId);
          this.margin.releaseOrder(orderId);
        });
        this.emitEvent({
          type: 'column_dropped',
          orderbookId,
          windowStart: now,
          windowEnd: now,
          droppedOrderIds: advanceResult.droppedOrderIds,
          clockSeq: seq,
          ts: now,
        });
      }

      const orders = orderbook.ordersWithPendingPositions(now);
      for (const order of orders) {
        const positionsDue = orderbook.pendingPositionsDue(order, now);
        const product = this.products.get(order.productTypeId);

        for (const positionRef of positionsDue) {
          const position = this.positions.get(positionRef.positionId);
          if (!position) {
            orderbook.resolvePendingPosition(order.id, positionRef.positionId);
            continue;
          }

          const hit = product.verifyHit(order, position, price);
          if (!hit) {
            continue;
          }

          this.positions.markHit(position.id, price, now);
          orderbook.resolvePendingPosition(order.id, position.id);
          this.emitEvent({
            type: 'verification_hit',
            orderbookId,
            positionId: position.id,
            orderId: order.id,
            price,
            triggerTs: now,
            clockSeq: seq,
            ts: now,
          });

          const changes = product.payout(order, position, price);
          this.enqueueSettlement({
            positionId: position.id,
            orderId: order.id,
            orderbookId,
            productTypeId: order.productTypeId,
            balanceChanges: changes,
            clockSeq: seq,
            priceAtHit: price,
            triggerTimestamp: now,
          });
        }
      }
    });

    this.flushMarginViolations(seq, orderbookId, now);
  }

  private executeSettlement(): void {
    while (this.settlements.size() > 0) {
      const instruction = this.settlements.dequeue();
      if (!instruction) {
        break;
      }
      const position = this.positions.get(instruction.positionId);
      this.balances.applyChangeset(
        instruction.balanceChanges,
        `settlement:${instruction.positionId}`
      );
      this.positions.settle(instruction.positionId, Date.now());
      this.emitEvent({
        type: 'payout_settled',
        orderbookId: instruction.orderbookId,
        positionId: instruction.positionId,
        amount: instruction.balanceChanges.credits.reduce(
          (total, change) => total + change.delta,
          0
        ),
        makerId: position?.makerId ?? '',
        userId: position?.userId ?? '',
        clockSeq: instruction.clockSeq,
        ts: Date.now(),
      });
    }
  }

  private enqueueSettlement(instruction: SettlementInstruction): void {
    const hasChanges =
      instruction.balanceChanges.credits.length ||
      instruction.balanceChanges.debits.length;
    if (!hasChanges) {
      return;
    }
    this.settlements.enqueue(instruction);
  }

  private flushMarginViolations(clockSeq: number, orderbookId: OrderbookId, ts: Timestamp): void {
    const violations = this.margin.collectViolations();
    violations.forEach((violation) => {
      this.emitEvent({
        type: 'margin_violation',
        violation,
        orderbookId,
        clockSeq,
        ts,
      });
    });
  }

  private bindCoreEvents(): void {
    this.orders.on('order_placed', (order: Order) => {
      this.emitEvent({
        type: 'order_placed',
        order,
        collateralLocked: order.collateralRequired,
        orderbookId: order.orderbookId,
        ts: order.timePlaced,
        clockSeq: this.clockSeq.get(order.orderbookId) ?? 0,
      });
    });
    this.orders.on(
      'order_updated',
      ({
        current,
        previous,
        delta,
      }: {
        current: Order;
        previous: Order;
        delta: Partial<Order>;
      }) => {
        this.emitEvent({
          type: 'order_updated',
          order: current,
          delta,
          previousVersion: previous.version,
          orderbookId: current.orderbookId,
          ts: Date.now(),
          clockSeq: this.clockSeq.get(current.orderbookId) ?? 0,
        });
      }
    );
    this.orders.on('order_cancelled', (order: Order, ts: Timestamp) => {
      this.emitEvent({
        type: 'order_cancelled',
        orderId: order.id,
        reason: 'maker_cancelled',
        orderbookId: order.orderbookId,
        ts,
        clockSeq: this.clockSeq.get(order.orderbookId) ?? 0,
      });
    });
    this.orders.on(
      'order_cancel_only',
      ({
        order,
        reason,
        cancelRequiredBy,
        timestamp,
      }: {
        order: Order;
        reason: string;
        cancelRequiredBy: Timestamp;
        timestamp: Timestamp;
      }) => {
        this.emitEvent({
          type: 'order_cancel_only',
          orderId: order.id,
          reason,
          cancelRequiredBy,
          orderbookId: order.orderbookId,
          ts: timestamp,
          clockSeq: this.clockSeq.get(order.orderbookId) ?? 0,
        });
      }
    );
    this.orders.on(
      'order_filled',
      ({
        order,
        position,
        fillSize,
        priceAtFill,
      }: {
        order: Order;
        position: { id: string; userId: string };
        fillSize: number;
        priceAtFill?: number;
      }) => {
        this.emitEvent({
          type: 'order_filled',
          orderId: order.id,
          positionId: position.id,
          fillSize,
          fillPrice: priceAtFill,
          userId: position.userId,
          orderbookId: order.orderbookId,
          ts: Date.now(),
          clockSeq: this.clockSeq.get(order.orderbookId) ?? 0,
        });
      }
    );
    this.orders.on(
      'order_rejected',
      ({
        orderbookId,
        orderId,
        makerId,
        userId,
        reason,
        constraint,
        timestamp,
      }: {
        orderbookId: OrderbookId;
        orderId?: OrderId;
        makerId: AccountId;
        userId?: AccountId;
        reason: string;
        constraint?: Record<string, unknown>;
        timestamp: Timestamp;
      }) => {
        this.emitEvent({
          type: 'order_rejected',
          orderId,
          makerId,
          userId,
          rejectionReason: reason,
          violatedConstraint: constraint,
          orderbookId,
          ts: timestamp,
          clockSeq: this.clockSeq.get(orderbookId) ?? 0,
        });
      }
    );
  }

  private emitEvent<
    T extends {
      type: string;
      orderbookId: OrderbookId;
      ts: Timestamp;
      clockSeq: number;
      sourceTs?: Timestamp;
    }
  >(event: T): void {
    const { type, orderbookId, ts, clockSeq, sourceTs, ...rest } = event;
    const envelope: ClearingHouseEvent = {
      eventId: randomUUID(),
      orderbookId,
      ts,
      clockSeq,
      ...(sourceTs !== undefined ? { sourceTs } : {}),
      payload: {
        type,
        ...(rest as Record<string, unknown>),
      } as any,
    };
    this.emit('event', envelope);
  }

  private getLastKnownPrice(orderbookId?: OrderbookId): number {
    if (orderbookId) {
      const price = this.orderbookPrices.get(orderbookId);
      if (price !== undefined) {
        return price;
      }
    }
    return this.lastObservedPrice;
  }

  private recordPrice(orderbookId: OrderbookId, price: number): void {
    this.orderbookPrices.set(orderbookId, price);
    this.lastObservedPrice = price;
  }

  private startClocks(orderbookIds?: OrderbookId[]): void {
    const ids =
      orderbookIds ??
      this.orderbooks.list().map((orderbook) => orderbook.config.orderbookId);
    ids.forEach((orderbookId) => this.startClockForOrderbook(orderbookId));
  }

  private startClockForOrderbook(orderbookId: OrderbookId): void {
    if (this.clockTimers.has(orderbookId)) {
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const price = this.getLastKnownPrice(orderbookId);
      this.clockTick({ orderbookId, now, price });
    }, 1000);

    this.clockTimers.set(orderbookId, interval);
  }

  private stopClocks(): void {
    this.clockTimers.forEach((interval) => clearInterval(interval));
    this.clockTimers.clear();
  }

  private forwardRuntimeEvents(): void {
    this.positions.on('position_opened', (position) => {
      this.emit('position_opened', position);
    });
    this.positions.on('position_settled', (position) => {
      this.emit('position_settled', position);
    });
    this.positions.on('position_hit', (position) => {
      this.emit('position_hit', position);
    });
  }
}
