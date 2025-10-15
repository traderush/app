/**
 * Unified WebSocket Manager for TradeRush
 * Consolidates all WebSocket functionality into a single, efficient service
 */

import { WebSocketMessage } from '@/types/websocket';

export interface WebSocketConfig {
  url?: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
}

export type MessageHandler = (message: WebSocketMessage) => void;
export type ConnectionHandler = () => void;
export type ErrorHandler = (error: Error) => void;

export interface WebSocketManagerOptions {
  config?: WebSocketConfig;
  onConnected?: ConnectionHandler;
  onDisconnected?: ConnectionHandler;
  onError?: ErrorHandler;
  autoConnect?: boolean;
  username?: string;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private messageHandlers = new Map<string, Set<MessageHandler>>();
  private messageQueue: WebSocketMessage[] = [];
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private connectionTimeoutTimer: NodeJS.Timeout | null = null;
  
  private config: Required<WebSocketConfig>;
  private options: Required<WebSocketManagerOptions>;
  
  // Connection state
  private userId: string | null = null;
  private sessionId: string | null = null;
  private isAuthenticated = false;
  private isConnecting = false;
  private isConnected = false;
  private connectionError: string | null = null;

  constructor(options: WebSocketManagerOptions = {}) {
    this.config = {
      url: options.config?.url || 'ws://localhost:8080/ws',
      reconnectAttempts: options.config?.reconnectAttempts || 5,
      reconnectDelay: options.config?.reconnectDelay || 1000,
      heartbeatInterval: options.config?.heartbeatInterval || 30000,
      connectionTimeout: options.config?.connectionTimeout || 5000,
    };

    this.options = {
      config: this.config,
      onConnected: options.onConnected || (() => {}),
      onDisconnected: options.onDisconnected || (() => {}),
      onError: options.onError || (() => {}),
      autoConnect: options.autoConnect || false,
      username: options.username || '',
    };

    // Auto-connect if requested
    if (this.options.autoConnect && this.options.username) {
      this.connect(this.options.username);
    }
  }

  /**
   * Connect to WebSocket server
   */
  async connect(username: string): Promise<void> {
    if (this.isConnecting || this.isConnected) {
      return;
    }

    this.isConnecting = true;
    this.connectionError = null;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${this.config.url}?username=${encodeURIComponent(username)}`);
        
        // Set connection timeout
        this.connectionTimeoutTimer = setTimeout(() => {
          if (this.ws?.readyState === WebSocket.CONNECTING) {
            this.ws.close();
            this.handleConnectionError(new Error('Connection timeout'));
            reject(new Error('WebSocket connection timeout'));
          }
        }, this.config.connectionTimeout);

        this.ws.onopen = () => {
          this.isConnecting = false;
          this.isConnected = true;
          this.connectionError = null;
          this.reconnectAttempts = 0;
          
          this.clearConnectionTimeout();
          this.startHeartbeat();
          this.processMessageQueue();
          
          this.options.onConnected();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
            this.options.onError(error as Error);
          }
        };

        this.ws.onclose = (event) => {
          this.isConnecting = false;
          this.isConnected = false;
          this.isAuthenticated = false;
          
          this.clearConnectionTimeout();
          this.stopHeartbeat();
          
          this.options.onDisconnected();
          
          // Attempt reconnection if not a clean close
          if (event.code !== 1000 && this.reconnectAttempts < this.config.reconnectAttempts) {
            this.scheduleReconnect(username);
          }
        };

        this.ws.onerror = (event) => {
          const error = new Error('WebSocket connection error');
          this.handleConnectionError(error);
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        this.handleConnectionError(error as Error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isConnecting = false;
    this.isConnected = false;
    this.isAuthenticated = false;
    
    this.clearReconnectTimer();
    this.clearConnectionTimeout();
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.options.onDisconnected();
  }

  /**
   * Send a message through WebSocket
   */
  send(message: { type: string; payload?: unknown }): void {
    // Add messageId and timestamp if not present (required by backend)
    const fullMessage = {
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      type: message.type,
      payload: message.payload,
    } as WebSocketMessage;

    if (!this.isConnected || !this.ws) {
      // Queue message for later if not connected
      this.messageQueue.push(fullMessage);
      return;
    }

    try {
      this.ws.send(JSON.stringify(fullMessage));
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      this.options.onError(error as Error);
    }
  }

  /**
   * Register a message handler for a specific message type
   */
  on(messageType: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }
    this.messageHandlers.get(messageType)!.add(handler);
  }

  /**
   * Unregister a message handler
   */
  off(messageType: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.messageHandlers.delete(messageType);
      }
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      isAuthenticated: this.isAuthenticated,
      userId: this.userId,
      sessionId: this.sessionId,
      connectionError: this.connectionError,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  // Private methods

  private handleMessage(message: WebSocketMessage): void {
    // Handle authentication messages
    if (message.type === 'connected') {
      const payload = message.payload as { userId: string; username: string; balance: number };
      this.userId = payload.userId;
      this.isAuthenticated = true;
    } else if (message.type === 'game_joined') {
      const payload = message.payload as { sessionId: string };
      this.sessionId = payload.sessionId;
    }

    // Call registered handlers
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in message handler for ${message.type}:`, error);
          this.options.onError(error as Error);
        }
      });
    }

    // Also call wildcard handlers
    const wildcardHandlers = this.messageHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('Error in wildcard message handler:', error);
          this.options.onError(error as Error);
        }
      });
    }
  }

  private handleConnectionError(error: Error): void {
    this.connectionError = error.message;
    this.options.onError(error);
  }

  private scheduleReconnect(username: string): void {
    if (this.reconnectTimer) {
      return; // Already scheduled
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(username).catch(() => {
        // Reconnection failed, will be handled by onclose
      });
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearConnectionTimeout(): void {
    if (this.connectionTimeoutTimer) {
      clearTimeout(this.connectionTimeoutTimer);
      this.connectionTimeoutTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.ws) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message && this.isConnected && this.ws) {
        try {
          this.ws.send(JSON.stringify(message));
        } catch (error) {
          console.error('Failed to send queued WebSocket message:', error);
          this.options.onError(error as Error);
        }
      }
    }
  }
}

// Singleton instance for global use
let globalWebSocketManager: WebSocketManager | null = null;

/**
 * Get the global WebSocket manager instance
 */
export function getWebSocketManager(): WebSocketManager {
  if (!globalWebSocketManager) {
    globalWebSocketManager = new WebSocketManager({
      autoConnect: false,
    });
  }
  return globalWebSocketManager;
}

/**
 * Create a new WebSocket manager instance
 */
export function createWebSocketManager(options?: WebSocketManagerOptions): WebSocketManager {
  return new WebSocketManager(options);
}

export default WebSocketManager;
