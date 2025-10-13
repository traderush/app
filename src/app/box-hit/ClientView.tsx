'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import RightPanel from '@/games/box-hit/RightPanel';
import PositionsTable from '@/games/box-hit/PositionsTable';
import CustomSlider from '@/components/CustomSlider';
import { playSelectionSound, playHitSound, cleanupSoundManager } from '@/lib/sound/SoundManager';
import { useGameStore, usePriceStore, useConnectionStore, useUIStore } from '@/stores';
import { useUserStore } from '@/stores/userStore';
import ErrorBoundary from '@/components/ErrorBoundary';
import { logger } from '@/utils/logger';
import Canvas from '@/components/canvas/Canvas';

// Sound management is now handled by SoundManager.ts

/** brand */
// Signature color is now managed by context

/** centralized trading colors */
const TRADING_COLORS = {
  positive: '#2fe3ac',  // Green for positive values (gains, up movements)
  negative: '#ec397a',  // Red for negative values (losses, down movements)
} as const;



/**
 * Main ClientView component for the BoxHit trading game
 * 
 * Features:
 * - Real-time WebSocket connections to multiple exchanges
 * - Live price data integration with canvas rendering
 * - Dynamic connection status with rich tooltips
 * - Comprehensive error handling and user feedback
 * - Zustand state management for game settings
 * - Toast notification system for user interactions
 * 
 * @returns JSX element containing the complete trading interface
 */
export default function ClientView() {
  // Cleanup sound manager and WebSocket connections on unmount
  useEffect(() => {
    return () => {
      // Cleanup sound manager
      cleanupSoundManager();
      
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
      
      // Cleanup composite price timer
      if (compositeTimerRef.current) {
        clearInterval(compositeTimerRef.current);
      }
      
      // Cleanup selection update timeout
      if (selectionUpdateTimeoutRef.current) {
        clearTimeout(selectionUpdateTimeoutRef.current);
      }
    };
  }, []);
  
  // Get signature color from UI store
  const signatureColor = useUIStore((state) => state.signatureColor);
  
  // Connection store - use refs + throttled state for optimal performance
  // Refs hold latest values (no re-renders), state updates throttled for UI display
  const currentBTCPriceRef = useRef(0);
  const currentETHPriceRef = useRef(0);
  const currentSOLPriceRef = useRef(0);
  const [currentBTCPrice, setCurrentBTCPrice] = useState(0);
  const [currentETHPrice, setCurrentETHPrice] = useState(0);
  const [currentSOLPrice, setCurrentSOLPrice] = useState(0);
  const [btc24hChange, setBtc24hChange] = useState(0);
  const [btc24hVolume, setBtc24hVolume] = useState(0);
  const [btc24hHigh, setBtc24hHigh] = useState(0);
  const [btc24hLow, setBtc24hLow] = useState(0);
  const [eth24hChange, setEth24hChange] = useState(0);
  const [eth24hVolume, setEth24hVolume] = useState(0);
  const [sol24hChange, setSol24hChange] = useState(0);
  const [sol24hVolume, setSol24hVolume] = useState(0);
  
  // Subscribe to store updates - refs update immediately, state throttled for UI
  useEffect(() => {
    let lastUIUpdate = 0;
    const UI_UPDATE_THROTTLE = 1000; // Update UI max once per second
    
    const unsubscribe = useConnectionStore.subscribe(
      (state) => ({
        currentBTCPrice: state.currentBTCPrice,
        currentETHPrice: state.currentETHPrice,
        currentSOLPrice: state.currentSOLPrice,
        btc24hChange: state.btc24hChange,
        btc24hVolume: state.btc24hVolume,
        btc24hHigh: state.btc24hHigh,
        btc24hLow: state.btc24hLow,
        eth24hChange: state.eth24hChange,
        eth24hVolume: state.eth24hVolume,
        sol24hChange: state.sol24hChange,
        sol24hVolume: state.sol24hVolume,
      }),
      (values) => {
        // Always update refs immediately (no re-renders)
        currentBTCPriceRef.current = values.currentBTCPrice;
        currentETHPriceRef.current = values.currentETHPrice;
        currentSOLPriceRef.current = values.currentSOLPrice;
        
        // Throttle state updates for UI (causes re-renders)
        const now = Date.now();
        if (now - lastUIUpdate >= UI_UPDATE_THROTTLE) {
          lastUIUpdate = now;
          setCurrentBTCPrice(values.currentBTCPrice);
          setCurrentETHPrice(values.currentETHPrice);
          setCurrentSOLPrice(values.currentSOLPrice);
          setBtc24hChange(values.btc24hChange);
          setBtc24hVolume(values.btc24hVolume);
          setBtc24hHigh(values.btc24hHigh);
          setBtc24hLow(values.btc24hLow);
          setEth24hChange(values.eth24hChange);
          setEth24hVolume(values.eth24hVolume);
          setSol24hChange(values.sol24hChange);
          setSol24hVolume(values.sol24hVolume);
        }
      }
    );
    return () => unsubscribe();
  }, []);
  
  // Get actions from store
  const setWebSocketConnected = useConnectionStore((state) => state.setWebSocketConnected);
  const setConnectedExchanges = useConnectionStore((state) => state.setConnectedExchanges);
  const setLastUpdateTime = useConnectionStore((state) => state.setLastUpdateTime);
  const setCurrentPrices = useConnectionStore((state) => state.setCurrentPrices);
  const set24hStats = useConnectionStore((state) => state.set24hStats);
  
  // Zustand stores - get only the actions we need
  const updateGameSettings = useGameStore((state) => state.updateGameSettings);
  const updateGameStats = useGameStore((state) => state.updateGameStats);
  
  // Zustand setter functions
  const setIsTradingMode = (mode: boolean) => updateGameSettings({ isTradingMode: mode });
  const setSelectedAsset = (asset: 'BTC' | 'ETH' | 'SOL' | 'DEMO') => updateGameSettings({ selectedAsset: asset });
  const setShowProbabilities = (show: boolean) => updateGameSettings({ showProbabilities: show });
  const setShowOtherPlayers = (show: boolean) => updateGameSettings({ showOtherPlayers: show });
  const setMinMultiplier = (mult: number) => updateGameSettings({ minMultiplier: mult });
  const setZoomLevel = (level: number) => updateGameSettings({ zoomLevel: level });
  const setTimeframe = (ms: number) => updateGameSettings({ timeframe: ms });
  
  const addPricePoint = usePriceStore((state) => state.addPricePoint);
  
  // UI store for dropdowns and preferences
  const favoriteAssets = useUIStore((state) => state.favoriteAssets);
  const isAssetDropdownOpen = useUIStore((state) => state.isAssetDropdownOpen);
  const toggleFavoriteAsset = useUIStore((state) => state.toggleFavoriteAsset);
  const setAssetDropdownOpen = useUIStore((state) => state.setAssetDropdownOpen);
  
  // UserStore integration for mock backend PnL tracking
  const addTrade = useUserStore((state) => state.addTrade);
  const settleTrade = useUserStore((state) => state.settleTrade);
  
  // Get individual values to avoid object recreation on every render
  const balance = useUserStore((state) => state.balance);
  const activeTradesCount = useUserStore((state) => state.activeTrades.length);
  const tradeHistoryCount = useUserStore((state) => state.tradeHistory.length);
  const totalProfit = useUserStore((state) => state.stats.totalProfit);
  
  // Debug userStore state changes (only when values actually change)
  useEffect(() => {
    console.log('📊 Mock Backend - UserStore state changed:', {
      balance,
      activeTradesCount,
      tradeHistoryCount,
      totalProfit
    });
  }, [balance, activeTradesCount, tradeHistoryCount, totalProfit]);
  
  
  // Local state for UI-specific data (not part of game logic)
  const [selectedCount, setSelectedCount] = useState(0);
  const [bestMultiplier, setBestMultiplier] = useState(0);
  const [selectedMultipliers, setSelectedMultipliers] = useState<number[]>([]);
  const [averagePositionPrice, setAveragePositionPrice] = useState<number | null>(null);
  const [isPriceUpdating, setIsPriceUpdating] = useState(false); // Loading state for price updates
  
  // Use Zustand store for game settings - subscribe to individual values
  const minMultiplier = useGameStore((state) => state.gameSettings.minMultiplier);
  const showOtherPlayers = useGameStore((state) => state.gameSettings.showOtherPlayers);
  const isTradingMode = useGameStore((state) => state.gameSettings.isTradingMode);
  const zoomLevel = useGameStore((state) => state.gameSettings.zoomLevel);
  const showProbabilities = useGameStore((state) => state.gameSettings.showProbabilities);
  const selectedAsset = useGameStore((state) => state.gameSettings.selectedAsset);
  const gameBetAmount = useGameStore((state) => state.gameSettings.betAmount);
  const timeframe = useGameStore((state) => state.gameSettings.timeframe);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false); // WebSocket connection status
  const [wsConnectionFailures, setWsConnectionFailures] = useState<Record<string, number>>({}); // Track connection failures
  const wsConnectionStatusRef = useRef(false); // Track WebSocket connection status to prevent unnecessary store updates
  const lastUpdateTimeStoreRef = useRef(0); // Track last time we updated the store to throttle updates
  
  // Audio context initialization is now handled by SoundManager
  
  // Toggle favorite asset (now uses Zustand store)
  const toggleFavorite = (asset: 'BTC' | 'ETH' | 'SOL' | 'DEMO', event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent dropdown from closing
    toggleFavoriteAsset(asset);
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.asset-dropdown')) {
        setAssetDropdownOpen(false);
      }
    };
    
    if (isAssetDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAssetDropdownOpen]);
  
  // Helper function to format volume in billions
  const formatVolumeInBillions = (volume: number): string => {
    const billions = volume / 1_000_000_000;
    return `${billions.toFixed(2)}B`;
  };

  // Asset data with live prices and 24h stats from Binance API
  const assetData = {
    DEMO: {
      name: 'Demo Asset',
      symbol: 'DEMO',
      icon: 'https://framerusercontent.com/images/dWPrOABO15xb2dkrxTZj3Z6cAU.png?width=256&height=256',
      price: 100.00, // Fixed demo price
      change24h: 2.50,
      volume24h: '45.20B'
    },
    BTC: {
      name: 'Bitcoin',
      symbol: 'BTC',
      icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/d8/fd/f6/d8fdf69a-e716-1018-1740-b344df03476a/AppIcon-0-0-1x_U007epad-0-11-0-sRGB-85-220.png/460x0w.webp',
      price: currentBTCPrice || null, // null until real data loads
      change24h: btc24hChange,
      volume24h: btc24hVolume > 0 ? formatVolumeInBillions(btc24hVolume) : '0.00B'
    },
    ETH: {
      name: 'Ethereum',
      symbol: 'ETH',
      icon: 'https://static1.tokenterminal.com//ethereum/logo.png?logo_hash=fd8f54cab23f8f4980041f4e74607cac0c7ab880',
      price: currentETHPrice || null, // null until real data loads
      change24h: eth24hChange,
      volume24h: eth24hVolume > 0 ? formatVolumeInBillions(eth24hVolume) : '0.00B'
    },
    SOL: {
      name: 'Solana',
      symbol: 'SOL',
      icon: 'https://avatarfiles.alphacoders.com/377/377220.png',
      price: currentSOLPrice || null, // null until real data loads
      change24h: sol24hChange,
      volume24h: sol24hVolume > 0 ? formatVolumeInBillions(sol24hVolume) : '0.00B'
    }
  };
  
  
  // Toast notification state - support up to 5 stacked toasts with animation states
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; timestamp: number; isVisible: boolean }>>([]);
  
  /**
   * Displays a toast notification to the user
   * @param message - The message to display in the toast
   */
  const showToast = useCallback((message: string) => {
    const newToastId = Date.now();
    const newToast = {
      id: newToastId,
      message,
      timestamp: Date.now(),
      isVisible: true
    };
    
    setToasts(prev => {
      const updated = [...prev, newToast];
      // Archive oldest toasts if we exceed 5, keeping only the latest 5
      if (updated.length > 5) {
        return updated.slice(-5);
      }
      return updated;
    });
    
    // Start fade out after 2.5 seconds, then remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.map(toast => 
        toast.id === newToastId ? { ...toast, isVisible: false } : toast
      ));
    }, 2500);
    
    // Remove toast completely after fade out completes
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== newToastId));
    }, 3000);
  }, []);
  
  // Ref to track the previous count to detect actual new selections
  const previousCountRef = useRef<number>(0);
  
  // Ref to track individual selection events for reliable position tracking
  const selectionEventsRef = useRef<Set<string>>(new Set());
  
  // Ref to track the last known selection state to detect actual changes
  const lastKnownSelectionRef = useRef<string>('');
  

  
  // Debounce selection updates to prevent performance issues
  const selectionUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Bet amount state - synced with right panel
  const [betAmount, setBetAmount] = useState(200);
  const [activeTab, setActiveTab] = useState<'place' | 'copy'>('copy');
  const [isCanvasStarted, setIsCanvasStarted] = useState(false); // Controls mock backend canvas
  const [mockBackendPositions, setMockBackendPositions] = useState<Map<string, any>>(new Map());
  const [mockBackendContracts, setMockBackendContracts] = useState<any[]>([]);
  const [mockBackendHitBoxes, setMockBackendHitBoxes] = useState<string[]>([]);
  const [mockBackendMissedBoxes, setMockBackendMissedBoxes] = useState<string[]>([]);
  const [mockBackendCurrentPrice, setMockBackendCurrentPrice] = useState(100);
  
  // Mock backend selection stats (updated immediately when boxes are selected)
  const [mockBackendSelectedCount, setMockBackendSelectedCount] = useState(0);
  const [mockBackendSelectedMultipliers, setMockBackendSelectedMultipliers] = useState<number[]>([]);
  const [mockBackendBestMultiplier, setMockBackendBestMultiplier] = useState(0);
  const [mockBackendSelectedAveragePrice, setMockBackendSelectedAveragePrice] = useState<number | null>(null);
  
  // Handle mock backend selection changes (immediate feedback when boxes are selected)
  const handleMockBackendSelectionChange = useCallback((count: number, best: number, multipliers: number[], averagePrice?: number | null) => {
    console.log('📊 ClientView: Selection changed from Canvas:', {
      count,
      bestMultiplier: best,
      multipliers,
      averagePrice
    });
    setMockBackendSelectedCount(count);
    setMockBackendBestMultiplier(best);
    setMockBackendSelectedMultipliers(multipliers);
    setMockBackendSelectedAveragePrice(averagePrice ?? null);
  }, []);
  
  // Keep track of previous positions using a ref to avoid infinite loops
  const previousPositionsRef = useRef<Map<string, any>>(new Map());
  
  // Handle mock backend positions and contracts update
  // Keep this callback stable (no dependencies) to ensure Canvas always calls it properly
  const handleMockBackendPositionsChange = useCallback((positions: Map<string, any>, contracts: any[], hitBoxes: string[], missedBoxes: string[]) => {
    console.log('🔄 ClientView: Received from Canvas:', { 
      activePositionsSize: positions.size,
      positions: Array.from(positions.entries()),
      hitBoxes, 
      missedBoxes,
      contractsCount: contracts.length
    });
    
    // Track new positions in userStore
    const previousPositions = previousPositionsRef.current;
    
    // Find new positions that weren't in the previous state
    positions.forEach((position, positionId) => {
      if (!previousPositions.has(positionId)) {
        console.log('➕ New position detected, adding trade to userStore:', {
          positionId,
          contractId: position.contractId,
          amount: betAmount
        });
        
        // Add trade to userStore
        const tradeId = `trade_${position.contractId}`;
        addTrade({
          id: tradeId,
          contractId: position.contractId,
          amount: betAmount,
          placedAt: new Date(),
        });
      }
    });
    
    // Track hit positions (settle as wins)
    hitBoxes.forEach((contractId) => {
      // Find the position for this contract
      const position = Array.from(positions.values()).find(p => p.contractId === contractId);
      if (position) {
        const contract = contracts.find(c => c.contractId === contractId);
        if (contract) {
          const payout = betAmount * (contract.returnMultiplier || 1);
          
          console.log('✅ Position hit, settling trade as win:', {
            contractId,
            amount: betAmount,
            payout,
            multiplier: contract.returnMultiplier
          });
          
          // Find the trade ID by contractId (since we use contractId as the key)
          const tradeId = `trade_${contractId}`;
          settleTrade(tradeId, 'win', payout);
        }
      }
    });
    
    // Track missed positions (settle as losses)
    missedBoxes.forEach((contractId) => {
      console.log('❌ Position missed, settling trade as loss:', {
        contractId,
        amount: betAmount
      });
      
      // Find the trade ID by contractId (since we use contractId as the key)
      const tradeId = `trade_${contractId}`;
      settleTrade(tradeId, 'loss', 0);
    });
    
    setMockBackendPositions(positions);
    setMockBackendContracts(contracts);
    setMockBackendHitBoxes(hitBoxes);
    setMockBackendMissedBoxes(missedBoxes);
    
    // Update the ref for next comparison
    previousPositionsRef.current = new Map(positions);
  }, [betAmount, addTrade, settleTrade]);
  
  // Derive position stats from mock backend positions (now pre-filtered to only active positions)
  const mockBackendMultipliers = useMemo(() => {
    const mults: number[] = [];
    
    // mockBackendPositions is already filtered to only active positions by Canvas
    mockBackendPositions.forEach((position, positionId) => {
      // Find the contract for this position using contractId
      const contract = mockBackendContracts.find(c => c.contractId === position.contractId);
      if (contract) {
        // Use returnMultiplier from backend contract
        const multiplier = contract.returnMultiplier || 0;
        mults.push(multiplier);
      }
    });
    
    console.log('📊 Mock Backend Stats:', {
      activePositionsCount: mockBackendPositions.size,
      hitCount: mockBackendHitBoxes.length,
      missedCount: mockBackendMissedBoxes.length,
      multipliers: mults,
      bestMultiplier: mults.length > 0 ? Math.max(...mults) : 0
    });
    
    return mults;
  }, [mockBackendPositions, mockBackendContracts, mockBackendHitBoxes, mockBackendMissedBoxes]);
  
  const mockBackendPositionCount = mockBackendPositions.size; // Already filtered to only active
  
  const mockBackendAveragePrice = useMemo(() => {
    const prices: number[] = [];
    
    // mockBackendPositions is already filtered to only active positions
    mockBackendPositions.forEach((position) => {
      const contract = mockBackendContracts.find(c => c.contractId === position.contractId);
      if (contract) {
        // Use lowerStrike and upperStrike for price range
        const avgPrice = (contract.lowerStrike + contract.upperStrike) / 2;
        prices.push(avgPrice);
      }
    });
    
    const average = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
    
    console.log('📊 Mock Backend Right Panel Values:', {
      selectedCount: mockBackendPositionCount,
      bestMultiplier: mockBackendMultipliers.length > 0 ? Math.max(...mockBackendMultipliers) : 0,
      multipliers: mockBackendMultipliers,
      averagePrice: average,
      betAmount: betAmount,
      totalPayout: mockBackendMultipliers.length > 0 ? betAmount * mockBackendMultipliers.reduce((a, b) => a + b, 0) : 0
    });
    
    return average;
  }, [mockBackendPositions, mockBackendContracts, mockBackendMultipliers, mockBackendPositionCount, betAmount]);
  
  
  // Debug: Log what will be passed to PositionsTable
  useEffect(() => {
    console.log('📊 ClientView: PositionsTable props:', {
      activeTab,
      willPassRealPositions: activeTab === 'copy',
      mockBackendPositionsSize: mockBackendPositions.size,
      mockBackendContractsLength: mockBackendContracts.length,
      mockBackendHitBoxesLength: mockBackendHitBoxes.length,
      mockBackendMissedBoxesLength: mockBackendMissedBoxes.length,
      mockBackendPositionCount,
      mockBackendMultipliers: mockBackendMultipliers.length
    });
  }, [activeTab, mockBackendPositions, mockBackendContracts, mockBackendHitBoxes, mockBackendMissedBoxes, mockBackendPositionCount, mockBackendMultipliers]);
  
  // Multi-exchange BTC price index system
  const wsRefs = useRef<{ [key: string]: WebSocket | null }>({});
  const reconnectTimeoutRefs = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});
  const exchangePricesRef = useRef<{ [key: string]: number }>({});
  const lastCompositePriceRef = useRef<number>(0);
  const priceHistoryRef = useRef<Array<{ time: number; price: number }>>([]);
  const compositeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Exchange weights for composite index (can be adjusted based on reliability/volume)
  const exchangeWeights = useMemo(() => ({
    'binance': 0.4,    // 40% weight - most reliable
    'coinbase': 0.3,   // 30% weight - major US exchange
    'kraken': 0.3      // 30% weight - major global exchange
  }), []);

  /**
   * Calculates composite BTC price from multiple exchanges using weighted average
   * @returns Composite price or null if no valid prices available
   */
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
        return Math.round(smoothedPrice * 100) / 100;
      }
    }
    
    return compositePrice;
  }, [exchangeWeights]);

  // Connect to multiple exchanges for composite price index
  const connectWebSockets = useCallback(() => {
    const exchanges = [
      {
        name: 'binance',
        url: 'wss://stream.binance.com:9443/ws/btcusdt@trade',
        weight: exchangeWeights.binance
      },
      {
        name: 'coinbase',
        url: 'wss://ws-feed.exchange.coinbase.com',
        weight: exchangeWeights.coinbase
      },
      {
        name: 'kraken',
        url: 'wss://ws.kraken.com',
        weight: exchangeWeights.kraken
      }
    ];

    exchanges.forEach(exchange => {
      if (wsRefs.current[exchange.name]?.readyState === WebSocket.OPEN) return;
      
      // Skip exchanges that have failed too many times
      if (wsConnectionFailures[exchange.name] >= 5) {
        logger.warn(`Skipping ${exchange.name} - too many connection failures`, undefined, 'WS');
        return;
      }
      
      logger.info(`Connecting to ${exchange.name} WebSocket for live BTC prices`, undefined, 'WS');
      
      try {
        const ws = new WebSocket(exchange.url);
        
        // Set connection timeout
        const connectionTimeout = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            logger.warn(`${exchange.name} WebSocket connection timeout`, undefined, 'WS');
            ws.close();
          }
        }, 10000); // 10 second timeout
        
        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          
          // Reset failure count on successful connection
          setWsConnectionFailures(prev => ({
            ...prev,
            [exchange.name]: 0
          }));
          
          logger.info(`${exchange.name} WebSocket connected successfully`, undefined, 'WS');
          
          // Update connection status (only update store if status changed)
          setIsWebSocketConnected(true);
          if (!wsConnectionStatusRef.current) {
            wsConnectionStatusRef.current = true;
          setWebSocketConnected(true);
          }
          
          // Update connected exchanges list
          const connectedExchanges = Object.keys(wsRefs.current).filter(
            key => wsRefs.current[key]?.readyState === WebSocket.OPEN
          );
          setConnectedExchanges(connectedExchanges);
          
          // Subscribe to BTC price feed (different for each exchange)
          if (exchange.name === 'coinbase') {
            ws.send(JSON.stringify({
              type: 'subscribe',
              product_ids: ['BTC-USD'],
              channels: ['ticker']
            }));
          } else if (exchange.name === 'kraken') {
            ws.send(JSON.stringify({
              event: 'subscribe',
              pair: ['XBT/USD'],
              subscription: { name: 'ticker' }
            }));
          }
          // Binance doesn't need subscription - it starts streaming immediately
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            let price = 0;
            
            // Parse price from different exchange formats
            if (exchange.name === 'binance' && data.p) {
              price = parseFloat(data.p);
            } else if (exchange.name === 'coinbase' && data.price) {
              price = parseFloat(data.price);
            } else if (exchange.name === 'kraken' && data[1] && data[1].c) {
              price = parseFloat(data[1].c[0]); // Close price from ticker
            }
            
            if (price > 0) {
              exchangePricesRef.current[exchange.name] = price;
              setIsWebSocketConnected(true);
              
              // Throttle lastUpdateTime updates to once per second to reduce store updates
              const now = Date.now();
              if (now - lastUpdateTimeStoreRef.current > 1000) {
                lastUpdateTimeStoreRef.current = now;
                setLastUpdateTime(now);
              }
              
              setIsPriceUpdating(false);
            }
          } catch (error) {
            logger.error(`${exchange.name} WebSocket parse error`, error, 'WS');
          }
        };
        
        ws.onclose = () => {
          clearTimeout(connectionTimeout);
          logger.warn(`${exchange.name} WebSocket disconnected, attempting to reconnect`, undefined, 'WS');
          
          // Check if any connections are still active
          const activeConnections = Object.values(wsRefs.current).filter(ws => ws?.readyState === WebSocket.OPEN);
          const isConnected = activeConnections.length > 0;
          setIsWebSocketConnected(isConnected);
          
          // Only update store if status changed
          if (wsConnectionStatusRef.current !== isConnected) {
            wsConnectionStatusRef.current = isConnected;
            setWebSocketConnected(isConnected);
          }
          
          // Update connected exchanges list
          const connectedExchanges = Object.keys(wsRefs.current).filter(
            key => wsRefs.current[key]?.readyState === WebSocket.OPEN
          );
          setConnectedExchanges(connectedExchanges);
          
          // Auto-reconnect after 1 second
          reconnectTimeoutRefs.current[exchange.name] = setTimeout(() => {
            connectWebSockets();
          }, 1000);
        };
        
        ws.onerror = (event) => {
          clearTimeout(connectionTimeout);
          
          const failureCount = (wsConnectionFailures[exchange.name] || 0) + 1;
          
          // Track connection failures
          setWsConnectionFailures(prev => ({
            ...prev,
            [exchange.name]: failureCount
          }));
          
          // Show user-friendly error notification
          if (failureCount === 1) {
            showToast(`⚠️ Connection issue with ${exchange.name}. Retrying...`);
          } else if (failureCount === 3) {
            showToast(`🔴 ${exchange.name} connection unstable. Switching to demo mode.`);
          }
          
          logger.error(`${exchange.name} WebSocket connection failed`, {
            exchange: exchange.name,
            url: exchange.url,
            readyState: ws.readyState,
            eventType: event.type,
            failureCount
          }, 'WS');
          
          // Don't close immediately, let onclose handle reconnection
        };
        
        wsRefs.current[exchange.name] = ws;
      } catch (error) {
        logger.error(`Failed to connect to ${exchange.name}`, error, 'WS');
        showToast(`❌ Failed to connect to ${exchange.name}. Check your internet connection.`);
        
        // Track connection failures for this exchange
        setWsConnectionFailures(prev => ({
          ...prev,
          [exchange.name]: (prev[exchange.name] || 0) + 1
        }));
      }
    });
  }, [exchangeWeights]);

  const handleSelectionChange = useCallback((count: number, best: number, multipliers: number[], averagePrice?: number | null) => {
    // Always update the state first
    setSelectedCount(count);
    setBestMultiplier(best);
    setSelectedMultipliers(multipliers);
    setAveragePositionPrice(averagePrice ?? null);
    
    // Only show toast when count actually increases (new box selected by user)
    if (count > previousCountRef.current && count > 0) {
      const newToastId = Date.now(); // Use timestamp as unique ID
      const newToast = {
        id: newToastId,
        message: "Trade Placed successfully",
        timestamp: Date.now(),
        isVisible: true
      };
      
      setToasts(prev => {
        const updated = [...prev, newToast];
        // Archive oldest toasts if we exceed 5, keeping only the latest 5
        if (updated.length > 5) {
          return updated.slice(-5);
        }
        return updated;
      });
      
      // Start fade out after 2.5 seconds, then remove after 3 seconds
      setTimeout(() => {
        setToasts(prev => prev.map(toast => 
          toast.id === newToastId ? { ...toast, isVisible: false } : toast
        ));
      }, 2500);
      
      // Remove toast completely after fade out completes
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== newToastId));
      }, 3000);
    }
    
    // Update the previous count for next comparison
    previousCountRef.current = count;
  }, []);

  const handleTradingModeChange = useCallback((tradingMode: boolean) => {
    // Control canvas start/stop
      setIsCanvasStarted(tradingMode);
  }, []);

  // Initialize multi-exchange WebSocket connections on mount
  useEffect(() => {
    connectWebSockets();
    
    return () => {
      // Clean up all exchange connections
      Object.entries(reconnectTimeoutRefs.current).forEach(([exchange, timeout]) => {
        if (timeout) {
          clearTimeout(timeout);
        }
      });
      Object.entries(wsRefs.current).forEach(([exchange, ws]) => {
      if (ws) {
          ws.close();
      }
      });
    };
  }, [connectWebSockets]);
  
  // Handle tab visibility changes to prevent crashes when switching tabs
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden - pause expensive operations
        logger.debug('Tab hidden, pausing operations', undefined, 'PERF');
      } else {
        // Tab is visible again - resume operations
        logger.debug('Tab visible, resuming operations', undefined, 'PERF');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Composite price calculation timer - runs every 500ms
  useEffect(() => {
    // Start timer for composite price calculation
    compositeTimerRef.current = setInterval(() => {
      // Only run when tab is visible to prevent background crashes
      if (!document.hidden) {
        const compositePrice = calculateCompositePrice();
        if (compositePrice) {
          const timestamp = Date.now();
          
          // Update BTC price in connectionStore - ETH and SOL are updated in fetch24hStats
          setCurrentPrices(compositePrice, currentETHPriceRef.current || 0, currentSOLPriceRef.current || 0);
          lastCompositePriceRef.current = compositePrice;
          
          // Store price history for chart (keep last 100 points)
          priceHistoryRef.current.push({ time: timestamp, price: compositePrice });
          if (priceHistoryRef.current.length > 100) {
            priceHistoryRef.current = priceHistoryRef.current.slice(-100);
          }
        }
      }
    }, 500); // Update every 500ms
    
    return () => {
      if (compositeTimerRef.current) {
        clearInterval(compositeTimerRef.current);
      }
    };
  }, [calculateCompositePrice, setCurrentPrices]);
  
  // Fetch 24h statistics (change % and volume) from Binance API for all assets
  useEffect(() => {
    const fetch24hStats = async () => {
      try {
        // Fetch data for BTC, ETH, and SOL in parallel
        const [btcResponse, ethResponse, solResponse] = await Promise.all([
          fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT'),
          fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT'),
          fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=SOLUSDT')
        ]);
        
        const [btcData, ethData, solData] = await Promise.all([
          btcResponse.json(),
          ethResponse.json(),
          solResponse.json()
        ]);
        
        // Update all stats in one go using connectionStore
        set24hStats({
          btc24hChange: btcData.priceChangePercent ? parseFloat(btcData.priceChangePercent) : undefined,
          btc24hVolume: btcData.quoteVolume ? parseFloat(btcData.quoteVolume) : undefined,
          btc24hHigh: btcData.highPrice ? parseFloat(btcData.highPrice) : undefined,
          btc24hLow: btcData.lowPrice ? parseFloat(btcData.lowPrice) : undefined,
          eth24hChange: ethData.priceChangePercent ? parseFloat(ethData.priceChangePercent) : undefined,
          eth24hVolume: ethData.quoteVolume ? parseFloat(ethData.quoteVolume) : undefined,
          sol24hChange: solData.priceChangePercent ? parseFloat(solData.priceChangePercent) : undefined,
          sol24hVolume: solData.quoteVolume ? parseFloat(solData.quoteVolume) : undefined,
        });
        
        // Update current prices for ETH and SOL (BTC is updated via WebSocket composite)
        const ethPrice = ethData.lastPrice ? parseFloat(ethData.lastPrice) : 0;
        const solPrice = solData.lastPrice ? parseFloat(solData.lastPrice) : 0;
        const btcPrice = lastCompositePriceRef.current || (btcData.lastPrice ? parseFloat(btcData.lastPrice) : 0);
        
        if (btcPrice || ethPrice || solPrice) {
          setCurrentPrices(btcPrice, ethPrice, solPrice);
        }
      } catch (error) {
        logger.error('Failed to fetch 24h statistics', error);
      }
    };
    
    // Fetch immediately and then every 60 seconds
    fetch24hStats();
    const statsInterval = setInterval(fetch24hStats, 60000);
    
    return () => clearInterval(statsInterval);
  }, [set24hStats, setCurrentPrices]);

  // Update slider background when minMultiplier changes
  useEffect(() => {
    const slider = document.querySelector('.multiplier-slider') as HTMLInputElement;
    if (slider) {
      const percentage = ((minMultiplier - 1) / 14) * 100;
      slider.style.background = `linear-gradient(to right, ${signatureColor} 0%, ${signatureColor} ${percentage}%, #52525B ${percentage}%, #52525B 100%)`;
    }
  }, [minMultiplier, signatureColor]);

  // Set initial slider background
  useEffect(() => {
    const slider = document.querySelector('.multiplier-slider') as HTMLInputElement;
    if (slider) {
      const percentage = ((minMultiplier - 1) / 14) * 100;
      slider.style.background = `linear-gradient(to right, ${signatureColor} 0%, ${signatureColor} ${percentage}%, #52525B ${percentage}%, #52525B 100%)`;
    }
  }, [signatureColor, minMultiplier]);

      return (
      <>
        <style jsx>{`
          .multiplier-slider {
            -webkit-appearance: none;
            appearance: none;
            width: 96px;
            height: 8px;
            border-radius: 4px;
            background: #52525B;
            outline: none;
            cursor: pointer;
          }
          
          .multiplier-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            height: 16px;
            width: 20px;
            border-radius: 8px;
            background: white;
            cursor: pointer;
            border: 2px solid ${signatureColor};
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
          
          .multiplier-slider::-moz-range-thumb {
            height: 16px;
            width: 20px;
            border-radius: 8px;
            background: white;
            cursor: pointer;
            border: 2px solid ${signatureColor};
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
        `}</style>
        <div className="grid grid-cols-[minmax(0,1fr)_400px] h-[calc(100vh-56px-56px-24px)]">
        {/* Left: Box Hit Game + positions table */}
        <div className="min-w-0">
          {/* Live Market Header with Asset Selection */}
          <div className="flex items-center justify-between p-4 gap-4">
            {/* Left side: Asset info */}
            <div className="flex items-center gap-4">
              {/* Asset Icon */}
              <div className="rounded-lg overflow-hidden" style={{ width: '28px', height: '28px' }}>
                <img 
                  src={activeTab === 'copy' ? assetData.DEMO.icon : assetData[selectedAsset].icon} 
                  alt={activeTab === 'copy' ? 'Demo Asset' : assetData[selectedAsset].name} 
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Asset Selector Dropdown - Show but disable functionality in mock backend mode */}
              <div className="relative asset-dropdown">
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setAssetDropdownOpen(!isAssetDropdownOpen)}
                  title="Select asset"
                >
                  <div className="text-white leading-none" style={{ fontSize: '18px', fontWeight: 500 }}>
                    {activeTab === 'copy' ? 'DEMO' : assetData[selectedAsset].symbol}
                  </div>
                  <svg 
                    className={`w-4 h-4 text-zinc-400 transition-transform ${isAssetDropdownOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {/* Dropdown Menu - Show in both modes but disable options in mock backend */}
                {isAssetDropdownOpen && (
                  <div 
                    className="absolute top-full left-0 mt-2 border border-zinc-700/50 rounded-lg shadow-2xl z-50" 
                    style={{ 
                      width: '280px',
                      backgroundColor: 'rgba(14, 14, 14, 0.7)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)'
                    }}
                  >
                    {Object.entries(assetData).map(([key, asset]) => (
                      <div
                        key={key}
                        className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                          activeTab === 'copy' 
                            ? key === 'DEMO' 
                              ? `cursor-pointer hover:bg-zinc-800/50 ${selectedAsset === key ? 'bg-zinc-800/50' : ''}`
                              : `cursor-pointer hover:bg-zinc-800/50 ${selectedAsset === key ? 'bg-zinc-800/50' : ''} opacity-50`
                            : `cursor-pointer hover:bg-zinc-800/50 ${selectedAsset === key ? 'bg-zinc-800/50' : ''}`
                        }`}
                        onClick={() => {
                          if (activeTab !== 'copy' || key === 'DEMO') {
                            setSelectedAsset(key as 'BTC' | 'ETH' | 'SOL' | 'DEMO');
                          setAssetDropdownOpen(false);
                          }
                        }}
                        title={
                          activeTab === 'copy' 
                            ? key === 'DEMO' 
                              ? `Select ${asset.name}` 
                              : 'Asset selection not available in mock backend mode'
                            : `Select ${asset.name}`
                        }
                      >
                        {/* Star icon for favorites - clickable */}
                        <button
                          onClick={(e) => toggleFavorite(key as 'BTC' | 'ETH' | 'SOL' | 'DEMO', e)}
                          className="flex-shrink-0 p-0.5 rounded transition-colors cursor-pointer hover:bg-zinc-700/50"
                        >
                          <svg 
                            className={`w-3.5 h-3.5 transition-colors ${
                              favoriteAssets.has(key as 'BTC' | 'ETH' | 'SOL' | 'DEMO') 
                                ? 'text-yellow-400 fill-current' 
                                : 'text-zinc-500 fill-none'
                            }`} 
                            fill="currentColor" 
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={favoriteAssets.has(key as 'BTC' | 'ETH' | 'SOL' | 'DEMO') ? 0 : 1.5}
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </button>
                        
                        {/* Asset icon */}
                        <div className="w-7 h-7 rounded overflow-hidden flex-shrink-0">
                          <img 
                            src={asset.icon} 
                            alt={asset.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        {/* Asset info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-xs font-medium">{asset.symbol}</div>
                          <div className="text-zinc-400" style={{ fontSize: '11px' }}>{asset.name}</div>
                        </div>
                        
                        {/* Price and change */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-white text-xs font-medium">
                            {asset.price 
                              ? asset.price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                              : <span className="text-zinc-500">--</span>
                            }
                          </div>
                          <div 
                            style={{ 
                              color: asset.change24h >= 0 ? TRADING_COLORS.positive : TRADING_COLORS.negative,
                              fontSize: '11px',
                              fontWeight: 500
                            }}
                          >
                            {asset.change24h !== 0 
                              ? `${asset.change24h >= 0 ? '+' : ''}${asset.change24h.toFixed(2)}%`
                              : <span className="text-zinc-500">--</span>
                            }
                          </div>
                        </div>
                        
                        {/* Volume text */}
                        <div className="text-zinc-400 flex-shrink-0" style={{ fontSize: '11px' }}>
                          Vol: {asset.volume24h}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Current Value */}
              <div className="flex items-center gap-2">
                <div className="text-white leading-none" style={{ fontSize: '28px', fontWeight: 500 }}>
                  {activeTab === 'copy' ? (
                    mockBackendCurrentPrice.toFixed(2)
                  ) : (
                    assetData[selectedAsset].price 
                      ? assetData[selectedAsset].price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                      : <span className="text-zinc-500" style={{ fontSize: '16px' }}>Loading...</span>
                  )}
                </div>
                {isPriceUpdating && activeTab !== 'copy' && (
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10AE80', border: '2px solid #134335' }}></div>
                )}
              </div>
              
              {/* 24h Change */}
              <div className="leading-none">
                <div className="text-zinc-400 leading-none" style={{ fontSize: '12px' }}>24h Change</div>
                <div className="font-medium leading-none" style={{ 
                  fontSize: '18px',
                  color: activeTab === 'copy' ? TRADING_COLORS.positive : (assetData[selectedAsset].change24h >= 0 ? TRADING_COLORS.positive : TRADING_COLORS.negative)
                }}>
                  {activeTab === 'copy' ? '+2.50%' : `${assetData[selectedAsset].change24h >= 0 ? '+' : ''}${assetData[selectedAsset].change24h.toFixed(2)}%`}
                </div>
              </div>
              
              {/* 24h Volume */}
              <div className="leading-none">
                <div className="text-zinc-400 leading-none" style={{ fontSize: '12px' }}>24h Volume</div>
                <div className="text-white leading-none" style={{ fontSize: '18px' }}>
                  {activeTab === 'copy' ? '45.20B' : assetData[selectedAsset].volume24h}
                </div>
              </div>
            </div>
            
            {/* Right side: Probabilities, User icon and Multiplier filter */}
            <div className="flex items-center gap-6">
              {/* Probabilities Checkbox - Toggle for Heatmap Overlay */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showProbabilities"
                  checked={showProbabilities}
                  onChange={(e) => setShowProbabilities(e.target.checked)}
                  className="w-3 h-3 rounded cursor-pointer"
                  style={{
                    borderColor: showProbabilities ? '#0F0F0F' : 'transparent',
                    backgroundColor: showProbabilities ? signatureColor : 'transparent',
                    borderRadius: '4px',
                    borderWidth: '1px',
                    padding: '0px',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    outline: showProbabilities ? `1px solid ${signatureColor}` : `1px solid #52525B`,
                    outlineOffset: '1px'
                  }}
                />
                <label 
                  htmlFor="showProbabilities" 
                  className="text-zinc-400 cursor-pointer select-none"
                  style={{ fontSize: '12px' }}
                >
                  Heatmap
                </label>
              </div>

              {/* Other Players Checkbox - Toggle for Other Players */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showOtherPlayers"
                  checked={showOtherPlayers}
                  onChange={(e) => setShowOtherPlayers(e.target.checked)}
                  className="w-3 h-3 rounded cursor-pointer"
                  style={{
                    borderColor: showOtherPlayers ? '#0F0F0F' : 'transparent',
                    backgroundColor: showOtherPlayers ? signatureColor : 'transparent',
                    borderRadius: '4px',
                    borderWidth: '1px',
                    padding: '0px',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    outline: showOtherPlayers ? `1px solid ${signatureColor}` : `1px solid #52525B`,
                    outlineOffset: '1px'
                  }}
                />
                <label 
                  htmlFor="showOtherPlayers" 
                  className="text-zinc-400 cursor-pointer select-none"
                  style={{ fontSize: '12px' }}
                >
                  Show Players
                </label>
              </div>
              
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400 flex-shrink-0" style={{ fontSize: '12px' }}>Min Multiplier:</span>
                  <div className="w-24">
                    <CustomSlider
                      min={1.0}
                      max={15.0}
                      step={0.1}
                      value={minMultiplier}
                      onChange={setMinMultiplier}
                      signatureColor={signatureColor}
                      className="w-full"
                    />
                  </div>
                  <span className="text-white font-medium" style={{ fontSize: '12px' }}>
                    {minMultiplier.toFixed(1)}x
                  </span>
                </div>

                {/* Timeframe Selector */}
                <div className="flex items-center gap-1">
                  {[
                    { label: '0.5s', value: 500 },
                    { label: '1s', value: 1000 },
                    { label: '2s', value: 2000 },
                    { label: '4s', value: 4000 },
                    { label: '10s', value: 10000 }
                  ].map((tf) => (
                  <button
                      key={tf.value}
                      onClick={() => setTimeframe(tf.value)}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        timeframe === tf.value
                          ? 'bg-zinc-700 text-white'
                          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                      }`}
                      title={`${tf.label} timeframe`}
                    >
                      {tf.label}
                  </button>
                  ))}
                </div>
            </div>
          </div>
          
          <div className="border-t border-b border-zinc-800">
            <ErrorBoundary 
              fallback={
                <div className="h-96 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg">
                  <div className="text-center">
                    <div className="text-red-500 text-lg mb-2">⚠️ Canvas Error</div>
                    <div className="text-zinc-400 text-sm">The game canvas encountered an error. Please refresh the page.</div>
                  </div>
                </div>
              }
              onError={(error, errorInfo) => {
                logger.error('Canvas Error', { error, errorInfo }, 'CANVAS');
                showToast('⚠️ Game canvas error occurred. Please refresh if issues persist.');
              }}
            >
              {/* Show Canvas component controlled by Start Trading button */}
                <div className="w-full h-[520px] overflow-hidden" style={{ backgroundColor: '#0E0E0E' }}>
                  <Canvas 
                    externalControl={true}
                    externalIsStarted={isCanvasStarted}
                    onExternalStartChange={setIsCanvasStarted}
                    externalTimeframe={timeframe}
                    onPositionsChange={handleMockBackendPositionsChange}
                    onSelectionChange={handleMockBackendSelectionChange}
                    betAmount={betAmount}
                    onPriceUpdate={setMockBackendCurrentPrice}
                    showProbabilities={showProbabilities}
                  showOtherPlayers={showOtherPlayers}
                    minMultiplier={minMultiplier}
                  />
                </div>
            </ErrorBoundary>
          </div>
          
          <PositionsTable 
            selectedCount={mockBackendPositionCount}
            selectedMultipliers={mockBackendMultipliers}
            betAmount={betAmount}
            currentBTCPrice={mockBackendCurrentPrice}
            onPositionHit={(positionId) => {
              // Handle position hit - this will be called when a box is hit
              logger.info('Position hit', { positionId }, 'GAME');
            }}
            onPositionMiss={(positionId) => {
              // Handle position missed - this will be called when a box is missed
              logger.info('Position missed', { positionId }, 'GAME');
            }}
            hitBoxes={mockBackendHitBoxes}
            missedBoxes={mockBackendMissedBoxes}
            realPositions={mockBackendPositions}
            contracts={mockBackendContracts}
          />
        </div>
        
        {/* Right: betting panel only */}
        <RightPanel 
          isTradingMode={isCanvasStarted}
          onTradingModeChange={handleTradingModeChange}
          selectedCount={mockBackendSelectedCount}
          bestMultiplier={mockBackendBestMultiplier}
          selectedMultipliers={mockBackendSelectedMultipliers}
          currentBTCPrice={mockBackendCurrentPrice}
          averagePositionPrice={mockBackendSelectedAveragePrice}
          betAmount={betAmount}
          onBetAmountChange={setBetAmount}
          dailyHigh={mockBackendCurrentPrice + 2}
          dailyLow={mockBackendCurrentPrice - 2}
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
        />
      </div>
      
      {/* Toast Notifications - Stacked from bottom-right, oldest on top, newest on bottom */}
      <div className="fixed bottom-4 right-4 z-50 space-y-3">
        {toasts.map((toast, index) => (
          <div 
            key={toast.id}
            className={`bg-[#171717] border border-zinc-700 rounded-lg px-5 py-4 shadow-lg flex items-center gap-4 transition-all duration-300 ease-in-out transform ${
              toast.isVisible 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-2'
            }`}
            style={{ fontSize: '12px' }}
          >
            {/* Success Icon - Smaller with #13AD80 color */}
            <div className="w-4 h-4 rounded-full bg-[#13AD80] flex items-center justify-center flex-shrink-0">
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            {/* Message */}
            <span className="text-white font-normal">Trade Placed successfully</span>
            
            {/* Close Button */}
            <button 
              onClick={() => {
                // Start fade out animation
                setToasts(prev => prev.map(t => 
                  t.id === toast.id ? { ...t, isVisible: false } : t
                ));
                // Remove after animation completes
                setTimeout(() => {
                  setToasts(prev => prev.filter(t => t.id !== toast.id));
                }, 300);
              }}
              className="ml-2 text-zinc-400 hover:text-zinc-300 transition-colors flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
        </>
    );
}
