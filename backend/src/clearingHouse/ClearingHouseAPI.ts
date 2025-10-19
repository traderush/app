import { EventEmitter } from 'events';
import { ClearingHouseService } from './services/ClearingHouseService';
import {
  ClockTickContext,
  FillOrderPayload,
  Order,
  OrderStatus,
  OrderbookConfig,
  PlaceOrderPayload,
  PositionStatus,
  UpdateOrderPayload,
} from './core/types';
import { ProductTypeHooks } from './core/product';
import { CLEARING_HOUSE_CONFIG } from './config';
import { MarketType, TimeFrame } from './types';
import {
  IRON_CONDOR_PRODUCT_ID,
  getIronCondorOrderData,
  parseIronCondorData,
} from './products/ironCondor';
import { IronCondorContractSnapshot, LegacyPosition } from './types';

export interface ConnectedUser {
  userId: string;
  balance: number;
  username?: string;
}

interface SessionInfo {
  sessionId: string;
  userId: string;
  marketType: MarketType;
  timeframe: TimeFrame;
  startedAt: number;
}

interface IronCondorContractView extends IronCondorContractSnapshot {
  orderId: string;
  orderbookId: string;
  bucket: number;
  columnIndex: number;
  anchorPrice: number;
}

/**
 * Lightweight façade for consumers that prefer an evented API over the raw service.
 * No product presets or session abstractions remain—callers interact with the
 * generic runtime contracts directly.
 */
export class ClearingHouseAPI extends EventEmitter {
  readonly clearingHouse = new ClearingHouseService();
  private readonly sessions = new Map<string, SessionInfo>();
  private readonly userSessions = new Map<string, string>();
  private readonly knownUsers = new Set<string>();

  constructor() {
    super();
    this.forwardEvents();
    this.bindIronCondorEvents();
  }

  registerProductType(hooks: ProductTypeHooks): void {
    this.clearingHouse.registerProductType(hooks);
  }

  createOrderbook(config: OrderbookConfig): void {
    this.clearingHouse.createOrderbook(config);
    if (config.productTypeId === IRON_CONDOR_PRODUCT_ID) {
      this.emitIronCondorContractUpdate(config.orderbookId, 'initial');
    }
  }

  ensureUser(userId: string): ConnectedUser {
    this.clearingHouse.initializeUser(userId);
    return {
      userId,
      balance: this.clearingHouse.getUserBalance(userId),
    };
  }

  getUserBalance(userId: string): number {
    return this.clearingHouse.getUserBalance(userId);
  }

  placeOrder(payload: PlaceOrderPayload, now: number = Date.now()): Order {
    if (payload.productTypeId === IRON_CONDOR_PRODUCT_ID) {
      this.ensureUniqueIronCondorPlacement(payload);
    }
    return this.clearingHouse.placeMakerOrder(payload, now);
  }

  updateOrder(payload: UpdateOrderPayload, now: number = Date.now()): Order {
    return this.clearingHouse.updateMakerOrder(payload, now);
  }

  cancelOrder(
    payload: { orderId: string; makerId: string },
    now: number = Date.now()
  ): Order {
    return this.clearingHouse.cancelMakerOrder(payload, now);
  }

  fillOrder(payload: FillOrderPayload): void {
    this.clearingHouse.fillOrder(payload);
  }

  tick(context: Omit<ClockTickContext, 'clockSeq'>): void {
    this.clearingHouse.clockTick(context);
  }

  deposit(userId: string, amount: number): number {
    const snapshot = this.clearingHouse.balanceService.credit(userId, amount);
    return snapshot.available;
  }

  withdraw(userId: string, amount: number): number {
    const snapshot = this.clearingHouse.balanceService.debit(userId, amount);
    return snapshot.available;
  }

  async authenticateUser(username: string, userId?: string): Promise<ConnectedUser> {
    const finalUserId = userId ?? this.generateUserId();
    const wasKnown = this.knownUsers.has(finalUserId);
    const snapshot = this.ensureUser(finalUserId);

    if (!wasKnown) {
      const targetBalance = CLEARING_HOUSE_CONFIG.userStartingBalance;
      if (snapshot.balance < targetBalance) {
        this.deposit(finalUserId, targetBalance - snapshot.balance);
      }
      this.knownUsers.add(finalUserId);
    }

    this.emit('user_authenticated', { userId: finalUserId, username });
    return {
      userId: finalUserId,
      balance: this.getUserBalance(finalUserId),
      username,
    };
  }

  async createSession(
    userId: string,
    marketType: MarketType,
    timeframe: TimeFrame
  ): Promise<{ sessionId: string; marketType: MarketType; timeframe: TimeFrame; mode: string }> {
    const existingSessionId = this.userSessions.get(userId);
    if (existingSessionId) {
      const existing = this.sessions.get(existingSessionId);
      if (existing) {
        return {
          sessionId: existing.sessionId,
          marketType: existing.marketType,
          timeframe: existing.timeframe,
          mode: 'unlimited',
        };
      }
    }

    const sessionId = this.generateSessionId(marketType);
    const info: SessionInfo = {
      sessionId,
      userId,
      marketType,
      timeframe,
      startedAt: Date.now(),
    };
    this.sessions.set(sessionId, info);
    this.userSessions.set(userId, sessionId);

    return {
      sessionId,
      marketType,
      timeframe,
      mode: 'unlimited',
    };
  }

  async leaveSession(userId: string): Promise<void> {
    const sessionId = this.userSessions.get(userId);
    if (!sessionId) {
      return;
    }
    this.sessions.delete(sessionId);
    this.userSessions.delete(userId);
  }

  getActiveIronCondorContracts(timeframe: TimeFrame): IronCondorContractView[] {
    return this.computeIronCondorContracts(`${IRON_CONDOR_PRODUCT_ID}:${timeframe}`);
  }


  onPriceUpdate(callback: (price: number, timestamp: number) => void): void {
    this.clearingHouse.on('price_update', (payload) => {
      callback(payload.price, payload.ts);
    });
  }

  onBalanceUpdate(callback: (userId: string, balance: number) => void): void {
    this.clearingHouse.on('balance_update', (payload) => {
      callback(payload.userId, payload.balance);
    });
  }

  onContractSettlement(callback: (settlement: any) => void): void {
    this.on('contract_settlement', (payload) => {
      callback(payload);
    });
  }

  private forwardEvents(): void {
    this.clearingHouse.on('event', (event) => this.emit('event', event));
    this.clearingHouse.on('position_opened', (position) =>
      this.emit('position_opened', position)
    );
    this.clearingHouse.on('position_hit', (position) =>
      this.emit('position_hit', position)
    );
    this.clearingHouse.on('position_settled', (position) =>
      this.emit('position_settled', position)
    );
  }

  private bindIronCondorEvents(): void {
    this.clearingHouse.on('event', (event) => {
      if (!this.isIronCondorOrderbook(event.orderbookId)) {
        return;
      }
      const type = event.payload?.type as string | undefined;
      if (type === 'payout_settled') {
        this.emitIronCondorSettlement(
          event.orderbookId,
          (event.payload as any).positionId,
          (event.payload as any).amount ?? 0,
          event.ts
        );
        this.emitIronCondorContractUpdate(event.orderbookId, 'settlement');
        return;
      }
      if (this.shouldRefreshIronCondorContracts(type)) {
        this.emitIronCondorContractUpdate(event.orderbookId, type ?? 'event');
      }
    });

    this.clearingHouse.positions.on('position_opened', (position) => {
      if (position.productTypeId !== IRON_CONDOR_PRODUCT_ID) {
        return;
      }
      this.emitIronCondorContractUpdate(position.orderbookId, 'position_opened');
    });

    this.clearingHouse.positions.on('position_settled', (position) => {
      if (position.productTypeId !== IRON_CONDOR_PRODUCT_ID) {
        return;
      }
      this.emitIronCondorContractUpdate(position.orderbookId, 'position_settled');
    });

    this.clearingHouse.positions.on('position_hit', (position) => {
      if (position.productTypeId !== IRON_CONDOR_PRODUCT_ID) {
        return;
      }
      this.emitIronCondorContractUpdate(position.orderbookId, 'position_hit');
    });
  }

  private ensureUniqueIronCondorPlacement(payload: PlaceOrderPayload): void {
    const candidate = parseIronCondorData(
      payload.data as Record<string, unknown> | undefined
    );
    if (!candidate) {
      return;
    }

    const orderbook = this.clearingHouse.orderbooks.get(payload.orderbookId);
    const snapshot = orderbook.snapshot();

    const conflict = snapshot.find((order) => {
      if (order.productTypeId !== IRON_CONDOR_PRODUCT_ID) {
        return false;
      }
      if (order.makerId !== payload.makerId) {
        return false;
      }
      if (order.cancelOnly) {
        return false;
      }
      if (
        order.status !== OrderStatus.ACTIVE &&
        order.status !== OrderStatus.PARTIALLY_FILLED
      ) {
        return false;
      }
      const existing = getIronCondorOrderData(order);
      if (!existing) {
        return false;
      }
      return (
        order.priceBucket === payload.priceBucket &&
        existing.columnIndex === candidate.columnIndex
      );
    });

    if (conflict) {
      const error = new Error('maker_duplicate_price_range');
      (error as Error & { orderId?: string }).orderId = conflict.id;
      throw error;
    }
  }

  private emitIronCondorContractUpdate(orderbookId: string, reason: string): void {
    const timeframe = this.parseIronCondorTimeframe(orderbookId);
    if (timeframe === null) {
      return;
    }
    const contracts = this.computeIronCondorContracts(orderbookId);
    this.emit('iron_condor_contracts_updated', {
      timeframe,
      contracts,
      reason,
      isInitial: reason === 'initial',
    });
  }

  private emitIronCondorSettlement(
    orderbookId: string,
    positionId: string,
    amount: number,
    timestamp: number
  ): void {
    const timeframe = this.parseIronCondorTimeframe(orderbookId);
    if (timeframe === null) {
      return;
    }

    const position = this.clearingHouse.positions.get(positionId);
    if (!position || position.productTypeId !== IRON_CONDOR_PRODUCT_ID) {
      return;
    }

    const orderbook = this.clearingHouse.orderbooks.get(orderbookId);
    const order = orderbook.getById(position.orderId);
    if (!order || order.productTypeId !== IRON_CONDOR_PRODUCT_ID) {
      return;
    }

    const data = getIronCondorOrderData(order);
    if (!data) {
      return;
    }

    const contractId = this.computeIronCondorContractId(
      timeframe,
      order.priceBucket,
      data.columnIndex
    );

    this.emit('contract_settlement', {
      type: 'ironCondor',
      contractId,
      orderbookId,
      timestamp,
      settlements: [
        {
          userId: position.userId,
          position: position.size,
          payout: amount,
        },
      ],
    });
  }

  private computeIronCondorContracts(orderbookId: string): IronCondorContractView[] {
    const timeframe = this.parseIronCondorTimeframe(orderbookId);
    if (timeframe === null) {
      return [];
    }

    let orderbook;
    try {
      orderbook = this.clearingHouse.orderbooks.get(orderbookId);
    } catch (error) {
      return [];
    }

    const config = orderbook.config;
    const snapshot = orderbook.snapshot();
    const contracts: IronCondorContractView[] = [];

    for (const order of snapshot) {
      if (order.productTypeId !== IRON_CONDOR_PRODUCT_ID) {
        continue;
      }

      const data = getIronCondorOrderData(order);
      if (!data) {
        continue;
      }

      const columnIndex = this.computeIronCondorColumnIndex(order, config);
      const contractId = this.computeIronCondorContractId(
        timeframe,
        order.priceBucket,
        data.columnIndex
      );

      const positions = this.buildIronCondorPositions(order.id, contractId);
      const totalVolume = Array.from(positions.values()).reduce(
        (total, entries) =>
          total + entries.reduce((sum, entry) => sum + entry.amount, 0),
        0
      );

      contracts.push({
        id: contractId,
        orderId: order.id,
        orderbookId,
        bucket: order.priceBucket,
        columnIndex,
        anchorPrice: data.anchorPrice,
        timeframe,
        returnMultiplier: data.multiplier,
        totalVolume,
        positions,
        status: this.mapIronCondorStatus(order.status),
        strikeRange: {
          lower: data.startRange,
          upper: data.endRange,
        },
        exerciseWindow: {
          start: order.triggerWindow.start,
          end: order.triggerWindow.end,
        },
      });
    }

    contracts.sort((a, b) => {
      if (a.columnIndex !== b.columnIndex) {
        return a.columnIndex - b.columnIndex;
      }
      return a.bucket - b.bucket;
    });

    return contracts;
  }

  private buildIronCondorPositions(
    orderId: string,
    contractId: string
  ): Map<string, LegacyPosition[]> {
    const entries = this.clearingHouse.positions
      .listByOrder(orderId)
      .filter((position) =>
        position.productTypeId === IRON_CONDOR_PRODUCT_ID &&
        (position.status === PositionStatus.OPEN ||
          position.status === PositionStatus.HIT)
      );

    const map = new Map<string, LegacyPosition[]>();
    for (const position of entries) {
      const legacy: LegacyPosition = {
        userId: position.userId,
        amount: position.size,
        timestamp: position.timeCreated,
        contractId,
      };
      const list = map.get(position.userId) ?? [];
      list.push(legacy);
      map.set(position.userId, list);
    }
    return map;
  }

  private computeIronCondorColumnIndex(
    order: Order,
    config: OrderbookConfig
  ): number {
    const timeframe = config.timeframeMs;
    if (timeframe <= 0) {
      return 0;
    }
    const horizonColumns = Math.max(
      1,
      Math.round(config.timeWindow.horizonMs / timeframe)
    );
    const deltaMs = order.triggerWindow.start - Date.now();
    const ahead = Math.floor(deltaMs / timeframe);
    if (ahead <= 0) {
      return 0;
    }
    return Math.min(ahead, horizonColumns - 1);
  }

  private computeIronCondorContractId(
    timeframe: TimeFrame,
    bucket: number,
    columnIndex: number
  ): string {
    const normalizedBucket = bucket + 1_000_000;
    return `IC_${timeframe}_${normalizedBucket}_${columnIndex}`;
  }

  private parseIronCondorTimeframe(orderbookId: string): TimeFrame | null {
    if (!this.isIronCondorOrderbook(orderbookId)) {
      return null;
    }
    const parts = orderbookId.split(':');
    if (parts.length !== 2) {
      return null;
    }
    const value = Number(parts[1]);
    if (!Number.isFinite(value)) {
      return null;
    }
    return value as TimeFrame;
  }

  private isIronCondorOrderbook(orderbookId: string): boolean {
    return orderbookId.startsWith(`${IRON_CONDOR_PRODUCT_ID}:`);
  }

  private shouldRefreshIronCondorContracts(type: string | undefined): boolean {
    if (!type) {
      return false;
    }
    switch (type) {
      case 'clock_tick':
      case 'order_placed':
      case 'order_updated':
      case 'order_cancelled':
      case 'order_cancel_only':
      case 'order_filled':
      case 'order_rejected':
      case 'column_dropped':
        return true;
      default:
        return false;
    }
  }

  private mapIronCondorStatus(status: OrderStatus): IronCondorContractView['status'] {
    switch (status) {
      case OrderStatus.CANCELLED:
        return 'abandoned';
      case OrderStatus.EXPIRED:
        return 'expired';
      case OrderStatus.FILLED:
        return 'exercised';
      default:
        return 'active';
    }
  }

  private generateSessionId(marketType: MarketType): string {
    return `${marketType}_session_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }

  private generateUserId(): string {
    return `user_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }
}

export type { IronCondorContractView };

export const clearingHouseAPI = new ClearingHouseAPI();
