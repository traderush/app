import { useState, useEffect, useRef, useCallback } from 'react';

export interface PricePoint {
  t: number; // timestamp
  p: number; // price
}

export interface PriceDataConfig {
  tickMs?: number;
  live?: boolean;
  initialPrice?: number;
  volatility?: number;
}

export const usePriceData = (config: PriceDataConfig = {}) => {
  const {
    tickMs = 2000,
    live = false,
    initialPrice = 117500,
    volatility = 0.02
  } = config;

  const [priceData, setPriceData] = useState<PricePoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState(initialPrice);
  const [isConnected, setIsConnected] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Generate simulated price data
  const generateSimulatedPrice = useCallback((lastPrice: number): number => {
    const change = (Math.random() - 0.5) * 2 * volatility * lastPrice;
    return Math.max(lastPrice + change, lastPrice * 0.8); // Prevent extreme drops
  }, [volatility]);

  // Add new price point
  const addPricePoint = useCallback((price: number) => {
    const now = Date.now();
    const newPoint: PricePoint = { t: now, p: price };
    
    setPriceData(prev => {
      const updated = [...prev, newPoint];
      // Keep only last 1000 points to prevent memory issues
      return updated.length > 1000 ? updated.slice(-1000) : updated;
    });
    
    setCurrentPrice(price);
    lastUpdateRef.current = now;
  }, []);

  // Start simulated price updates
  const startSimulation = useCallback(() => {
    if (intervalRef.current) return;
    
    intervalRef.current = setInterval(() => {
      setCurrentPrice(prevPrice => {
        const newPrice = generateSimulatedPrice(prevPrice);
        addPricePoint(newPrice);
        return newPrice;
      });
    }, tickMs);
  }, [tickMs, generateSimulatedPrice, addPricePoint]);

  // Stop simulation
  const stopSimulation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // WebSocket connection for live data
  const connectWebSocket = useCallback(() => {
    if (!live || wsRef.current) return;
    
    try {
      const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
      wsRef.current = ws;
      
      ws.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const price = parseFloat(data.c); // Current price
          addPricePoint(price);
        } catch (error) {
          console.error('Error parsing WebSocket data:', error);
        }
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
        wsRef.current = null;
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [live, addPricePoint]);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Initialize price data
  useEffect(() => {
    if (priceData.length === 0) {
      // Initialize with some historical data
      const initialData: PricePoint[] = [];
      let price = initialPrice;
      
      for (let i = 0; i < 50; i++) {
        price = generateSimulatedPrice(price);
        initialData.push({
          t: Date.now() - (50 - i) * tickMs,
          p: price
        });
      }
      
      setPriceData(initialData);
      setCurrentPrice(price);
    }
  }, [initialPrice, tickMs, generateSimulatedPrice, priceData.length]);

  // Start/stop based on mode
  useEffect(() => {
    if (live) {
      connectWebSocket();
      stopSimulation();
    } else {
      disconnectWebSocket();
      startSimulation();
    }

    return () => {
      stopSimulation();
      disconnectWebSocket();
    };
  }, [live, connectWebSocket, disconnectWebSocket, startSimulation, stopSimulation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSimulation();
      disconnectWebSocket();
    };
  }, [stopSimulation, disconnectWebSocket]);

  return {
    priceData,
    currentPrice,
    isConnected,
    addPricePoint,
    startSimulation,
    stopSimulation,
    connectWebSocket,
    disconnectWebSocket
  };
};
