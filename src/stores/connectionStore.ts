import { create } from 'zustand';
import { WebSocketMessage } from '@/types/game';
import { subscribeWithSelector } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';

export interface ConnectionStatus {
  isWebSocketConnected: boolean;
  connectedExchanges: string[];
  lastUpdateTime: number | null;
  isBackendConnected: boolean;
}

// Simplified Connection State - focused only on connection management
interface ConnectionState {
  // Connection Status
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  
  // WebSocket specific
  isWebSocketConnected: boolean;
  connectedExchanges: string[];
  lastUpdateTime: number | null;
  
  // Backend API
  isBackendConnected: boolean;
  
  // Last message
  lastMessage: WebSocketMessage | null;
  
  // Actions
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setError: (error: string | null) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  
  // WebSocket actions
  setWebSocketConnected: (connected: boolean) => void;
  setConnectedExchanges: (exchanges: string[]) => void;
  addConnectedExchange: (exchange: string) => void;
  removeConnectedExchange: (exchange: string) => void;
  setLastUpdateTime: (time: number) => void;
  
  // Backend actions
  setBackendConnected: (connected: boolean) => void;
  setLastMessage: (message: WebSocketMessage | null) => void;
  
  // Complex actions
  updateConnectionStatus: (updates: Partial<ConnectionStatus>) => void;
  resetConnection: () => void;
}

const initialState = {
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  isWebSocketConnected: false,
  connectedExchanges: [],
  lastUpdateTime: null,
  isBackendConnected: false,
  lastMessage: null,
};

export const useConnectionStore = create<ConnectionState>()(
  devtools(
    subscribeWithSelector((set) => ({
    ...initialState,
    
    // Basic connection actions
    setConnected: (connected) => 
      set({ isConnected: connected, isConnecting: false, connectionError: connected ? null : undefined }),
    
    setConnecting: (connecting) => 
      set({ isConnecting: connecting }),
    
    setError: (error) => 
      set({ connectionError: error, isConnecting: false }),
    
    incrementReconnectAttempts: () => 
      set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 })),
    
    resetReconnectAttempts: () => 
      set({ reconnectAttempts: 0 }),
    
    // WebSocket actions
    setWebSocketConnected: (connected) =>
      set({ isWebSocketConnected: connected }),
    
    setConnectedExchanges: (exchanges) =>
      set({ connectedExchanges: exchanges }),
    
    addConnectedExchange: (exchange) =>
      set((state) => ({
        connectedExchanges: [...new Set([...state.connectedExchanges, exchange])],
      })),
    
    removeConnectedExchange: (exchange) =>
      set((state) => ({
        connectedExchanges: state.connectedExchanges.filter((e) => e !== exchange),
      })),
    
    setLastUpdateTime: (time) =>
      set({ lastUpdateTime: time }),
    
    // Backend actions
    setBackendConnected: (connected) =>
      set({ isBackendConnected: connected }),
    
    setLastMessage: (message) =>
      set({ lastMessage: message, lastUpdateTime: Date.now() }),
    
    // Complex actions
    updateConnectionStatus: (updates) =>
      set((state) => ({ ...state, ...updates })),
    
    resetConnection: () =>
      set(initialState),
  })),
  { name: 'ConnectionStore' }
)
);