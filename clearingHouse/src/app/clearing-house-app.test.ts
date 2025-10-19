import { describe, expect, it } from "bun:test";
import {
  ClearingHouseCommandType,
  createClearingHouseApp,
} from "./clearing-house-app";
import type { Order } from "../core/orders";
import { Asset, type AccountId, type OrderId, type OrderbookId, type ProductTypeId, type Timestamp } from "../domain/primitives";
import { IronCondorProduct, IRON_CONDOR_PRODUCT_ID } from "../core/products/iron-condor";
import type { ProductRuntime } from "../core/products/types";
import type { ClearingHouseEvent } from "../events/types";

function castProductRuntime(): ProductRuntime<Record<string, unknown>, Record<string, unknown>> {
  return IronCondorProduct as unknown as ProductRuntime<Record<string, unknown>, Record<string, unknown>>;
}

describe("ClearingHouseApp", () => {
  const makerId = "maker" as AccountId;
  const takerId = "taker" as AccountId;
  const productTypeId = IRON_CONDOR_PRODUCT_ID as ProductTypeId;
  const symbol = Asset.BTC;

  it("rejects orders from makers that are not whitelisted", async () => {
    const app = createClearingHouseApp();
    const captured: ClearingHouseEvent[] = [];
    app.eventBus.on("order_rejected", (event) => {
      captured.push(event);
    });

    const runtime = castProductRuntime();
    await app.dispatchCommand({
      type: ClearingHouseCommandType.RegisterProduct,
      product: runtime,
    });

    const baseTime = Date.now() as Timestamp;
    app.handlePriceAndTimeUpdate(symbol, 100, baseTime);

    const orderbookId = await app.dispatchCommand({
      type: ClearingHouseCommandType.CreateOrderbook,
      input: {
        productTypeId,
        timeframe: 1_000,
        priceStep: 5,
        placeOrdersBounds: { pricePlusBound: 100, priceMinusBound: 100, timeBuffer: 0, timeLimit: 60_000 },
        updateOrdersBounds: { pricePlusBound: 100, priceMinusBound: 100, timeBuffer: 0, timeLimit: 60_000 },
        cancelOrdersBounds: { pricePlusBound: 150, priceMinusBound: 150, timeBuffer: 0, timeLimit: 120_000 },
        symbol,
      },
    }) as OrderbookId;

    const orderId = "order_unauthorized" as OrderId;
    const triggerStart = (baseTime + 2_000) as Timestamp;
    const triggerEnd = (triggerStart + 2_000) as Timestamp;
    const order: Order<Record<string, unknown>> = {
      id: orderId,
      makerId,
      data: {
        multiplier: 10,
        startRange: 90,
        endRange: 140,
      },
      sizeTotal: 5,
      sizeRemaining: 5,
      timePlaced: baseTime,
      pendingPositions: [],
      triggerWindow: { start: triggerStart, end: triggerEnd },
    };

    await expect(app.dispatchCommand({
      type: ClearingHouseCommandType.PlaceOrder,
      accountId: makerId,
      orderbookId,
      productTypeId,
      order,
    })).rejects.toThrow(/not authorized/);

    expect(captured).toHaveLength(1);
    const event = captured[0]!;
    expect(event.name).toBe("order_rejected");
    expect(event.payload.makerId).toBe(makerId);
    expect(event.payload.violatedConstraint).toMatchObject({ reason: "maker_not_authorized" });
  });

  it("emits lifecycle events when orders fill and settle", async () => {
    const app = createClearingHouseApp();
    const events: ClearingHouseEvent[] = [];
    const track = (event: ClearingHouseEvent) => {
      events.push(event);
    };

    app.eventBus.on("order_placed", track);
    app.eventBus.on("price_update", track);
    app.eventBus.on("clock_tick", track);
    app.eventBus.on("order_filled", track);
    app.eventBus.on("verification_hit", track);
    app.eventBus.on("payout_settled", track);

    const runtime = castProductRuntime();
    await app.dispatchCommand({
      type: ClearingHouseCommandType.RegisterProduct,
      product: runtime,
    });

    const baseTime = Date.now() as Timestamp;
    app.handlePriceAndTimeUpdate(symbol, 100, baseTime);

    const orderbookId = await app.dispatchCommand({
      type: ClearingHouseCommandType.CreateOrderbook,
      input: {
        productTypeId,
        timeframe: 1_000,
        priceStep: 5,
        placeOrdersBounds: { pricePlusBound: 100, priceMinusBound: 100, timeBuffer: 0, timeLimit: 60_000 },
        updateOrdersBounds: { pricePlusBound: 100, priceMinusBound: 100, timeBuffer: 0, timeLimit: 60_000 },
        cancelOrdersBounds: { pricePlusBound: 150, priceMinusBound: 150, timeBuffer: 0, timeLimit: 120_000 },
        symbol,
      },
    }) as OrderbookId;

    await app.dispatchCommand({
      type: ClearingHouseCommandType.WhitelistMaker,
      orderbookId,
      makerId,
    });

    await app.dispatchCommand({
      type: ClearingHouseCommandType.CreditAccount,
      accountId: makerId,
      asset: Asset.USD,
      amount: 100,
    });

    const triggerStart = (baseTime + 2_000) as Timestamp;
    const triggerEnd = (triggerStart + 2_000) as Timestamp;
    const orderId = "order_success" as OrderId;

    const order: Order<Record<string, unknown>> = {
      id: orderId,
      makerId,
      data: {
        multiplier: 10,
        startRange: 110,
        endRange: 130,
      },
      sizeTotal: 4,
      sizeRemaining: 4,
      timePlaced: baseTime,
      pendingPositions: [],
      triggerWindow: { start: triggerStart, end: triggerEnd },
    };

    await app.dispatchCommand({
      type: ClearingHouseCommandType.PlaceOrder,
      accountId: makerId,
      orderbookId,
      productTypeId,
      order,
    });

    const preFillTime = (triggerStart + 200) as Timestamp;
    app.handlePriceAndTimeUpdate(symbol, 100, preFillTime);
    await app.eventBus.dispatchAll();

    await app.dispatchCommand({
      type: ClearingHouseCommandType.FillOrder,
      accountId: takerId,
      orderbookId,
      productTypeId,
      orderId,
      size: 2,
    });

    const settlementTime = (preFillTime + 200) as Timestamp;
    app.handlePriceAndTimeUpdate(symbol, 110, settlementTime);
    await app.eventBus.dispatchAll();

    const eventNames = events.map((event) => event.name);
    expect(eventNames).toEqual([
      "order_placed",
      "price_update",
      "clock_tick",
      "order_filled",
      "price_update",
      "clock_tick",
      "verification_hit",
      "payout_settled",
    ]);

    const makerBalance = app.balanceService.getBalance(makerId, Asset.USD);
    const takerBalance = app.balanceService.getBalance(takerId, Asset.USD);
    expect(makerBalance).toBe(80);
    expect(takerBalance).toBe(22);
  });
});
