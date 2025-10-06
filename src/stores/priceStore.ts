import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface PricePoint {
  t: number; // timestamp
  p: number; // price
  v?: number; // volume
  h?: number; // high
  l?: number; // low
  o?: number; // open
  c?: number; // close
}

export interface PriceDataConfig {
  tickMs: number;
  live: boolean;
  initialPrice: number;
  volatility: number;
  maxDataPoints: number;
  exchanges: string[];
}

export interface WebSocketConnection {
  exchange: string;
  url: string;
  isConnected: boolean;
  lastUpdate: number;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

export interface PriceStats {
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  volatility: number;
  trend: 'up' | 'down' | 'neutral';
  lastUpdate: number;
}

interface PriceState {
  // Price Data
  priceData: PricePoint[];
  config: PriceDataConfig;
  connections: Record<string, WebSocketConnection>;
  
  // Computed Stats
  stats: PriceStats;
  
  // State
  isConnected: boolean;
  isSimulating: boolean;
  error: string | null;
  
  // Actions
  setPriceData: (data: PricePoint[]) => void;
  addPricePoint: (point: PricePoint) => void;
  updateConfig: (config: Partial<PriceDataConfig>) => void;
  
  // WebSocket Management
  connectWebSocket: (exchange: string, url: string) => void;
  disconnectWebSocket: (exchange: string) => void;
  updateConnectionStatus: (exchange: string, isConnected: boolean) => void;
  
  // Simulation
  startSimulation: () => void;
  stopSimulation: () => void;
  generateSimulatedPrice: (lastPrice: number) => number;
  
  // Stats
  updateStats: (stats: Partial<PriceStats>) => void;
  calculateStats: () => void;
  
  // Error Handling
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Complex Actions
  initializePriceData: () => void;
  resetPriceData: () => void;
  
  // Computed Values
  getLatestPrice: () => number;
  getPriceHistory: (timeframe: number) => PricePoint[];
  getPriceRange: (timeframe: number) => { min: number; max: number };
  getAveragePrice: (timeframe: number) => number;
  isPriceIncreasing: (timeframe: number) => boolean;
}

const initialConfig: PriceDataConfig = {
  tickMs: 2000,
  live: false,
  initialPrice: 117500,
  volatility: 0.02,
  maxDataPoints: 1000,
  exchanges: ['binance', 'coinbase'],
};

const initialStats: PriceStats = {
  currentPrice: initialConfig.initialPrice,
  priceChange24h: 0,
  priceChangePercent24h: 0,
  volume24h: 0,
  high24h: initialConfig.initialPrice,
  low24h: initialConfig.initialPrice,
  volatility: 0,
  trend: 'neutral',
  lastUpdate: Date.now(),
};

let simulationInterval: NodeJS.Timeout | null = null;
let wsConnections: Record<string, WebSocket> = {};

export const usePriceStore = create<PriceState>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    priceData: [],
    config: initialConfig,
    connections: {},
    stats: initialStats,
    isConnected: false,
    isSimulating: false,
    error: null,

    // Basic Actions
    setPriceData: (data) => set({ priceData: data }),

    addPricePoint: (point) =>
      set((state) => {
        const newData = [...state.priceData, point];
        // Keep only the last maxDataPoints
        const trimmedData = newData.length > state.config.maxDataPoints
          ? newData.slice(-state.config.maxDataPoints)
          : newData;

        return {
          priceData: trimmedData,
          stats: {
            ...state.stats,
            currentPrice: point.p,
            lastUpdate: point.t,
          },
        };
      }),

    updateConfig: (configUpdates) =>
      set((state) => ({
        config: { ...state.config, ...configUpdates },
      })),

    // WebSocket Management
    connectWebSocket: (exchange, url) =>
      set((state) => {
        if (wsConnections[exchange]) {
          wsConnections[exchange].close();
        }

        try {
          const ws = new WebSocket(url);
          wsConnections[exchange] = ws;

          ws.onopen = () => {
            set((state) => ({
              connections: {
                ...state.connections,
                [exchange]: {
                  ...state.connections[exchange],
                  isConnected: true,
                  lastUpdate: Date.now(),
                  reconnectAttempts: 0,
                },
              },
              isConnected: true,
              error: null,
            }));
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              let price: number;

              // Handle different exchange data formats
              if (exchange === 'binance') {
                price = parseFloat(data.c); // Current price
              } else if (exchange === 'coinbase') {
                price = parseFloat(data.price);
              } else {
                price = parseFloat(data.price || data.c || data.close);
              }

              if (price && !isNaN(price)) {
                const point: PricePoint = {
                  t: Date.now(),
                  p: price,
                  v: data.v || data.volume,
                  h: data.h || data.high,
                  l: data.l || data.low,
                  o: data.o || data.open,
                  c: data.c || data.close,
                };

                get().addPricePoint(point);
                get().calculateStats();

                set((state) => ({
                  connections: {
                    ...state.connections,
                    [exchange]: {
                      ...state.connections[exchange],
                      lastUpdate: Date.now(),
                    },
                  },
                }));
              }
            } catch (error) {
              console.error('Error parsing WebSocket data:', error);
              get().setError(`Failed to parse data from ${exchange}`);
            }
          };

          ws.onclose = () => {
            set((state) => ({
              connections: {
                ...state.connections,
                [exchange]: {
                  ...state.connections[exchange],
                  isConnected: false,
                },
              },
            }));

            // Attempt reconnection
            const connection = get().connections[exchange];
            if (connection && connection.reconnectAttempts < connection.maxReconnectAttempts) {
              setTimeout(() => {
                set((state) => ({
                  connections: {
                    ...state.connections,
                    [exchange]: {
                      ...state.connections[exchange],
                      reconnectAttempts: state.connections[exchange].reconnectAttempts + 1,
                    },
                  },
                }));
                get().connectWebSocket(exchange, url);
              }, 5000);
            }
          };

          ws.onerror = (error) => {
            console.error(`WebSocket error for ${exchange}:`, error.message || 'Unknown error');
            get().setError(`Connection error for ${exchange}`);
          };

          return {
            connections: {
              ...state.connections,
              [exchange]: {
                exchange,
                url,
                isConnected: false,
                lastUpdate: 0,
                reconnectAttempts: 0,
                maxReconnectAttempts: 5,
              },
            },
          };
        } catch (error) {
          console.error(`Failed to connect to ${exchange}:`, error);
          get().setError(`Failed to connect to ${exchange}`);
          return state;
        }
      }),

    disconnectWebSocket: (exchange) =>
      set((state) => {
        if (wsConnections[exchange]) {
          wsConnections[exchange].close();
          delete wsConnections[exchange];
        }

        const { [exchange]: _removed, ...remainingConnections } = state.connections;
        const isConnected = Object.values(remainingConnections).some((conn) => conn.isConnected);

        return {
          connections: remainingConnections,
          isConnected,
        };
      }),

    updateConnectionStatus: (exchange, isConnected) =>
      set((state) => ({
        connections: {
          ...state.connections,
          [exchange]: {
            ...state.connections[exchange],
            isConnected,
            lastUpdate: Date.now(),
          },
        },
        isConnected: Object.values({
          ...state.connections,
          [exchange]: { ...state.connections[exchange], isConnected },
        }).some((conn) => conn.isConnected),
      })),

    // Simulation
    startSimulation: () =>
      set((state) => {
        if (simulationInterval) return state;

        simulationInterval = setInterval(() => {
          const currentPrice = get().stats.currentPrice;
          const newPrice = get().generateSimulatedPrice(currentPrice);
          
          const point: PricePoint = {
            t: Date.now(),
            p: newPrice,
          };

          get().addPricePoint(point);
          get().calculateStats();
        }, state.config.tickMs);

        return { isSimulating: true };
      }),

    stopSimulation: () =>
      set(() => {
        if (simulationInterval) {
          clearInterval(simulationInterval);
          simulationInterval = null;
        }
        return { isSimulating: false };
      }),

    generateSimulatedPrice: (lastPrice) => {
      const state = get();
      const change = (Math.random() - 0.5) * 2 * state.config.volatility * lastPrice;
      return Math.max(lastPrice + change, lastPrice * 0.8); // Prevent extreme drops
    },

    // Stats
    updateStats: (statsUpdates) =>
      set((state) => ({
        stats: { ...state.stats, ...statsUpdates },
      })),

    calculateStats: () =>
      set((state) => {
        if (state.priceData.length === 0) return state;

        const prices = state.priceData.map((p) => p.p);
        const currentPrice = prices[prices.length - 1];
        const price24hAgo = prices[Math.max(0, prices.length - 720)]; // Assuming 2-second intervals

        const priceChange24h = currentPrice - price24hAgo;
        const priceChangePercent24h = (priceChange24h / price24hAgo) * 100;

        const high24h = Math.max(...prices.slice(-720));
        const low24h = Math.min(...prices.slice(-720));

        // Calculate volatility (standard deviation of price changes)
        const priceChanges = prices.slice(1).map((price, i) => (price - prices[i]) / prices[i]);
        const avgChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
        const volatility = Math.sqrt(
          priceChanges.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / priceChanges.length
        );

        const trend = priceChangePercent24h > 1 ? 'up' : priceChangePercent24h < -1 ? 'down' : 'neutral';

        return {
          stats: {
            ...state.stats,
            currentPrice,
            priceChange24h,
            priceChangePercent24h,
            high24h,
            low24h,
            volatility,
            trend,
            lastUpdate: Date.now(),
          },
        };
      }),

    // Error Handling
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),

    // Complex Actions
    initializePriceData: () =>
      set((state) => {
        const initialData: PricePoint[] = [];
        let price = state.config.initialPrice;

        // Generate initial historical data
        for (let i = 0; i < 50; i++) {
          price = get().generateSimulatedPrice(price);
          initialData.push({
            t: Date.now() - (50 - i) * state.config.tickMs,
            p: price,
          });
        }

        return {
          priceData: initialData,
          stats: {
            ...state.stats,
            currentPrice: price,
            lastUpdate: Date.now(),
          },
        };
      }),

    resetPriceData: () =>
      set(() => {
        // Close all WebSocket connections
        Object.values(wsConnections).forEach((ws) => ws.close());
        wsConnections = {};

        // Stop simulation
        if (simulationInterval) {
          clearInterval(simulationInterval);
          simulationInterval = null;
        }

        return {
          priceData: [],
          connections: {},
          stats: initialStats,
          isConnected: false,
          isSimulating: false,
          error: null,
        };
      }),

    // Computed Values
    getLatestPrice: () => {
      const state = get();
      return state.priceData.length > 0 ? state.priceData[state.priceData.length - 1].p : state.config.initialPrice;
    },

    getPriceHistory: (timeframe) => {
      const state = get();
      const cutoffTime = Date.now() - timeframe;
      return state.priceData.filter((point) => point.t >= cutoffTime);
    },

    getPriceRange: (timeframe) => {
      const history = get().getPriceHistory(timeframe);
      if (history.length === 0) return { min: 0, max: 0 };

      const prices = history.map((p) => p.p);
      return {
        min: Math.min(...prices),
        max: Math.max(...prices),
      };
    },

    getAveragePrice: (timeframe) => {
      const history = get().getPriceHistory(timeframe);
      if (history.length === 0) return 0;

      const total = history.reduce((sum, point) => sum + point.p, 0);
      return total / history.length;
    },

    isPriceIncreasing: (timeframe) => {
      const history = get().getPriceHistory(timeframe);
      if (history.length < 2) return false;

      const first = history[0].p;
      const last = history[history.length - 1].p;
      return last > first;
    },
  }))
);
