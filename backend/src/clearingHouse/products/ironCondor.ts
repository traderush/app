import { getTimeframeConfig, TimeFrame } from '../../config/timeframeConfig';
import { ProductTypeHooks } from '../core/product';
import { BalanceChangeset, Order, OrderbookConfig } from '../core/types';

export const IRON_CONDOR_PRODUCT_ID = 'iron_condor';

export type IronCondorOrderData = {
  /** price lower bound (inclusive) where the contract triggers */
  startRange: number;
  /** price upper bound (exclusive) where the contract triggers */
  endRange: number;
  /** payout multiplier per unit size */
  multiplier: number;
  /** zero-based column index within the time horizon */
  columnIndex: number;
  /** price reference captured when the order was created */
  anchorPrice: number;
};

export function createIronCondorProductType(): ProductTypeHooks {
  return {
    id: IRON_CONDOR_PRODUCT_ID,
    orderComparator: (a, b) => {
      const aMultiplier = coerceMultiplier(a);
      const bMultiplier = coerceMultiplier(b);
      return bMultiplier - aMultiplier;
    },
    verifyHit(order, _position, priceAtTick) {
      const data = getIronCondorOrderData(order);
      if (!data) {
        return false;
      }
      return data.startRange <= priceAtTick && priceAtTick < data.endRange;
    },
    payout(order, position, _priceAtHit): BalanceChangeset {
      const data = getIronCondorOrderData(order);
      if (!data) {
        return emptyChangeset();
      }

      const rawPayout = Math.max(data.multiplier, 0) * position.size;
      if (rawPayout <= 0) {
        return emptyChangeset();
      }

      const collateralPerUnit =
        order.sizeTotal > 0 ? order.collateralRequired / order.sizeTotal : 0;
      const maxPayoutByCollateral = collateralPerUnit * position.size;
      const payout = Math.min(rawPayout, maxPayoutByCollateral);

      if (payout <= 0) {
        return emptyChangeset();
      }

      return {
        credits: [
          {
            accountId: position.userId,
            delta: payout,
            reason: `${IRON_CONDOR_PRODUCT_ID}:payout`,
          },
        ],
        debits: [
          {
            accountId: order.makerId,
            delta: payout,
            reason: `${IRON_CONDOR_PRODUCT_ID}:payout`,
          },
        ],
      };
    },
    init: () => undefined,
  };
}

export function buildIronCondorOrderbookConfig(
  timeframe: TimeFrame
): OrderbookConfig {
  const timeframeConfig = getTimeframeConfig(timeframe);
  const rowsAbove = timeframeConfig.ironCondor.rowsAbove;
  const rowsBelow = timeframeConfig.ironCondor.rowsBelow;
  const priceWindowMin = -rowsBelow;
  const priceWindowMax = rowsAbove;
  const yAxisSize = rowsAbove + rowsBelow + 1;

  return {
    orderbookId: `${IRON_CONDOR_PRODUCT_ID}:${timeframe}`,
    productTypeId: IRON_CONDOR_PRODUCT_ID,
    timeframeMs: timeframe,
    priceStep: timeframeConfig.boxHeight,
    priceWindow: {
      min: priceWindowMin,
      max: priceWindowMax,
    },
    timeWindow: {
      horizonMs: timeframe * 20,
    },
    yAxisSize,
    updateOrdersBuffer: 1,
    placeOrdersBuffer: 2,
  };
}

export function parseIronCondorData(
  raw: Record<string, unknown> | undefined
): IronCondorOrderData | undefined {
  if (!raw) {
    return undefined;
  }
  const data = raw as Partial<Record<keyof IronCondorOrderData, unknown>>;
  const startRange = typeof data.startRange === 'number' ? data.startRange : undefined;
  const endRange = typeof data.endRange === 'number' ? data.endRange : undefined;
  const multiplier = typeof data.multiplier === 'number' ? data.multiplier : undefined;
  if (
    startRange === undefined ||
    endRange === undefined ||
    multiplier === undefined
  ) {
    return undefined;
  }
  const columnIndex = typeof data.columnIndex === 'number' ? data.columnIndex : 0;
  const anchorPrice = typeof data.anchorPrice === 'number' ? data.anchorPrice : startRange;
  return { startRange, endRange, multiplier, columnIndex, anchorPrice };
}

export function getIronCondorOrderData(order: Order): IronCondorOrderData | undefined {
  const data = order.data as Partial<IronCondorOrderData> | undefined;
  return parseIronCondorData(data as Record<string, unknown> | undefined);
}

function coerceMultiplier(order: Order): number {
  const data = getIronCondorOrderData(order);
  return data ? data.multiplier : 0;
}

function emptyChangeset(): BalanceChangeset {
  return {
    credits: [],
    debits: [],
  };
}
