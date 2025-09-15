/**
 * TradeRush App - Main entry point
 */

import { ConnectionManager } from './core/ConnectionManager';
import { MessageRouter } from './core/MessageRouter';
import { WebSocketServer } from './core/WebSocketServer';
import { GameEngineManager } from './games/GameEngineManager';
import { LeaderboardService } from './services/LeaderboardService';
import { SessionManager } from './services/SessionManager';
import { StreamingService } from './services/StreamingService';
import { UserService } from './services/UserService';
import { ClientMessageType } from './types';
import { createLogger } from './utils/logger';

// Import handlers
import { handleAuth } from './handlers/AuthHandler';
import {
  handleJoinGame,
  handleLeaveGame,
  handlePlaceTrade,
  handleGetGameConfig,
} from './handlers/GameHandler';
import { handleGetLeaderboard, handleGetState } from './handlers/StateHandler';

const logger = createLogger('TradeRushApp');

export class TradeRushApp {
  private wsServer: WebSocketServer;
  private connectionManager: ConnectionManager;
  private messageRouter: MessageRouter;
  private userService: UserService;
  private sessionManager: SessionManager;
  private leaderboardService: LeaderboardService;
  private gameEngineManager: GameEngineManager;
  private streamingService: StreamingService;

  constructor(
    private config: {
      port: number;
      host?: string;
    }
  ) {
    // Initialize services
    this.connectionManager = new ConnectionManager();

    this.userService = new UserService();
    this.sessionManager = new SessionManager();
    this.leaderboardService = new LeaderboardService(this.userService);
    this.gameEngineManager = new GameEngineManager();

    // Initialize message router with services
    const services = {
      userService: this.userService,
      sessionManager: this.sessionManager,
      gameEngineManager: this.gameEngineManager,
      leaderboardService: this.leaderboardService,
    };

    this.messageRouter = new MessageRouter(this.connectionManager, services);

    // Initialize streaming service
    this.streamingService = new StreamingService(
      this.messageRouter,
      this.gameEngineManager,
      this.userService,
      this.sessionManager
    );

    // Initialize WebSocket server
    this.wsServer = new WebSocketServer(
      {
        port: this.config.port,
        host: this.config.host,
        maxConnections: 10000,
        heartbeatInterval: 30000,
      },
      this.connectionManager,
      this.messageRouter
    );

    // Register message handlers
    this.registerHandlers();
  }

  /**
   * Register all message handlers
   */
  private registerHandlers(): void {
    // Authentication
    this.messageRouter.registerHandler(ClientMessageType.AUTH, handleAuth);

    // Game actions
    this.messageRouter.registerHandler(
      ClientMessageType.JOIN_GAME,
      handleJoinGame
    );
    this.messageRouter.registerHandler(
      ClientMessageType.LEAVE_GAME,
      handleLeaveGame
    );
    this.messageRouter.registerHandler(
      ClientMessageType.PLACE_TRADE,
      handlePlaceTrade
    );

    // State queries
    this.messageRouter.registerHandler(
      ClientMessageType.GET_STATE,
      handleGetState
    );
    this.messageRouter.registerHandler(
      ClientMessageType.GET_LEADERBOARD,
      handleGetLeaderboard
    );
    this.messageRouter.registerHandler(
      ClientMessageType.GET_GAME_CONFIG,
      handleGetGameConfig
    );

    logger.info('Message handlers registered');
  }

  /**
   * Start the application
   */
  async start(): Promise<void> {
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
    } catch (error) {
      logger.error('Failed to start TradeRush app', error);
      throw error;
    }
  }

  /**
   * Stop the application
   */
  async stop(): Promise<void> {
    try {
      logger.info('Stopping TradeRush app...');

      // Stop streaming service
      this.streamingService.stop();

      // Stop game engines
      this.gameEngineManager.stopAll();

      // Stop WebSocket server
      await this.wsServer.stop();

      logger.info('TradeRush app stopped');
    } catch (error) {
      logger.error('Error stopping TradeRush app', error);
      throw error;
    }
  }

  /**
   * Start periodic maintenance tasks
   */
  private startPeriodicTasks(): void {
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
