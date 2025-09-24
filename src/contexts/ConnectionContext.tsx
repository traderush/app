'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface ConnectionStatus {
  isWebSocketConnected: boolean;
  connectedExchanges: string[];
  lastUpdateTime: number | null;
  currentBTCPrice: number;
  currentETHPrice: number;
  currentSOLPrice: number;
}

interface ConnectionContextType {
  connectionStatus: ConnectionStatus;
  updateConnectionStatus: (updates: Partial<ConnectionStatus>) => void;
  setWebSocketConnected: (connected: boolean) => void;
  setConnectedExchanges: (exchanges: string[]) => void;
  setLastUpdateTime: (time: number) => void;
  setCurrentPrices: (btc: number, eth: number, sol: number) => void;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export function ConnectionProvider({ children }: { children: React.ReactNode }) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isWebSocketConnected: false,
    connectedExchanges: [],
    lastUpdateTime: null,
    currentBTCPrice: 108200,
    currentETHPrice: 4385,
    currentSOLPrice: 200.67,
  });

  const updateConnectionStatus = useCallback((updates: Partial<ConnectionStatus>) => {
    setConnectionStatus(prev => ({ ...prev, ...updates }));
  }, []);

  const setWebSocketConnected = useCallback((connected: boolean) => {
    setConnectionStatus(prev => ({ ...prev, isWebSocketConnected: connected }));
  }, []);

  const setConnectedExchanges = useCallback((exchanges: string[]) => {
    setConnectionStatus(prev => ({ ...prev, connectedExchanges: exchanges }));
  }, []);

  const setLastUpdateTime = useCallback((time: number) => {
    setConnectionStatus(prev => ({ ...prev, lastUpdateTime: time }));
  }, []);

  const setCurrentPrices = useCallback((btc: number, eth: number, sol: number) => {
    setConnectionStatus(prev => ({ 
      ...prev, 
      currentBTCPrice: btc,
      currentETHPrice: eth,
      currentSOLPrice: sol,
      lastUpdateTime: Date.now()
    }));
  }, []);

  return (
    <ConnectionContext.Provider value={{
      connectionStatus,
      updateConnectionStatus,
      setWebSocketConnected,
      setConnectedExchanges,
      setLastUpdateTime,
      setCurrentPrices,
    }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnectionStatus() {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error('useConnectionStatus must be used within a ConnectionProvider');
  }
  return context;
}
