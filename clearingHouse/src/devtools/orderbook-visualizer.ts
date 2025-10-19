import { createClearingHouseApp, type ClearingHouseApp } from "../app/clearing-house-app";
import type { ClearingHouseEvent } from "../events/types";
import { OracleService } from "../services/oracle-service";
import { createMarketMaker } from "../market-maker";
import type {
  AccountId,
  Asset,
  OrderId,
  OrderbookId,
  ProductTypeId,
  Timestamp,
} from "../domain/primitives";
import type { Order } from "../core/orders";
import { bootstrapDefaultMarket } from "../setup/default-market";

interface OrderCellSnapshot {
  price: number;
  orderId: OrderId | undefined;
  makerId: AccountId;
  sizeRemaining: number;
  sizeTotal: number;
  pendingPositions: number;
  triggerStart: Timestamp;
  triggerEnd: Timestamp;
  multiplier: number | null;
}

interface TimeColumnSnapshot {
  windowStart: Timestamp;
  windowEnd: Timestamp;
  buckets: OrderCellSnapshot[];
}

interface OrderbookSnapshot {
  orderbookId: OrderbookId;
  productTypeId: ProductTypeId;
  symbol: Asset;
  timeframe: number;
  priceStep: number;
  currentPrice: number | null;
  priceUpdatedAt: Timestamp | null;
  columns: TimeColumnSnapshot[];
}

interface SsePayload {
  kind: "snapshot" | "event" | "heartbeat";
  snapshots?: OrderbookSnapshot[];
  event?: ClearingHouseEvent;
  ts: Timestamp;
}

type PriceCache = Map<Asset, { price: number; ts: Timestamp }>;

type TimeColumnNode = {
  column: {
    windowStart: Timestamp;
    windowEnd: Timestamp;
    priceBuckets: Map<number, { price: number; orders: Order<Record<string, unknown>>[] }>;
  };
  next: TimeColumnNode | null;
};

type SseClient = {
  id: number;
  send: (payload: SsePayload) => void;
  close: () => void;
};

const SNAPSHOT_INTERVAL_MS = 2_000;
const encoder = new TextEncoder();

function buildOrderbookSnapshots(app: ClearingHouseApp, prices: PriceCache): OrderbookSnapshot[] {
  const snapshots: OrderbookSnapshot[] = [];

  for (const [productTypeId, orderbooks] of app.orderbookStore.entries()) {
    for (const [orderbookId, orderbook] of orderbooks.entries()) {
      const columns: TimeColumnSnapshot[] = [];
      const priceInfo = prices.get(orderbook.config.symbol);
      const rawPrice = priceInfo?.price ?? orderbook.getCurrentPrice();
      const currentPrice = Number.isFinite(rawPrice) ? rawPrice : null;
      let node = orderbook.head as TimeColumnNode | null;

      while (node) {
        const bucketSnapshots: OrderCellSnapshot[] = [];
        const priceBuckets = [...node.column.priceBuckets.values()].sort((a, b) => b.price - a.price);

        for (const priceBucket of priceBuckets) {
          const topOrder = priceBucket.orders[0] as Order<Record<string, unknown>> | undefined;
          if (!topOrder) {
            continue;
          }

          const multiplierValue = (topOrder.data as { multiplier?: number }).multiplier;
          const multiplier = typeof multiplierValue === "number" ? multiplierValue : null;

          bucketSnapshots.push({
            price: priceBucket.price,
            orderId: topOrder.id,
            makerId: topOrder.makerId,
            sizeRemaining: topOrder.sizeRemaining,
            sizeTotal: topOrder.sizeTotal,
            pendingPositions: topOrder.pendingPositions.length,
            triggerStart: topOrder.triggerWindow.start,
            triggerEnd: topOrder.triggerWindow.end,
            multiplier,
          });
        }

        columns.push({
          windowStart: node.column.windowStart,
          windowEnd: node.column.windowEnd,
          buckets: bucketSnapshots,
        });

        node = node.next;
      }

      snapshots.push({
        orderbookId,
        productTypeId,
        symbol: orderbook.config.symbol,
        timeframe: orderbook.config.timeframe,
        priceStep: orderbook.config.priceStep,
        currentPrice,
        priceUpdatedAt: priceInfo?.ts ?? null,
        columns,
      });
    }
  }

  return snapshots;
}

async function startEventRelay(
  app: ClearingHouseApp,
  broadcast: (payload: SsePayload) => void,
  prices: PriceCache,
): Promise<void> {
  const stream = app.createEventStream();
  for await (const event of stream) {
    if (event.name === "price_update") {
      const symbol = event.payload.symbol as Asset;
      prices.set(symbol, { price: Number(event.payload.price), ts: event.ts });
    }

    broadcast({
      kind: "event",
      event,
      snapshots: buildOrderbookSnapshots(app, prices),
      ts: Date.now() as Timestamp,
    });
  }
}

async function main(): Promise<void> {
  const app = createClearingHouseApp();
  const marketMaker = createMarketMaker(app);
  const oracle = new OracleService(async (symbol, price, time) => {
    app.handlePriceAndTimeUpdate(symbol, price, time);
    await marketMaker.handleMarketUpdate(symbol, price, time);
  });

  const referenceTime = Date.now() as Timestamp;
  await bootstrapDefaultMarket(app, marketMaker, referenceTime);
  await app.start();
  await oracle.start();

  const clients = new Map<number, SseClient>();
  let nextClientId = 1;
  const priceCache: PriceCache = new Map();
  for (const [asset, price] of app.getPriceSnapshot()) {
    priceCache.set(asset, { price, ts: referenceTime });
  }

  const broadcast = (payload: SsePayload): void => {
    if (clients.size === 0) {
      return;
    }
    for (const [id, client] of [...clients.entries()]) {
      try {
        client.send(payload);
      } catch (error) {
        clients.delete(id);
        try {
          client.close();
        } catch {
          // ignore cleanup errors
        }
      }
    }
  };

  void startEventRelay(app, broadcast, priceCache);

  setInterval(() => {
    if (clients.size === 0) {
      return;
    }
    broadcast({
      kind: "snapshot",
      snapshots: buildOrderbookSnapshots(app, priceCache),
      ts: Date.now() as Timestamp,
    });
  }, SNAPSHOT_INTERVAL_MS);

  const fetchHandler = async (req: Request): Promise<Response> => {
    const url = new URL(req.url);

    if (url.pathname === "/events") {
      const clientId = nextClientId++;
      let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
      let closed = false;

      const cleanup = () => {
        if (closed) {
          return;
        }
        closed = true;
        clients.delete(clientId);
        if (controllerRef) {
          try {
            controllerRef.close();
          } catch {
            // ignore close errors
          }
        }
        console.log(`SSE client ${clientId} disconnected (clients=${clients.size})`);
      };

      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controllerRef = controller;

          const send = (payload: SsePayload) => {
            if (closed) {
              return;
            }
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            } catch (error) {
              cleanup();
              throw error;
            }
          };

          clients.set(clientId, {
            id: clientId,
            send,
            close: cleanup,
          });

          console.log(`SSE client ${clientId} connected (clients=${clients.size})`);

          send({ kind: "snapshot", snapshots: buildOrderbookSnapshots(app, priceCache), ts: Date.now() as Timestamp });
        },
        cancel() {
          cleanup();
        },
      });

      req.signal.addEventListener("abort", cleanup, { once: true });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    if (url.pathname === "/snapshot") {
      const payload: SsePayload = {
        kind: "snapshot",
        snapshots: buildOrderbookSnapshots(app, priceCache),
        ts: Date.now() as Timestamp,
      };
      return new Response(JSON.stringify(payload), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/" || url.pathname === "/index.html" || url.pathname === "/visualizer") {
      const file = Bun.file("public/orderbook-visualizer.html");
      return new Response(await file.bytes(), {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response("Not Found", { status: 404 });
  };

  const fallbackPorts = [4100, 4101, 4102, 4103, 4104];
  const requestedPort = Number(process.env.VISUALIZER_PORT ?? "");
  const portsToTry = Number.isFinite(requestedPort) && requestedPort > 0
    ? [requestedPort, ...fallbackPorts.filter((port) => port !== requestedPort)]
    : fallbackPorts;

  let server: ReturnType<typeof Bun.serve> | undefined;
  let lastError: unknown;

  for (const port of portsToTry) {
    try {
      server = Bun.serve({ port, fetch: fetchHandler });
      if (server.port !== port) {
        console.warn(`Server bound to port ${server.port} (requested ${port})`);
      }
      break;
    } catch (error) {
      if (isAddressInUse(error)) {
        lastError = error;
        console.warn(`Port ${port} unavailable, trying next option…`);
        continue;
      }
      throw error;
    }
  }

  if (!server) {
    throw lastError ?? new Error("Unable to start visualizer server");
  }

  console.log(`Orderbook visualizer available at ${server.url}`);
}

void main().catch((error) => {
  console.error("Failed to start orderbook visualizer", error);
  process.exitCode = 1;
});

function isAddressInUse(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === "EADDRINUSE",
  );
}
