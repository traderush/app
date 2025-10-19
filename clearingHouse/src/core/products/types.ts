import type {
  AccountId,
  ProductTypeId,
  Timestamp,
  TimeWindow
} from "../../domain/primitives";
import type { BalanceChanges, CollateralLockChange } from "../../services/balance-service";
import type { OrderComparator } from "../ephemeral-orderbook";
import type { Order } from "../orders";
import type { Position } from "../positions";

export interface ProductRuntime<
  TOrderData extends object = Record<string, unknown>,
  TPositionData extends object = Record<string, unknown>,
> {
  id: ProductTypeId;
  name: string;
  comparator: OrderComparator;
  getOrderPrice(order: Order<TOrderData>): number;
  updatePosition(
    order: Order<TOrderData>,
    existingPosition: Position<TPositionData> | undefined,
    size: number,
    now: Timestamp,
    price: number,
    accountId: AccountId,
  ): {position: Position<TPositionData>, locks: CollateralLockChange[]};
  verifyHit(
    order: Order<TOrderData>,
    position: Position<TPositionData>,
    price: number,
    now: Timestamp,
    timeWindow?: TimeWindow
  ): boolean;
  payout(
    order: Order<TOrderData>,
    position: Position<TPositionData>,
    priceAtHit: number,
  ): BalanceChanges;
}
