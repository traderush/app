import { randomUUID } from "crypto";
import { BunFile } from "bun";

import { createClearingHouseApp, type ClearingHouseApp, ClearingHouseCommandType } from "../app/clearing-house-app";
import { OracleService } from "../services/oracle-service";
import { createMarketMaker } from "../market-maker";
import { bootstrapDefaultMarket } from "../setup/default-market";

import type { ClearingHouseEvent } from "../events/types";
import type { Order } from "../core/orders";
import type { TimeWindow } from "../domain/primitives";
import {
  Asset,
  type AccountId,
  type OrderId,
  type OrderbookId,
  type ProductTypeId,
  type Timestamp,
} from "../domain/primitives";
import { IRON_CONDOR_PRODUCT_ID } from "../core/products/iron-condor";

// Engine protocol payloads — aligned with app/src/types/boxHitEngine.ts
type TimeFrameMs = 500 | 1000 | 2000 | 4000 | 10000;

type EngineContractSnapshot = {
  contractId: string;
  orderId: string;
  orderbookId: string;
  timeframe: TimeFrameMs;
  startTime: number;
  endTime: number;
  lowerStrike: number;
  upperStrike: number;
  returnMultiplier: number;
  totalVolume: number;
  status: "active" | "triggered" | "settled" | "expired";
  type: "IRON_CONDOR";
};

type EnginePricePoint = { price: number; timestamp: number };

type EngineWelcome = {
  type: "welcome";
  payload: { userId: string; username: string; balance: number; timeframes: TimeFrameMs[] };
};

type EngineSnapshot = {
  type: "snapshot";
  payload: { timeframe: TimeFrameMs; priceHistory: EnginePricePoint[]; contracts: EngineContractSnapshot[] };
};

type EnginePriceTick = { type: "price_tick"; payload: EnginePricePoint };
type EngineContractUpdate = { type: "contract_update"; payload: { timeframe: TimeFrameMs; contracts: EngineContractSnapshot[] } };
type EngineTradeConfirmed = { type: "trade_confirmed"; payload: { contractId: string; amount: number; tradeId: string; balance: number; priceAtFill: number; timestamp: number } };
type EngineTradeResult = { type: "trade_result"; payload: { contractId: string; tradeId: string; won: boolean; payout: number; profit: number; balance: number; timestamp: number } };
type EngineBalanceUpdate = { type: "balance_update"; payload: { balance: number; reason: string } };
type EngineStatus = { type: "engine_status"; payload: { status: "online" | "degraded" | "error"; message?: string } };
type EngineHeartbeat = { type: "heartbeat"; payload: { serverTime: number } };
type EngineAck = { type: "ack"; payload: { command: string; ok: boolean; error?: string } };
type EngineError = { type: "error"; payload: { message: string } };

type OutgoingMessage =
  | EngineWelcome
  | EngineSnapshot
  | EnginePriceTick
  | EngineContractUpdate
  | EngineTradeConfirmed
  | EngineTradeResult
  | EngineBalanceUpdate
  | EngineStatus
  | EngineHeartbeat
  | EngineAck
  | EngineError;

type ClientHello = { type: "hello"; payload?: { username?: string } };
type ClientSubscribe = { type: "subscribe"; payload: { timeframe: TimeFrameMs } };
type ClientUnsubscribe = { type: "unsubscribe"; payload: { timeframe: TimeFrameMs } };
type ClientPlaceTrade = { type: "place_trade"; payload: { contractId: string; amount: number } };
type ClientPong = { type: "pong"; payload?: { timestamp?: number } };
type ClientDisconnect = { type: "disconnect"; payload?: {} };
type IncomingMessage = ClientHello | ClientSubscribe | ClientUnsubscribe | ClientPlaceTrade | ClientPong | ClientDisconnect;

const MAX_HISTORY = 600;
const ENGINE_TIMEFRAMES: TimeFrameMs[] = [500, 1000, 2000, 4000, 10000];

type PriceHistoryStore = Map<TimeFrameMs, EnginePricePoint[]>;

type Session = {
  id: string;
  ws: ServerWebSocket<unknown>;
  accountId: AccountId;
  username: string;
  timeframe?: TimeFrameMs;
};

function isTimeframe(value: unknown): value is TimeFrameMs {
  return typeof value === "number" && ENGINE_TIMEFRAMES.includes(value as TimeFrameMs);
}

function trimHistory(list: EnginePricePoint[], max = MAX_HISTORY): EnginePricePoint[] {
  if (list.length <= max) return list;
  return list.slice(list.length - max);
}

function mapContractStatus(now: number, start: number, end: number, sizeRemaining: number, hasPending: boolean): EngineContractSnapshot["status"] {
  if (now < start) return "active";
  if (now >= start && now < end) return hasPending ? "triggered" : "active";
  if (now >= end) return hasPending ? "settled" : "expired";
  return "active";
}

function buildContractsSnapshot(app: ClearingHouseApp, tf: TimeFrameMs): EngineContractSnapshot[] {
  const snapshots: EngineContractSnapshot[] = [];
  const now = Date.now();

  for (const [productTypeId, bookMap] of app.orderbookStore.entries()) {
    for (const [orderbookId, orderbook] of bookMap.entries()) {
      if ((orderbook.config.timeframe as number) !== tf) continue;

      // Traverse linked time columns starting from head
      let node = orderbook.head as unknown as {
        column: { priceBuckets: Map<number, { price: number; orders: Order<Record<string, unknown>>[] }>; windowStart: number; windowEnd: number };
        next: any | null;
      } | null;

      while (node) {
        const bucketEntries = [...node.column.priceBuckets.values()].sort((a, b) => b.price - a.price);
        for (const bucket of bucketEntries) {
          for (const order of bucket.orders) {
            const data = order.data as unknown as { multiplier?: number; startRange?: number; endRange?: number };
            const start = order.triggerWindow.start;
            const end = order.triggerWindow.end;
            const lower = typeof data.startRange === "number" ? data.startRange : bucket.price;
            const upper = typeof data.endRange === "number" ? data.endRange : bucket.price + 1;
            const status = mapContractStatus(now, start, end, order.sizeRemaining, order.pendingPositions.length > 0);
            snapshots.push({
              contractId: order.id!,
              orderId: order.id!,
              orderbookId,
              timeframe: tf,
              startTime: start,
              endTime: end,
              lowerStrike: lower,
              upperStrike: upper,
              returnMultiplier: typeof data.multiplier === "number" ? data.multiplier : 1,
              totalVolume: order.sizeTotal,
              status,
              type: "IRON_CONDOR",
            });
          }
        }
        node = node.next;
      }
    }
  }

  return snapshots;
}

function buildExplorerSnapshots(app: ClearingHouseApp): Array<{
  timeframe: number;
  price: number;
  timeframeMs: number;
  timeWindowMs: number;
  priceWindow: { min: number; max: number };
  priceStep: number;
  contracts: Array<{
    id: string;
    returnMultiplier: number;
    status: string;
    strikeRange: { lower: number; upper: number };
    exerciseWindow: { start: number; end: number };
    totalVolume: number;
    openInterest: number;
    positions: Array<{ userId: string; totalSize: number; fills: Array<{ amount: number; timestamp: number }> }>;
    columnIndex: number;
    anchorPrice: number;
  }>;
}> {
  const out: Array<any> = [];
  const now = Date.now();

  for (const [_, bookMap] of app.orderbookStore.entries()) {
    for (const [__, orderbook] of bookMap.entries()) {
      const tf = orderbook.config.timeframe as number;
      const price = orderbook.getCurrentPrice();
      const priceStep = orderbook.config.priceStep || 1;

      const contracts: any[] = [];
      let minStrike = Number.POSITIVE_INFINITY;
      let maxStrike = Number.NEGATIVE_INFINITY;

      // Walk columns, gather contracts
      let node = orderbook.head as any;
      while (node) {
        const colStart = node.column.windowStart as number;
        const buckets = [...node.column.priceBuckets.values()].sort((a: any, b: any) => b.price - a.price);
        for (const bucket of buckets) {
          for (const order of bucket.orders as Order<Record<string, unknown>>[]) {
            const d = order.data as any;
            const lower = typeof d.startRange === 'number' ? d.startRange : bucket.price;
            const upper = typeof d.endRange === 'number' ? d.endRange : bucket.price + priceStep;
            minStrike = Math.min(minStrike, lower);
            maxStrike = Math.max(maxStrike, upper);
            const colIndex = Math.floor((colStart - now) / tf);
            contracts.push({
              id: order.id!,
              returnMultiplier: typeof d.multiplier === 'number' ? d.multiplier : 1,
              status: order.sizeRemaining > 0 ? 'active' : 'expired',
              strikeRange: { lower, upper },
              exerciseWindow: { start: order.triggerWindow.start, end: order.triggerWindow.end },
              totalVolume: order.sizeTotal,
              openInterest: Math.max(0, order.sizeRemaining),
              positions: [],
              columnIndex: colIndex,
              anchorPrice: lower,
            });
          }
        }
        node = node.next;
      }

      const timeWindowMs = tf * 40; // Arbitrary horizon for explorer
      const priceWindow = {
        min: Number.isFinite(minStrike) ? minStrike : Math.max(0, price - 50),
        max: Number.isFinite(maxStrike) ? maxStrike : price + 50,
      };

      out.push({
        timeframe: tf,
        price,
        timeframeMs: tf,
        timeWindowMs,
        priceWindow,
        priceStep,
        contracts,
      });
    }
  }

  return out;
}

async function main() {
  const app = createClearingHouseApp();
  const marketMaker = createMarketMaker(app);
  const oracle = new OracleService(async (symbol, price, time) => {
    app.handlePriceAndTimeUpdate(symbol, price, time);
    await marketMaker.handleMarketUpdate(symbol, price, time);
    // Record price point
    recordPricePoint(priceHistories, { price, timestamp: time });
    // Broadcast live tick
    broadcastAll({ type: "price_tick", payload: { price, timestamp: time } });
  });

  const referenceTime = Date.now() as Timestamp;
  await bootstrapDefaultMarket(app, marketMaker, referenceTime);
  await app.start();
  await oracle.start();

  // Seed price history with current price per timeframe
  const priceHistories: PriceHistoryStore = new Map();
  for (const tf of ENGINE_TIMEFRAMES) {
    priceHistories.set(tf, []);
  }
  for (const [, orderbooks] of app.orderbookStore) {
    for (const [, ob] of orderbooks) {
      const price = ob.getCurrentPrice();
      for (const tf of ENGINE_TIMEFRAMES) {
        pushHistory(priceHistories, tf, { price, timestamp: referenceTime });
      }
      break; // single price is fine
    }
    break;
  }

  // Track sessions
  const sessions = new Map<string, Session>();

  // Map of orderId to (productTypeId, orderbookId)
  function findOrderLocation(orderId: OrderId): { productTypeId: ProductTypeId; orderbookId: OrderbookId } | null {
    for (const [productTypeId, books] of app.orderbookStore.entries()) {
      for (const [orderbookId, ob] of books.entries()) {
        if (ob.orders.has(orderId)) return { productTypeId, orderbookId };
      }
    }
    return null;
  }

  // Event relay -> translate CH events into engine messages per-session
  (async () => {
    for await (const event of app.createEventStream()) {
      handleClearingHouseEvent(event);
    }
  })().catch((err) => {
    console.error("event stream error", err);
  });

  function handleClearingHouseEvent(event: ClearingHouseEvent): void {
    switch (event.name) {
      case "payout_settled": {
        const { takerId, orderId, totalCredit } = event.payload as any;
        for (const session of sessions.values()) {
          if (session.accountId !== takerId) continue;
          const balance = app.balanceService.getBalance(session.accountId, Asset.USD);
          const message: EngineTradeResult = {
            type: "trade_result",
            payload: {
              contractId: orderId,
              tradeId: `pos_${takerId}_${orderId}`,
              won: true,
              payout: totalCredit,
              profit: totalCredit,
              balance,
              timestamp: event.ts,
            },
          };
          send(session, message);
        }
        break;
      }
      default:
        break;
    }
  }

  function pushHistory(store: PriceHistoryStore, tf: TimeFrameMs, point: EnginePricePoint): void {
    const arr = store.get(tf) ?? [];
    arr.push(point);
    store.set(tf, trimHistory(arr));
  }

  function recordPricePoint(store: PriceHistoryStore, point: EnginePricePoint): void {
    for (const tf of ENGINE_TIMEFRAMES) {
      pushHistory(store, tf, point);
    }
  }

  function send(session: Session, message: OutgoingMessage): void {
    try {
      session.ws.send(JSON.stringify(message));
    } catch (err) {
      console.warn("failed to send", err);
    }
  }

  function broadcastAll(message: OutgoingMessage): void {
    for (const session of sessions.values()) {
      send(session, message);
    }
  }

  function buildSnapshotPayload(tf: TimeFrameMs): EngineSnapshot["payload"] {
    const history = priceHistories.get(tf) ?? [];
    const contracts = buildContractsSnapshot(app, tf);
    return { timeframe: tf, priceHistory: history, contracts };
  }

  const server = Bun.serve({
    port: Number(process.env.ENGINE_PORT ?? 8080),
    fetch: async (req, server) => {
      const url = new URL(req.url);
      if (url.pathname === "/ws" && server.upgrade(req)) {
        return new Response(null);
      }

      if (url.pathname === "/api/explorer/orderbooks") {
        const snapshots = buildExplorerSnapshots(app);
        return new Response(
          JSON.stringify({ snapshots, generatedAt: Date.now() }),
          { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
      }

      if (url.pathname === "/" || url.pathname === "/visualizer") {
        try {
          const file: BunFile = Bun.file("public/orderbook-visualizer.html");
          if (await file.exists()) {
            return new Response(await file.bytes(), { headers: { "Content-Type": "text/html" } });
          }
        } catch {}
      }

      return new Response("ok", { status: 200 });
    },
    websocket: {
      open(ws) {
        const id = randomUUID();
        const accountId = (`user_${id}`) as AccountId;
        const username = accountId;
        const session: Session = { id, ws, accountId, username };
        sessions.set(id, session);

        // Seed a nominal balance so users can win payouts later (maker already funded)
        // Not debiting on fills for iron condor currently; balances change on payouts.
        // Send welcome with supported timeframes
        const balance = app.balanceService.getBalance(accountId, Asset.USD);
        const welcome: EngineWelcome = {
          type: "welcome",
          payload: { userId: accountId, username, balance, timeframes: ENGINE_TIMEFRAMES },
        };
        ws.send(JSON.stringify(welcome));
      },
      async message(ws, raw) {
        const session = [...sessions.values()].find(s => s.ws === ws);
        if (!session) return;

        let msg: IncomingMessage;
        try {
          msg = JSON.parse(raw.toString());
        } catch (err) {
          ws.send(JSON.stringify({ type: "error", payload: { message: "Malformed message" } } satisfies EngineError));
          return;
        }

        switch (msg.type) {
          case "hello": {
            if (msg.payload?.username) {
              session.username = msg.payload.username;
            }
            const balance = app.balanceService.getBalance(session.accountId, Asset.USD);
            send(session, { type: "welcome", payload: { userId: session.accountId, username: session.username, balance, timeframes: ENGINE_TIMEFRAMES } });
            break;
          }
          case "subscribe": {
            const tf = msg.payload?.timeframe;
            if (!isTimeframe(tf)) {
              send(session, { type: "ack", payload: { command: "subscribe", ok: false, error: "Invalid timeframe" } });
              break;
            }
            session.timeframe = tf;
            const payload = buildSnapshotPayload(tf);
            send(session, { type: "snapshot", payload });
            send(session, { type: "ack", payload: { command: "subscribe", ok: true } });
            break;
          }
          case "place_trade": {
            const { contractId, amount } = msg.payload;
            const loc = findOrderLocation(contractId as OrderId);
            if (!loc) {
              send(session, { type: "ack", payload: { command: "place_trade", ok: false, error: "Unknown contract" } });
              break;
            }
            const { orderbookId, productTypeId } = loc;
            try {
              const report = await app.dispatchCommand({
                type: ClearingHouseCommandType.FillOrder,
                accountId: session.accountId,
                orderbookId,
                productTypeId,
                orderId: contractId as OrderId,
                size: Math.max(0.0001, amount),
              } as any);

              const balance = app.balanceService.getBalance(session.accountId, Asset.USD);
              const priceAtFill = (report as any)?.trade?.fillPrice ?? 0;
              const ts = Date.now();
              const confirmed: EngineTradeConfirmed = {
                type: "trade_confirmed",
                payload: { contractId, amount, tradeId: `pos_${session.accountId}_${contractId}`, balance, priceAtFill, timestamp: ts },
              };
              send(session, confirmed);
            } catch (err: any) {
              send(session, { type: "ack", payload: { command: "place_trade", ok: false, error: err?.message ?? "Trade failed" } });
            }
            break;
          }
          case "pong": {
            // no-op
            break;
          }
          case "disconnect": {
            ws.close();
            break;
          }
          default: {
            send(session, { type: "error", payload: { message: `Unknown command: ${(msg as any)?.type}` } });
          }
        }
      },
      close(ws) {
        for (const [id, s] of sessions.entries()) {
          if (s.ws === ws) {
            sessions.delete(id);
            break;
          }
        }
      },
    },
  });

  // Heartbeat
  setInterval(() => {
    broadcastAll({ type: "heartbeat", payload: { serverTime: Date.now() } });
  }, 15_000);

  // Periodic contract broadcast per timeframe to keep clients fresh
  setInterval(() => {
    const now = Date.now();
    for (const tf of ENGINE_TIMEFRAMES) {
      const contracts = buildContractsSnapshot(app, tf);
      broadcastAll({ type: "contract_update", payload: { timeframe: tf, contracts } });
    }
  }, 2_000);

  console.log(`Engine WebSocket server listening at ${server.url} (ws path /ws)`);
}

void main().catch((err) => {
  console.error("engine server failed", err);
  process.exitCode = 1;
});
