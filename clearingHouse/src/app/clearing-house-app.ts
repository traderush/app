import { randomUUID } from "crypto";
import {
  EphemeralOrderbook,
  OrderPlacementError,
  type FillReport,
  type OrderbookConfig,
  type OrderbookStore,
  type SettlementReport,
  type ExpirationReport,
  type VerificationReport,
} from "../core/ephemeral-orderbook";
import type { Order } from "../core/orders";
import type { ProductRuntime } from "../core/products/types";
import type {
  AccountId,
  Asset,
  EventId,
  OrderbookId,
  OrderId,
  ProductTypeId,
  Timestamp
} from "../domain/primitives";
import { EventBus } from "../events/event-bus";
import type { EventStream } from "../events/event-stream";
import type { ClearingHouseEvent } from "../events/types";
import type { BalanceChanges } from "../services/balance-service";
import { InMemoryBalanceService } from "../services/balance-service";


class OrderRejectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderRejectionError";
  }
}

export enum ClearingHouseCommandType {
  PlaceOrder = "placeOrder",
  FillOrder = "fillOrder",
  RegisterProduct = "registerProduct",
  CreateOrderbook = "createOrderbook",
  WhitelistMaker = "whitelistMaker",
  RevokeMaker = "revokeMaker",
  CreditAccount = "creditAccount",
  DebitAccount = "debitAccount",
}

export type PlaceOrderCommand = {
  type: ClearingHouseCommandType.PlaceOrder;
  accountId: AccountId;
  orderbookId: OrderbookId;
  productTypeId: ProductTypeId;
  order: Order;
};

export type FillOrderCommand = {
  type: ClearingHouseCommandType.FillOrder;
  accountId: AccountId;
  orderbookId: OrderbookId;
  productTypeId: ProductTypeId;
  orderId: OrderId;
  size: number;
};

export type RegisterProductCommand = {
  type: ClearingHouseCommandType.RegisterProduct;
  product: ProductRuntime<Record<string, unknown>, Record<string, unknown>>;
};

export type CreateOrderbookCommand = {
  type: ClearingHouseCommandType.CreateOrderbook;
  input: OrderbookConfig;
};

export type WhitelistMakerCommand = {
  type: ClearingHouseCommandType.WhitelistMaker;
  orderbookId: OrderbookId;
  makerId: AccountId;
};

export type RevokeMakerCommand = {
  type: ClearingHouseCommandType.RevokeMaker;
  makerId: AccountId;
};

export type CreditAccountCommand = {
  type: ClearingHouseCommandType.CreditAccount;
  accountId: AccountId;
  asset: Asset;
  amount: number;
  metadata?: Record<string, unknown>;
};

export type DebitAccountCommand = {
  type: ClearingHouseCommandType.DebitAccount;
  accountId: AccountId;
  asset: Asset;
  amount: number;
  metadata?: Record<string, unknown>;
};

export type ClearingHouseCommand =
  | PlaceOrderCommand
  | FillOrderCommand
  | RegisterProductCommand
  | CreateOrderbookCommand
  | WhitelistMakerCommand
  | RevokeMakerCommand
  | CreditAccountCommand
  | DebitAccountCommand;

export type ClearingHouseCommandResult =
  | OrderId
  | FillReport
  | OrderbookId
  | void;

export class ClearingHouseApp {
  public readonly eventBus = new EventBus();
  public readonly balanceService = new InMemoryBalanceService();
  public readonly orderbookStore: OrderbookStore = new Map();

  private readonly whitelistedMakers = new Set<AccountId>();
  private readonly products = new Map<ProductTypeId, ProductRuntime<Record<string, unknown>, Record<string, unknown>>>();

  private readonly prices = new Map<Asset, number>();
  private clockSeq = 0;
  private now = new Date().getTime() as Timestamp;

  async start(): Promise<this> {
    return this;
  }

  private processPlaceOrder(command: PlaceOrderCommand): OrderId {
    const { accountId, orderbookId, productTypeId, order } = command;
    const orderbook = this.orderbookStore.get(productTypeId)?.get(orderbookId);
    const runtimeOrder = order as Order<Record<string, unknown>>;

    if (!orderbook) {
      const rejection = new OrderRejectionError(`Orderbook ${orderbookId} not found`);
      this.publishOrderRejectedEvent(orderbookId, accountId, rejection.message, { reason: "orderbook_not_found" }, runtimeOrder.id);
      throw rejection;
    }

    const product = this.products.get(productTypeId);
    if (!product) {
      const rejection = new OrderRejectionError(`Product ${productTypeId} not registered`);
      this.publishOrderRejectedEvent(
        orderbookId,
        accountId,
        rejection.message,
        { reason: "product_not_registered", productTypeId },
        runtimeOrder.id,
      );
      throw rejection;
    }

    try {
      this.ensureMakerAuthorized(accountId);
    } catch (error) {
      const rejectionMessage = error instanceof OrderRejectionError ? error.message : "Maker is not authorized";
      this.publishOrderRejectedEvent(orderbookId, accountId, rejectionMessage, { reason: "maker_not_authorized" }, runtimeOrder.id);
      throw error;
    }

    const priceStep = orderbook.config.priceStep;
    if (priceStep <= 0) {
      const rejection = new OrderRejectionError(`Invalid price step ${priceStep} configured for orderbook ${orderbookId}`);
      this.publishOrderRejectedEvent(
        orderbookId,
        accountId,
        rejection.message,
        { reason: "invalid_price_step", priceStep },
        runtimeOrder.id,
      );
      throw rejection;
    }

    const orderPrice = product.getOrderPrice(runtimeOrder);
    const priceBucket = Math.floor(orderPrice / priceStep) * priceStep;

    try {
      const orderId = orderbook.placeOrder(runtimeOrder);
      const storedOrder = orderbook.getOrder(orderId) ?? runtimeOrder;
      this.publishOrderPlacedEvent(orderbookId, storedOrder, orderPrice, priceBucket);
      return orderId;
    } catch (error) {
      const placementError = error instanceof OrderPlacementError
        ? error
        : new OrderPlacementError(error instanceof Error ? error.message : String(error));
      this.publishOrderRejectedEvent(
        orderbookId,
        accountId,
        placementError.message,
        placementError.details ?? {},
        runtimeOrder.id,
      );
      throw error;
    }
  }

  private processFillOrder(command: FillOrderCommand): FillReport {
    const { accountId, orderbookId, productTypeId, orderId, size } = command;
    const orderbook = this.orderbookStore.get(productTypeId)?.get(orderbookId);

    if (!orderbook) {
      throw new Error(`Orderbook ${orderbookId} not found`);
    }

    const report = orderbook.fillOrder(orderId, size, accountId);
    this.publishOrderFilledEvent(orderbookId, report);
    return report;
  }

  private processRegisterProduct(command: RegisterProductCommand): void {
    const { product } = command;
    this.products.set(product.id, product);
    this.getOrCreateOrderbookMap(product.id);
  }

  private processCreateOrderbook(command: CreateOrderbookCommand): OrderbookId {
    const { input } = command;
    const product = this.products.get(input.productTypeId);
    if (!product) {
      throw new Error(`Product ${input.productTypeId} not found`);
    }
    const productOrderbooks = this.getOrCreateOrderbookMap(input.productTypeId);
    const orderbookId = randomUUID() as OrderbookId;
    const orderbook = new EphemeralOrderbook(
      product,
      { ...input, id: orderbookId },
      this.balanceService,
      this.now,
      this.prices.get(input.symbol as Asset) ?? 0,
    );
    productOrderbooks.set(orderbookId, orderbook);
    return orderbookId;
  }

  private processWhitelistMaker(command: WhitelistMakerCommand): void {
    const { makerId } = command;
    this.whitelistedMakers.add(makerId);
  }

  private processRevokeMaker(command: RevokeMakerCommand): void {
    const { makerId } = command;
    this.whitelistedMakers.delete(makerId);
  }

  private processCreditAccount(command: CreditAccountCommand): void {
    const { accountId, asset, amount, metadata } = command;
    this.ensurePositiveAmount(amount, "Credit amount must be positive");

    this.applyLedgerChanges(
      {
        credits: [
          {
            accountId,
            Asset: asset,
            amount,
          },
        ],
        debits: [],
      },
      {
        commandType: ClearingHouseCommandType.CreditAccount,
        accountId,
        asset,
        ...(metadata ?? {}),
      },
    );
  }

  private processDebitAccount(command: DebitAccountCommand): void {
    const { accountId, asset, amount, metadata } = command;
    this.ensurePositiveAmount(amount, "Debit amount must be positive");

    const available = this.balanceService.getBalance(accountId, asset);
    if (available < amount) {
      throw new Error(`Insufficient balance for account ${accountId} in ${asset}`);
    }

    this.applyLedgerChanges(
      {
        credits: [],
        debits: [
          {
            accountId,
            Asset: asset,
            amount,
          },
        ],
      },
      {
        commandType: ClearingHouseCommandType.DebitAccount,
        accountId,
        asset,
        ...(metadata ?? {}),
      },
    );
  }

  private process(command: ClearingHouseCommand): ClearingHouseCommandResult {
    switch (command.type) {
      case ClearingHouseCommandType.PlaceOrder:
        return this.processPlaceOrder(command);
      case ClearingHouseCommandType.FillOrder:
        return this.processFillOrder(command);
      case ClearingHouseCommandType.RegisterProduct:
        return this.processRegisterProduct(command);
      case ClearingHouseCommandType.CreateOrderbook:
        return this.processCreateOrderbook(command);
      case ClearingHouseCommandType.WhitelistMaker:
        return this.processWhitelistMaker(command);
      case ClearingHouseCommandType.RevokeMaker:
        return this.processRevokeMaker(command);
      case ClearingHouseCommandType.CreditAccount:
        return this.processCreditAccount(command);
      case ClearingHouseCommandType.DebitAccount:
        return this.processDebitAccount(command);
    }
  }

  public async dispatchCommand(command: ClearingHouseCommand): Promise<ClearingHouseCommandResult> {
    try {
      const result = await Promise.resolve(this.process(command));
      await this.eventBus.dispatchAll();
      return result;
    } catch (error) {
      await this.eventBus.dispatchAll();
      throw error;
    }
  }

  public async handleCommands(commands: AsyncIterable<ClearingHouseCommand>): Promise<void> {
    for await (const command of commands) {
      await this.dispatchCommand(command);
    }
  }

  public createEventStream(): EventStream<ClearingHouseEvent> {
    return this.eventBus.events();
  }

  public getLatestPrice(symbol: Asset): number | undefined {
    return this.prices.get(symbol);
  }

  public getPriceSnapshot(): ReadonlyMap<Asset, number> {
    return new Map(this.prices);
  }

  private ensureMakerAuthorized(makerId: AccountId): void {
    if (!this.whitelistedMakers.has(makerId)) {
      throw new OrderRejectionError(`Maker ${makerId} is not authorized`);
    }
  }


  public handlePriceAndTimeUpdate(symbol: Asset, price: number, time: Timestamp): void {
    this.now = time;
    for (const productMap of this.orderbookStore.values()) {
      for (const orderbook of productMap.values()) {
        if (orderbook.config.symbol === symbol) {
          const orderbookId = orderbook.config.id as OrderbookId;
          const { settlements, verificationHits, expirations } = orderbook.updatePriceAndTime(price, time);

          this.publishPriceUpdateEvent(orderbookId, symbol, price);
          this.publishClockTickEvent(orderbookId, time, "price_update");

          for (const verification of verificationHits) {
            this.publishVerificationHitEvent(orderbookId, verification);
          }

          for (const settlement of settlements) {
            this.publishPayoutSettledEvent(orderbookId, settlement);
          }

          for (const expiration of expirations) {
            this.publishPayoutExpiredEvent(orderbookId, expiration);
          }
        }
      }
    }
    this.prices.set(symbol, price);
  }

  private publishOrderPlacedEvent(
    orderbookId: OrderbookId,
    order: Order<Record<string, unknown>>,
    price: number,
    priceBucket: number,
  ): void {
    if (!order.id) {
      return;
    }

    const event: ClearingHouseEvent<"order_placed"> = {
      eventId: randomUUID() as EventId,
      name: "order_placed",
      orderbookId,
      ts: this.touchNow(),
      clockSeq: this.nextClockSeq(),
      payload: {
        orderId: order.id,
        makerId: order.makerId,
        sizeTotal: order.sizeTotal,
        sizeRemaining: order.sizeRemaining,
        triggerWindow: order.triggerWindow,
        fillWindow: order.triggerWindow,
        price,
        priceBucket,
      },
    };

    this.eventBus.publish(event);
  }

  private publishOrderRejectedEvent(
    orderbookId: OrderbookId,
    makerId: AccountId,
    rejectionReason: string,
    violatedConstraint: Record<string, unknown>,
    orderId?: OrderId,
  ): void {
    const constraint = Object.keys(violatedConstraint).length
      ? violatedConstraint
      : { reason: rejectionReason };

    const event: ClearingHouseEvent<"order_rejected"> = {
      eventId: randomUUID() as EventId,
      name: "order_rejected",
      orderbookId,
      ts: this.touchNow(),
      clockSeq: this.nextClockSeq(),
      payload: {
        makerId,
        rejectionReason,
        violatedConstraint: constraint,
        orderId,
      },
    };

    this.eventBus.publish(event);
  }

  private publishOrderFilledEvent(orderbookId: OrderbookId, report: FillReport): void {
    if (report.balances?.length) {
      for (const balance of report.balances) {
        this.publishBalanceUpdateEvent(
          orderbookId,
          balance.accountId,
          balance.asset,
          balance.balance,
          balance.locked,
          balance.delta ?? 0,
          balance.reason ?? "order_fill",
          balance.context,
        );
      }
    }
    const balances = this.mapBalanceSnapshotsForEvent(report.balances);
    const event: ClearingHouseEvent<"order_filled"> = {
      eventId: randomUUID() as EventId,
      name: "order_filled",
      orderbookId,
      ts: this.now,
      clockSeq: this.nextClockSeq(),
      payload: {
        orderId: report.trade.orderId,
        positionId: report.trade.positionId,
        fillSize: report.trade.fillSize,
        fillPrice: report.trade.fillPrice,
        userId: report.trade.takerId,
        sizeRemaining: report.trade.sizeRemaining,
        balances,
      },
    };

    this.eventBus.publish(event);
  }

  private publishPayoutSettledEvent(orderbookId: OrderbookId, settlement: SettlementReport): void {
    if (settlement.balances?.length) {
      for (const balance of settlement.balances) {
        this.publishBalanceUpdateEvent(
          orderbookId,
          balance.accountId,
          balance.asset,
          balance.balance,
          balance.locked,
          balance.delta ?? 0,
          balance.reason ?? "payout_settlement",
          balance.context,
        );
      }
    }
    const balances = this.mapBalanceSnapshotsForEvent(settlement.balances);
    const event: ClearingHouseEvent<"payout_settled"> = {
      eventId: randomUUID() as EventId,
      name: "payout_settled",
      orderbookId,
      ts: this.now,
      clockSeq: this.nextClockSeq(),
      payload: {
        orderId: settlement.orderId,
        positionId: settlement.positionId,
        totalCredit: settlement.totalCredit,
        makerId: settlement.makerId,
        userId: settlement.takerId,
        balances,
      },
    };

    this.eventBus.publish(event);
  }

  private publishPayoutExpiredEvent(orderbookId: OrderbookId, expiration: ExpirationReport): void {
    const event: ClearingHouseEvent<"payout_expired"> = {
      eventId: randomUUID() as EventId,
      name: "payout_expired",
      orderbookId,
      ts: this.now,
      clockSeq: this.nextClockSeq(),
      payload: {
        orderId: expiration.orderId,
        positionId: expiration.positionId,
        makerId: expiration.makerId,
        userId: expiration.takerId,
        size: expiration.size,
      },
    };

    this.eventBus.publish(event);
  }

  private publishBalanceUpdateEvent(
    fallbackOrderbookId: OrderbookId | undefined,
    accountId: AccountId,
    asset: Asset,
    balance: number,
    locked: number,
    delta: number,
    reason?: string,
    metadata?: Record<string, unknown>,
  ): void {
    const contextOrderbookId =
      metadata && typeof metadata.orderbookId === "string"
        ? (metadata.orderbookId as OrderbookId)
        : undefined;
    const orderbookId = fallbackOrderbookId ?? contextOrderbookId ?? ("system" as OrderbookId);

    const event: ClearingHouseEvent<"balance_updated"> = {
      eventId: randomUUID() as EventId,
      name: "balance_updated",
      orderbookId,
      ts: this.touchNow(),
      clockSeq: this.nextClockSeq(),
      payload: {
        accountId,
        asset,
        balance,
        locked,
        delta,
        reason,
        metadata,
      },
    };

    this.eventBus.publish(event);
  }

  private publishVerificationHitEvent(orderbookId: OrderbookId, verification: VerificationReport): void {
    const event: ClearingHouseEvent<"verification_hit"> = {
      eventId: randomUUID() as EventId,
      name: "verification_hit",
      orderbookId,
      ts: this.now,
      clockSeq: this.nextClockSeq(),
      payload: {
        positionId: verification.positionId,
        orderId: verification.orderId,
        price: verification.price,
        triggerTs: verification.triggerTs,
        userId: verification.takerId,
      },
    };

    this.eventBus.publish(event);
  }

  private publishPriceUpdateEvent(orderbookId: OrderbookId, symbol: Asset, price: number): void {
    const event: ClearingHouseEvent<"price_update"> = {
      eventId: randomUUID() as EventId,
      name: "price_update",
      orderbookId,
      ts: this.now,
      clockSeq: this.nextClockSeq(),
      payload: {
        symbol,
        price,
      },
    };

    this.eventBus.publish(event);
  }

  private publishClockTickEvent(orderbookId: OrderbookId, time: Timestamp, reason: string): void {
    const event: ClearingHouseEvent<"clock_tick"> = {
      eventId: randomUUID() as EventId,
      name: "clock_tick",
      orderbookId,
      ts: this.now,
      clockSeq: this.nextClockSeq(),
      payload: {
        now: time,
        reason,
      },
    };

    this.eventBus.publish(event);
  }

  private mapBalanceSnapshotsForEvent(
    snapshots: Array<{ accountId: AccountId; asset: Asset; balance: number; locked: number }>,
  ): Array<{ accountId: AccountId; Asset: Asset; balance: number; locked: number; delta?: number; reason?: string; metadata?: Record<string, unknown> }> | undefined {
    if (!snapshots.length) {
      return undefined;
    }

    return snapshots.map((snapshot) => ({
      accountId: snapshot.accountId,
      Asset: snapshot.asset,
      balance: snapshot.balance,
      locked: snapshot.locked,
      delta: "delta" in snapshot ? snapshot.delta : undefined,
      reason: "reason" in snapshot && typeof snapshot.reason === "string" ? snapshot.reason : undefined,
      metadata: "context" in snapshot && snapshot.context ? snapshot.context : undefined,
    }));
  }

  private touchNow(): Timestamp {
    const current = new Date().getTime() as Timestamp;
    if (current > this.now) {
      this.now = current;
    }
    return this.now;
  }

  private nextClockSeq(): number {
    return this.clockSeq++;
  }

  private getOrCreateOrderbookMap(productTypeId: ProductTypeId): Map<OrderbookId, EphemeralOrderbook> {
    let productOrderbooks = this.orderbookStore.get(productTypeId);
    if (!productOrderbooks) {
      productOrderbooks = new Map();
      this.orderbookStore.set(productTypeId, productOrderbooks);
    }
    return productOrderbooks;
  }

  private applyLedgerChanges(changes: BalanceChanges, metadata?: Record<string, unknown>): void {
    const credits = changes.credits ?? [];
    const debits = changes.debits ?? [];
    const locks = changes.locks ?? [];
    const unlocks = changes.unlocks ?? [];

    if (credits.length === 0 && debits.length === 0 && locks.length === 0 && unlocks.length === 0) {
      return;
    }

    this.balanceService.applyChanges({
      id: randomUUID(),
      ts: this.now,
      changes: {
        credits: [...credits],
        debits: [...debits],
        locks: locks.length ? [...locks] : undefined,
        unlocks: unlocks.length ? [...unlocks] : undefined,
      },
      metadata,
    });

    const impacted = new Map<string, { accountId: AccountId; asset: Asset; delta: number }>();
    const accumulate = (accountId: AccountId, asset: Asset, delta: number) => {
      const key = `${accountId}:${asset}`;
      const current = impacted.get(key);
      if (current) {
        current.delta += delta;
        return;
      }
      impacted.set(key, { accountId, asset, delta });
    };

    for (const credit of credits) {
      accumulate(credit.accountId, credit.Asset, credit.amount);
    }
    for (const debit of debits) {
      accumulate(debit.accountId, debit.Asset, -debit.amount);
    }
    for (const lock of locks) {
      accumulate(lock.accountId, lock.Asset, -lock.amount);
    }
    for (const unlock of unlocks) {
      accumulate(unlock.accountId, unlock.Asset, unlock.amount);
    }

    if (impacted.size === 0) {
      return;
    }

    const reason =
      (metadata && typeof metadata.reason === "string" ? metadata.reason : undefined)
      ?? (metadata && typeof metadata.commandType === "string" ? metadata.commandType : undefined);
    const context = metadata ? { ...metadata } : undefined;
    const orderbookIdFromContext = context?.orderbookId as OrderbookId | undefined;

    for (const { accountId, asset, delta } of impacted.values()) {
      this.publishBalanceUpdateEvent(
        orderbookIdFromContext,
        accountId,
        asset,
        this.balanceService.getBalance(accountId, asset),
        this.balanceService.getLocked(accountId, asset),
        delta,
        reason,
        context,
      );
    }
  }

  private ensurePositiveAmount(amount: number, message: string): void {
    if (amount <= 0) {
      throw new Error(message);
    }
  }
}

export function createClearingHouseApp(): ClearingHouseApp {
  const app = new ClearingHouseApp();
  return app;
}
