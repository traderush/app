'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

interface PriceFeedManagerProps {
  onPriceUpdate: (price: number) => void;
  isLive?: boolean;
  realBTCPrice?: number;
}

const PriceFeedManager = React.memo(function PriceFeedManager({ 
  onPriceUpdate, 
  isLive = false, 
  realBTCPrice = 0 
}: PriceFeedManagerProps) {
  // WebSocket connections for multiple exchanges
  const wsRefs = useRef<{ [key: string]: WebSocket | null }>({});
  const reconnectTimeoutRefs = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});
  const exchangePricesRef = useRef<{ [key: string]: number }>({});
  const lastCompositePriceRef = useRef<number>(0);
  const priceHistoryRef = useRef<Array<{ time: number; price: number }>>([]);
  const compositeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Exchange weights for composite index
  const exchangeWeights = useMemo(() => ({
    'binance': 0.4,    // 40% weight - most reliable
    'coinbase': 0.3,   // 30% weight - major US exchange
    'kraken': 0.3      // 30% weight - major global exchange
  }), []);

  // Calculate composite BTC price from multiple exchanges
  const calculateCompositePrice = useCallback(() => {
    const prices = Object.values(exchangePricesRef.current);
    if (prices.length === 0) return null;
    
    // Calculate weighted average based on exchange weights
    let totalWeight = 0;
    let weightedSum = 0;
    
    Object.entries(exchangeWeights).forEach(([exchange, weight]) => {
      const price = exchangePricesRef.current[exchange];
      if (price && price > 0) {
        weightedSum += price * weight;
        totalWeight += weight;
      }
    });
    
    if (totalWeight === 0) return null;
    
    // Return weighted average with 2 decimal precision for smooth chart movement
    const compositePrice = Math.round((weightedSum / totalWeight) * 100) / 100;
    
    // Add small smoothing to prevent extreme jumps
    if (lastCompositePriceRef.current > 0) {
      const diff = compositePrice - lastCompositePriceRef.current;
      const maxJump = lastCompositePriceRef.current * 0.01; // Max 1% jump
      if (Math.abs(diff) > maxJump) {
        const smoothedPrice = lastCompositePriceRef.current + (diff > 0 ? maxJump : -maxJump);
        lastCompositePriceRef.current = smoothedPrice;
        return smoothedPrice;
      }
    }
    
    lastCompositePriceRef.current = compositePrice;
    return compositePrice;
  }, [exchangeWeights]);

  // Connect to exchange WebSocket
  const connectToExchange = useCallback((exchange: string) => {
    if (wsRefs.current[exchange]) return;

    const wsUrl = getExchangeWebSocketUrl(exchange);
    if (!wsUrl) {
      console.warn(`No WebSocket URL configured for exchange: ${exchange}`);
      return;
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRefs.current[exchange] = ws;

      ws.onopen = () => {
        console.log(`Connected to ${exchange} WebSocket`);
        subscribeToPriceFeed(ws, exchange);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const price = extractPriceFromMessage(data, exchange);
          if (price && price > 0) {
            exchangePricesRef.current[exchange] = price;
          }
        } catch (error) {
          console.error(`Error parsing ${exchange} message:`, error);
        }
      };

      ws.onclose = () => {
        console.log(`${exchange} WebSocket closed`);
        wsRefs.current[exchange] = null;
        scheduleReconnect(exchange);
      };

      ws.onerror = (error) => {
        console.error(`${exchange} WebSocket error:`, error.message || 'Unknown error');
      };
    } catch (error) {
      console.error(`Failed to connect to ${exchange}:`, error);
      scheduleReconnect(exchange);
    }
  }, []);

  // Get WebSocket URL for exchange
  const getExchangeWebSocketUrl = (exchange: string): string | null => {
    switch (exchange) {
      case 'binance':
        return 'wss://stream.binance.com:9443/ws/btcusdt@ticker';
      case 'coinbase':
        return 'wss://ws-feed.exchange.coinbase.com';
      case 'kraken':
        return 'wss://ws.kraken.com';
      default:
        return null;
    }
  };

  // Subscribe to price feed
  const subscribeToPriceFeed = (ws: WebSocket, exchange: string) => {
    switch (exchange) {
      case 'binance':
        // Binance subscription is automatic with the URL
        break;
      case 'coinbase':
        ws.send(JSON.stringify({
          type: 'subscribe',
          product_ids: ['BTC-USD'],
          channels: ['ticker']
        }));
        break;
      case 'kraken':
        ws.send(JSON.stringify({
          event: 'subscribe',
          pair: ['XBT/USD'],
          subscription: { name: 'ticker' }
        }));
        break;
    }
  };

  // Extract price from exchange message
  const extractPriceFromMessage = (data: any, exchange: string): number | null => {
    try {
      switch (exchange) {
        case 'binance':
          return parseFloat(data.c);
        case 'coinbase':
          return parseFloat(data.price);
        case 'kraken':
          if (data[1] && data[1].c) {
            return parseFloat(data[1].c[0]);
          }
          return null;
        default:
          return null;
      }
    } catch (error) {
      console.error(`Error extracting price from ${exchange}:`, error);
      return null;
    }
  };

  // Schedule reconnection
  const scheduleReconnect = useCallback((exchange: string) => {
    if (reconnectTimeoutRefs.current[exchange]) {
      clearTimeout(reconnectTimeoutRefs.current[exchange]);
    }
    
    reconnectTimeoutRefs.current[exchange] = setTimeout(() => {
      console.log(`Reconnecting to ${exchange}...`);
      connectToExchange(exchange);
    }, 5000);
  }, [connectToExchange]);

  // Start composite price calculation timer
  useEffect(() => {
    if (!isLive) return;

    compositeTimerRef.current = setInterval(() => {
      const compositePrice = calculateCompositePrice();
      if (compositePrice) {
        onPriceUpdate(compositePrice);
        
        // Store price history for chart
        priceHistoryRef.current.push({
          time: Date.now(),
          price: compositePrice
        });
        
        // Keep only last 1000 prices
        if (priceHistoryRef.current.length > 1000) {
          priceHistoryRef.current = priceHistoryRef.current.slice(-1000);
        }
      }
    }, 1000); // Update every second

    return () => {
      if (compositeTimerRef.current) {
        clearInterval(compositeTimerRef.current);
      }
    };
  }, [isLive, calculateCompositePrice, onPriceUpdate]);

  // Connect to exchanges when live mode is enabled
  useEffect(() => {
    if (isLive) {
      Object.keys(exchangeWeights).forEach(exchange => {
        connectToExchange(exchange);
      });
    } else {
      // Disconnect all WebSockets when not in live mode
      Object.keys(wsRefs.current).forEach(exchange => {
        const ws = wsRefs.current[exchange];
        if (ws) {
          ws.close();
          wsRefs.current[exchange] = null;
        }
        
        if (reconnectTimeoutRefs.current[exchange]) {
          clearTimeout(reconnectTimeoutRefs.current[exchange]);
          delete reconnectTimeoutRefs.current[exchange];
        }
      });
    }

    return () => {
      // Cleanup on unmount
      Object.keys(wsRefs.current).forEach(exchange => {
        const ws = wsRefs.current[exchange];
        if (ws) {
          ws.close();
        }
        
        if (reconnectTimeoutRefs.current[exchange]) {
          clearTimeout(reconnectTimeoutRefs.current[exchange]);
        }
      });
      
      if (compositeTimerRef.current) {
        clearInterval(compositeTimerRef.current);
      }
    };
  }, [isLive, connectToExchange, exchangeWeights]);

  // Use real BTC price when provided and not in live mode
  useEffect(() => {
    if (!isLive && realBTCPrice > 0) {
      onPriceUpdate(realBTCPrice);
    }
  }, [isLive, realBTCPrice, onPriceUpdate]);

  // This component doesn't render anything
  return null;
});

export default PriceFeedManager;
