# TradeRush Clearing House (Bun Runtime)

This Bun.js workspace implements the clearing house runtime described in `architecture.md`. It wires together in-memory services for order management, margin, balances, oracle ticks, and settlement, along with product modules for Iron Condor and Vertical Spread derivatives. The entrypoint (`src/index.ts`) boots a demo scenario that exercises the full maker → user → verification → settlement flow.

## Getting Started

Install Bun dependencies (only type definitions are required):

```bash
bun install
```

Run the demo loop to observe emitted events:

```bash
bun run src/index.ts
```

Run the test suite (uses `bun:test`) to validate the Iron Condor lifecycle end-to-end:

```bash
bun test
```

## Project Structure

- `src/domain` – shared primitives and entity types (`Order`, `Position`, `OrderbookConfig`, etc.).
- `src/orderbook` – ephemeral grid implementation with time/price buckets.
- `src/services` – balance ledger, margin engine, oracle cache, settlement queue, orderbook store, and clock.
- `src/products` – product runtime definitions (Iron Condor, Vertical Spread) with verification and payout logic.
- `src/app` – orchestration layer (`ClearingHouseApp`), admin utilities, contracts, and demo bootstrap.
- `tests/` – minimal Bun test covering the Iron Condor payout lifecycle.

Refer to `architecture.md` for the detailed specification that informed these modules.
