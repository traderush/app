/**
 * Leaderboard service for tracking top players
 */

import { 
  GameMode, 
  LeaderboardEntry
} from '../types';
import { createLogger } from '../utils/logger';
import { UserService } from './UserService';

const logger = createLogger('LeaderboardService');

export interface LeaderboardConfig {
  updateInterval?: number; // milliseconds
  cacheSize?: number;
}

export class LeaderboardService {
  private userService: UserService;
  private cache: Map<string, LeaderboardEntry[]> = new Map();
  private lastUpdate: number = 0;
  private config: Required<LeaderboardConfig>;

  constructor(userService: UserService, config: LeaderboardConfig = {}) {
    this.userService = userService;
    this.config = {
      updateInterval: 30000, // 30 seconds
      cacheSize: 100,
      ...config
    };
  }

  /**
   * Get leaderboard for a specific game mode or overall
   */
  async getLeaderboard(
    gameMode?: GameMode,
    limit: number = 10
  ): Promise<LeaderboardEntry[]> {
    const cacheKey = gameMode || 'overall';
    const now = Date.now();

    // Check cache
    if (this.cache.has(cacheKey) && (now - this.lastUpdate) < this.config.updateInterval) {
      const cached = this.cache.get(cacheKey)!;
      return cached.slice(0, limit);
    }

    // Generate fresh leaderboard
    const entries = await this.generateLeaderboard(gameMode);
    
    // Update cache
    this.cache.set(cacheKey, entries);
    this.lastUpdate = now;

    return entries.slice(0, limit);
  }

  /**
   * Get a specific user's rank
   */
  async getUserRank(userId: string, gameMode?: GameMode): Promise<number | undefined> {
    const leaderboard = await this.getLeaderboard(gameMode, this.config.cacheSize);
    
    const index = leaderboard.findIndex(entry => entry.userId === userId);
    return index >= 0 ? index + 1 : undefined;
  }

  /**
   * Update user stats (called after trades)
   */
  async updateUserStats(
    userId: string,
    profit: number,
    volume: number,
    won: boolean
  ): Promise<void> {
    await this.userService.recordTradeResult(userId, won, profit, volume);
    
    // Clear cache to force refresh
    if (this.cache.size > 0) {
      this.cache.clear();
      logger.debug('Leaderboard cache cleared after user update', { userId });
    }
  }

  /**
   * Generate leaderboard from user data
   */
  private async generateLeaderboard(gameMode?: GameMode): Promise<LeaderboardEntry[]> {
    const users = this.userService.getAllUsers();
    
    // Convert users to leaderboard entries
    const entries: LeaderboardEntry[] = users.map(user => ({
      userId: user.userId,
      username: user.username,
      totalProfit: user.stats.totalProfit,
      totalVolume: user.stats.totalVolume,
      winRate: user.stats.winRate,
      rank: 0 // Will be set after sorting
    }));

    // Sort by profit (descending)
    entries.sort((a, b) => b.totalProfit - a.totalProfit);

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    logger.info('Leaderboard generated', {
      gameMode,
      totalUsers: entries.length
    });

    return entries;
  }

  /**
   * Get top performers for specific metrics
   */
  async getTopPerformers(metric: 'profit' | 'volume' | 'winRate', limit: number = 5): Promise<LeaderboardEntry[]> {
    const users = this.userService.getAllUsers();
    
    const entries: LeaderboardEntry[] = users.map(user => ({
      userId: user.userId,
      username: user.username,
      totalProfit: user.stats.totalProfit,
      totalVolume: user.stats.totalVolume,
      winRate: user.stats.winRate,
      rank: 0
    }));

    // Sort by specified metric
    switch (metric) {
      case 'profit':
        entries.sort((a, b) => b.totalProfit - a.totalProfit);
        break;
      case 'volume':
        entries.sort((a, b) => b.totalVolume - a.totalVolume);
        break;
      case 'winRate':
        entries.sort((a, b) => b.winRate - a.winRate);
        break;
    }

    // Assign ranks and return top performers
    return entries.slice(0, limit).map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
  }

  /**
   * Get leaderboard statistics
   */
  getStats() {
    const users = this.userService.getAllUsers();
    
    if (users.length === 0) {
      return {
        totalPlayers: 0,
        totalVolume: 0,
        totalProfit: 0,
        averageWinRate: 0
      };
    }

    const stats = users.reduce((acc, user) => ({
      totalVolume: acc.totalVolume + user.stats.totalVolume,
      totalProfit: acc.totalProfit + user.stats.totalProfit,
      totalWinRate: acc.totalWinRate + user.stats.winRate
    }), { totalVolume: 0, totalProfit: 0, totalWinRate: 0 });

    return {
      totalPlayers: users.length,
      totalVolume: stats.totalVolume,
      totalProfit: stats.totalProfit,
      averageWinRate: stats.totalWinRate / users.length,
      cacheSize: this.cache.size
    };
  }

  /**
   * Clear leaderboard cache
   */
  clearCache(): void {
    this.cache.clear();
    this.lastUpdate = 0;
    logger.info('Leaderboard cache cleared');
  }
}