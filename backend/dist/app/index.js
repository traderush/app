"use strict";
/**
 * TradeRush App - Main entry point
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradeRushApp = void 0;
const ConnectionManager_1 = require("./core/ConnectionManager");
const MessageRouter_1 = require("./core/MessageRouter");
const WebSocketServer_1 = require("./core/WebSocketServer");
const GameEngineManager_1 = require("./games/GameEngineManager");
const LeaderboardService_1 = require("./services/LeaderboardService");
const SessionManager_1 = require("./services/SessionManager");
const StreamingService_1 = require("./services/StreamingService");
const UserService_1 = require("./services/UserService");
const types_1 = require("./types");
const logger_1 = require("./utils/logger");
// Import handlers
const AuthHandler_1 = require("./handlers/AuthHandler");
const GameHandler_1 = require("./handlers/GameHandler");
const StateHandler_1 = require("./handlers/StateHandler");
const logger = (0, logger_1.createLogger)('TradeRushApp');
class TradeRushApp {
    constructor(config) {
        this.config = config;
        // Initialize services
        this.connectionManager = new ConnectionManager_1.ConnectionManager();
        this.userService = new UserService_1.UserService();
        this.sessionManager = new SessionManager_1.SessionManager();
        this.leaderboardService = new LeaderboardService_1.LeaderboardService(this.userService);
        this.gameEngineManager = new GameEngineManager_1.GameEngineManager();
        // Initialize message router with services
        const services = {
            userService: this.userService,
            sessionManager: this.sessionManager,
            gameEngineManager: this.gameEngineManager,
            leaderboardService: this.leaderboardService,
        };
        this.messageRouter = new MessageRouter_1.MessageRouter(this.connectionManager, services);
        // Initialize streaming service
        this.streamingService = new StreamingService_1.StreamingService(this.messageRouter, this.gameEngineManager, this.userService, this.sessionManager);
        // Initialize WebSocket server
        this.wsServer = new WebSocketServer_1.WebSocketServer({
            port: this.config.port,
            host: this.config.host,
            maxConnections: 10000,
            heartbeatInterval: 30000,
        }, this.connectionManager, this.messageRouter);
        // Register message handlers
        this.registerHandlers();
    }
    /**
     * Register all message handlers
     */
    registerHandlers() {
        // Authentication
        this.messageRouter.registerHandler(types_1.ClientMessageType.AUTH, AuthHandler_1.handleAuth);
        // Game actions
        this.messageRouter.registerHandler(types_1.ClientMessageType.JOIN_GAME, GameHandler_1.handleJoinGame);
        this.messageRouter.registerHandler(types_1.ClientMessageType.LEAVE_GAME, GameHandler_1.handleLeaveGame);
        this.messageRouter.registerHandler(types_1.ClientMessageType.PLACE_TRADE, GameHandler_1.handlePlaceTrade);
        // State queries
        this.messageRouter.registerHandler(types_1.ClientMessageType.GET_STATE, StateHandler_1.handleGetState);
        this.messageRouter.registerHandler(types_1.ClientMessageType.GET_LEADERBOARD, StateHandler_1.handleGetLeaderboard);
        this.messageRouter.registerHandler(types_1.ClientMessageType.GET_GAME_CONFIG, GameHandler_1.handleGetGameConfig);
        logger.info('Message handlers registered');
    }
    /**
     * Start the application
     */
    async start() {
        try {
            logger.info('Starting TradeRush app...');
            // Start WebSocket server
            await this.wsServer.start();
            // Start game engines
            this.gameEngineManager.startAll();
            // Start streaming service
            this.streamingService.start();
            // Start periodic tasks
            this.startPeriodicTasks();
            logger.info('TradeRush app started successfully', {
                port: this.config.port,
                host: this.config.host,
            });
        }
        catch (error) {
            logger.error('Failed to start TradeRush app', error);
            throw error;
        }
    }
    /**
     * Stop the application
     */
    async stop() {
        try {
            logger.info('Stopping TradeRush app...');
            // Stop streaming service
            this.streamingService.stop();
            // Stop game engines
            this.gameEngineManager.stopAll();
            // Stop WebSocket server
            await this.wsServer.stop();
            logger.info('TradeRush app stopped');
        }
        catch (error) {
            logger.error('Error stopping TradeRush app', error);
            throw error;
        }
    }
    /**
     * Start periodic maintenance tasks
     */
    startPeriodicTasks() {
        // Clean up stale connections every minute
        setInterval(() => {
            const removed = this.connectionManager.cleanupStale();
            if (removed > 0) {
                logger.info('Cleaned up stale connections', { removed });
            }
        }, 60000);
        // Clean up expired sessions every 5 minutes
        setInterval(() => {
            const cleaned = this.sessionManager.cleanupExpiredSessions();
            if (cleaned > 0) {
                logger.info('Cleaned up expired sessions', { cleaned });
            }
        }, 300000);
        // Log statistics every minute
        setInterval(() => {
            const stats = this.getStats();
            logger.info('Application statistics', stats);
        }, 60000);
    }
    /**
     * Get application statistics
     */
    getStats() {
        return {
            connections: this.connectionManager.getStats(),
            sessions: this.sessionManager.getStats(),
            gameEngines: this.gameEngineManager.getStats(),
            leaderboard: this.leaderboardService.getStats(),
            streaming: this.streamingService.getStats(),
        };
    }
}
exports.TradeRushApp = TradeRushApp;
// Create and start the app if this is the main module
if (require.main === module) {
    const port = parseInt(process.env.PORT || '8080');
    const host = process.env.HOST || 'localhost';
    const app = new TradeRushApp({ port, host });
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        logger.info('Received SIGINT, shutting down gracefully...');
        await app.stop();
        process.exit(0);
    });
    process.on('SIGTERM', async () => {
        logger.info('Received SIGTERM, shutting down gracefully...');
        await app.stop();
        process.exit(0);
    });
    // Start the app
    app.start().catch((error) => {
        logger.fatal('Failed to start application', error);
        process.exit(1);
    });
}
