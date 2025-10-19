/**
 * Manages game engines and coordinates game operations
 */

import { EventEmitter } from 'events';
import { clearingHouseAPI } from '../../clearingHouse';
import { TimeFrame } from '../../clearingHouse/types';
import {
  AppError,
  BoxHitGameState,
  ErrorCode,
  GameContract,
  GameMode,
  IGameEngine,
  Result,
  err,
  ok,
} from '../types';
import { createLogger } from '../utils/logger';
import { BoxHitEngine } from './boxhit/BoxHitEngine';

const logger = createLogger('GameEngineManager');

export class GameEngineManager extends EventEmitter {
  private engines: Map<string, IGameEngine> = new Map();

  constructor() {
    super();
    this.setupClearingHouseListeners();
  }

  /**
   * Get or create a game engine
   */
  async getEngine(
    gameMode: GameMode,
    timeframe: TimeFrame
  ): Promise<IGameEngine> {
    const key = this.getEngineKey(gameMode, timeframe);

    let engine = this.engines.get(key);
    if (!engine) {
      engine = await this.createEngine(gameMode, timeframe);
      this.engines.set(key, engine);
    }

    return engine;
  }

  /**
   * Create a new game engine
   */
  private async createEngine(
    gameMode: GameMode,
    timeframe: TimeFrame
  ): Promise<IGameEngine> {
    logger.info('Creating game engine', { gameMode, timeframe });

    let engine: IGameEngine;

    switch (gameMode) {
      case GameMode.BOX_HIT:
        engine = new BoxHitEngine(timeframe);
        break;
      default:
        throw new Error(`Unknown game mode: ${gameMode}`);
    }

    await engine.initialize();
    engine.start();

    if (gameMode === GameMode.BOX_HIT) {
      const contracts = clearingHouseAPI.getActiveIronCondorContracts(timeframe);
      if (typeof (engine as any).onNewContracts === 'function') {
        (engine as any).onNewContracts(contracts);
      }
      this.emit('contracts_updated', {
        gameMode,
        timeframe,
        newContracts: contracts,
        isInitial: true,
      });
    }

    logger.info('Game engine created and started', { gameMode, timeframe });
    return engine;
  }

  /**
   * Place a bet in a game
   */
  async placeBet(
    gameMode: GameMode,
    timeframe: TimeFrame,
    userId: string,
    contractId: string,
    amount: number
  ): Promise<Result<boolean>> {
    try {
      const engine = await this.getEngine(gameMode, timeframe);
      const success = await engine.placeBet(userId, contractId, amount);

      if (!success) {
        return err(
          new AppError(ErrorCode.INVALID_CONTRACT, 'Failed to place bet')
        );
      }

      return ok(true);
    } catch (error) {
      logger.error('Failed to place bet', error, {
        gameMode,
        userId,
        contractId,
        amount,
      });
      return err(new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to place bet'));
    }
  }

  /**
   * Get active contracts for a game
   */
  async getActiveContracts(
    gameMode: GameMode,
    timeframe: TimeFrame
  ): Promise<GameContract[]> {
    try {
      const engine = await this.getEngine(gameMode, timeframe);
      return engine.getActiveContracts();
    } catch (error) {
      logger.error('Failed to get active contracts', error, {
        gameMode,
        timeframe,
      });
      return [];
    }
  }

  /**
   * Get current game state
   */
  async getGameState(
    gameMode: GameMode,
    timeframe: TimeFrame
  ): Promise<BoxHitGameState | null> {
    try {
      const engine = await this.getEngine(gameMode, timeframe);
      return engine.getGameState();
    } catch (error) {
      logger.error('Failed to get game state', error, {
        gameMode,
        timeframe,
      });
      return null;
    }
  }

  /**
   * Setup clearing house event listeners
   */
  private setupClearingHouseListeners(): void {
    // Listen for price updates
    clearingHouseAPI.onPriceUpdate((price, timestamp) => {
      // Broadcast to all engines
      for (const engine of this.engines.values()) {
        engine.onPriceUpdate(price, timestamp);
      }
    });

    // Listen for contract settlements
    clearingHouseAPI.onContractSettlement((settlement) => {
      // Transform settlements array to winners format expected by game engines
      // settlements contains: { userId, position, payout }
      const winners = (settlement.settlements || [])
        .filter((s: any) => s.payout > 0)
        .map((s: any) => ({
          userId: s.userId,
          payout: s.payout,
          trade: s.position
        }));

      // Find relevant engines and notify them
      for (const engine of this.engines.values()) {
        if (
          settlement.type === 'ironCondor' &&
          engine.gameMode === GameMode.BOX_HIT
        ) {
          engine.onContractSettlement(
            settlement.contractId,
            winners
          );
        }
      }
    });
    // Listen for contract snapshots
    clearingHouseAPI.on('iron_condor_contracts_updated', (data: any) => {
      const timeframe = data.timeframe as TimeFrame;
      const engine = this.engines.get(`${GameMode.BOX_HIT}:${timeframe}`);
      if (engine) {
        if (typeof (engine as any).onNewContracts === 'function') {
          (engine as any).onNewContracts(data.contracts);
        }
        this.emit('contracts_updated', {
          gameMode: GameMode.BOX_HIT,
          timeframe,
          newContracts: data.contracts,
          isInitial: data.reason === 'initial',
        });
      }
    });


    logger.info('Clearing house listeners setup');
  }

  /**
   * Start all engines
   */
  startAll(): void {
    clearingHouseAPI.clearingHouse.startPriceFeed();
    logger.info('Started price feed');
  }

  /**
   * Stop all engines
   */
  stopAll(): void {
    clearingHouseAPI.clearingHouse.stopPriceFeed();

    for (const engine of this.engines.values()) {
      engine.stop();
      engine.destroy();
    }

    this.engines.clear();
    logger.info('All engines stopped');
  }

  /**
   * Get engine key for map storage
   */
  private getEngineKey(gameMode: GameMode, timeframe: TimeFrame): string {
    return `${gameMode}:${timeframe}`;
  }

  /**
   * Get statistics
   */
  getStats() {
    const stats: any = {
      activeEngines: this.engines.size,
      engines: [],
    };

    for (const [key, engine] of this.engines.entries()) {
      const [gameMode, timeframe] = key.split(':');
      const contracts = engine.getActiveContracts();

      stats.engines.push({
        gameMode,
        timeframe: parseInt(timeframe),
        activeContracts: contracts.length,
        totalVolume: contracts.reduce((sum, c) => sum + c.totalVolume, 0),
      });
    }

    return stats;
  }
}
