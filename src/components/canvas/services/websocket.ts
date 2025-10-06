// WebSocket Service for TradeRush

export interface WebSocketMessage {
  type: string;
  payload?: unknown;
  timestamp?: number;
}

export type MessageHandler = (message: WebSocketMessage) => void;

export interface WebSocketConfig {
  url?: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private messageHandlers = new Map<string, Set<MessageHandler>>();
  private messageQueue: WebSocketMessage[] = [];
  private reconnectAttempts = 0;
  private config: Required<WebSocketConfig>;
  
  // Connection state
  private userId: string | null = null;
  private sessionId: string | null = null;
  private isAuthenticated = false;
  
  // Callbacks
  private onConnectedCallback?: () => void;
  private onDisconnectedCallback?: () => void;
  private onErrorCallback?: (error: Error) => void;

  constructor(config: WebSocketConfig = {}) {
    this.config = {
      url: config.url || 'ws://localhost:8080/ws',
      reconnectAttempts: config.reconnectAttempts || 5,
      reconnectDelay: config.reconnectDelay || 1000,
    };
  }

  async connect(username: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Set a timeout for the connection attempt
      const timeoutId = setTimeout(() => {
        if (this.ws?.readyState === WebSocket.CONNECTING) {
          this.ws.close();
          reject(new Error('WebSocket connection timeout'));
        }
      }, 5000); // 5 second timeout

      try {
        console.log('Attempting to connect to WebSocket:', this.config.url);
        this.ws = new WebSocket(this.config.url);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected successfully');
          clearTimeout(timeoutId); // Clear the timeout
          this.reconnectAttempts = 0;
          
          // Send auth message immediately
          this.send({
            type: 'auth',
            payload: {
              token: username
            }
          });
          
          // Wait for auth confirmation
          const authHandler = (msg: any) => {
            if (msg.type === 'connected') {
              this.userId = msg.userId;
              this.isAuthenticated = true;
              this.off('connected', authHandler);
              
              // Process queued messages
              this.processMessageQueue();
              
              if (this.onConnectedCallback) {
                this.onConnectedCallback();
              }
              
              resolve();
            }
          };
          
          this.on('connected', authHandler);
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          console.error('WebSocket readyState:', this.ws?.readyState);
          clearTimeout(timeoutId); // Clear the timeout on error
          if (this.onErrorCallback) {
            this.onErrorCallback(new Error('WebSocket connection error'));
          }
          reject(new Error('WebSocket connection failed'));
        };
        
        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          clearTimeout(timeoutId); // Clear the timeout on close
          this.isAuthenticated = false;
          
          if (this.onDisconnectedCallback) {
            this.onDisconnectedCallback();
          }
          
          // Attempt reconnection
          if (this.reconnectAttempts < this.config.reconnectAttempts) {
            setTimeout(() => {
              console.log(`Reconnecting... (attempt ${this.reconnectAttempts + 1})`);
              this.reconnect(username);
            }, this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts));
            this.reconnectAttempts++;
          }
        };
        
        // Heartbeat handler - commented out as backend doesn't expect pong messages
        // this.on('heartbeat', () => {
        //   this.send({ type: 'pong', timestamp: Date.now() });
        // });
        
      } catch (error) {
        reject(error);
      }
    });
  }

  private async reconnect(username: string): Promise<void> {
    try {
      await this.connect(username);
      
      // Rejoin game if we were in one
      if (this.sessionId) {
        // The backend should handle session recovery
        this.send({
          type: 'get_state',
          payload: {}
        });
      }
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers.clear();
    this.messageQueue = [];
    this.userId = null;
    this.sessionId = null;
    this.isAuthenticated = false;
  }

  send(message: any): void {
    // Add messageId and timestamp if not present
    const fullMessage = {
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      ...message
    };

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Queue message if not connected
      this.messageQueue.push(fullMessage);
      return;
    }

    if (!this.isAuthenticated && message.type !== 'auth') {
      // Queue non-auth messages until authenticated
      this.messageQueue.push(fullMessage);
      return;
    }

    try {
      this.ws.send(JSON.stringify(fullMessage));
    } catch (error) {
      console.error('Failed to send message:', error);
      this.messageQueue.push(fullMessage);
    }
  }

  on(messageType: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }
    this.messageHandlers.get(messageType)!.add(handler);
  }

  off(messageType: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  once(messageType: string, handler: MessageHandler): void {
    const onceHandler = (message: any) => {
      handler(message);
      this.off(messageType, onceHandler);
    };
    this.on(messageType, onceHandler);
  }

  private handleMessage(message: any): void {
    // Store session ID when game is joined
    if (message.type === 'game_joined') {
      this.sessionId = message.sessionId;
    }

    // Call all registered handlers for this message type
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in message handler for ${message.type}:`, error);
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
        }
      });
    }
  }

  private processMessageQueue(): void {
    const queue = [...this.messageQueue];
    this.messageQueue = [];
    
    queue.forEach(message => {
      this.send(message);
    });
  }

  // State getters
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getUserId(): string | null {
    return this.userId;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  // Event callbacks
  onConnected(callback: () => void): void {
    this.onConnectedCallback = callback;
  }

  onDisconnected(callback: () => void): void {
    this.onDisconnectedCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }
}

// Singleton instance
let instance: WebSocketService | null = null;

export function getWebSocketService(config?: WebSocketConfig): WebSocketService {
  if (!instance) {
    instance = new WebSocketService(config);
  }
  return instance;
}

export default WebSocketService;