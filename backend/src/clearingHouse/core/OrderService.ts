import { EventEmitter } from 'events';
import { MarginService } from './MarginService';
import { OrderbookStore } from './OrderbookStore';
import { PositionService } from './PositionService';
import {
  AccountId,
  CancelOrderPayload,
  FillOrderPayload,
  Order,
  OrderId,
  OrderStatus,
  OrderbookConfig,
  OrderbookId,
  PlaceOrderPayload,
  PositionRef,
  TimeWindow,
  Timestamp,
  UpdateOrderPayload,
} from './types';

export interface PlaceOrderResult {
  success: boolean;
  order?: Order;
  reason?: string;
}

export interface FillOrderResult {
  success: boolean;
  order?: Order;
  positionId?: string;
  fillSize?: number;
  authorizedSize?: number;
  reason?: string;
}

export class OrderService extends EventEmitter {
  private readonly orderIndex = new Map<OrderId, OrderbookId>();

  constructor(
    private readonly orderbooks: OrderbookStore,
    private readonly margin: MarginService,
    private readonly positions: PositionService
  ) {
    super();
  }

  placeOrder(payload: PlaceOrderPayload, now: Timestamp): PlaceOrderResult {
    const orderbook = this.orderbooks.get(payload.orderbookId);
    const triggerWindow: TimeWindow =
      payload.triggerWindow ?? payload.fillWindow;
    const order: Order = {
      id: this.generateOrderId(payload),
      orderbookId: payload.orderbookId,
      productTypeId: payload.productTypeId,
      makerId: payload.makerId,
      data: payload.data,
      sizeTotal: payload.size,
      sizeRemaining: payload.size,
      collateralRequired: payload.collateralRequired,
      collateralFilled: 0,
      timePlaced: now,
      fillWindow: payload.fillWindow,
      triggerWindow,
      pendingPositions: [],
      status: OrderStatus.ACTIVE,
      cancelOnly: false,
      priceBucket: payload.priceBucket,
      version: 1,
    };

    try {
      this.margin.reserveForOrder(order);
    } catch (error) {
      this.emitOrderRejected({
        orderbookId: payload.orderbookId,
        orderId: order.id,
        makerId: payload.makerId,
        reason:
          error instanceof Error ? error.message : 'margin_reservation_failed',
        constraint: {
          type: 'margin',
          collateralRequired: order.collateralRequired,
        },
        timestamp: now,
      });
      return {
        success: false,
        reason:
          error instanceof Error ? error.message : 'margin_reservation_failed',
      };
    }

    const result = orderbook.place(order, now);
    if (!result.success) {
      this.margin.releaseOrder(order.id);
      this.emitOrderRejected({
        orderbookId: payload.orderbookId,
        orderId: order.id,
        makerId: payload.makerId,
        reason: result.reason ?? 'order_placement_failed',
        constraint: this.describePlacementViolation(
          result.reason ?? 'order_placement_failed',
          order,
          orderbook.config,
          now,
          'place'
        ),
        timestamp: now,
      });
      return { success: false, reason: result.reason };
    }

    this.orderIndex.set(order.id, payload.orderbookId);
    this.emit('order_placed', result.order);
    return { success: true, order: result.order };
  }

  updateOrder(
    payload: UpdateOrderPayload,
    now: Timestamp
  ): PlaceOrderResult {
    const orderbookId = this.orderIndex.get(payload.orderId);
    if (!orderbookId) {
      return { success: false, reason: 'order_not_found' };
    }
    const orderbook = this.orderbooks.get(orderbookId);
    const beforeUpdate = orderbook.getById(payload.orderId);
    if (!beforeUpdate) {
      return { success: false, reason: 'order_not_found' };
    }
    if (beforeUpdate.makerId !== payload.makerId) {
      this.emitOrderRejected({
        orderbookId,
        orderId: payload.orderId,
        makerId: payload.makerId,
        reason: 'maker_mismatch',
        constraint: { orderMakerId: beforeUpdate.makerId },
        timestamp: now,
      });
      return { success: false, reason: 'maker_mismatch' };
    }
    const result = orderbook.update(
      payload.orderId,
      (order) => {
        const next = { ...order };
        if (typeof payload.size === 'number') {
          const delta = payload.size - order.sizeTotal;
          next.sizeTotal = payload.size;
          next.sizeRemaining = Math.max(order.sizeRemaining + delta, 0);
        }
        if (payload.collateralRequired !== undefined) {
          next.collateralRequired = payload.collateralRequired;
        }
        if (payload.data !== undefined) {
          next.data = payload.data;
        }
        if (payload.fillWindow) {
          next.fillWindow = payload.fillWindow;
        }
        if (payload.triggerWindow) {
          next.triggerWindow = payload.triggerWindow;
        }
        if (payload.priceBucket !== undefined) {
          next.priceBucket = payload.priceBucket;
        }
        return next;
      },
      now
    );

    if (!result.success || !result.order) {
      this.emitOrderRejected({
        orderbookId,
        orderId: payload.orderId,
        makerId: payload.makerId,
        reason: result.reason ?? 'update_failed',
        constraint: this.describePlacementViolation(
          result.reason ?? 'update_failed',
          beforeUpdate,
          orderbook.config,
          now,
          'update'
        ),
        timestamp: now,
      });
      return { success: false, reason: result.reason ?? 'update_failed' };
    }

    this.margin.reconcileCollateral(result.order);
    const delta = this.diffOrders(beforeUpdate, result.order);
    this.emit('order_updated', {
      current: result.order,
      previous: beforeUpdate,
      delta,
    });
    return { success: true, order: result.order };
  }

  cancelOrder(payload: CancelOrderPayload, now: Timestamp): PlaceOrderResult {
    const orderbookId = this.orderIndex.get(payload.orderId);
    if (!orderbookId) {
      return { success: false, reason: 'order_not_found' };
    }
    const orderbook = this.orderbooks.get(orderbookId);
    const order = orderbook.getById(payload.orderId);
    if (!order) {
      return { success: false, reason: 'order_not_found' };
    }
    if (order.makerId !== payload.makerId) {
      this.emitOrderRejected({
        orderbookId,
        orderId: payload.orderId,
        makerId: payload.makerId,
        reason: 'maker_mismatch',
        constraint: { orderMakerId: order.makerId },
        timestamp: now,
      });
      return { success: false, reason: 'maker_mismatch' };
    }
    const result = orderbook.cancel(payload.orderId, 'maker_cancelled');
    if (!result.success || !result.order) {
      this.emitOrderRejected({
        orderbookId,
        orderId: payload.orderId,
        makerId: payload.makerId,
        reason: result.reason ?? 'cancel_failed',
        timestamp: now,
      });
      return { success: false, reason: result.reason ?? 'cancel_failed' };
    }
    this.margin.releaseOrder(payload.orderId);
    this.emit('order_cancelled', result.order, now);
    return { success: true, order: result.order };
  }

  fillOrder(payload: FillOrderPayload): FillOrderResult {
    const now = payload.timestamp;
    const orderbookId = this.orderIndex.get(payload.orderId);
    if (!orderbookId) {
      return { success: false, reason: 'order_not_found' };
    }
    const orderbook = this.orderbooks.get(orderbookId);
    const order = orderbook.getById(payload.orderId);
    if (!order) {
      return { success: false, reason: 'order_not_found' };
    }

    if (order.cancelOnly) {
      this.emitOrderRejected({
        orderbookId,
        orderId: order.id,
        makerId: order.makerId,
        userId: payload.userId,
        reason: 'order_cancel_only',
        timestamp: now,
      });
      return { success: false, reason: 'order_cancel_only' };
    }

    const fillLeadMs =
      orderbook.config.placeOrdersBuffer * orderbook.config.timeframeMs;
    if (now < order.fillWindow.start - fillLeadMs) {
      this.emitOrderRejected({
        orderbookId,
        orderId: order.id,
        makerId: order.makerId,
        userId: payload.userId,
        reason: 'before_fill_window_buffer',
        constraint: {
          earliestFillTs: order.fillWindow.start - fillLeadMs,
          requestTs: now,
        },
        timestamp: now,
      });
      return { success: false, reason: 'before_fill_window_buffer' };
    }

    if (now < order.fillWindow.start || now > order.fillWindow.end) {
      this.emitOrderRejected({
        orderbookId,
        orderId: order.id,
        makerId: order.makerId,
        userId: payload.userId,
        reason: 'outside_fill_window',
        constraint: {
          fillWindow: order.fillWindow,
          requestTs: now,
        },
        timestamp: now,
      });
      return { success: false, reason: 'outside_fill_window' };
    }

    const requestedSize = Math.min(payload.size, order.sizeRemaining);
    if (requestedSize <= 0) {
      return { success: false, reason: 'order_fully_filled' };
    }

    const authorization = this.margin.authorizeFill(
      order,
      requestedSize,
      now
    );

    if (authorization.authorizedSize <= 0) {
      const cancelRequiredBy = Math.min(
        order.triggerWindow.end,
        order.fillWindow.end
      );
      this.emit('order_cancel_only', {
        order,
        reason: authorization.reason ?? 'margin_blocked',
        cancelRequiredBy,
        timestamp: now,
      });
      orderbook.markCancelOnly(order.id, now);
      this.emitOrderRejected({
        orderbookId,
        orderId: order.id,
        makerId: order.makerId,
        userId: payload.userId,
        reason: authorization.reason ?? 'margin_blocked',
        constraint: {
          requestedSize,
          authorizedSize: authorization.authorizedSize,
        },
        timestamp: now,
      });
      return {
        success: false,
        reason: authorization.reason ?? 'margin_blocked',
        authorizedSize: authorization.authorizedSize,
      };
    }

    const fillSize = authorization.authorizedSize;
    const collateralPerUnit =
      order.sizeTotal > 0 ? order.collateralRequired / order.sizeTotal : 0;
    const collateralUsed = collateralPerUnit * fillSize;

    const updatedOrder =
      orderbook.mutate(order.id, (mutable) => {
        mutable.sizeRemaining = Math.max(mutable.sizeRemaining - fillSize, 0);
        mutable.collateralFilled += collateralUsed;
        mutable.status =
          mutable.sizeRemaining > 0
            ? OrderStatus.PARTIALLY_FILLED
            : OrderStatus.FILLED;
      }) ?? order;

    if (updatedOrder.sizeRemaining <= 0) {
      this.margin.releaseOrder(order.id);
      this.orderIndex.delete(order.id);
    }

    const position = this.positions.open({
      orderId: updatedOrder.id,
      orderbookId: updatedOrder.orderbookId,
      productTypeId: updatedOrder.productTypeId,
      userId: payload.userId,
      makerId: updatedOrder.makerId,
      size: fillSize,
      collateralLocked: collateralUsed,
      triggerWindow: updatedOrder.triggerWindow,
      timestamp: now,
    });

    const positionRef: PositionRef = {
      positionId: position.id,
      triggerWindow: position.triggerWindow,
      userId: position.userId,
      size: position.size,
    };
    orderbook.attachPendingPosition(order.id, positionRef);

    this.emit('order_filled', {
      order: updatedOrder,
      position,
      fillSize,
      priceAtFill: payload.priceAtFill,
    });

    return {
      success: true,
      order: updatedOrder,
      positionId: position.id,
      fillSize,
      authorizedSize: fillSize,
    };
  }

  private generateOrderId(payload: PlaceOrderPayload): OrderId {
    return `${payload.orderbookId}:${Date.now().toString(36)}:${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }

  forgetOrder(orderId: OrderId): void {
    this.orderIndex.delete(orderId);
  }

  private emitOrderRejected(params: {
    orderbookId: OrderbookId;
    orderId?: OrderId;
    makerId: AccountId;
    userId?: AccountId;
    reason: string;
    constraint?: Record<string, unknown>;
    timestamp: Timestamp;
  }): void {
    this.emit('order_rejected', params);
  }

  private describePlacementViolation(
    reason: string,
    order: Order,
    config: OrderbookConfig,
    now: Timestamp,
    context: 'place' | 'update'
  ): Record<string, unknown> | undefined {
    const placeBufferMs = config.placeOrdersBuffer * config.timeframeMs;
    const updateBufferMs = config.updateOrdersBuffer * config.timeframeMs;
    switch (reason) {
      case 'fill_window_too_soon':
        return {
          earliestStart:
            now + (context === 'place' ? placeBufferMs : updateBufferMs),
          requestedStart: order.fillWindow.start,
          bufferMs: context === 'place' ? placeBufferMs : updateBufferMs,
        };
      case 'invalid_fill_window':
        return {
          fillWindow: order.fillWindow,
        };
      case 'fill_window_out_of_range':
        return {
          fillWindow: order.fillWindow,
          horizonEnd: now + config.timeWindow.horizonMs,
        };
      case 'price_bucket_out_of_range':
        return {
          priceBucket: order.priceBucket,
          priceWindow: config.priceWindow,
        };
      default:
        return undefined;
    }
  }

  private diffOrders(before: Order, after: Order): Partial<Order> {
    const delta: Partial<Order> = {};
    if (before.sizeTotal !== after.sizeTotal) {
      delta.sizeTotal = after.sizeTotal;
    }
    if (before.sizeRemaining !== after.sizeRemaining) {
      delta.sizeRemaining = after.sizeRemaining;
    }
    if (before.collateralRequired !== after.collateralRequired) {
      delta.collateralRequired = after.collateralRequired;
    }
    if (before.collateralFilled !== after.collateralFilled) {
      delta.collateralFilled = after.collateralFilled;
    }
    if (!this.windowsEqual(before.fillWindow, after.fillWindow)) {
      delta.fillWindow = after.fillWindow;
    }
    if (!this.windowsEqual(before.triggerWindow, after.triggerWindow)) {
      delta.triggerWindow = after.triggerWindow;
    }
    if (before.priceBucket !== after.priceBucket) {
      delta.priceBucket = after.priceBucket;
    }
    if (before.cancelOnly !== after.cancelOnly) {
      delta.cancelOnly = after.cancelOnly;
    }
    if (before.status !== after.status) {
      delta.status = after.status;
    }
    if (!this.shallowEqual(before.data, after.data)) {
      delta.data = after.data;
    }
    return delta;
  }

  private windowsEqual(a: TimeWindow, b: TimeWindow): boolean {
    return a.start === b.start && a.end === b.end;
  }

  private shallowEqual(
    a: Record<string, unknown>,
    b: Record<string, unknown>
  ): boolean {
    const aKeys = Object.keys(a ?? {});
    const bKeys = Object.keys(b ?? {});
    if (aKeys.length !== bKeys.length) {
      return false;
    }
    for (const key of aKeys) {
      if (a[key] !== b[key]) {
        return false;
      }
    }
    return true;
  }
}
