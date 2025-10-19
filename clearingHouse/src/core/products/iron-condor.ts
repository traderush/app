import { Asset, type AccountId, type PositionId, type ProductTypeId, type Timestamp } from "../../domain/primitives";
import type { BalanceChanges, CollateralLockChange } from "../../services/balance-service";
import type { Order } from "../orders";
import type { Position } from "../positions";
import type { ProductRuntime } from "./types";

export interface IronCondorOrderData {
  multiplier: number;
  startRange: number;
  endRange: number;
}

export type IronCondorPositionData = Record<string, never>;


export const IRON_CONDOR_PRODUCT_ID = "iron_condor" satisfies ProductTypeId;

export const IronCondorProduct: ProductRuntime<IronCondorOrderData, IronCondorPositionData> = {
  id: IRON_CONDOR_PRODUCT_ID,
  name: "Iron Condor",
  comparator: (a, b) => b.data.multiplier - a.data.multiplier,
  getOrderPrice(order) {
    return order.data.startRange;
  },

  updatePosition(
    order: Order<IronCondorOrderData>,
    existingPosition: Position<IronCondorPositionData> | undefined,
    size: number,
    now: Timestamp,
    _price: number,
    accountId: AccountId,
  ): {position: Position<IronCondorPositionData>, locks: CollateralLockChange[]} {
    const totalSize = Math.min(size, order.sizeRemaining);
    const nextPositionSize = (existingPosition?.size ?? 0) + totalSize;

    const position: Position<IronCondorPositionData> = existingPosition
      ? {
          ...existingPosition,
          size: nextPositionSize,
        }
      : {
          id:`pos_${accountId}_${order.id!}` as PositionId,
          size: totalSize,
          orderId: order.id!,
          userId: accountId,
          collateralLocked: 0,
          timeCreated: now,
          data: {} as IronCondorPositionData,
        };

    return {
      position,
      locks: [],
    };
  },
  verifyHit(order, _position, price: number, _now: Timestamp, _timeWindow) {
    const data = order.data as IronCondorOrderData;
    return price >= data.startRange && price < data.endRange;
  },
  payout(order, position, _price): BalanceChanges {
    const data = order.data as IronCondorOrderData;
    const amount = data.multiplier * position.size;
    return {
      unlocks: [
        {
          accountId: position.userId,
          Asset: Asset.USD,
          amount: position.size,
        }
      ],
      credits: [
        {
          accountId: position.userId,
          Asset: Asset.USD,
          amount,
        },
      ],
      debits: [
        {
          accountId: order.makerId,
          Asset: Asset.USD,
          amount,
        },
      ],
    };
  },
};
