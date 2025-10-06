"use strict";
/**
 * User management service (no authentication for now)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
const clearingHouse_1 = require("../../clearingHouse");
const logger = (0, logger_1.createLogger)('UserService');
class UserService {
    constructor() {
        this.users = new Map();
        this.usernameToUserId = new Map();
        logger.info('UserService initialized (no auth mode)');
    }
    /**
     * Create or get user by username (no password required)
     */
    async authenticateUser(username) {
        try {
            // Check if user exists
            const existingUserId = this.usernameToUserId.get(username);
            if (existingUserId) {
                const user = this.users.get(existingUserId);
                if (user) {
                    // Update last active
                    user.lastActiveAt = Date.now();
                    logger.info('User logged in', { userId: user.userId, username });
                    return (0, types_1.ok)(user);
                }
            }
            // Create new user
            const userId = this.generateUserId();
            const newUser = {
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
            await clearingHouse_1.clearingHouseAPI.authenticateUser(username, userId);
            logger.info('New user created', { userId, username });
            return (0, types_1.ok)(newUser);
        }
        catch (error) {
            logger.error('Failed to authenticate user', error, { username });
            return (0, types_1.err)(new types_1.AppError(types_1.ErrorCode.INTERNAL_ERROR, 'Failed to authenticate user'));
        }
    }
    /**
     * Get user by ID
     */
    async getUserById(userId) {
        return this.users.get(userId) || null;
    }
    /**
     * Get user by username
     */
    async getUserByUsername(username) {
        const userId = this.usernameToUserId.get(username);
        if (!userId)
            return null;
        return this.users.get(userId) || null;
    }
    /**
     * Update user last active timestamp
     */
    async updateLastActive(userId) {
        const user = this.users.get(userId);
        if (user) {
            user.lastActiveAt = Date.now();
        }
    }
    /**
     * Update user statistics
     */
    async updateUserStats(userId, update) {
        const user = this.users.get(userId);
        if (!user)
            return;
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
    async recordTradeResult(userId, won, profit, volume) {
        const user = this.users.get(userId);
        if (!user)
            return;
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
        }
        else {
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
    async getUserBalance(userId) {
        try {
            return clearingHouse_1.clearingHouseAPI.getUserBalance(userId);
        }
        catch (error) {
            logger.error('Failed to get user balance', error, { userId });
            return 0;
        }
    }
    /**
     * Get all users (for leaderboard)
     */
    getAllUsers() {
        return Array.from(this.users.values());
    }
    /**
     * Get user count
     */
    getUserCount() {
        return this.users.size;
    }
    /**
     * Generate unique user ID
     */
    generateUserId() {
        return `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
    /**
     * Create initial user stats
     */
    createInitialStats() {
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
    async generateToken(user) {
        // For no-auth mode, just return the user ID as the "token"
        return user.userId;
    }
    /**
     * Verify token (accepts any valid user ID for now)
     */
    async verifyToken(token) {
        // For no-auth mode, treat token as user ID
        return this.users.get(token) || null;
    }
}
exports.UserService = UserService;
