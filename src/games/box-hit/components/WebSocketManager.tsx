'use client';

import React, { useRef, useCallback, useEffect } from 'react';
import { useConnectionStatus } from '@/contexts/ConnectionContext';
import { logger } from '@/utils/logger';

interface WebSocketManagerProps {
  onPriceUpdate: (price: number) => void;
  onConnectionStatusChange: (connected: boolean) => void;
}

const WebSocketManager = React.memo<WebSocketManagerProps>(({
  onPriceUpdate,
  onConnectionStatusChange
}) => {
  const { setWebSocketConnected, setConnectedExchanges, setLastUpdateTime, setCurrentPrices } = useConnectionStatus();
  
  const wsRefs = useRef<Record<string, WebSocket>>({});
  const reconnectTimeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});
  const compositeTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // WebSocket connection management
  const connectWebSocket = useCallback((url: string, exchange: string) => {
    if (wsRefs.current[exchange]) {
      wsRefs.current[exchange].close();
    }

    try {
      const ws = new WebSocket(url);
      wsRefs.current[exchange] = ws;

      ws.onopen = () => {
        logger.info(`Connected to ${exchange}`, undefined, 'WEBSOCKET');
        setWebSocketConnected(true);
        setConnectedExchanges([exchange]);
        onConnectionStatusChange(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.price) {
            onPriceUpdate(data.price);
            setCurrentPrices(data.price, data.price * 0.04, data.price * 0.001);
            setLastUpdateTime(Date.now());
          }
        } catch (error) {
          logger.error(`Error parsing ${exchange} message:`, error, 'WEBSOCKET');
        }
      };

      ws.onerror = (error) => {
        logger.error(`${exchange} WebSocket error:`, error, 'WEBSOCKET');
        onConnectionStatusChange(false);
      };

      ws.onclose = () => {
        logger.info(`${exchange} WebSocket closed`, undefined, 'WEBSOCKET');
        setConnectedExchanges([]);
        
        // Attempt reconnection
        const timeout = setTimeout(() => {
          logger.info(`Reconnecting to ${exchange}...`, undefined, 'WEBSOCKET');
          connectWebSocket(url, exchange);
        }, 5000);
        
        reconnectTimeoutRefs.current[exchange] = timeout;
      };

    } catch (error) {
      logger.error(`Failed to connect to ${exchange}:`, error, 'WEBSOCKET');
    }
  }, [setWebSocketConnected, setConnectedExchanges, setCurrentPrices, setLastUpdateTime, onPriceUpdate, onConnectionStatusChange]);

  // Initialize WebSocket connections
  useEffect(() => {
    // Connect to Binance WebSocket
    connectWebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker', 'binance');
    
    // Connect to Coinbase WebSocket
    connectWebSocket('wss://ws-feed.exchange.coinbase.com', 'coinbase');

    return () => {
      // Cleanup WebSocket connections
      Object.values(wsRefs.current).forEach(ws => {
        if (ws) {
          ws.close();
        }
      });
      
      // Cleanup timers
      Object.values(reconnectTimeoutRefs.current).forEach(timeout => {
        if (timeout) {
          clearTimeout(timeout);
        }
      });
    };
  }, [connectWebSocket]);

  // Composite price calculation
  useEffect(() => {
    compositeTimerRef.current = setInterval(() => {
      // Calculate composite price from all connected exchanges
      const prices = Object.values(wsRefs.current)
        .filter(ws => ws.readyState === WebSocket.OPEN)
        .map(ws => {
          // This would need to be implemented based on actual price data
          return Math.random() * 1000 + 50000; // Placeholder
        });
      
      if (prices.length > 0) {
        const compositePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        onPriceUpdate(compositePrice);
      }
    }, 1000);

    return () => {
      if (compositeTimerRef.current) {
        clearInterval(compositeTimerRef.current);
      }
    };
  }, [onPriceUpdate]);

  return null; // This component doesn't render anything
});

WebSocketManager.displayName = 'WebSocketManager';

export default WebSocketManager;
