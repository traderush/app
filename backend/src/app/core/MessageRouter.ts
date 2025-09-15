/**
 * Routes WebSocket messages to appropriate handlers
 */

import { ClientMessage, ClientMessageType, ServerMessage } from '../types';
import { UnauthorizedError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import { ConnectionManager } from './ConnectionManager';

const logger = createLogger('MessageRouter');

// Handler function type
export type MessageHandler<T extends ClientMessage = ClientMessage> = (
  message: T,
  context: HandlerContext
) => Promise<ServerMessage | null>;

// Context provided to handlers
export interface HandlerContext {
  ws: any;
  connectionId: string;
  userId?: string;
  connectionManager: ConnectionManager;
  services: HandlerServices;
}

// Services available to handlers
export interface HandlerServices {
  userService: any; // Will be properly typed when implemented
  sessionManager: any;
  gameEngineManager: any;
  leaderboardService: any;
}

export class MessageRouter {
  private handlers: Map<ClientMessageType, MessageHandler> = new Map();
  private connectionManager: ConnectionManager;
  private services: HandlerServices;
  private middleware: MessageMiddleware[] = [];

  constructor(connectionManager: ConnectionManager, services: HandlerServices) {
    this.connectionManager = connectionManager;
    this.services = services;
  }

  /**
   * Register a message handler
   */
  registerHandler(type: ClientMessageType, handler: MessageHandler): void {
    this.handlers.set(type, handler);
    logger.info('Handler registered', { type });
  }

  /**
   * Register middleware
   */
  use(middleware: MessageMiddleware): void {
    this.middleware.push(middleware);
  }

  /**
   * Route a message to the appropriate handler
   */
  async route(message: ClientMessage, ws: any): Promise<ServerMessage | null> {
    const { connectionId } = ws.data;

    try {
      // Get connection info
      const connection = this.connectionManager.getConnection(connectionId);
      if (!connection) {
        throw new Error('Connection not found');
      }

      // Create handler context
      const context: HandlerContext = {
        ws,
        connectionId,
        userId: connection.userId,
        connectionManager: this.connectionManager,
        services: this.services,
      };

      // Apply middleware
      for (const mw of this.middleware) {
        const result = await mw(message, context);
        if (!result.continue) {
          return result.response || null;
        }
      }

      // Check authentication for non-auth messages
      if (message.type !== ClientMessageType.AUTH && !context.userId) {
        throw new UnauthorizedError('Authentication required');
      }

      // Apply rate limiting
      // TODO: Implement rate limiting when needed
      // if (context.userId) {
      //   this.connectionManager.checkRateLimit(context.userId, message.type);
      // }

      // Get handler
      const handler = this.handlers.get(message.type);
      if (!handler) {
        logger.warn('No handler for message type', {
          type: message.type,
          connectionId,
        });
        throw new Error(`Unknown message type: ${message.type}`);
      }

      // Execute handler
      const response = await handler(message, context);

      return response;
    } catch (error) {
      logger.error('Error routing message', error, {
        type: message.type,
        connectionId,
      });
      throw error;
    }
  }

  /**
   * Handle user disconnect
   */
  async handleDisconnect(userId: string): Promise<void> {
    try {
      // Leave any active game sessions
      if (this.services.sessionManager) {
        await this.services.sessionManager.handleUserDisconnect(userId);
      }

      // Update user status
      if (this.services.userService) {
        await this.services.userService.updateLastActive(userId);
      }

      logger.info('User disconnected', { userId });
    } catch (error) {
      logger.error('Error handling disconnect', error, { userId });
    }
  }

  /**
   * Broadcast a message to specific users
   */
  broadcast(message: ServerMessage, userIds: string[]): void {
    for (const userId of userIds) {
      const webSockets = this.connectionManager.getUserWebSockets(userId);
      for (const ws of webSockets) {
        try {
          ws.send(JSON.stringify(message));
        } catch (error) {
          logger.error('Error broadcasting to user', error, { userId });
        }
      }
    }
  }

  /**
   * Broadcast to all connected users
   */
  broadcastAll(message: ServerMessage): void {
    const connections = this.connectionManager.getAllConnections();
    for (const conn of connections) {
      const ws = this.connectionManager.getWebSocket(conn.connectionId);
      if (ws) {
        try {
          ws.send(JSON.stringify(message));
        } catch (error) {
          logger.error('Error broadcasting', error, {
            connectionId: conn.connectionId,
          });
        }
      }
    }
  }

  /**
   * Send message to a specific user
   */
  sendToUser(userId: string, message: ServerMessage): boolean {
    const webSockets = this.connectionManager.getUserWebSockets(userId);
    if (webSockets.length === 0) {
      return false;
    }

    let sent = false;
    for (const ws of webSockets) {
      try {
        ws.send(JSON.stringify(message));
        sent = true;
      } catch (error) {
        logger.error('Error sending to user', error, { userId });
      }
    }

    return sent;
  }

  /**
   * Get router statistics
   */
  getStats() {
    return {
      registeredHandlers: this.handlers.size,
      middlewareCount: this.middleware.length,
      handlers: Array.from(this.handlers.keys()),
    };
  }
}

// Middleware type
export type MessageMiddleware = (
  message: ClientMessage,
  context: HandlerContext
) => Promise<MiddlewareResult>;

export interface MiddlewareResult {
  continue: boolean;
  response?: ServerMessage;
}

// Helper to create middleware results
export const middlewareContinue = (): MiddlewareResult => ({
  continue: true,
});

export const middlewareStop = (response?: ServerMessage): MiddlewareResult => ({
  continue: false,
  response,
});
