/**
 * Manages active game sessions
 */

import { 
  GameSession, 
  GameMode, 
  Result,
  ok,
  err,
  SessionStats,
  AppError,
  ErrorCode
} from '../types';
import { TimeFrame } from '../../clearingHouse/types';
import { createLogger } from '../utils/logger';
import { clearingHouseAPI } from '../../clearingHouse';
import { AlreadyInSessionError } from '../utils/errors';
import { MarketType } from '../../clearingHouse';

const logger = createLogger('SessionManager');

export interface SessionManagerConfig {
  maxSessionsPerUser?: number;
  sessionTimeout?: number; // milliseconds
}

export class SessionManager {
  private sessions: Map<string, GameSession> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();
  private config: Required<SessionManagerConfig>;

  constructor(config: SessionManagerConfig = {}) {
    this.config = {
      maxSessionsPerUser: 1, // One game at a time
      sessionTimeout: 3600000, // 1 hour
      ...config
    };
  }

  /**
   * Create a new game session
   */
  async createSession(
    userId: string,
    gameMode: GameMode,
    timeframe: TimeFrame
  ): Promise<Result<GameSession>> {
    try {
      // Check if user already has a session
      const existingSessions = this.userSessions.get(userId);
      if (existingSessions && existingSessions.size > 0) {
        const sessionId = Array.from(existingSessions)[0];
        return err(new AlreadyInSessionError(sessionId));
      }

      // Create session in clearing house
      const chSession = await clearingHouseAPI.createSession(
        userId,
        this.mapGameModeToClearingHouse(gameMode) as MarketType,
        timeframe
      );

      // Create local session
      const session: GameSession = {
        sessionId: chSession.sessionId,
        userId,
        gameMode,
        timeframe,
        startedAt: Date.now(),
        lastActivityAt: Date.now(),
        stats: this.createInitialStats()
      };

      // Store session
      this.sessions.set(session.sessionId, session);
      
      // Update user sessions
      const userSessionSet = this.userSessions.get(userId) || new Set();
      userSessionSet.add(session.sessionId);
      this.userSessions.set(userId, userSessionSet);

      logger.info('Session created', {
        sessionId: session.sessionId,
        userId,
        gameMode,
        timeframe
      });

      return ok(session);
    } catch (error) {
      logger.error('Failed to create session', error, { userId, gameMode });
      return err(new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to create session'));
    }
  }

  /**
   * Leave a session
   */
  async leaveSession(userId: string): Promise<Result<void>> {
    try {
      const sessionIds = this.userSessions.get(userId);
      if (!sessionIds || sessionIds.size === 0) {
        return ok(undefined);
      }

      // Leave all user sessions (should be just one)
      for (const sessionId of sessionIds) {
        const session = this.sessions.get(sessionId);
        if (session) {
          // Notify clearing house
          await clearingHouseAPI.leaveSession(userId);

          // Remove session
          this.sessions.delete(sessionId);

          logger.info('Session ended', {
            sessionId,
            userId,
            duration: Date.now() - session.startedAt,
            stats: session.stats
          });
        }
      }

      // Clear user sessions
      this.userSessions.delete(userId);

      return ok(undefined);
    } catch (error) {
      logger.error('Failed to leave session', error, { userId });
      return err(new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to leave session'));
    }
  }

  /**
   * Get user's active session
   */
  getUserSession(userId: string): GameSession | null {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds || sessionIds.size === 0) {
      return null;
    }

    const sessionId = Array.from(sessionIds)[0];
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): GameSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Update session activity
   */
  updateActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivityAt = Date.now();
    }
  }

  /**
   * Update session statistics
   */
  updateSessionStats(
    sessionId: string,
    updates: Partial<SessionStats>
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    Object.assign(session.stats, updates);

    logger.debug('Session stats updated', {
      sessionId,
      stats: session.stats
    });
  }

  /**
   * Record trade in session
   */
  recordTrade(
    sessionId: string,
    amount: number,
    won: boolean,
    profit: number
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.stats.tradesPlaced++;
    session.stats.volume += amount;
    session.stats.profit += profit;

    if (won) {
      session.stats.winCount++;
    } else {
      session.stats.lossCount++;
    }

    this.updateActivity(sessionId);
  }

  /**
   * Handle user disconnect
   */
  async handleUserDisconnect(userId: string): Promise<void> {
    // For now, keep session alive on disconnect
    // User can reconnect and continue
    logger.info('User disconnected but session kept alive', { userId });
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): GameSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get sessions by game mode
   */
  getSessionsByGameMode(gameMode: GameMode): GameSession[] {
    return this.getAllSessions().filter(s => s.gameMode === gameMode);
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivityAt > this.config.sessionTimeout) {
        // Remove from user sessions
        const userSessions = this.userSessions.get(session.userId);
        if (userSessions) {
          userSessions.delete(sessionId);
          if (userSessions.size === 0) {
            this.userSessions.delete(session.userId);
          }
        }

        // Remove session
        this.sessions.delete(sessionId);
        cleaned++;

        logger.info('Expired session cleaned up', {
          sessionId,
          userId: session.userId,
          inactiveFor: now - session.lastActivityAt
        });
      }
    }

    return cleaned;
  }

  /**
   * Get session statistics
   */
  getStats() {
    const sessions = this.getAllSessions();
    const now = Date.now();

    const byGameMode = new Map<GameMode, number>();
    const byTimeframe = new Map<TimeFrame, number>();
    let totalVolume = 0;
    let totalTrades = 0;

    for (const session of sessions) {
      // Count by game mode
      const modeCount = byGameMode.get(session.gameMode) || 0;
      byGameMode.set(session.gameMode, modeCount + 1);

      // Count by timeframe
      const tfCount = byTimeframe.get(session.timeframe) || 0;
      byTimeframe.set(session.timeframe, tfCount + 1);

      // Sum stats
      totalVolume += session.stats.volume;
      totalTrades += session.stats.tradesPlaced;
    }

    return {
      activeSessions: sessions.length,
      activeUsers: this.userSessions.size,
      byGameMode: Object.fromEntries(byGameMode),
      byTimeframe: Object.fromEntries(byTimeframe),
      totalVolume,
      totalTrades,
      averageSessionDuration: sessions.reduce((sum, s) => 
        sum + (now - s.startedAt), 0) / sessions.length || 0
    };
  }

  /**
   * Map game mode to clearing house market type
   */
  private mapGameModeToClearingHouse(gameMode: GameMode): 'iron_condor' | 'spread' {
    switch (gameMode) {
      case GameMode.BOX_HIT:
        return 'iron_condor';
      default:
        throw new Error(`Unknown game mode: ${gameMode}`);
    }
  }

  /**
   * Create initial session stats
   */
  private createInitialStats(): SessionStats {
    return {
      tradesPlaced: 0,
      volume: 0,
      profit: 0,
      winCount: 0,
      lossCount: 0
    };
  }
}
