import type {
  AccountId,
  OrderId,
  OrderbookId,
  PositionId,
  ProductTypeId,
  TimeWindow,
  Timestamp
} from "../domain/primitives";

export interface PositionRef {
  positionId: PositionId;
  triggerWindow?: TimeWindow;
}

export interface Order<TOrderData extends object = Record<string, unknown>> {
  id?: OrderId;
  makerId: AccountId;
  data: TOrderData;
  sizeTotal: number;
  sizeRemaining: number;
  timePlaced: Timestamp;
  pendingPositions: PositionRef[];
  triggerWindow: TimeWindow;
}

export interface OrderOriginInfo {
  productTypeId: ProductTypeId;
  orderbookId: OrderbookId;
  triggerWindow: TimeWindow;
}
