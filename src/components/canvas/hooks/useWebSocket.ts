import { useEffect, useState, useCallback, useRef } from 'react';
import { getWebSocketService } from '../services/websocket';
import type WebSocketService from '../services/websocket';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  username?: string;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  userId: string | null;
  sessionId: string | null;
  connect: (username?: string) => Promise<void>;
  disconnect: () => void;
  send: (message: { type: string; data?: unknown }) => void;
  on: (event: string, handler: (data: unknown) => void) => void;
  off: (event: string, handler: (data: unknown) => void) => void;
  ws: WebSocketService;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { autoConnect = false, username = `player_${Math.random().toString(36).substring(2, 11)}` } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocketService>(getWebSocketService());
  const ws = wsRef.current;

  // Set up event handlers
  useEffect(() => {
    ws.onConnected(() => {
      setIsConnected(true);
      setIsConnecting(false);
      setUserId(ws.getUserId());
      setSessionId(ws.getSessionId());
    });

    ws.onDisconnected(() => {
      setIsConnected(false);
      setIsConnecting(false);
    });

    ws.onError((error) => {
      console.error('WebSocket error:', error);
      setIsConnecting(false);
    });

    // Listen for session updates
    const sessionHandler = () => {
      setSessionId(ws.getSessionId());
    };
    ws.on('game_joined', sessionHandler);

    return () => {
      ws.off('game_joined', sessionHandler);
    };
  }, [ws]);

  const connect = useCallback(async (customUsername?: string) => {
    if (isConnected || isConnecting) return;
    
    setIsConnecting(true);
    try {
      await ws.connect(customUsername || username);
    } catch (error) {
      console.error('Failed to connect:', error);
      setIsConnecting(false);
    }
  }, [ws, username, isConnected, isConnecting]);

  const disconnect = useCallback(() => {
    ws.disconnect();
    setIsConnected(false);
    setUserId(null);
    setSessionId(null);
  }, [ws]);

  // Auto-connect if requested
  useEffect(() => {
    if (autoConnect && !isConnected && !isConnecting) {
      connect();
    }
  }, [autoConnect, connect, isConnected, isConnecting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, []);

  // Stable references for ws methods
  const send = useCallback((message: { type: string; data?: unknown }) => ws.send(message), [ws]);
  const on = useCallback((event: string, handler: (data: unknown) => void) => ws.on(event, handler), [ws]);
  const off = useCallback((event: string, handler: (data: unknown) => void) => ws.off(event, handler), [ws]);

  return {
    isConnected,
    isConnecting,
    userId,
    sessionId,
    connect,
    disconnect,
    send,
    on,
    off,
    ws,
  };
}