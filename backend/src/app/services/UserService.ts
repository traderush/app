/**
 * User management service (no authentication for now)
 */

import { User, UserStats, Result, ok, err, AppError, ErrorCode } from '../types';
import { createLogger } from '../utils/logger';
import { clearingHouseAPI } from '../../clearingHouse';

const logger = createLogger('UserService');

export class UserService {
  private users: Map<string, User> = new Map();
  private usernameToUserId: Map<string, string> = new Map();

  constructor() {
    logger.info('UserService initialized (no auth mode)');
  }

  /**
   * Create or get user by username (no password required)
   */
  async authenticateUser(username: string): Promise<Result<User>> {
    try {
      // Check if user exists
      const existingUserId = this.usernameToUserId.get(username);
      if (existingUserId) {
        const user = this.users.get(existingUserId);
        if (user) {
          // Update last active
          user.lastActiveAt = Date.now();
          logger.info('User logged in', { userId: user.userId, username });
          return ok(user);
        }
      }

      // Create new user
      const userId = this.generateUserId();
      const newUser: User = {
        userId,
        username,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        stats: this.createInitialStats()
      };

      // Save user
      this.users.set(userId, newUser);
      this.usernameToUserId.set(username, userId);

      // Initialize user in clearing house with the same userId
      await clearingHouseAPI.authenticateUser(username, userId);
      
      logger.info('New user created', { userId, username });
      return ok(newUser);
    } catch (error) {
      logger.error('Failed to authenticate user', error, { username });
      return err(new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to authenticate user'));
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.users.get(userId) || null;
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User | null> {
    const userId = this.usernameToUserId.get(username);
    if (!userId) return null;
    return this.users.get(userId) || null;
  }

  /**
   * Update user last active timestamp
   */
  async updateLastActive(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.lastActiveAt = Date.now();
    }
  }

  /**
   * Update user statistics
   */
  async updateUserStats(
    userId: string, 
    update: Partial<UserStats>
  ): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;

    // Update stats
    Object.assign(user.stats, update);

    // Recalculate win rate
    if (user.stats.totalTrades > 0) {
      user.stats.winRate = user.stats.winCount / user.stats.totalTrades;
    }

    logger.info('User stats updated', { userId, stats: user.stats });
  }

  /**
   * Record trade result
   */
  async recordTradeResult(
    userId: string,
    won: boolean,
    profit: number,
    volume: number
  ): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;

    const stats = user.stats;
    
    // Update basic stats
    stats.totalTrades++;
    stats.totalVolume += volume;
    stats.totalProfit += profit;

    if (won) {
      stats.winCount++;
      stats.currentStreak++;
      if (stats.currentStreak > stats.bestStreak) {
        stats.bestStreak = stats.currentStreak;
      }
    } else {
      stats.lossCount++;
      stats.currentStreak = 0;
    }

    // Update win rate
    stats.winRate = stats.winCount / stats.totalTrades;

    logger.info('Trade result recorded', {
      userId,
      won,
      profit,
      newStats: stats
    });
  }

  /**
   * Get user balance from clearing house
   */
  async getUserBalance(userId: string): Promise<number> {
    try {
      return clearingHouseAPI.getUserBalance(userId);
    } catch (error) {
      logger.error('Failed to get user balance', error, { userId });
      return 0;
    }
  }

  /**
   * Get all users (for leaderboard)
   */
  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  /**
   * Get user count
   */
  getUserCount(): number {
    return this.users.size;
  }

  /**
   * Generate unique user ID
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Create initial user stats
   */
  private createInitialStats(): UserStats {
    return {
      totalProfit: 0,
      totalVolume: 0,
      totalTrades: 0,
      winCount: 0,
      lossCount: 0,
      winRate: 0,
      bestStreak: 0,
      currentStreak: 0
    };
  }

  /**
   * Generate token (returns user ID for now since no auth)
   */
  async generateToken(user: User): Promise<string> {
    // For no-auth mode, just return the user ID as the "token"
    return user.userId;
  }

  /**
   * Verify token (accepts any valid user ID for now)
   */
  async verifyToken(token: string): Promise<User | null> {
    // For no-auth mode, treat token as user ID
    return this.users.get(token) || null;
  }
}