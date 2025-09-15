/**
 * Main WebSocket server using Bun
 */

import { Server } from 'bun';
import { createLogger } from '../utils/logger';
import { ConnectionManager } from './ConnectionManager';
import { MessageRouter } from './MessageRouter';
import { validateClientMessage } from '../utils/validators';
import { handleWebSocketError } from '../utils/errors';
import { 
  ClientMessage, 
  ServerMessage, 
  createMessage,
  ServerMessageType,
  Connection
} from '../types';

const logger = createLogger('WebSocketServer');

export interface WebSocketServerConfig {
  port: number;
  host?: string;
  maxConnections?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
}

export class WebSocketServer {
  private server: Server | null = null;
  private connectionManager: ConnectionManager;
  private messageRouter: MessageRouter;
  private config: Required<WebSocketServerConfig>;
  private heartbeatInterval: NodeJS.Timer | null = null;

  constructor(
    config: WebSocketServerConfig,
    connectionManager: ConnectionManager,
    messageRouter: MessageRouter
  ) {
    this.config = {
      host: 'localhost',
      maxConnections: 10000,
      heartbeatInterval: 30000, // 30 seconds
      connectionTimeout: 60000, // 60 seconds
      ...config
    };
    this.connectionManager = connectionManager;
    this.messageRouter = messageRouter;
  }

  async start(): Promise<void> {
    try {
      this.server = Bun.serve({
        port: this.config.port,
        hostname: this.config.host,
        
        fetch: this.handleHttpRequest.bind(this),
        
        websocket: {
          message: this.handleMessage.bind(this),
          open: this.handleOpen.bind(this),
          close: this.handleClose.bind(this),
          drain: this.handleDrain.bind(this),
          ping: this.handlePing.bind(this),
          pong: this.handlePong.bind(this),
          maxPayloadLength: 16 * 1024 * 1024, // 16MB
          idleTimeout: 120, // 2 minutes
          backpressureLimit: 1024 * 1024, // 1MB
          perMessageDeflate: true // Enable compression
        }
      });

      // Start heartbeat interval
      this.startHeartbeat();

      logger.info('WebSocket server started', {
        port: this.config.port,
        host: this.config.host
      });
    } catch (error) {
      logger.error('Failed to start WebSocket server', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.server) {
      // Close all connections gracefully
      await this.connectionManager.closeAll();
      
      // Stop the server
      this.server.stop();
      this.server = null;
      
      logger.info('WebSocket server stopped');
    }
  }

  private handleHttpRequest(request: Request, server: Server): Response | Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        connections: this.connectionManager.getConnectionCount(),
        uptime: process.uptime()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // WebSocket upgrade
    if (url.pathname === '/ws') {
      const success = server.upgrade(request, {
        data: {
          createdAt: Date.now(),
        },
      });
      if (success) {
        return new Response(null, { status: 101 }); // WebSocket upgrade response
      }
      return new Response('Failed to upgrade', { status: 400 });
    }

    return new Response('Not found', { status: 404 });
  }

  private async handleOpen(ws: any): Promise<void> {
    const connectionId = this.generateConnectionId();
    ws.data = { connectionId };

    // Add connection to ConnectionManager
    this.connectionManager.addConnection(connectionId, ws);

    logger.info('WebSocket connection opened', { connectionId });

    // Don't send initial heartbeat immediately - wait for auth
  }

  private async handleMessage(ws: any, message: string | Buffer): Promise<void> {
    const { connectionId } = ws.data;
    
    try {
      // Parse message
      const data = typeof message === 'string' 
        ? JSON.parse(message)
        : JSON.parse(message.toString());

      // Log raw message for debugging validation errors
      if (!data || typeof data !== 'object') {
        logger.error('Invalid message format', { connectionId, rawMessage: message });
      }

      // Validate message format
      const validatedMessage = validateClientMessage(data) as ClientMessage;

      // Update last activity
      if (connectionId && this.connectionManager.hasConnection(connectionId)) {
        this.connectionManager.updateActivity(connectionId);
      }

      // Route message
      const response = await this.messageRouter.route(validatedMessage, ws);

      // Send response if any
      if (response) {
        this.sendMessage(ws, response);
      }
    } catch (error) {
      handleWebSocketError(ws, error, connectionId);
    }
  }

  private async handleClose(ws: any, code: number, reason: string): Promise<void> {
    const { connectionId, userId } = ws.data;

    logger.info('WebSocket connection closed', {
      connectionId,
      userId,
      code,
      reason
    });

    // Clean up connection
    if (connectionId) {
      await this.connectionManager.removeConnection(connectionId);
    }

    // Notify router of disconnection
    if (userId) {
      await this.messageRouter.handleDisconnect(userId);
    }
  }

  private handleDrain(ws: any): void {
    // Called when backpressure is reduced
    logger.debug('WebSocket backpressure drained', {
      connectionId: ws.data.connectionId
    });
  }

  private handlePing(ws: any, _data: Buffer): void {
    // Bun automatically responds with pong
    logger.debug('WebSocket ping received', {
      connectionId: ws.data.connectionId
    });
  }

  private handlePong(ws: any, _data: Buffer): void {
    // Update last activity on pong
    const { connectionId } = ws.data;
    if (connectionId && this.connectionManager.hasConnection(connectionId)) {
      this.connectionManager.updateActivity(connectionId);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const connections = this.connectionManager.getAllConnections();
      const now = Date.now();

      for (const conn of connections) {
        const ws = this.connectionManager.getWebSocket(conn.connectionId);
        if (!ws) continue;

        // Check if connection is stale
        if (now - conn.lastHeartbeat > this.config.connectionTimeout) {
          logger.warn('Closing stale connection', {
            connectionId: conn.connectionId,
            userId: conn.userId
          });
          ws.close(1000, 'Connection timeout');
          continue;
        }

        // Send heartbeat
        this.sendHeartbeat(ws);
      }
    }, this.config.heartbeatInterval);
  }

  private sendHeartbeat(ws: any): void {
    const message = createMessage(ServerMessageType.HEARTBEAT, {
      serverTime: Date.now()
    });
    this.sendMessage(ws, message);
  }

  sendMessage(ws: any, message: ServerMessage): boolean {
    try {
      if (ws.readyState === 1) { // OPEN
        const data = JSON.stringify(message);
        ws.send(data);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to send message', error, {
        connectionId: ws.data?.connectionId
      });
      return false;
    }
  }

  broadcast(message: ServerMessage, filter?: (conn: Connection) => boolean): void {
    const connections = filter 
      ? this.connectionManager.getAllConnections().filter(filter)
      : this.connectionManager.getAllConnections();

    for (const conn of connections) {
      const ws = this.connectionManager.getWebSocket(conn.connectionId);
      if (ws) {
        this.sendMessage(ws, message);
      }
    }
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}