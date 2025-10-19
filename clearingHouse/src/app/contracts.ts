import type { Order } from "../core/orders";
import type { Position } from "../core/positions";
import type {
  AccountId,
  OrderId,
  OrderbookId,
  PriceWindow,
  TimeWindow,
  Timestamp,
} from "../domain/primitives";

export interface PlaceOrderInput<TData extends Record<string, unknown> = Record<string, unknown>> {
  orderbookId: OrderbookId;
  makerId: AccountId;
  sizeTotal: number;
  triggerWindow: TimeWindow;
  fillWindow: TimeWindow;
  data: TData;
  collateralRequired?: number;
  requestedAt?: Timestamp;
}

export interface FillOrderInput {
  orderId: OrderId;
  orderbookId: OrderbookId;
  userId: AccountId;
  size: number;
  price: number;
  requestedAt?: Timestamp;
}

export interface PriceWindowUpdateInput {
  orderbookId: OrderbookId;
  priceWindow: PriceWindow;
}

export interface PositionedOrder<TData extends object = Record<string, unknown>, TPositionData extends object = Record<string, unknown>> {
  order: Order<TData>;
  position: Position<TPositionData>;
}
