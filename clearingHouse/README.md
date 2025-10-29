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

## Deploying on Railway

Railway automatically provisions HTTPS/WSS endpoints, so the engine can run without additional TLS setup.

1. Create a new Railway service and point it at the `clearingHouse/` directory.
2. Set the build command to `bun install` (or use Nixpacks' Bun detection).
3. Set the start command to `bun run start` (this uses the Bun server entrypoint with Railway's `PORT` variable).
4. (Optional) Define `ENGINE_HOST=0.0.0.0` if you want to override Bun’s default listener.
5. In your frontend deployment, set `NEXT_PUBLIC_ENGINE_WS` to the public WSS URL (e.g. `wss://<service-subdomain>.up.railway.app/ws`).

The server automatically picks up Railway’s `PORT` environment variable and serves both the WebSocket endpoint (`/ws`) and the REST explorer endpoint (`/api/explorer/orderbooks`) over HTTPS/WSS.

### Local TLS / WSS

For local testing with secure WebSockets you can provide TLS material via environment variables:

- Inline secrets: set `ENGINE_TLS_CERT` and `ENGINE_TLS_KEY` (and optionally `ENGINE_TLS_CA`, `ENGINE_TLS_PASSPHRASE`).
- File pointers: set `ENGINE_TLS_CERT_FILE` and `ENGINE_TLS_KEY_FILE` to PEM files on disk.

An example workflow:

```bash
mkdir -p clearingHouse/certs
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout clearingHouse/certs/dev-key.pem \
  -out clearingHouse/certs/dev-cert.pem \
  -subj "/CN=localhost" -days 365

# Launch with TLS enabled (serves wss://localhost:8443/ws)
cd clearingHouse
PORT=8443 bun run engine-wss
```

When TLS variables are present the server automatically upgrades to HTTPS/WSS; otherwise it continues serving plain WS.
