import type {
  AccountId,
  Decimal,
  OrderId,
  PositionId,
  Timestamp
} from "../domain/primitives";

export interface Position<TPositionData extends object = Record<string, unknown>> {
  id: PositionId;
  size: Decimal;
  orderId: OrderId;
  userId: AccountId;
  collateralLocked: Decimal;
  timeCreated: Timestamp;
  data: TPositionData;
}
