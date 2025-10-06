"use strict";
/**
 * Manages active game sessions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
const clearingHouse_1 = require("../../clearingHouse");
const errors_1 = require("../utils/errors");
const logger = (0, logger_1.createLogger)('SessionManager');
class SessionManager {
    constructor(config = {}) {
        this.sessions = new Map();
        this.userSessions = new Map();
        this.config = {
            maxSessionsPerUser: 1, // One game at a time
            sessionTimeout: 3600000, // 1 hour
            ...config
        };
    }
    /**
     * Create a new game session
     */
    async createSession(userId, gameMode, timeframe) {
        try {
            // Check if user already has a session
            const existingSessions = this.userSessions.get(userId);
            if (existingSessions && existingSessions.size > 0) {
                const sessionId = Array.from(existingSessions)[0];
                return (0, types_1.err)(new errors_1.AlreadyInSessionError(sessionId));
            }
            // Create session in clearing house
            const chSession = await clearingHouse_1.clearingHouseAPI.createSession(userId, this.mapGameModeToClearingHouse(gameMode), timeframe);
            // Create local session
            const session = {
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
            return (0, types_1.ok)(session);
        }
        catch (error) {
            logger.error('Failed to create session', error, { userId, gameMode });
            return (0, types_1.err)(new types_1.AppError(types_1.ErrorCode.INTERNAL_ERROR, 'Failed to create session'));
        }
    }
    /**
     * Leave a session
     */
    async leaveSession(userId) {
        try {
            const sessionIds = this.userSessions.get(userId);
            if (!sessionIds || sessionIds.size === 0) {
                return (0, types_1.err)(new errors_1.NoActiveSessionError());
            }
            // Leave all user sessions (should be just one)
            for (const sessionId of sessionIds) {
                const session = this.sessions.get(sessionId);
                if (session) {
                    // Notify clearing house
                    await clearingHouse_1.clearingHouseAPI.leaveSession(userId);
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
            return (0, types_1.ok)(undefined);
        }
        catch (error) {
            logger.error('Failed to leave session', error, { userId });
            return (0, types_1.err)(new types_1.AppError(types_1.ErrorCode.INTERNAL_ERROR, 'Failed to leave session'));
        }
    }
    /**
     * Get user's active session
     */
    getUserSession(userId) {
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
    getSession(sessionId) {
        return this.sessions.get(sessionId) || null;
    }
    /**
     * Update session activity
     */
    updateActivity(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastActivityAt = Date.now();
        }
    }
    /**
     * Update session statistics
     */
    updateSessionStats(sessionId, updates) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        Object.assign(session.stats, updates);
        logger.debug('Session stats updated', {
            sessionId,
            stats: session.stats
        });
    }
    /**
     * Record trade in session
     */
    recordTrade(sessionId, amount, won, profit) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        session.stats.tradesPlaced++;
        session.stats.volume += amount;
        session.stats.profit += profit;
        if (won) {
            session.stats.winCount++;
        }
        else {
            session.stats.lossCount++;
        }
        this.updateActivity(sessionId);
    }
    /**
     * Handle user disconnect
     */
    async handleUserDisconnect(userId) {
        // For now, keep session alive on disconnect
        // User can reconnect and continue
        logger.info('User disconnected but session kept alive', { userId });
    }
    /**
     * Get all active sessions
     */
    getAllSessions() {
        return Array.from(this.sessions.values());
    }
    /**
     * Get sessions by game mode
     */
    getSessionsByGameMode(gameMode) {
        return this.getAllSessions().filter(s => s.gameMode === gameMode);
    }
    /**
     * Clean up expired sessions
     */
    cleanupExpiredSessions() {
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
        const byGameMode = new Map();
        const byTimeframe = new Map();
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
            averageSessionDuration: sessions.reduce((sum, s) => sum + (now - s.startedAt), 0) / sessions.length || 0
        };
    }
    /**
     * Map game mode to clearing house market type
     */
    mapGameModeToClearingHouse(gameMode) {
        switch (gameMode) {
            case types_1.GameMode.BOX_HIT:
                return 'iron_condor';
            case types_1.GameMode.TOWERS:
                return 'spread';
            default:
                throw new Error(`Unknown game mode: ${gameMode}`);
        }
    }
    /**
     * Create initial session stats
     */
    createInitialStats() {
        return {
            tradesPlaced: 0,
            volume: 0,
            profit: 0,
            winCount: 0,
            lossCount: 0
        };
    }
}
exports.SessionManager = SessionManager;
