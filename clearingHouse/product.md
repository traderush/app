# TradeRush Clearing House – Role-Oriented Product Reference

## Scope
This document explains how admins, market makers, and traders interact with the clearing house through read (inspection) and write (state-changing) APIs. It mirrors the architecture doc while keeping the focus on observable behavior instead of service internals.

## Core Concepts
- **Tick** — a discrete processing cycle that ingests the latest oracle price, evaluates pending positions, and queues settlements. The platform may emit multiple ticks within a single timeframe; only ticks that coincide with a Δt boundary advance columns.
- **Timeframe (Δt)** — the scheduled duration assigned to each orderbook column. Δt defines when columns should roll forward, independent of how many ticks occur between those boundaries.
- **Column** — a slot inside the ephemeral orderbook representing one Δt slice into the future. Columns contain price buckets that accept orders scheduled for their boundary tick.
- **Price Window** — the inclusive range of underlying prices `[min_price, max_price]` tracked by new columns. Makers can only target price buckets inside this window; admins may widen or tighten it as markets move.
- **Fill Window** — the time interval `[start_ts, end_ts)` during which a trader is allowed to fill the order. It must sit within the orderbook’s placement buffers and time horizon.
- **Trigger Window** — the monitoring interval during which the platform evaluates whether a filled position should pay out. Verification runs on every tick (scheduled or ad hoc) until the trigger window closes.
- **Pending Position** — a trader fill that is waiting for its trigger window to resolve. Pending positions stay attached to the originating order so verification and settlement can run in place.
- **Placement Buffers** — guard intervals expressed in tick counts that delay how soon a new or updated order can enter the active window, giving risk services time to react even when multiple ticks occur before the next column roll.
- **Margin State** — collateral reservations for makers and traders. Margin checks may scale fills down or push orders into cancel-only mode if capital is insufficient.
- **Vault** — an optional pooled maker program. Admins configure vault parameters, makers receive delegated collateral, and traders (as vault depositors) hold redeemable shares tied to net asset value.
- **Notification Stream** — a role-filtered feed that delivers real-time descriptions of order placements, amendments, cancellations, margin adjustments, verification outcomes, and settlements so clients can mirror platform state.

## System Lifecycle Overview
1. **Configuration** — Admins register product types, create orderbooks, and whitelist makers. Each orderbook exposes its timeframe, buffers, and initial price window through read APIs.
2. **Quoting** — Whitelisted market makers submit orders that specify product data, size, collateral, price bucket, and fill window. The clearing house reserves maker collateral and slots the order into future columns.
3. **Filling** — Traders request fills during an order’s fill window. Margin checks may accept the full request, scale it down, or reject it. Approved fills create pending positions tied to the originating order.
4. **Tick Processing** — On each tick (scheduled or ad hoc) the platform evaluates pending positions against the latest oracle price and determines whether positions are hit or expire. When the tick coincides with a Δt boundary, columns roll forward, the active price window is refreshed, and placement buffers update accordingly.
5. **Settlement** — Approved payouts credit and debit balances, release collateral as required, and mark positions settled. Cancel-only logic cleans up orders that age out or fail risk constraints.
6. **Vault Cycle (optional)** — Vault controllers delegate capital to makers, track deployed exposure, accrue fees, and honor withdrawal requests subject to margin buffers and recall scheduling.

## Admin Role
### Read Interfaces
- Query product-type definitions, including required order payload schema, payout logic description, and allowed verification rules.
- Inspect orderbook specifications: timeframe, price window bounds, placement/update buffers, price step, and column horizon.
- Retrieve operational health snapshots summarizing active columns, pending positions, and aggregate collateral utilization for each maker and orderbook.
- Subscribe to the notification stream filtered for governance events to audit placements, modifications, fills, margin escalations, and settlements in chronological order.
- Access vault registry data covering configuration, live net asset value, fee accruals, deployed versus idle capital, and outstanding withdrawal requests.

### Write Interfaces
- Initialize new product types by submitting configuration payloads that define order schema, verification logic, and payout calculations.
- Create or modify orderbooks (price window, timeframe, buffers, price step) to reflect market conditions. Price window updates apply to future columns while existing pending positions continue under their original constraints.
- Manage maker access: whitelist or remove maker accounts, pause specific orderbooks, or globally halt quoting during incidents.
- Adjust systemic risk parameters such as placement buffers or margin guards when volatility or liquidity conditions change.
- Operate vault programs by creating vaults, amending fee schedules or risk caps, delegating collateral to makers, and pausing or resuming vault activity.

## Market Maker Role
### Read Interfaces
- Pull orderbook snapshots that expose the time × price grid, valid placement horizon, and current price window bounds to plan quotes.
- Inspect their own orders, including remaining size, fill window, trigger window, collateral reservations, and any cancel-only flags.
- Request margin and collateral status summaries showing available balance, reserved capital per order, and buffer countdowns before placement or update restrictions lift.
- Consume maker-scoped notifications for order acknowledgments, margin adjustments, verification results, and settlements to synchronize internal risk systems.
- (If vault-backed) Query delegated capital balances, outstanding recall obligations, and fee accrual metrics tied to their maker account.

### Write Interfaces
- Place new orders that conform to the published timeframe, price window, and buffer requirements. Orders must include product-specific data (e.g., strike ranges, expiries) and collateral commitments.
- Update existing orders prior to the update buffer deadline to adjust price bucket, size, or timing while staying within allowed bounds.
- Cancel orders at any time before associated positions settle, either proactively or in response to cancel-only notifications, to release reserved collateral.
- Manage exposure by redistributing quotes across columns or orderbooks, respecting per-orderbook caps and vault delegation limits when applicable.
- Report voluntary pauses or resumptions of quoting to align with vault controllers or admin directives.

## Trader Role
### Read Interfaces
- Request orderbook depth snapshots that list active orders grouped by price bucket, fill window, and available size so they can decide which quotes to target.
- Fetch personal position ledgers detailing fill time, size, collateral locked, trigger window, and settlement outcome for each position.
- Receive trader-focused notifications describing fill acknowledgments, verification decisions, collateral releases, and settlement payouts.
- Retrieve pricing context (latest oracle price, tick timestamp, time until next tick) to understand how close pending positions are to potential triggers.
- (When participating in vaults) Read vault account state: share holdings, latest share price, outstanding withdrawal requests, and estimated redemption timelines.

### Write Interfaces
- Submit fill requests specifying the target order and desired size during the order’s fill window. The platform returns the accepted size after margin checks and locks the required collateral.
- Manage vault participation by submitting deposits, scheduling withdrawal requests, and confirming redemptions once funds are ready.
- Initiate position-level actions permitted by the product spec (e.g., requesting early close if enabled) by calling the corresponding API endpoints.

## Vault Interaction Summary
- **Admins** configure vault parameters (supported orderbooks, leverage caps, fee schedules) and may pause deployments or recalls through management APIs.
- **Market Makers** receive delegated collateral allocations, view recall schedules, and acknowledge receipt or return of funds through dedicated endpoints.
- **Traders** act as vault depositors: they can deposit settlement currency in exchange for shares, request withdrawals that enter a funding queue, and redeem once collateral returns from makers.
- Vault state updates surface through the notification stream, including capital deployment, fee accruals, and withdrawal progress, without exposing underlying service-to-service mechanics.

## Iron Condor Example
1. **Admin Setup**
   - Initializes an iron condor product type defining order payload fields: `start_range`, `end_range`, `time_start`, `time_end`, `multiplier`, and collateral policy.
   - Creates an orderbook with Δt = 1 minute (columns roll every minute even if extra ticks fire in between), placement buffer = 2 ticks, update buffer = 1 tick, price step = 1 index point, and a price window of 4,000 to 4,200.
2. **Maker Quote**
   - Market maker requests a placement preview to confirm the price window still covers the desired range. The API responds with allowed price buckets and earliest admissible start time.
   - Maker posts an order:
     ```json
     {
       "product_type": "iron_condor",
       "orderbook_id": "ic-usdc-1m",
       "start_range": 4100,
       "end_range": 4150,
       "time_start": "2025-01-10T12:05:00Z",
       "time_end": "2025-01-10T12:15:00Z",
       "size": 10,
       "collateral_required": "1500",
       "multiplier": 100
     }
     ```
   - The platform reserves maker collateral, assigns the order to the column whose tick aligns with `time_start`, and confirms the accepted payload.
3. **Trader Fill**
   - Five minutes later, a trader calls the fill API with `size = 6`. Margin checks approve the full size, so a pending position is created with trigger window equal to the order’s range and time horizon.
   - The response includes a position identifier, accepted size, locked trader collateral (if required by the product), and the trigger window timeline.
4. **Tick Evaluation**
   - At each subsequent tick, the platform evaluates the oracle price. Multiple ticks can occur before the scheduled column boundary, so verification may fire several times without advancing the column. When the price enters `[4100, 4150)` during the trigger window, the position is marked as hit. If the price never enters the range before the trigger window closes, the position expires without payout and collateral unlocks.
5. **Settlement**
   - For a hit position, the payout equals `min(multiplier * size, maker collateral available at hit)` and is processed in the settlement phase. The maker’s remaining size declines from 10 to 4, leaving the residual order active until its fill window ends or the maker cancels it.
6. **Lifecycle Visibility**
   - Admins and makers observe the placement, fill, verification, and settlement through their notification filters. Traders monitor the same lifecycle against their position ledger and receive updates when collateral unlocks or payouts land.

All descriptions above intentionally avoid the internal mechanics of how services communicate, focusing instead on what each role can read or write through the product-facing surfaces.
