import { EventEmitter } from 'events';

export type OrderId = string;
export type PositionId = string;
export type AccountId = string;
export type ProductTypeId = string;
export type OrderbookId = string;

export type Timestamp = number; // ms since epoch

export interface TimeWindow {
  start: Timestamp;
  end: Timestamp;
}

export enum OrderStatus {
  ACTIVE = 'active',
  PARTIALLY_FILLED = 'partially_filled',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  FILLED = 'filled',
}

export enum PositionStatus {
  OPEN = 'open',
  HIT = 'hit',
  SETTLED = 'settled',
  EXPIRED = 'expired',
}

export interface PositionRef {
  positionId: PositionId;
  triggerWindow: TimeWindow;
  userId: AccountId;
  size: number;
}

export interface Order {
  id: OrderId;
  orderbookId: OrderbookId;
  productTypeId: ProductTypeId;
  makerId: AccountId;
  data: Record<string, unknown>;
  sizeTotal: number;
  sizeRemaining: number;
  collateralRequired: number;
  collateralFilled: number;
  timePlaced: Timestamp;
  fillWindow: TimeWindow;
  triggerWindow: TimeWindow;
  pendingPositions: PositionRef[];
  status: OrderStatus;
  cancelOnly: boolean;
  priceBucket: number;
  version: number;
}

export interface Position {
  id: PositionId;
  orderId: OrderId;
  orderbookId: OrderbookId;
  productTypeId: ProductTypeId;
  userId: AccountId;
  makerId: AccountId;
  size: number;
  collateralLocked: number;
  timeCreated: Timestamp;
  triggerWindow: TimeWindow;
  status: PositionStatus;
  priceAtFill?: number;
  priceAtHit?: number;
  timeHit?: Timestamp;
  timeSettled?: Timestamp;
}

export interface BalanceChange {
  accountId: AccountId;
  delta: number;
  reason: string;
}

export interface BalanceChangeset {
  credits: BalanceChange[];
  debits: BalanceChange[];
}

export interface OrderbookConfig {
  orderbookId: OrderbookId;
  productTypeId: ProductTypeId;
  timeframeMs: number;
  priceStep: number;
  priceWindow: {
    min: number;
    max: number;
  };
  timeWindow: {
    horizonMs: number;
  };
  yAxisSize: number;
  updateOrdersBuffer: number;
  placeOrdersBuffer: number;
}

export interface PlaceOrderPayload {
  orderbookId: OrderbookId;
  productTypeId: ProductTypeId;
  makerId: AccountId;
  size: number;
  collateralRequired: number;
  data: Record<string, unknown>;
  fillWindow: TimeWindow;
  triggerWindow?: TimeWindow;
  priceBucket: number;
}

export interface UpdateOrderPayload {
  orderId: OrderId;
  makerId: AccountId;
  size?: number;
  collateralRequired?: number;
  data?: Record<string, unknown>;
  fillWindow?: TimeWindow;
  triggerWindow?: TimeWindow;
  priceBucket?: number;
}

export interface CancelOrderPayload {
  orderId: OrderId;
  makerId: AccountId;
}

export interface FillOrderPayload {
  orderId: OrderId;
  userId: AccountId;
  size: number;
  priceAtFill?: number;
  timestamp: Timestamp;
}

export interface AuthorizedFill {
  size: number;
  collateralUsed: number;
}

export interface MarginAuthorization {
  authorizedSize: number;
  reason?: string;
}

export interface MarginViolation {
  entityId: string;
  requiredMargin: number;
  availableMargin: number;
  policyAction: 'order_blocked' | 'fill_scaled';
  orderId: OrderId;
  timestamp: Timestamp;
}

export interface SettlementInstruction {
  positionId: PositionId;
  orderId: OrderId;
  orderbookId: OrderbookId;
  productTypeId: ProductTypeId;
  balanceChanges: BalanceChangeset;
  clockSeq: number;
  priceAtHit: number;
  triggerTimestamp: Timestamp;
}

export interface ClockTickContext {
  orderbookId: OrderbookId;
  now: Timestamp;
  price: number;
  clockSeq?: number;
}

export type EventEnvelope<TPayload> = {
  eventId: string;
  orderbookId: OrderbookId;
  ts: Timestamp;
  clockSeq: number;
  sourceTs?: Timestamp;
  version?: number;
  payload: TPayload;
};

export type ClearingHouseEvent =
  | EventEnvelope<{
      type: 'order_placed';
      order: Order;
      collateralLocked: number;
    }>
  | EventEnvelope<{
      type: 'order_updated';
      order: Order;
      delta: Partial<Order>;
      previousVersion: number;
    }>
  | EventEnvelope<{
      type: 'order_cancelled';
      orderId: OrderId;
      reason: string;
    }>
  | EventEnvelope<{
      type: 'order_cancel_only';
      orderId: OrderId;
      reason: string;
      cancelRequiredBy: Timestamp;
    }>
  | EventEnvelope<{
      type: 'order_rejected';
      orderId?: OrderId;
      makerId: AccountId;
      userId?: AccountId;
      rejectionReason: string;
      violatedConstraint?: Record<string, unknown>;
    }>
  | EventEnvelope<{
      type: 'order_filled';
      orderId: OrderId;
      positionId: PositionId;
      fillSize: number;
      fillPrice?: number;
      userId: AccountId;
    }>
  | EventEnvelope<{
      type: 'verification_hit';
      positionId: PositionId;
      orderId: OrderId;
      price: number;
      triggerTs: Timestamp;
    }>
  | EventEnvelope<{
      type: 'payout_settled';
      positionId: PositionId;
      amount: number;
      makerId: AccountId;
      userId: AccountId;
    }>
  | EventEnvelope<{
      type: 'margin_violation';
      violation: MarginViolation;
    }>
  | EventEnvelope<{
      type: 'price_update';
      symbol: string;
      price: number;
      oracleSeq: number;
    }>
  | EventEnvelope<{
      type: 'clock_tick';
      windowStart: Timestamp;
      windowEnd: Timestamp;
      reason: 'tick' | 'manual';
      price: number;
    }>
  | EventEnvelope<{
      type: 'column_dropped';
      windowStart: Timestamp;
      windowEnd: Timestamp;
      droppedOrderIds: OrderId[];
    }>;

export interface SettlementQueue {
  enqueue(instruction: SettlementInstruction): void;
  dequeue(): SettlementInstruction | undefined;
  peek(): SettlementInstruction | undefined;
  size(): number;
}

export type Listener<TPayload> = (payload: TPayload) => void;

export type EventMap = Record<string, Listener<any>[]>;

export interface Disposable {
  dispose(): void;
}

export interface Identified {
  id: string;
}

export type ModuleWithEvents<TEvents extends string> = EventEmitter & {
  on(event: TEvents, listener: Listener<any>): void;
  off(event: TEvents, listener: Listener<any>): void;
};
