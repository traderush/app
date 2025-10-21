import type {
  AccountId,
  Asset,
  Decimal,
  EventId,
  OrderId,
  OrderbookId,
  PositionId,
  Timestamp,
} from "../domain/primitives";

export type EventName =
  | "order_placed"
  | "order_rejected"
  | "order_filled"
  | "price_update"
  | "clock_tick"
  | "verification_hit"
  | "payout_settled"
  | "payout_expired"
  | "margin_violation"
  | "balance_updated";

export interface EventEnvelope<TName extends EventName, TPayload> {
  eventId: EventId;
  name: TName;
  orderbookId: OrderbookId;
  ts: Timestamp;
  sourceTs?: Timestamp;
  clockSeq: number;
  version?: number;
  payload: TPayload;
}

export type OrderEventPayloads = {
  order_placed: {
    orderId: OrderId;
    makerId: AccountId;
    sizeTotal: Decimal;
    sizeRemaining: Decimal;
    triggerWindow: { start: Timestamp; end: Timestamp };
    fillWindow: { start: Timestamp; end: Timestamp };
    price: Decimal;
    priceBucket: Decimal;
    collateralRequired?: Decimal;
  };
  order_rejected: {
    makerId: AccountId;
    rejectionReason: string;
    violatedConstraint: Record<string, unknown>;
    userId?: AccountId;
    orderId?: OrderId;
  };
  order_filled: {
    orderId: OrderId;
    positionId: PositionId;
    fillSize: Decimal;
    fillPrice: Decimal;
    userId: AccountId;
    sizeRemaining: Decimal;
    balances?: Array<{
      accountId: AccountId;
      Asset: Asset;
      balance: Decimal;
      locked: Decimal;
      delta?: Decimal;
      reason?: string;
      metadata?: Record<string, unknown>;
    }>;
  };
  price_update: {
    symbol: string;
    price: Decimal;
    oracleSeq?: number;
  };
  clock_tick: {
    now: Timestamp;
    reason: string;
  };
  verification_hit: {
    positionId: PositionId;
    orderId: OrderId;
    price: Decimal;
    triggerTs: Timestamp;
    userId: AccountId;
  };
  payout_settled: {
    orderId: OrderId;
    positionId: PositionId;
    totalCredit: Decimal;
    makerId: AccountId;
    userId: AccountId;
    balances?: Array<{
      accountId: AccountId;
      Asset: Asset;
      balance: Decimal;
      locked: Decimal;
      delta?: Decimal;
      reason?: string;
      metadata?: Record<string, unknown>;
    }>;
  };
  payout_expired: {
    orderId: OrderId;
    positionId: PositionId;
    makerId: AccountId;
    userId: AccountId;
    size: Decimal;
  };
  margin_violation: {
    entityId: AccountId;
    requiredMargin: Decimal;
    availableMargin: Decimal;
    policyAction: "order_blocked" | "fill_scaled";
    orderId: OrderId;
  };
  balance_updated: {
    accountId: AccountId;
    asset: Asset;
    balance: Decimal;
    locked: Decimal;
    delta: Decimal;
    reason?: string;
    metadata?: Record<string, unknown>;
  };
};

export type ClearingHouseEvent<TName extends EventName = EventName> = EventEnvelope<
  TName,
  OrderEventPayloads[TName]
>;
