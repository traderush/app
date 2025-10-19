# TradeRush Clearing House Architecture

**Status:** Living Draft  
**Last updated:** 2025-05-15

---

## Overview
The clearing house runs a single-threaded dispatcher (`ClearingHouseApp`) that manages product registration, ephemeral orderbooks, balance updates, and command/event distribution. Orders are time-gated quotes posted by whitelisted market makers. Users fill those orders while the oracle feeds price ticks. Each tick drives verification and, when hits occur, settlement flows through the balance service. The system is intentionally modular: product logic (pricing, validation, payouts) is injected via `ProductRuntime`s while shared infrastructure (orderbook graph, ledger, events) remains product-agnostic.

---

## Table of Contents
1. [Components](#components)
2. [Data Models](#data-models)
3. [Commands & Permissions](#commands--permissions)
4. [Lifecycle](#lifecycle)
5. [Example Product: Iron Condor](#example-product-iron-condor)
6. [Invariants & Constraints](#invariants--constraints)
7. [Events](#events)
8. [Future Work](#future-work)

---

## Components

### ClearingHouseApp (`src/app/clearing-house-app.ts`)
- Owns the in-memory balance service, orderbook store, event bus, and product registry.
- Exposes `dispatchCommand(command)`; commands are processed synchronously and events buffered until the end of each dispatch.
- Maintains the authoritative clock (`now`) and price map used by orderbooks. `handlePriceAndTimeUpdate(symbol, price, ts)` fans updates to every orderbook whose `config.symbol` matches the feed.
- Emits domain events (`order_placed`, `order_rejected`, `order_filled`, `payout_settled`) once business logic completes.

### Product Runtime (`src/core/products/types.ts`)
Each product supplies a runtime describing how orders should be ranked, filled, verified, and settled.
```ts
interface ProductRuntime<TOrderData, TPositionData> {
  comparator(aOrder, bOrder) -> number
  getOrderPrice(order) -> number
  updatePosition(order, existingPosition?, size, now, price, takerId)
    -> { position, locks[] }
  verifyHit(order, position, price, now, triggerWindow?) -> boolean
  payout(order, position, priceAtHit) -> BalanceChanges
}
```
- Comparator sorts orders inside a price bucket.
- `updatePosition` can roll up multiple fills into a single logical position and return extra collateral locks.
- `verifyHit` drives payout eligibility on price/time updates.

### EphemeralOrderbook (`src/core/ephemeral-orderbook.ts`)
- Stores orders in a doubly-linked set of `TimeColumnNode`s keyed by `TimeWindow.start`. Each column keeps `PriceBucket`s keyed by `Math.floor(price / priceStep) * priceStep`.
- Primary operations:
  - `placeOrder(order)` -> stores the order, enforcing bounds from `config.placeOrdersBounds`.
  - `fillOrder(orderId, size, takerId)` -> reuses a deterministic position id (`pos_${takerId}_${orderId}`), updates remaining size, records pending positions, and applies balance locks returned by the product runtime.
  - `updatePriceAndTime(price, now)` -> advances/drops expired columns, scans the active price bucket, runs `verifyHit`, and returns `{ settlements, verificationHits }` once maker balances cover the required debits.
  - `attachPendingPosition` / `markOrderInactive` / `handleMakerInsolvency` keep bookkeeping in sync with fills and failed settlements.
- Maintains secondary indexes (`orderIndex`, `columnIndex`) for O(1) lookups and a `cancelOnlyOrders` set for orders exhausted or disqualified after fills.
- Delegates all balance mutations to the injected `BalanceService` while returning balance snapshots for event payloads.

### Balance Service (`src/services/balance-service.ts`)
- In-memory ledger with per-account balances and locked amounts.
- `applyChanges()` persists debits, credits, locks, and unlocks as an atomic record. Both `ClearingHouseApp` and `EphemeralOrderbook` call into it.
- `InMemoryBalanceService` is the current implementation; interface supports future persistence backends.

### Oracle Service (`src/services/oracle-service.ts`)
- Toy driver that periodically calls `sendPriceUpdate(asset, price, ts)`.
- The clearing house acts as the clock: there is no standalone `ClockModule`. Price updates are the only trigger for advancing time and processing verification.

### Event System (`src/events/*`)
- `EventBus` buffers events for listener callbacks and also pushes them into `EventStream` instances so external consumers can `for await` them.
- Events are emitted after the command pipeline finishes (success or failure) to keep external projections in sync with ledger state.

### Actors
- **Admins** register products, create orderbooks, whitelist or revoke makers, and adjust balances directly via credit/debit commands.
- **Market Makers** submit signed `placeOrder` commands (update/cancel pipelines are stubbed for future work).
- **Users** call `fillOrder` to trade against maker liquidity.

---

## Data Models

> Types mirror the in-memory TypeScript structures; persistence/serialization is implementation-defined.

### Order (`src/core/orders.ts`)
| Field | Type | Notes |
|---|---|---|
| id | `OrderId` | Required; supplied by caller. |
| makerId | `AccountId` | Must be whitelisted. |
| data | `TOrderData` | Product-specific payload. |
| sizeTotal | `number` | Maker's advertised size. |
| sizeRemaining | `number` | Decrements on fills. |
| timePlaced | `Timestamp` | Recorded when command runs. |
| pendingPositions | `PositionRef[]` | Holds unresolved fills. |
| triggerWindow | `TimeWindow` | Governs both fill eligibility and verification window. |

`PositionRef = { positionId: PositionId; triggerWindow?: TimeWindow }`

### Position (`src/core/positions.ts`)
| Field | Type | Notes |
|---|---|---|
| id | `PositionId` | Deterministic per user/order pair. |
| size | `Decimal` | Aggregate fill size. |
| orderId | `OrderId` | Parent order. |
| userId | `AccountId` | Filler. |
| collateralLocked | `Decimal` | Set by product runtime. |
| timeCreated | `Timestamp` | First fill time. |
| data | `TPositionData` | Product-defined metadata. |

### OrderbookConfig (`src/core/ephemeral-orderbook.ts`)
| Field | Type | Notes |
|---|---|---|
| id | `OrderbookId` | Assigned on creation. |
| productTypeId | `ProductTypeId` | Runtime lookup key. |
| timeframe | `Duration` | Grid resolution (ms). |
| priceStep | `number` | Tick size for buckets. |
| placeOrdersBounds | `OrdersBounds` | Buffer/limit for new orders. |
| updateOrdersBounds | `OrdersBounds` | Reserved for future update API. |
| cancelOrdersBounds | `OrdersBounds` | Reserved for future cancel API. |
| symbol | `string` | Asset key for oracle routing. |

`OrdersBounds = { pricePlusBound, priceMinusBound, timeBuffer, timeLimit }`

---

## Commands & Permissions

| Role | Command | Contract |
|---|---|---|
| Admin | `registerProduct(productRuntime)` | Adds runtime, creates empty orderbook map. |
| Admin | `createOrderbook(config)` | Instantiates `EphemeralOrderbook`, returns new id. |
| Admin | `whitelistMaker(makerId)` / `revokeMaker(makerId)` | Manage maker registry. |
| Admin | `creditAccount(accountId, asset, amount, metadata?)` | Applies ledger credit (amount must be > 0). |
| Admin | `debitAccount(accountId, asset, amount, metadata?)` | Debits ledger; rejects if balance insufficient. |
| Maker | `placeOrder({ orderbookId, productTypeId, order })` | Validates bounds, stores order, emits `order_placed`. |
| User | `fillOrder({ orderbookId, productTypeId, orderId, size })` | Confirms window & remaining size, creates/updates position, emits `order_filled`. |
| System | `handlePriceAndTimeUpdate(symbol, price, ts)` | Advances all matching orderbooks, emits `payout_settled` for successful settlements. |

Commands run synchronously; any thrown error aborts state changes after emitting `order_rejected` (for maker placement failures) or surfacing the exception to the caller.

---

## Lifecycle

### Bootstrap (pseudo)
```pseudo
procedure bootstrapProduct(runtime):
    dispatch(registerProduct(runtime))
    orderbookId <- dispatch(createOrderbook({ runtime.id, timeframe, priceStep, bounds, symbol }))
    for maker in initialWhitelist:
        dispatch(whitelistMaker(maker))
    dispatch(creditAccount(treasury, USD, seedCapital))
```

### Place Order (pseudo)
```pseudo
procedure placeOrder(cmd):
    assert maker is whitelisted
    order <- cmd.order
    orderPrice <- runtime.getOrderPrice(order)
    assert withinBounds(order.triggerWindow.start, now + placeBounds.timeBuffer, now + placeBounds.timeLimit)
    assert withinBounds(orderPrice, lastPrice - placeBounds.priceMinusBound, lastPrice + placeBounds.pricePlusBound)
    orderId <- orderbook.placeOrder(order)
    emit order_placed(orderId, sizeRemaining, triggerWindow, priceBucket)
```

### Fill Order (pseudo)
```pseudo
procedure fillOrder(cmd):
    order <- orderbook.requireOrder(cmd.orderId)
    assert now in order.triggerWindow
    size <- min(cmd.size, order.sizeRemaining)
    { position, locks } <- runtime.updatePosition(order, positions[user, order], size, now, lastPrice, user)
    order.sizeRemaining -= (position.size - previousSize)
    orderbook.attachPendingPosition(order.id, { positionId: position.id })
    applyBalanceChanges({ credits: [], debits: [], locks }, metadata("order_fill"))
    emit order_filled(order.id, position.id, filledSize, lastPrice, positionSnapshots)
```

### Price Update & Settlement (pseudo)
```pseudo
procedure handlePriceUpdate(symbol, price, ts):
    now <- ts
    for orderbook in orderbooksFor(symbol):
        result <- orderbook.updatePriceAndTime(price, now)
        emit price_update(orderbook.id, symbol, price)
        emit clock_tick(orderbook.id, now, "price_update")
        for hit in result.verificationHits:
            emit verification_hit(hit.orderId, hit.positionId, price, now, hit.userId)
        for settlement in result.settlements:
            emit payout_settled(settlement.orderId, settlement.positionId, settlement.totalCredit, settlement.balances)
```
- During `updatePriceAndTime` the orderbook drops expired columns, keeps active orders in their buckets, runs product `verifyHit`, ensures makers can cover debits via `balanceService.getBalance`, unlocks user collateral if the maker defaults, and removes exhausted orders.

---

## Example Product: Iron Condor

### Runtime Sketch
```ts
export const IronCondorProduct: ProductRuntime<IronCondorOrderData, {}> = {
  comparator: (lhs, rhs) => rhs.data.multiplier - lhs.data.multiplier,
  getOrderPrice: order => order.data.startRange,
  updatePosition: (order, existing, size, now, _price, takerId) => {
    const nextSize = Math.min(size, order.sizeRemaining) + (existing?.size ?? 0)
    return {
      position: existing ? { ...existing, size: nextSize } : {
        id: `pos_${takerId}_${order.id}`,
        size: Math.min(size, order.sizeRemaining),
        orderId: order.id,
        userId: takerId,
        collateralLocked: 0,
        timeCreated: now,
        data: {}
      },
      locks: []
    }
  },
  verifyHit: (order, _position, price) => price >= order.data.startRange && price < order.data.endRange,
  payout: (order, position) => {
    const amount = order.data.multiplier * position.size
    return {
      credits: [{ accountId: position.userId, Asset: USD, amount }],
      debits: [{ accountId: order.makerId, Asset: USD, amount }],
      unlocks: [{ accountId: position.userId, Asset: USD, amount: position.size }]
    }
  }
}
```

### Order Payload
| Field | Type | Notes |
|---|---|---|
| multiplier | `number` | Payout per unit size. |
| startRange | `number` | Inclusive lower trigger bound. |
| endRange | `number` | Exclusive upper trigger bound. |

### Position Payload
- No additional data; positions are size-only accumulators.

---

## Invariants & Constraints
- `order.triggerWindow.end - order.triggerWindow.start` must be positive and divisible by the orderbook `timeframe`.
- Order placement enforces `placeOrdersBounds` on both time (buffer + horizon) and price (+/- bounds relative to last price observed for the symbol).
- `fillOrder` rejects fills that occur outside the trigger window or exceed remaining size.
- Settlement is skipped if the maker cannot cover required debits; affected orders are removed and any user locks are released.
- Position ids are deterministic (`pos_{userId}_{orderId}`) so repeated fills collapse into a single ledger entry.
- Cancel/update pathways exist in config but are not yet exposed-orders become cancel-only automatically when size is exhausted or insolvency is detected.

---

## Events
Current emissions come from `ClearingHouseApp`:

| Event | Payload Highlights |
|---|---|
| `price_update` | `symbol`, `price`, optional `oracleSeq`. |
| `clock_tick` | `now`, `reason`. |
| `order_placed` | `orderId`, `makerId`, `sizeTotal`, `sizeRemaining`, `triggerWindow`, `fillWindow (== triggerWindow)`, `price`, `priceBucket`. |
| `order_rejected` | `makerId`, `rejectionReason`, `violatedConstraint`, optional `orderId`. |
| `order_filled` | `orderId`, `positionId`, `fillSize`, `fillPrice`, `userId`, `sizeRemaining`, optional balance snapshots. |
| `verification_hit` | `orderId`, `positionId`, `price`, `triggerTs`, `userId`. |
| `payout_settled` | `orderId`, `positionId`, `totalCredit`, `makerId`, `userId`, optional balances. |

The event envelope includes `eventId`, `orderbookId`, `ts`, `clockSeq`, and optional `sourceTs` / `version` fields. The bus type system also reserves `margin_violation`; it remains unused until the margin pipeline is implemented.

---

## Future Work
- Expose maker order updates/cancellations using the pre-plumbed `updateOrdersBounds` and `cancelOrdersBounds` settings once those commands ship.
- Reintroduce a vaulted market-maker program after the operational model is finalized.
- Integrate a true margin service instead of relying solely on post-hoc balance checks.
- Persist the ledger and orderbook state for durability and recovery.
- Support multi-leg products (e.g., spreads) by extending `ProductRuntime` data contracts.
