/**
 * Manages WebSocket connections and user mappings
 */

import { Connection } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('ConnectionManager');

export class ConnectionManager {
  private connections: Map<string, Connection> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private webSockets: Map<string, any> = new Map();

  /**
   * Add a new connection
   */
  async addConnection(connectionId: string, ws: any): Promise<Connection> {
    const connection: Connection = {
      connectionId,
      userId: '', // Will be set after authentication
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      userAgent: ws.data?.userAgent,
    };

    this.connections.set(connectionId, connection);
    this.webSockets.set(connectionId, ws);

    logger.info('Connection added', { connectionId });
    return connection;
  }

  /**
   * Associate a connection with a user after authentication
   */
  async authenticateConnection(
    connectionId: string,
    userId: string
  ): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    // Check max connections per user
    const userConns = this.userConnections.get(userId) || new Set();

    // Update connection with user ID
    connection.userId = userId;

    // Update user connections mapping
    userConns.add(connectionId);
    this.userConnections.set(userId, userConns);

    // Update WebSocket data
    const ws = this.webSockets.get(connectionId);
    if (ws && ws.data) {
      ws.data.userId = userId;
    }

    logger.info('Connection authenticated', { connectionId, userId });
  }

  /**
   * Remove a connection
   */
  async removeConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    // Remove from user connections
    if (connection.userId) {
      const userConns = this.userConnections.get(connection.userId);
      if (userConns) {
        userConns.delete(connectionId);
        if (userConns.size === 0) {
          this.userConnections.delete(connection.userId);
        }
      }
    }

    // Remove connection and websocket
    this.connections.delete(connectionId);
    this.webSockets.delete(connectionId);

    logger.info('Connection removed', {
      connectionId,
      userId: connection.userId,
    });
  }

  /**
   * Get connection by ID
   */
  getConnection(connectionId: string): Connection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get all connections for a user
   */
  getUserConnections(userId: string): Connection[] {
    const connectionIds = this.userConnections.get(userId);
    if (!connectionIds) {
      return [];
    }

    const connections: Connection[] = [];
    for (const connId of connectionIds) {
      const conn = this.connections.get(connId);
      if (conn) {
        connections.push(conn);
      }
    }
    return connections;
  }

  /**
   * Get WebSocket for a connection
   */
  getWebSocket(connectionId: string): any {
    return this.webSockets.get(connectionId);
  }

  /**
   * Get all WebSockets for a user
   */
  getUserWebSockets(userId: string): any[] {
    const connections = this.getUserConnections(userId);
    return connections
      .map((conn) => this.webSockets.get(conn.connectionId))
      .filter((ws) => ws !== undefined);
  }

  /**
   * Update connection activity
   */
  updateActivity(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastHeartbeat = Date.now();
    }
  }

  /**
   * Check if connection exists
   */
  hasConnection(connectionId: string): boolean {
    return this.connections.has(connectionId);
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    const userConns = this.userConnections.get(userId);
    return userConns ? userConns.size > 0 : false;
  }

  /**
   * Get all connections
   */
  getAllConnections(): Connection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get user count
   */
  getUserCount(): number {
    return this.userConnections.size;
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    logger.info('Closing all connections', {
      count: this.connections.size,
    });

    for (const [connectionId, ws] of this.webSockets) {
      try {
        ws.close(1000, 'Server shutting down');
      } catch (error) {
        logger.error('Error closing connection', error, { connectionId });
      }
    }

    this.connections.clear();
    this.userConnections.clear();
    this.webSockets.clear();
  }

  /**
   * Get connection statistics
   */
  getStats() {
    const connections = Array.from(this.connections.values());
    const now = Date.now();

    return {
      totalConnections: connections.length,
      totalUsers: this.userConnections.size,
      averageConnectionTime:
        connections.reduce((sum, conn) => sum + (now - conn.connectedAt), 0) /
          connections.length || 0,
      connectionsByUser: Array.from(this.userConnections.entries()).map(
        ([userId, conns]) => ({
          userId,
          connections: conns.size,
        })
      ),
    };
  }

  /**
   * Clean up stale connections
   */
  cleanupStale(maxAge: number = 300000): number {
    // 5 minutes default
    const now = Date.now();
    let removed = 0;

    for (const [connectionId, connection] of this.connections) {
      if (now - connection.lastHeartbeat > maxAge) {
        const ws = this.webSockets.get(connectionId);
        if (ws) {
          ws.close(1000, 'Connection timeout');
        }
        this.removeConnection(connectionId);
        removed++;
      }
    }

    if (removed > 0) {
      logger.info('Cleaned up stale connections', { removed });
    }

    return removed;
  }
}
