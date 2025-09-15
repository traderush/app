/**
 * Towers game engine - wrapper around Spread trading
 */

import { EventEmitter } from 'events';
import { clearingHouseAPI } from '../../../clearingHouse';
import { TimeFrame } from '../../../clearingHouse/types';
import {
  GameContract,
  GameMode,
  IGameEngine,
  TowersContract,
  TowersGameState,
} from '../../types';
import { createLogger } from '../../utils/logger';

const logger = createLogger('TowersEngine');

// Max tower height (visual levels)
// const MAX_TOWER_HEIGHT = 10;

export class TowersEngine extends EventEmitter implements IGameEngine {
  public readonly gameMode = GameMode.TOWERS;
  public readonly timeframe: TimeFrame;

  private priceHistory: Array<{ price: number; timestamp: number }> = [];
  private currentPrice: number = 0;
  private lastPrice: number = 0;
  private isRunning: boolean = false;

  constructor(timeframe: TimeFrame) {
    super();
    this.timeframe = timeframe;
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Towers engine', { timeframe: this.timeframe });

    // Initialize price
    this.currentPrice = clearingHouseAPI.clearingHouse.getCurrentPrice();
    this.lastPrice = this.currentPrice;
    this.priceHistory.push({
      price: this.currentPrice,
      timestamp: Date.now(),
    });
  }

  start(): void {
    this.isRunning = true;
    logger.info('Towers engine started', { timeframe: this.timeframe });
  }

  stop(): void {
    this.isRunning = false;
    logger.info('Towers engine stopped', { timeframe: this.timeframe });
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
    // Get contract from clearing house
    const chContracts = clearingHouseAPI.clearingHouse.getActiveSpreadContracts(
      this.timeframe
    );

    const chContract = chContracts.find((c) => c.id === contractId);
    if (!chContract) {
      logger.warn('Contract not found', { contractId });
      return false;
    }

    if (chContract.status !== 'active') {
      logger.warn('Contract not active', { contractId });
      return false;
    }

    // Place bet in clearing house
    const result = clearingHouseAPI.clearingHouse.placeSpreadPosition(
      userId,
      contractId,
      amount,
      this.timeframe
    );

    if (result.success) {
      // Emit bet placed event
      this.emit('betPlaced', {
        userId,
        contractId,
        amount,
      });

      logger.info('Bet placed on spread', {
        userId,
        contractId,
        amount,
        type: chContract.spreadType,
      });
    }

    return result.success;
  }

  getActiveContracts(): GameContract[] {
    // Get fresh contracts directly from clearing house
    const contracts = clearingHouseAPI.clearingHouse.getActiveSpreadContracts(
      this.timeframe
    );

    // Transform clearing house contracts to game contracts
    const gameContracts: GameContract[] = [];

    for (const chContract of contracts) {
      // Include all active contracts
      const towersContract: TowersContract = {
        contractId: chContract.id,
        returnMultiplier: chContract.returnMultiplier,
        isActive: chContract.status === 'active',
        totalVolume: chContract.totalVolume,
        playerCount: chContract.positions.size,
        strikePrice: chContract.strikePrice,
        type: chContract.spreadType,
        startTime: chContract.exerciseWindow.start,
        endTime: chContract.exerciseWindow.end,
      };
      gameContracts.push(towersContract);
    }

    return gameContracts;
  }

  getGameState(): TowersGameState {
    return {
      gameMode: GameMode.TOWERS,
      timeframe: this.timeframe,
      contracts: this.getActiveContracts() as TowersContract[],
      currentPrice: this.currentPrice,
    };
  }

  onPriceUpdate(price: number, timestamp: number): void {
    if (!this.isRunning) return;

    this.lastPrice = this.currentPrice;
    this.currentPrice = price;

    // Update price history
    this.priceHistory.push({ price, timestamp });
    if (this.priceHistory.length > 100) {
      this.priceHistory.shift();
    }

    // Get active contracts from clearing house
    const chContracts = clearingHouseAPI.clearingHouse.getActiveSpreadContracts(
      this.timeframe
    );

    // Check price direction
    const priceDirection = price > this.lastPrice ? 'UP' : 'DOWN';

    for (const chContract of chContracts) {
      // Check if contract type matches price movement
      const contractDirection =
        chContract.spreadType === 'call' ? 'UP' : 'DOWN';

      if (contractDirection === priceDirection) {
        this.emit('towerBuild', {
          contractId: chContract.id,
          type: chContract.spreadType,
          priceDirection,
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

    this.emit('towerSettled', {
      contractId,
      winners: winners.length,
      totalPayout,
    });

    logger.info('Tower settled', {
      contractId,
      winners: winners.length,
      totalPayout,
    });
  }
}
