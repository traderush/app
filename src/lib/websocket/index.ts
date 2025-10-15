/**
 * Unified WebSocket exports
 * Single entry point for all WebSocket functionality
 */

export {
  WebSocketManager,
  getWebSocketManager,
  createWebSocketManager,
  type WebSocketConfig,
  type MessageHandler,
  type ConnectionHandler,
  type ErrorHandler,
  type WebSocketManagerOptions,
} from './WebSocketManager';

export {
  useWebSocketManager,
  type UseWebSocketManagerOptions,
  type UseWebSocketManagerReturn,
} from './useWebSocketManager';

// Re-export types from websocket.ts for convenience
export type { WebSocketMessage } from '@/types/websocket';
