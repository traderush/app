import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist } from 'zustand/middleware';
import { createPersistentStorage } from '@/utils/persistence';

export interface GameCell {
  id: string;
  x: number;
  y: number;
  state: 'empty' | 'selected' | 'hit' | 'missed';
  mult: number;
  selectionTime?: number;
  crossedTime?: number;
  hitTime?: number;
}

export interface GamePosition {
  id: string;
  cellIds: string[];
  betAmount: number;
  multipliers: number[];
  totalMultiplier: number;
  potentialPayout: number;
  isActive: boolean;
  createdAt: number;
  hitTime?: number;
  missTime?: number;
}

export interface GameSettings {
  betAmount: number;
  selectedCount: number;
  selectedMultipliers: number[];
  bestMultiplier: number;
  soundEnabled: boolean;
  autoPlay: boolean;
  minMultiplier: number;
  showOtherPlayers: boolean;
  isTradingMode: boolean;
  zoomLevel: number;
  showProbabilities: boolean;
  selectedAsset: 'BTC' | 'ETH' | 'SOL' | 'DEMO';
  timeframe: number; // Timeframe in milliseconds (500, 1000, 2000, 4000, 10000)
}

export interface GameStats {
  totalBets: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  totalWinnings: number;
  totalLossAmount: number; // Total amount lost (was duplicate totalLosses)
  netProfit: number;
  longestWinStreak: number;
  longestLossStreak: number;
  currentStreak: number;
  bestMultiplier: number;
}

interface GameState {
  // Game Data
  gridCells: GameCell[];
  activePositions: GamePosition[];
  gameSettings: GameSettings;
  gameStats: GameStats;
  
  // Game State
  isGameActive: boolean;
  isGamePaused: boolean;
  currentTime: number;
  lastUpdate: number;
  
  // UI State
  selectedCells: string[];
  hoveredCell: string | null;
  showGrid: boolean;
  showStats: boolean;
  
  // Actions
  setGridCells: (cells: GameCell[]) => void;
  updateCell: (cellId: string, updates: Partial<GameCell>) => void;
  toggleCellSelection: (cellId: string) => void;
  clearSelection: () => void;
  
  addPosition: (position: Omit<GamePosition, 'id' | 'createdAt'>) => void;
  updatePosition: (positionId: string, updates: Partial<GamePosition>) => void;
  removePosition: (positionId: string) => void;
  clearPositions: () => void;
  
  updateGameSettings: (settings: Partial<GameSettings>) => void;
  updateGameStats: (stats: Partial<GameStats>) => void;
  
  setGameActive: (active: boolean) => void;
  setGamePaused: (paused: boolean) => void;
  setCurrentTime: (time: number) => void;
  
  setSelectedCells: (cells: string[]) => void;
  setHoveredCell: (cellId: string | null) => void;
  setShowGrid: (show: boolean) => void;
  setShowStats: (show: boolean) => void;
  
  // Complex Actions
  hitCell: (cellId: string) => void;
  missCell: (cellId: string) => void;
  processGameTick: () => void;
  resetGame: () => void;
  
  // Computed Values
  getSelectedCells: () => GameCell[];
  getActivePositions: () => GamePosition[];
  getTotalPotentialPayout: () => number;
  getGameProgress: () => number;
}

const initialGameSettings: GameSettings = {
  betAmount: 200,
  selectedCount: 0,
  selectedMultipliers: [],
  bestMultiplier: 0,
  soundEnabled: true,
  autoPlay: false,
  minMultiplier: 1.0,
  showOtherPlayers: false,
  isTradingMode: false,
  zoomLevel: 1.0,
  showProbabilities: false,
  selectedAsset: 'BTC',
  timeframe: 2000, // Default 2s timeframe
};

const initialGameStats: GameStats = {
  totalBets: 0,
  totalWins: 0,
  totalLosses: 0,
  winRate: 0,
  totalWinnings: 0,
  totalLossAmount: 0,
  netProfit: 0,
  longestWinStreak: 0,
  longestLossStreak: 0,
  currentStreak: 0,
  bestMultiplier: 0,
};

export const useGameStore = create<GameState>()(
  persist(
    subscribeWithSelector((set, get) => ({
    // Initial State
    gridCells: [],
    activePositions: [],
    gameSettings: initialGameSettings,
    gameStats: initialGameStats,
    isGameActive: false,
    isGamePaused: false,
    currentTime: 0,
    lastUpdate: 0,
    selectedCells: [],
    hoveredCell: null,
    showGrid: true,
    showStats: false,

    // Basic Actions
    setGridCells: (cells) => set({ gridCells: cells }),
    
    updateCell: (cellId, updates) =>
      set((state) => {
        // Optimized: Use direct array indexing instead of map
        const cellIndex = state.gridCells.findIndex(cell => cell.id === cellId);
        if (cellIndex === -1) return state;

        const updatedCells = [...state.gridCells];
        updatedCells[cellIndex] = { ...updatedCells[cellIndex], ...updates };
        
        return { gridCells: updatedCells };
      }),

    toggleCellSelection: (cellId) =>
      set((state) => {
        const cell = state.gridCells.find((c) => c.id === cellId);
        if (!cell) return state;

        const isSelected = cell.state === 'selected';
        const newState: 'selected' | 'empty' = isSelected ? 'empty' : 'selected';
        
        const updatedCells = state.gridCells.map((c) =>
          c.id === cellId
            ? {
                ...c,
                state: newState,
                selectionTime: newState === 'selected' ? Date.now() : undefined,
              }
            : c
        );

        // Update selected cells list
        const selectedCells = updatedCells
          .filter((c) => c.state === 'selected')
          .map((c) => c.id);

        // Update game settings
        const selectedMultipliers = updatedCells
          .filter((c) => c.state === 'selected')
          .map((c) => c.mult);

        const bestMultiplier = selectedMultipliers.length > 0 
          ? Math.max(...selectedMultipliers) 
          : 0;

        return {
          gridCells: updatedCells,
          selectedCells,
          gameSettings: {
            ...state.gameSettings,
            selectedCount: selectedCells.length,
            selectedMultipliers,
            bestMultiplier,
          },
        };
      }),

    clearSelection: () =>
      set((state) => {
        // Optimized: Use direct array mutation instead of map
        const updatedCells = [...state.gridCells];
        for (let i = 0; i < updatedCells.length; i++) {
          if (updatedCells[i].state === 'selected') {
            updatedCells[i] = {
              ...updatedCells[i],
              state: 'empty',
              selectionTime: undefined,
            };
          }
        }
        
        return {
          gridCells: updatedCells,
          selectedCells: [],
          gameSettings: {
            ...state.gameSettings,
            selectedCount: 0,
            selectedMultipliers: [],
            bestMultiplier: 0,
          },
        };
      }),

    // Position Management
    addPosition: (positionData) =>
      set((state) => {
        const newPosition: GamePosition = {
          ...positionData,
          id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now(),
        };

        return {
          activePositions: [...state.activePositions, newPosition],
          gameStats: {
            ...state.gameStats,
            totalBets: state.gameStats.totalBets + 1,
          },
        };
      }),

    updatePosition: (positionId, updates) =>
      set((state) => ({
        activePositions: state.activePositions.map((pos) =>
          pos.id === positionId ? { ...pos, ...updates } : pos
        ),
      })),

    removePosition: (positionId) =>
      set((state) => ({
        activePositions: state.activePositions.filter((pos) => pos.id !== positionId),
      })),

    clearPositions: () => set({ activePositions: [] }),

    // Settings & Stats
    updateGameSettings: (settings) =>
      set((state) => ({
        gameSettings: { ...state.gameSettings, ...settings },
      })),

    updateGameStats: (stats) =>
      set((state) => ({
        gameStats: { ...state.gameStats, ...stats },
      })),

    // Game State
    setGameActive: (active) => set({ isGameActive: active }),
    setGamePaused: (paused) => set({ isGamePaused: paused }),
    setCurrentTime: (time) => set({ currentTime: time, lastUpdate: Date.now() }),

    // UI State
    setSelectedCells: (cells) => set({ selectedCells: cells }),
    setHoveredCell: (cellId) => set({ hoveredCell: cellId }),
    setShowGrid: (show) => set({ showGrid: show }),
    setShowStats: (show) => set({ showStats: show }),

    // Complex Actions
    hitCell: (cellId) =>
      set((state) => {
        // Optimized: Use direct array mutation for better performance
        const cellIndex = state.gridCells.findIndex(cell => cell.id === cellId);
        if (cellIndex === -1) return state;

        const updatedCells = [...state.gridCells];
        updatedCells[cellIndex] = { 
          ...updatedCells[cellIndex], 
          state: 'hit' as const, 
          hitTime: Date.now() 
        };

        // Optimized: Only process positions that contain this cell
        const updatedPositions = [...state.activePositions];
        let hitPositionsCount = 0;
        let totalWinnings = 0;

        for (let i = 0; i < updatedPositions.length; i++) {
          const pos = updatedPositions[i];
          if (pos.cellIds.includes(cellId) && !pos.hitTime) {
            updatedPositions[i] = { 
              ...pos, 
              hitTime: Date.now(), 
              isActive: false 
            };
            hitPositionsCount++;
            totalWinnings += pos.potentialPayout;
          }
        }

        const newWins = state.gameStats.totalWins + hitPositionsCount;

        return {
          gridCells: updatedCells,
          activePositions: updatedPositions,
          gameStats: {
            ...state.gameStats,
            totalWins: newWins,
            totalWinnings: state.gameStats.totalWinnings + totalWinnings,
            winRate: newWins / state.gameStats.totalBets || 0,
            currentStreak: state.gameStats.currentStreak + 1,
            longestWinStreak: Math.max(
              state.gameStats.longestWinStreak,
              state.gameStats.currentStreak + 1
            ),
          },
        };
      }),

    missCell: (cellId) =>
      set((state) => {
        // Optimized: Use direct array mutation for better performance
        const cellIndex = state.gridCells.findIndex(cell => cell.id === cellId);
        if (cellIndex === -1) return state;

        const updatedCells = [...state.gridCells];
        updatedCells[cellIndex] = { 
          ...updatedCells[cellIndex], 
          state: 'missed' as const 
        };

        // Optimized: Only process positions that contain this cell
        const updatedPositions = [...state.activePositions];
        let missedPositionsCount = 0;
        let totalLossAmount = 0;

        for (let i = 0; i < updatedPositions.length; i++) {
          const pos = updatedPositions[i];
          if (pos.cellIds.includes(cellId) && !pos.missTime) {
            updatedPositions[i] = { 
              ...pos, 
              missTime: Date.now(), 
              isActive: false 
            };
            missedPositionsCount++;
            totalLossAmount += pos.betAmount;
          }
        }

        const newLossCount = state.gameStats.totalLosses + missedPositionsCount;

        return {
          gridCells: updatedCells,
          activePositions: updatedPositions,
          gameStats: {
            ...state.gameStats,
            totalLosses: newLossCount,
            totalLossAmount: state.gameStats.totalLossAmount + totalLossAmount,
            winRate: state.gameStats.totalWins / state.gameStats.totalBets || 0,
            currentStreak: 0,
            longestLossStreak: Math.max(
              state.gameStats.longestLossStreak,
              state.gameStats.currentStreak + 1
            ),
          },
        };
      }),

    processGameTick: () =>
      set(() => {
        const now = Date.now();
        return {
          currentTime: now,
          lastUpdate: now,
        };
      }),

    resetGame: () =>
      set((state) => {
        // Optimized: Use direct array mutation instead of map
        const updatedCells = [...state.gridCells];
        for (let i = 0; i < updatedCells.length; i++) {
          updatedCells[i] = {
            ...updatedCells[i],
            state: 'empty',
            selectionTime: undefined,
            crossedTime: undefined,
            hitTime: undefined,
          };
        }
        
        return {
          gridCells: updatedCells,
          activePositions: [],
          selectedCells: [],
          gameSettings: {
            ...state.gameSettings,
            selectedCount: 0,
            selectedMultipliers: [],
            bestMultiplier: 0,
          },
          isGameActive: false,
          isGamePaused: false,
        };
      }),

    // Computed Values
    getSelectedCells: () => {
      const state = get();
      return state.gridCells.filter((cell) => cell.state === 'selected');
    },

    getActivePositions: () => {
      const state = get();
      return state.activePositions.filter((pos) => pos.isActive);
    },

    getTotalPotentialPayout: () => {
      const state = get();
      return state.activePositions.reduce((sum, pos) => sum + pos.potentialPayout, 0);
    },

    getGameProgress: () => {
      const state = get();
      if (state.activePositions.length === 0) return 0;
      const completedPositions = state.activePositions.filter(
        (pos) => pos.hitTime || pos.missTime
      ).length;
      return (completedPositions / state.activePositions.length) * 100;
    },
  })),
    {
      name: 'game-store',
      storage: createPersistentStorage('game') as any,
      partialize: (state) => ({
        gameSettings: state.gameSettings,
        gameStats: state.gameStats,
        showGrid: state.showGrid,
        showStats: state.showStats,
      }) as any,
    }
  )
);
