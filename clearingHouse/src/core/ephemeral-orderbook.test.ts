import { describe, expect, it } from "bun:test";
import { EphemeralOrderbook, OrderPlacementError, type FillReport } from "./ephemeral-orderbook";
import type { Order } from "./orders";
import type { ProductRuntime } from "./products/types";
import { Asset, type AccountId, type OrderId, type ProductTypeId, type Timestamp } from "../domain/primitives";
import { InMemoryBalanceService } from "../services/balance-service";

interface TestOrderData {
  price: number;
  priority: number;
  hitPrice: number;
  payoutPerUnit: number;
  lockPerUnit: number;
}

interface TestPositionData {
  note: string;
}

const TEST_PRODUCT_ID = "test_product" satisfies ProductTypeId;

const testRuntime: ProductRuntime<TestOrderData, TestPositionData> = {
  id: TEST_PRODUCT_ID,
  name: "Test Runtime",
  comparator: (a, b) => b.data.priority - a.data.priority,
  getOrderPrice(order) {
    return order.data.price;
  },
  updatePosition(order, existingPosition, size, now, _price, accountId) {
    const effectiveSize = Math.min(size, order.sizeRemaining);
    const previousSize = existingPosition?.size ?? 0;
    const nextSize = previousSize + effectiveSize;
    const lockAmount = order.data.lockPerUnit * effectiveSize;
    const previousCollateral = existingPosition?.collateralLocked ?? 0;
    const position = existingPosition
      ? { ...existingPosition, size: nextSize, collateralLocked: previousCollateral + lockAmount }
      : {
          id: `pos_${accountId}_${order.id!}`,
          size: effectiveSize,
          orderId: order.id!,
          userId: accountId,
          collateralLocked: lockAmount,
          timeCreated: now,
          data: { note: "test" },
        };

    return {
      position,
      locks: lockAmount > 0
        ? [
            {
              accountId,
              Asset: Asset.USD,
              amount: lockAmount,
            },
          ]
        : [],
    };
  },
  verifyHit(order, _position, price) {
    return price >= order.data.hitPrice;
  },
  payout(order, position) {
    const totalCredit = order.data.payoutPerUnit * position.size;
    return {
      credits: [
        {
          accountId: position.userId,
          Asset: Asset.USD,
          amount: totalCredit,
        },
      ],
      debits: [
        {
          accountId: order.makerId,
          Asset: Asset.USD,
          amount: totalCredit,
        },
      ],
      unlocks: position.collateralLocked > 0
        ? [
            {
              accountId: position.userId,
              Asset: Asset.USD,
              amount: position.collateralLocked,
            },
          ]
        : [],
    };
  },
};

function createOrder(
  overrides: Partial<Order<TestOrderData>> & { id: OrderId; makerId: AccountId },
  baseTime: Timestamp,
  timeframe: number,
  price: number,
): Order<TestOrderData> {
  const triggerStart = overrides.triggerWindow?.start ?? (baseTime + timeframe);
  return {
    id: overrides.id,
    makerId: overrides.makerId,
    data: overrides.data ?? {
      price,
      priority: 1,
      hitPrice: price + 10,
      payoutPerUnit: 12,
      lockPerUnit: 5,
    },
    sizeTotal: overrides.sizeTotal ?? 5,
    sizeRemaining: overrides.sizeRemaining ?? (overrides.sizeTotal ?? 5),
    timePlaced: overrides.timePlaced ?? baseTime,
    pendingPositions: overrides.pendingPositions ?? [],
    triggerWindow: overrides.triggerWindow ?? {
      start: triggerStart,
      end: triggerStart + timeframe,
    },
  } satisfies Order<TestOrderData>;
}

describe("EphemeralOrderbook", () => {
  const timeframe = 1_000;
  const priceStep = 5;
  const bounds = {
    pricePlusBound: 100,
    priceMinusBound: 100,
    timeBuffer: 0,
    timeLimit: 60_000,
  };

  function buildOrderbook(initialPrice: number, baseTime: Timestamp) {
    const balanceService = new InMemoryBalanceService();
    const config = {
      productTypeId: TEST_PRODUCT_ID,
      timeframe,
      priceStep,
      placeOrdersBounds: bounds,
      updateOrdersBounds: bounds,
      cancelOrdersBounds: bounds,
      symbol: "TEST",
    };
    const orderbook = new EphemeralOrderbook(testRuntime, config, balanceService, baseTime, initialPrice);
    return { orderbook, balanceService, config };
  }

  it("orders share price buckets sorted by comparator priority", () => {
    const baseTime = Date.now() as Timestamp;
    const initialPrice = 100;
    const { orderbook } = buildOrderbook(initialPrice, baseTime);

    const lowPriorityOrder = createOrder(
      {
        id: "order_low",
        makerId: "maker",
        data: {
          price: 110,
          priority: 1,
          hitPrice: 120,
          payoutPerUnit: 10,
          lockPerUnit: 0,
        },
      },
      baseTime,
      timeframe,
      110,
    );

    const highPriorityOrder = createOrder(
      {
        id: "order_high",
        makerId: "maker",
        data: {
          price: 111,
          priority: 5,
          hitPrice: 120,
          payoutPerUnit: 10,
          lockPerUnit: 0,
        },
      },
      baseTime,
      timeframe,
      111,
    );

    orderbook.placeOrder(lowPriorityOrder);
    orderbook.placeOrder(highPriorityOrder);

    const column = orderbook.head?.column;
    expect(column).toBeDefined();
    const bucketKey = Math.floor(lowPriorityOrder.data.price / priceStep) * priceStep;
    const bucket = column?.priceBuckets.get(bucketKey);
    const orderIds = bucket?.orders.map(order => order.id);
    expect(orderIds).toEqual(["order_high", "order_low"]);
  });

  it("rejects orders that violate time bounds", () => {
    const baseTime = Date.now() as Timestamp;
    const initialPrice = 100;
    const { orderbook } = buildOrderbook(initialPrice, baseTime);

    const invalidOrder = createOrder(
      {
        id: "order_invalid",
        makerId: "maker",
        triggerWindow: {
          start: baseTime - 1,
          end: baseTime + timeframe,
        },
      },
      baseTime,
      timeframe,
      100,
    );

    expect(() => orderbook.placeOrder(invalidOrder)).toThrow(OrderPlacementError);
  });

  it("rejects orders whose trigger window duration is misaligned with timeframe", () => {
    const baseTime = Date.now() as Timestamp;
    const initialPrice = 100;
    const { orderbook } = buildOrderbook(initialPrice, baseTime);

    const misalignedOrder = createOrder(
      {
        id: "order_misaligned",
        makerId: "maker",
        triggerWindow: {
          start: baseTime + timeframe,
          end: baseTime + timeframe + 750,
        },
      },
      baseTime,
      timeframe,
      100,
    );

    expect(() => orderbook.placeOrder(misalignedOrder)).toThrow(OrderPlacementError);
  });

  it("aggregates fills into a deterministic position id", () => {
    const baseTime = Date.now() as Timestamp;
    const initialPrice = 100;
    const { orderbook, balanceService } = buildOrderbook(initialPrice, baseTime);
    const makerId = "maker";
    const takerId = "taker";
    const order = createOrder({ id: "order_fill", makerId }, baseTime, timeframe, 100);

    balanceService.applyChanges({
      id: "maker_credit",
      ts: baseTime,
      changes: {
        credits: [
          { accountId: makerId, Asset: Asset.USD, amount: 100 },
        ],
        debits: [],
      },
    });

    balanceService.applyChanges({
      id: "taker_credit",
      ts: baseTime,
      changes: {
        credits: [
          { accountId: takerId, Asset: Asset.USD, amount: 50 },
        ],
        debits: [],
      },
    });

    orderbook.placeOrder(order);
    const fillTime = (order.triggerWindow.start + timeframe / 2) as Timestamp;
    orderbook.updatePriceAndTime(initialPrice, fillTime);

    const firstFill = orderbook.fillOrder(order.id!, 2, takerId) as FillReport<TestPositionData>;
    expect(firstFill.position.id).toBe(`pos_${takerId}_${order.id}`);
    expect(firstFill.position.size).toBe(2);
    expect(firstFill.locks[0]?.amount).toBe(10);

    const secondFill = orderbook.fillOrder(order.id!, 1, takerId) as FillReport<TestPositionData>;
    expect(secondFill.position.id).toBe(firstFill.position.id);
    expect(secondFill.position.size).toBe(3);
    expect(secondFill.trade.sizeRemaining).toBe(order.sizeRemaining);
    expect(balanceService.getLocked(takerId, Asset.USD)).toBe(15);
  });

  it("settles payouts when prices hit and maker has sufficient balance", () => {
    const baseTime = Date.now() as Timestamp;
    const initialPrice = 100;
    const { orderbook, balanceService } = buildOrderbook(initialPrice, baseTime);
    const makerId = "maker";
    const takerId = "taker";
    const order = createOrder(
      {
        id: "order_settlement",
        makerId,
        data: {
          price: 105,
          priority: 1,
          hitPrice: 105,
          payoutPerUnit: 12,
          lockPerUnit: 5,
        },
      },
      baseTime,
      timeframe,
      105,
    );

    balanceService.applyChanges({
      id: "maker_credit",
      ts: baseTime,
      changes: {
        credits: [
          { accountId: makerId, Asset: Asset.USD, amount: 100 },
        ],
        debits: [],
      },
    });

    balanceService.applyChanges({
      id: "taker_credit",
      ts: baseTime,
      changes: {
        credits: [
          { accountId: takerId, Asset: Asset.USD, amount: 50 },
        ],
        debits: [],
      },
    });

    orderbook.placeOrder(order);
    const fillTime = (order.triggerWindow.start + timeframe / 2) as Timestamp;
    orderbook.updatePriceAndTime(initialPrice, fillTime);
    orderbook.fillOrder(order.id!, 2, takerId);

    const { settlements, verificationHits, expirations } = orderbook.updatePriceAndTime(order.data.hitPrice, fillTime + 1);
    expect(verificationHits).toHaveLength(1);
    expect(settlements).toHaveLength(1);
    expect(expirations).toHaveLength(0);
    const settlement = settlements[0]!;
    expect(settlement.totalCredit).toBe(24);
    expect(balanceService.getBalance(makerId, Asset.USD)).toBe(76);
    expect(balanceService.getBalance(takerId, Asset.USD)).toBe(74);
    expect(balanceService.getLocked(takerId, Asset.USD)).toBe(0);
  });

  it("removes orders and unlocks collateral when maker is insolvent", () => {
    const baseTime = Date.now() as Timestamp;
    const initialPrice = 100;
    const { orderbook, balanceService } = buildOrderbook(initialPrice, baseTime);
    const makerId = "maker";
    const takerId = "taker";
    const order = createOrder(
      {
        id: "order_default",
        makerId,
        data: {
          price: 100,
          priority: 1,
          hitPrice: 100,
          payoutPerUnit: 12,
          lockPerUnit: 5,
        },
      },
      baseTime,
      timeframe,
      100,
    );

    balanceService.applyChanges({
      id: "maker_credit",
      ts: baseTime,
      changes: {
        credits: [
          { accountId: makerId, Asset: Asset.USD, amount: 5 },
        ],
        debits: [],
      },
    });

    balanceService.applyChanges({
      id: "taker_credit",
      ts: baseTime,
      changes: {
        credits: [
          { accountId: takerId, Asset: Asset.USD, amount: 20 },
        ],
        debits: [],
      },
    });

    orderbook.placeOrder(order);
    const fillTime = (order.triggerWindow.start + timeframe / 2) as Timestamp;
    orderbook.updatePriceAndTime(initialPrice, fillTime);
    orderbook.fillOrder(order.id!, 2, takerId);

    const result = orderbook.updatePriceAndTime(order.data.hitPrice, fillTime + 1);
    expect(result.settlements).toHaveLength(0);
    expect(result.verificationHits).toHaveLength(0);
    expect(result.expirations).toHaveLength(0);
    expect(orderbook.getOrder(order.id!)).toBeUndefined();
    expect(balanceService.getLocked(takerId, Asset.USD)).toBe(0);
    expect(balanceService.getBalance(takerId, Asset.USD)).toBe(20);
  });
});
