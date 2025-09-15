import { EventEmitter } from 'events';
import { TimeFrame } from '../config/timeframeConfig';
import { ClearingHouseService } from './services/ClearingHouseService';
import {
  ClientMessage,
  ClientMessageType,
  ConnectedPayload,
  IronCondorContractsPayload,
  MarketType,
  ServerMessage,
  ServerMessageType,
  SessionJoinedPayload,
  SpreadContractsPayload,
  TradePlacedPayload,
} from './types/messages';

/**
 * ClearingHouseAPI is the public interface for the clearing house.
 * All external access to clearing house functionality should go through this API.
 */
export class ClearingHouseAPI extends EventEmitter {
  public clearingHouse: ClearingHouseService;
  private sessions: Map<string, SessionInfo> = new Map();
  private userSessions: Map<string, string> = new Map(); // userId -> sessionId

  constructor() {
    super();
    this.clearingHouse = new ClearingHouseService();
    this.setupEventForwarding();
  }

  // User Management
  async authenticateUser(
    username: string,
    userId?: string
  ): Promise<ConnectedPayload> {
    // Use provided userId or generate a new one
    const finalUserId =
      userId ||
      `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Get or create balance
    let balance = this.clearingHouse.getUserBalance(finalUserId);
    if (balance === 0) {
      // New user gets initial balance
      const balanceService = (this.clearingHouse as any).balanceService;
      balanceService.credit(finalUserId, 10000);
      balance = this.clearingHouse.getUserBalance(finalUserId);
    }

    return {
      userId: finalUserId,
      username,
      balance,
    };
  }

  // Session Management
  async createSession(
    userId: string,
    marketType: MarketType,
    timeframe: TimeFrame
  ): Promise<SessionJoinedPayload> {
    const sessionId = `${marketType}_session_${Date.now()}`;

    const sessionInfo: SessionInfo = {
      sessionId,
      userId,
      marketType,
      timeframe,
      startedAt: Date.now(),
    };

    this.sessions.set(sessionId, sessionInfo);
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
    if (sessionId) {
      this.sessions.delete(sessionId);
      this.userSessions.delete(userId);
    }
  }

  // Trading Operations
  async placeIronCondorTrade(
    userId: string,
    contractId: string,
    amount: number
  ): Promise<TradePlacedPayload> {
    // Get timeframe from session
    const sessionId = this.userSessions.get(userId);
    const session = sessionId ? this.sessions.get(sessionId) : null;
    if (!session) {
      throw new Error('User not in a session');
    }

    const success = this.clearingHouse.placeIronCondorPosition(
      userId,
      contractId,
      amount,
      session.timeframe
    );
    if (!success) {
      throw new Error('Trade failed');
    }

    const balance = this.clearingHouse.getUserBalance(userId);

    return {
      contractId,
      amount,
      balance,
      position: {
        userId,
        amount,
        timestamp: Date.now(),
      },
    };
  }

  async placeSpreadTrade(
    userId: string,
    contractId: string,
    amount: number
  ): Promise<TradePlacedPayload> {
    // Get timeframe from session
    const sessionId = this.userSessions.get(userId);
    const session = sessionId ? this.sessions.get(sessionId) : null;
    if (!session) {
      throw new Error('User not in a session');
    }

    const result = this.clearingHouse.placeSpreadPosition(
      userId,
      contractId,
      amount,
      session.timeframe
    );
    if (!result.success) {
      throw new Error(result.error || 'Trade failed');
    }

    const balance = this.clearingHouse.getUserBalance(userId);

    return {
      contractId,
      amount,
      balance,
      position: {
        userId,
        amount,
        timestamp: Date.now(),
      },
    };
  }

  // Contract Information
  async getIronCondorContracts(
    timeframe: TimeFrame
  ): Promise<IronCondorContractsPayload> {
    const orderbook = (this.clearingHouse as any).ironCondorOrderbooks.get(
      timeframe
    );
    if (!orderbook) return { timeframe, contracts: [] };
    const contracts = Array.from(
      orderbook.getActiveContracts().values()
    );

    return {
      timeframe,
      contracts: contracts.map((c: any) => ({
        contractId: c.id,
        returnMultiplier: c.returnMultiplier,
        lowerStrike: c.strikeRange.lower,
        upperStrike: c.strikeRange.upper,
        isActive: c.status === 'active',
        totalVolume: c.totalVolume,
      })),
    };
  }

  async getSpreadContracts(
    timeframe: TimeFrame
  ): Promise<SpreadContractsPayload> {
    const orderbook = (this.clearingHouse as any).spreadOrderbooks.get(
      timeframe
    );
    if (!orderbook)
      return { timeframe, contracts: [] };
    const contracts = Array.from(
      orderbook.getActiveContracts().values()
    );

    return {
      timeframe,
      contracts: contracts.map((c: any) => ({
        contractId: c.id,
        returnMultiplier: c.returnMultiplier,
        strikePrice: c.strikePrice,
        type: c.spreadType as 'call' | 'put',
        isActive: c.status === 'active',
        totalVolume: c.totalVolume,
      })),
    };
  }

  // Balance Operations
  getUserBalance(userId: string): number {
    return this.clearingHouse.getUserBalance(userId);
  }

  deposit(userId: string, amount: number): number {
    const balanceService = (this.clearingHouse as any).balanceService;
    return balanceService.credit(userId, amount);
  }

  // Message Processing
  async processMessage(
    message: ClientMessage,
    userId: string
  ): Promise<ServerMessage | null> {
    switch (message.type) {
      case ClientMessageType.CONNECT:
        const authResult = await this.authenticateUser(
          message.payload.username
        );
        return {
          type: ServerMessageType.CONNECTED,
          payload: authResult,
          timestamp: Date.now(),
        };

      case ClientMessageType.JOIN_SESSION:
        const sessionResult = await this.createSession(
          userId,
          message.payload.marketType,
          message.payload.timeframe
        );
        return {
          type: ServerMessageType.SESSION_JOINED,
          payload: sessionResult,
          timestamp: Date.now(),
        };

      case ClientMessageType.PLACE_TRADE:
        const tradeResult = await this.placeIronCondorTrade(
          userId,
          message.payload.contractId,
          message.payload.amount
        );
        return {
          type: ServerMessageType.TRADE_PLACED,
          payload: tradeResult,
          timestamp: Date.now(),
        };

      case ClientMessageType.PLACE_SPREAD_TRADE:
        const spreadResult = await this.placeSpreadTrade(
          userId,
          message.payload.contractId,
          message.payload.amount
        );
        return {
          type: ServerMessageType.TRADE_PLACED,
          payload: spreadResult,
          timestamp: Date.now(),
        };

      case ClientMessageType.GET_STATE:
        const balance = this.getUserBalance(userId);
        return {
          type: ServerMessageType.STATE_UPDATE,
          payload: { balance },
          timestamp: Date.now(),
        };

      default:
        return null;
    }
  }

  // Event Subscriptions
  onPriceUpdate(callback: (price: number, timestamp: number) => void): void {
    this.on('price.update', callback);
  }

  onBalanceUpdate(callback: (userId: string, balance: number) => void): void {
    this.on('balance.update', callback);
  }

  onContractSettlement(callback: (settlement: any) => void): void {
    this.on('contract.settlement', callback);
  }

  private setupEventForwarding(): void {
    // Forward relevant events from clearing house
    this.clearingHouse.on('price_update', (pricePoint: any) => {
      this.emit('price.update', pricePoint.price, pricePoint.timestamp);
    });

    this.clearingHouse.on('balance_updated', (data: any) => {
      this.emit('balance.update', data.userId, data.balance);
    });

    this.clearingHouse.on('iron_condor_exercised', (data) => {
      this.emit('contract.settlement', {
        type: 'ironCondor',
        ...data,
      });
    });

    // Handle expired contracts (losses)
    this.clearingHouse.on('iron_condor_expired', (data) => {
      // Transform expired positions into settlements with 0 payout
      const settlements = data.expiredPositions.map((pos: any) => ({
        userId: pos.userId,
        position: pos.position,
        payout: 0, // No payout for expired contracts
      }));

      this.emit('contract.settlement', {
        type: 'ironCondor',
        contractId: data.contractId,
        settlements,
        timestamp: data.timestamp,
      });
    });

    this.clearingHouse.on('spread_triggered', (data) => {
      this.emit('contract.settlement', {
        type: 'spread',
        ...data,
      });
    });
  }
}

interface SessionInfo {
  sessionId: string;
  userId: string;
  marketType: MarketType;
  timeframe: TimeFrame;
  startedAt: number;
}

// Export singleton instance
export const clearingHouseAPI = new ClearingHouseAPI();
