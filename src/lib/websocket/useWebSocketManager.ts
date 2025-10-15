/**
 * React hook for WebSocket Manager integration
 * Provides a clean interface for components to use the unified WebSocket service
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { WebSocketManager, WebSocketManagerOptions, MessageHandler } from './WebSocketManager';
import { WebSocketMessage } from '@/types/websocket';

export interface UseWebSocketManagerOptions extends WebSocketManagerOptions {
  autoConnect?: boolean;
  username?: string;
}

export interface UseWebSocketManagerReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  sessionId: string | null;
  connectionError: string | null;
  reconnectAttempts: number;
  
  // Connection methods
  connect: (username?: string) => Promise<void>;
  disconnect: () => void;
  
  // Message methods
  send: (message: { type: string; payload?: unknown }) => void;
  on: (messageType: string, handler: MessageHandler) => void;
  off: (messageType: string, handler: MessageHandler) => void;
  
  // WebSocket instance
  ws: WebSocketManager;
}

/**
 * React hook for WebSocket Manager
 */
export function useWebSocketManager(options: UseWebSocketManagerOptions = {}): UseWebSocketManagerReturn {
  const managerRef = useRef<WebSocketManager | null>(null);
  const [connectionState, setConnectionState] = useState({
    isConnected: false,
    isConnecting: false,
    isAuthenticated: false,
    userId: null as string | null,
    sessionId: null as string | null,
    connectionError: null as string | null,
    reconnectAttempts: 0,
  });

  // Initialize WebSocket manager
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new WebSocketManager({
        ...options,
        onConnected: () => {
          setConnectionState(managerRef.current!.getConnectionState());
          options.onConnected?.();
        },
        onDisconnected: () => {
          setConnectionState(managerRef.current!.getConnectionState());
          options.onDisconnected?.();
        },
        onError: (error: Error) => {
          setConnectionState(managerRef.current!.getConnectionState());
          options.onError?.(error);
        },
      });
    }

    return () => {
      // Cleanup on unmount
      if (managerRef.current) {
        managerRef.current.disconnect();
        managerRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Auto-connect if requested
  useEffect(() => {
    if (options.autoConnect && options.username && managerRef.current) {
      managerRef.current.connect(options.username);
    }
  }, [options.autoConnect, options.username]);

  const connect = useCallback(async (username?: string) => {
    if (managerRef.current) {
      await managerRef.current.connect(username || options.username || '');
      setConnectionState(managerRef.current.getConnectionState());
    }
  }, [options.username]);

  const disconnect = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.disconnect();
      setConnectionState(managerRef.current.getConnectionState());
    }
  }, []);

  const send = useCallback((message: { type: string; payload?: unknown }) => {
    if (managerRef.current) {
      managerRef.current.send(message);
    }
  }, []);

  const on = useCallback((messageType: string, handler: MessageHandler) => {
    if (managerRef.current) {
      managerRef.current.on(messageType, handler);
    }
  }, []);

  const off = useCallback((messageType: string, handler: MessageHandler) => {
    if (managerRef.current) {
      managerRef.current.off(messageType, handler);
    }
  }, []);

  return {
    ...connectionState,
    connect,
    disconnect,
    send,
    on,
    off,
    ws: managerRef.current!,
  };
}

export default useWebSocketManager;
