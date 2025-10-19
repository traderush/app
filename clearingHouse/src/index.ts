import { createClearingHouseApp } from "./app/clearing-house-app";
import type { ClearingHouseEvent } from "./events/types";
import { OracleService } from "./services/oracle-service";
import { createMarketMaker } from "./market-maker";
import { bootstrapDefaultMarket } from "./setup/default-market";
import { type Timestamp } from "./domain/primitives";

function logEvent(event: ClearingHouseEvent) {
  const { name, ts, clockSeq, payload } = event;
  console.log(`[event:${name}] ts=${new Date(ts).toISOString()} clockSeq=${clockSeq}`, payload);
}

const app = createClearingHouseApp();
app.eventBus.on("order_placed", logEvent);
app.eventBus.on("order_filled", logEvent);
app.eventBus.on("verification_hit", logEvent);
app.eventBus.on("payout_settled", logEvent);
app.eventBus.on("margin_violation", logEvent);

const marketMaker = createMarketMaker(app);

const oracle = new OracleService(async (symbol, price, time) => {
  app.handlePriceAndTimeUpdate(symbol, price, time);
  await marketMaker.handleMarketUpdate(symbol, price, time);
});

async function bootstrap(): Promise<void> {
  const referenceTime = Date.now() as Timestamp;
  await bootstrapDefaultMarket(app, marketMaker, referenceTime);
}

await bootstrap();
await app.start();
await oracle.start();

console.log("perpetual mode running – press Ctrl+C to exit");
