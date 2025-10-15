/**
 * useClientViewState Hook
 * 
 * Manages state for the ClientView component, separating local component state
 * from global Zustand store state for better clarity and maintainability.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore, useUIStore } from '@/stores';
import { useUserStore } from '@/stores/userStore';
import { Contract, Position } from '@/types/game';
import { handleCanvasError } from '@/lib/errorHandler';

export interface MockBackendState {
  positions: Map<string, Position>;
  contracts: Contract[];
  hitBoxes: string[];
  missedBoxes: string[];
  currentPrice: number;
  selectedCount: number;
  selectedMultipliers: number[];
  bestMultiplier: number;
  selectedAveragePrice: number | null;
}

export interface ClientViewState {
  // Local component state
  betAmount: number;
  isCanvasStarted: boolean;
  mockBackend: MockBackendState;
  
  // Global store subscriptions (read-only)
  gameSettings: {
    minMultiplier: number;
    showOtherPlayers: boolean;
    showProbabilities: boolean;
    timeframe: number;
    selectedAsset: 'BTC' | 'ETH' | 'SOL' | 'DEMO';
  };
  
  uiState: {
    favoriteAssets: Set<'BTC' | 'ETH' | 'SOL' | 'DEMO'>;
    isAssetDropdownOpen: boolean;
    signatureColor: string;
  };
  
  // Actions
  actions: {
    setBetAmount: (amount: number) => void;
    setIsCanvasStarted: (started: boolean) => void;
    updateGameSettings: (settings: Partial<ClientViewState['gameSettings']>) => void;
    toggleFavoriteAsset: (asset: 'BTC' | 'ETH' | 'SOL' | 'DEMO') => void;
    setAssetDropdownOpen: (open: boolean) => void;
    handleMockBackendPositionsChange: (
      positions: Map<string, Position>,
      contracts: Contract[],
      hitBoxes: string[],
      missedBoxes: string[]
    ) => void;
    handleMockBackendSelectionChange: (
      count: number,
      bestMultiplier: number,
      multipliers: number[],
      averagePrice?: number | null
    ) => void;
  };
}

export const useClientViewState = (): ClientViewState => {
  // Local component state
  const [betAmount, setBetAmount] = useState(200);
  const [isCanvasStarted, setIsCanvasStarted] = useState(false);
  
  // Mock backend state
  const [mockBackendPositions, setMockBackendPositions] = useState<Map<string, Position>>(new Map());
  const [mockBackendContracts, setMockBackendContracts] = useState<Contract[]>([]);
  const [mockBackendHitBoxes, setMockBackendHitBoxes] = useState<string[]>([]);
  const [mockBackendMissedBoxes, setMockBackendMissedBoxes] = useState<string[]>([]);
  const [mockBackendCurrentPrice, setMockBackendCurrentPrice] = useState(100);
  const [mockBackendSelectedCount, setMockBackendSelectedCount] = useState(0);
  const [mockBackendSelectedMultipliers, setMockBackendSelectedMultipliers] = useState<number[]>([]);
  const [mockBackendBestMultiplier, setMockBackendBestMultiplier] = useState(0);
  const [mockBackendSelectedAveragePrice, setMockBackendSelectedAveragePrice] = useState<number | null>(null);

  // Keep track of previous positions using a ref to avoid infinite loops
  const previousPositionsRef = useRef<Map<string, Position>>(new Map());
  const previousCountRef = useRef(0);

  // Global store subscriptions - individual subscriptions to prevent infinite loops
  const gameSettings = useGameStore((state) => ({
    minMultiplier: state.gameSettings.minMultiplier,
    showOtherPlayers: state.gameSettings.showOtherPlayers,
    showProbabilities: state.gameSettings.showProbabilities,
    timeframe: state.gameSettings.timeframe,
    selectedAsset: state.gameSettings.selectedAsset,
  }));

  const uiState = useUIStore((state) => ({
    favoriteAssets: state.favoriteAssets,
    isAssetDropdownOpen: state.isAssetDropdownOpen,
    signatureColor: state.signatureColor,
  }));

  // Store actions - use refs to avoid infinite loops
  const updateGameSettingsRef = useRef(useGameStore.getState().updateGameSettings);
  const toggleFavoriteAssetRef = useRef(useUIStore.getState().toggleFavoriteAsset);
  const setAssetDropdownOpenRef = useRef(useUIStore.getState().setAssetDropdownOpen);
  const addTradeRef = useRef(useUserStore.getState().addTrade);
  const settleTradeRef = useRef(useUserStore.getState().settleTrade);

  // Update refs when store actions change
  useEffect(() => {
    updateGameSettingsRef.current = useGameStore.getState().updateGameSettings;
    toggleFavoriteAssetRef.current = useUIStore.getState().toggleFavoriteAsset;
    setAssetDropdownOpenRef.current = useUIStore.getState().setAssetDropdownOpen;
    addTradeRef.current = useUserStore.getState().addTrade;
    settleTradeRef.current = useUserStore.getState().settleTrade;
  });

  // Memoized mock backend state
  const mockBackend = useMemo((): MockBackendState => ({
    positions: mockBackendPositions,
    contracts: mockBackendContracts,
    hitBoxes: mockBackendHitBoxes,
    missedBoxes: mockBackendMissedBoxes,
    currentPrice: mockBackendCurrentPrice,
    selectedCount: mockBackendSelectedCount,
    selectedMultipliers: mockBackendSelectedMultipliers,
    bestMultiplier: mockBackendBestMultiplier,
    selectedAveragePrice: mockBackendSelectedAveragePrice,
  }), [
    mockBackendPositions,
    mockBackendContracts,
    mockBackendHitBoxes,
    mockBackendMissedBoxes,
    mockBackendCurrentPrice,
    mockBackendSelectedCount,
    mockBackendSelectedMultipliers,
    mockBackendBestMultiplier,
    mockBackendSelectedAveragePrice,
  ]);

  // Handle mock backend positions and contracts update
  const handleMockBackendPositionsChange = useCallback((
    positions: Map<string, Position>,
    contracts: Contract[],
    hitBoxes: string[],
    missedBoxes: string[]
  ) => {
    try {
      // Track new positions in userStore
      const previousPositions = previousPositionsRef.current;

      // Find new positions that weren't in the previous state
      positions.forEach((position, positionId) => {
        if (!previousPositions.has(positionId)) {
          // Add trade to userStore
          const tradeId = `trade_${position.contractId}`;
          addTradeRef.current({
            id: tradeId,
            contractId: position.contractId,
            amount: betAmount,
            placedAt: new Date(),
          });
        }
      });

      // Track hit positions (settle as wins)
      hitBoxes.forEach((contractId) => {
        const position = Array.from(positions.values()).find(p => p.contractId === contractId);
        if (position) {
          const contract = contracts.find(c => c.contractId === contractId);
          if (contract) {
            const payout = betAmount * (contract.returnMultiplier || 1);
            const tradeId = `trade_${contractId}`;
            settleTradeRef.current(tradeId, 'win', payout);
          }
        }
      });

      // Track missed positions (settle as losses)
      missedBoxes.forEach((contractId) => {
        const tradeId = `trade_${contractId}`;
        settleTradeRef.current(tradeId, 'loss', 0);
      });

      // Update local state
      setMockBackendPositions(positions);
      setMockBackendContracts(contracts);
      setMockBackendHitBoxes(hitBoxes);
      setMockBackendMissedBoxes(missedBoxes);

      // Update the ref for next comparison
      previousPositionsRef.current = new Map(positions);
    } catch (error) {
      handleCanvasError(error instanceof Error ? error : new Error(String(error)), {
        component: 'ClientView',
        action: 'handleMockBackendPositionsChange'
      });
    }
  }, [betAmount]);

  // Handle mock backend selection changes
  const handleMockBackendSelectionChange = useCallback((
    count: number,
    bestMultiplier: number,
    multipliers: number[],
    averagePrice?: number | null
  ) => {
    try {
      setMockBackendSelectedCount(count);
      setMockBackendBestMultiplier(bestMultiplier);
      setMockBackendSelectedMultipliers(multipliers);
      setMockBackendSelectedAveragePrice(averagePrice || null);

      // Update previous count for future comparisons
      previousCountRef.current = count;
    } catch (error) {
      handleCanvasError(error instanceof Error ? error : new Error(String(error)), {
        component: 'ClientView',
        action: 'handleMockBackendSelectionChange'
      });
    }
  }, []);

  // Memoized actions object
  const actions = useMemo(() => ({
    setBetAmount,
    setIsCanvasStarted,
    updateGameSettings: updateGameSettingsRef.current,
    toggleFavoriteAsset: toggleFavoriteAssetRef.current,
    setAssetDropdownOpen: setAssetDropdownOpenRef.current,
    handleMockBackendPositionsChange,
    handleMockBackendSelectionChange,
  }), [
    handleMockBackendPositionsChange,
    handleMockBackendSelectionChange,
  ]);

  return {
    // Local state
    betAmount,
    isCanvasStarted,
    mockBackend,
    
    // Global store state
    gameSettings,
    uiState,
    
    // Actions
    actions,
  };
};
