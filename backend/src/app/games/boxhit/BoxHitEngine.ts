/**
 * Box Hit game engine - wrapper around Iron Condor trading
 */

import { EventEmitter } from 'events';
import { clearingHouseAPI } from '../../../clearingHouse';
import { TimeFrame } from '../../../clearingHouse/types';
import { FillOrderPayload } from '../../../clearingHouse/core/types';
import {
  BoxHitContract,
  BoxHitGameState,
  GameContract,
  GameMode,
  IGameEngine,
} from '../../types';
import { createLogger } from '../../utils/logger';

const logger = createLogger('BoxHitEngine');

export class BoxHitEngine extends EventEmitter implements IGameEngine {
  public readonly gameMode = GameMode.BOX_HIT;
  public readonly timeframe: TimeFrame;

  private priceHistory: Array<{ price: number; timestamp: number }> = [];
  private currentPrice: number = 0;
  private isRunning: boolean = false;

  constructor(timeframe: TimeFrame) {
    super();
    this.timeframe = timeframe;
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Box Hit engine', { timeframe: this.timeframe });

    // Initialize price history
    this.currentPrice = clearingHouseAPI.clearingHouse.getCurrentPrice();
    this.priceHistory.push({
      price: this.currentPrice,
      timestamp: Date.now(),
    });
  }

  start(): void {
    this.isRunning = true;
    logger.info('Box Hit engine started', { timeframe: this.timeframe });
  }

  stop(): void {
    this.isRunning = false;
    logger.info('Box Hit engine stopped', { timeframe: this.timeframe });
  }

  destroy(): void {
    this.stop();
    this.removeAllListeners();
    this.priceHistory = [];
  }

  async placeBet(
    userId: string,
    contractId: string,
    amount: number
  ): Promise<boolean> {
    logger.info('Attempting to place bet', {
      userId,
      contractId,
      amount,
      timeframe: this.timeframe,
    });

    // Get contract from clearing house
    const chContracts = clearingHouseAPI.getActiveIronCondorContracts(
      this.timeframe
    );

    const chContract = chContracts.find((c) => c.id === contractId);
    if (!chContract) {
      logger.warn('Contract not found', {
        contractId,
        availableContracts: chContracts
          .slice(0, 5)
          .map((c) => ({ id: c.id, status: c.status })),
      });
      return false;
    }

    if (chContract.columnIndex !== 0) {
      logger.warn('Attempted to place bet on non-current column', {
        contractId,
        columnIndex: chContract.columnIndex,
      });
      return false;
    }

    // Log contract details for debugging
    logger.info('Found contract for bet placement', {
      contractId: chContract.id,
      startTime: new Date(chContract.exerciseWindow.start).toISOString(),
      endTime: new Date(chContract.exerciseWindow.end).toISOString(),
      strikes: chContract.strikeRange,
      status: chContract.status,
    });

    if (chContract.status !== 'active') {
      logger.warn('Contract not active', { contractId });
      return false;
    }

    // Place bet in clearing house
    const payload: FillOrderPayload = {
      orderId: chContract.orderId,
      userId,
      size: amount,
      priceAtFill: clearingHouseAPI.clearingHouse.getCurrentPrice(
        chContract.orderbookId
      ),
      timestamp: Date.now(),
    };

    try {
      clearingHouseAPI.fillOrder(payload);
      this.emit('betPlaced', {
        userId,
        contractId,
        amount,
      });
      return true;
    } catch (error) {
      logger.warn('Failed to place bet', { error });
      return false;
    }
  }

  getActiveContracts(): GameContract[] {
    // Get fresh contracts directly from clearing house
    const contracts = clearingHouseAPI.getActiveIronCondorContracts(
      this.timeframe
    );

    // Transform clearing house contracts to game contracts
    const gameContracts: GameContract[] = [];

    for (const chContract of contracts) {
      if (chContract.columnIndex !== 0) {
        continue;
      }

      const boxHitContract: BoxHitContract = {
        contractId: chContract.id,
        returnMultiplier: chContract.returnMultiplier,
        isActive: chContract.status === 'active',
        totalVolume: chContract.totalVolume,
        playerCount: chContract.positions.size,
        lowerStrike: chContract.strikeRange.lower,
        upperStrike: chContract.strikeRange.upper,
        startTime: chContract.exerciseWindow.start,
        endTime: chContract.exerciseWindow.end,
      };
      gameContracts.push(boxHitContract);
    }

    return gameContracts;
  }

  getGameState(): BoxHitGameState {
    return {
      gameMode: GameMode.BOX_HIT,
      timeframe: this.timeframe,
      contracts: this.getActiveContracts() as BoxHitContract[],
      currentPrice: this.currentPrice,
    };
  }

  onPriceUpdate(price: number, timestamp: number): void {
    if (!this.isRunning) return;

    this.currentPrice = price;

    // Update price history (keep last 100 points)
    this.priceHistory.push({ price, timestamp });
    if (this.priceHistory.length > 100) {
      this.priceHistory.shift();
    }

    // Get active contracts from clearing house
    const chContracts = clearingHouseAPI.getActiveIronCondorContracts(
      this.timeframe
    );

    // Check if price hits any contracts
    for (const chContract of chContracts) {
      // Check if price is within strike range
      const isInRange =
        price >= chContract.strikeRange.lower &&
        price <= chContract.strikeRange.upper;

      if (isInRange) {
        this.emit('boxHit', {
          contractId: chContract.id,
          price,
          timestamp,
        });
      }
    }

    // Emit state update
    this.emit('stateUpdate', this.getGameState());
  }

  onNewContracts(_contracts: any[]): void {
    // Simply emit the state update - we don't store contracts
    this.emit('contractsUpdated', this.getGameState());
  }

  onContractSettlement(contractId: string, winners: any[]): void {
    // Calculate total payout
    const totalPayout = winners.reduce((sum, w) => sum + w.payout, 0);

    this.emit('boxExpired', {
      contractId,
      winners: winners.length,
      totalPayout,
    });

    logger.info('Box expired', {
      contractId,
      winners: winners.length,
      totalPayout,
    });
  }
}
