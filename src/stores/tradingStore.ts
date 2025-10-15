import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';

// Trade interface
export interface Trade {
  id: string;
  contractId: string;
  amount: number;
  placedAt: Date;
  settledAt?: Date;
  result?: 'win' | 'loss' | 'pending';
  payout?: number;
  asset?: string;
  type?: string;
}

// Game Position (consolidated from gameStore)
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

// Game Cell (consolidated from gameStore)
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

// Game Stats (consolidated from gameStore and userStore)
export interface GameStats {
  totalBets: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  totalWinnings: number;
  totalLossAmount: number;
  netProfit: number;
  longestWinStreak: number;
  longestLossStreak: number;
  currentStreak: number;
  bestMultiplier: number;
  totalVolume: number;
  bestStreak: number;
}

// Player Tracking (from playerStore)
export interface WatchedPlayer {
  id: string;
  username: string;
  profit: number;
  trades: number;
  winRate: number;
  avatar?: string;
  level?: number;
  lastActive?: Date;
  address?: string;
}

export interface PlayerPreferences {
  showProfit: boolean;
  showTrades: boolean;
  showWinRate: boolean;
  sortBy: 'profit' | 'trades' | 'winRate' | 'username';
  sortOrder: 'asc' | 'desc';
}

// Price Data (consolidated from priceStore)
export interface PricePoint {
  t: number; // timestamp
  p: number; // price
  v?: number; // volume
  h?: number; // high
  l?: number; // low
  o?: number; // open
  c?: number; // close
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

// Consolidated Trading State
interface TradingState {
  // Game State
  gridCells: GameCell[];
  activePositions: GamePosition[];
  gameStats: GameStats;
  isGameActive: boolean;
  isGamePaused: boolean;
  currentTime: number;
  lastUpdate: number;
  selectedCells: string[];
  hoveredCell: string | null;
  
  // Trading State
  activeTrades: Trade[];
  tradeHistory: Trade[];
  
  // Price Data
  priceData: PricePoint[];
  priceStats: PriceStats;
  isSimulating: boolean;

  // Player Tracking
  watchedPlayers: WatchedPlayer[];
  selectedPlayer: WatchedPlayer | null;
  isPlayerTrackerOpen: boolean;
  playerPreferences: PlayerPreferences;
  
  // Actions - Game State
  setGridCells: (cells: GameCell[]) => void;
  updateCell: (cellId: string, updates: Partial<GameCell>) => void;
  toggleCellSelection: (cellId: string) => void;
  clearSelection: () => void;
  addPosition: (position: Omit<GamePosition, 'id' | 'createdAt'>) => void;
  updatePosition: (positionId: string, updates: Partial<GamePosition>) => void;
  removePosition: (positionId: string) => void;
  clearPositions: () => void;
  setGameActive: (active: boolean) => void;
  setGamePaused: (paused: boolean) => void;
  setCurrentTime: (time: number) => void;
  setSelectedCells: (cells: string[]) => void;
  setHoveredCell: (cellId: string | null) => void;
  
  // Actions - Trading
  addTrade: (trade: Omit<Trade, 'id'> & { id?: string }) => void;
  updateTrade: (tradeId: string, updates: Partial<Trade>) => void;
  removeTrade: (tradeId: string) => void;
  settleTrade: (tradeId: string, result: 'win' | 'loss', payout?: number) => void;
  clearTrades: () => void;
  
  // Actions - Game Stats
  updateGameStats: (stats: Partial<GameStats>) => void;
  calculateStats: () => void;
  resetStats: () => void;

  // Actions - Player Tracking
  addWatchedPlayer: (player: Omit<WatchedPlayer, 'id'>) => void;
  removeWatchedPlayer: (playerId: string) => void;
  updatePlayerStats: (playerId: string, stats: Partial<Omit<WatchedPlayer, 'id'>>) => void;
  setSelectedPlayer: (player: WatchedPlayer | null) => void;
  setIsPlayerTrackerOpen: (open: boolean) => void;
  updatePlayerPreferences: (preferences: Partial<PlayerPreferences>) => void;
  resetPlayerData: () => void;
  
  // Actions - Price Data
  setPriceData: (data: PricePoint[]) => void;
  addPricePoint: (point: PricePoint) => void;
  updatePriceStats: (stats: Partial<PriceStats>) => void;
  startSimulation: () => void;
  stopSimulation: () => void;
  
  // Complex Actions
  hitCell: (cellId: string) => void;
  missCell: (cellId: string) => void;
  processGameTick: () => void;
  resetGame: () => void;
  resetTradingData: () => void;
  
  // Computed Values
  getSelectedCells: () => GameCell[];
  getActivePositions: () => GamePosition[];
  getTotalPotentialPayout: () => number;
  getGameProgress: () => number;
}

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
  totalVolume: 0,
  bestStreak: 0,
};

const initialPriceStats: PriceStats = {
  currentPrice: 100,
  priceChange24h: 0,
  priceChangePercent24h: 0,
  volume24h: 0,
  high24h: 100,
  low24h: 100,
  volatility: 0.02,
  trend: 'neutral',
  lastUpdate: Date.now(),
};

export const useTradingStore = create<TradingState>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
      // Initial State
      gridCells: [],
      activePositions: [],
      gameStats: initialGameStats,
      isGameActive: false,
      isGamePaused: false,
      currentTime: 0,
      lastUpdate: Date.now(),
      selectedCells: [],
      hoveredCell: null,
      activeTrades: [],
      tradeHistory: [],
      priceData: [],
      priceStats: initialPriceStats,
      isSimulating: false,
      
      // Player Tracking Initial State
      watchedPlayers: [
        { id: '1', username: 'CryptoTrader', profit: 1250, trades: 45, winRate: 67, avatar: 'https://pbs.twimg.com/profile_images/1944058901713805312/Hl1bsg0D_400x400.jpg', level: 15, address: '0x1234...5678' },
        { id: '2', username: 'DeFiMaster', profit: 890, trades: 32, winRate: 59, avatar: 'https://pbs.twimg.com/profile_images/1785913384590061568/OcNP_wnv_400x400.png', level: 12, address: '0x2345...6789' },
        { id: '3', username: 'BlockchainPro', profit: 2100, trades: 78, winRate: 72, avatar: 'https://pbs.twimg.com/profile_images/1760274165070798848/f5V5qbs9_400x400.jpg', level: 18, address: '0x3456...7890' },
        { id: '4', username: 'TradingGuru', profit: -150, trades: 12, winRate: 25, avatar: 'https://pbs.twimg.com/profile_images/1935120379137134592/Khgw5Kfn_400x400.jpg', level: 8, address: '0x4567...8901' },
      ],
      selectedPlayer: null,
      isPlayerTrackerOpen: false,
      playerPreferences: {
        showProfit: true,
        showTrades: true,
        showWinRate: true,
        sortBy: 'profit',
        sortOrder: 'desc',
      },
      
      // Game State Actions
      setGridCells: (cells) =>
        set({ gridCells: cells }),
      
      updateCell: (cellId, updates) =>
        set((state) => ({
          gridCells: state.gridCells.map((cell) =>
            cell.id === cellId ? { ...cell, ...updates } : cell
          ),
        })),
      
      toggleCellSelection: (cellId) =>
        set((state) => {
          const isSelected = state.selectedCells.includes(cellId);
          return {
            selectedCells: isSelected
              ? state.selectedCells.filter((id) => id !== cellId)
              : [...state.selectedCells, cellId],
          };
        }),
      
      clearSelection: () =>
        set({ selectedCells: [] }),
      
      addPosition: (position) =>
        set((state) => ({
          activePositions: [
            ...state.activePositions,
            {
              ...position,
              id: `position-${Date.now()}-${Math.random()}`,
              createdAt: Date.now(),
            },
          ],
        })),
      
      updatePosition: (positionId, updates) =>
        set((state) => ({
          activePositions: state.activePositions.map((pos) =>
            pos.id === positionId ? { ...pos, ...updates } : pos
          ),
        })),
      
      removePosition: (positionId) =>
        set((state) => ({
          activePositions: state.activePositions.filter(
            (pos) => pos.id !== positionId
          ),
        })),
      
      clearPositions: () =>
        set({ activePositions: [] }),
      
      setGameActive: (active) =>
        set({ isGameActive: active }),
      
      setGamePaused: (paused) =>
        set({ isGamePaused: paused }),
      
      setCurrentTime: (time) =>
        set({ currentTime: time }),
      
      setSelectedCells: (cells) =>
        set({ selectedCells: cells }),
      
      setHoveredCell: (cellId) =>
        set({ hoveredCell: cellId }),
      
      // Trading Actions
      addTrade: (trade) =>
        set((state) => ({
          activeTrades: [
            ...state.activeTrades,
            {
              ...trade,
              id: trade.id || `trade-${Date.now()}-${Math.random()}`,
            },
          ],
        })),
      
      updateTrade: (tradeId, updates) =>
        set((state) => ({
          activeTrades: state.activeTrades.map((trade) =>
            trade.id === tradeId ? { ...trade, ...updates } : trade
          ),
        })),
      
      removeTrade: (tradeId) =>
        set((state) => ({
          activeTrades: state.activeTrades.filter((trade) => trade.id !== tradeId),
        })),
      
      settleTrade: (tradeId, result, payout) =>
        set((state) => {
          const trade = state.activeTrades.find((t) => t.id === tradeId);
          if (!trade) return state;
          
          const settledTrade = {
            ...trade,
            result,
            payout,
            settledAt: new Date(),
          };
          
          return {
            activeTrades: state.activeTrades.filter((t) => t.id !== tradeId),
            tradeHistory: [...state.tradeHistory, settledTrade],
          };
        }),
      
      clearTrades: () =>
        set({ activeTrades: [], tradeHistory: [] }),
      
      // Game Stats Actions
      updateGameStats: (stats) =>
        set((state) => ({
          gameStats: { ...state.gameStats, ...stats },
        })),
      
      calculateStats: () =>
        set((state) => {
          const { tradeHistory } = state;
          const totalBets = tradeHistory.length;
          const totalWins = tradeHistory.filter((t) => t.result === 'win').length;
          const totalLosses = tradeHistory.filter((t) => t.result === 'loss').length;
          const winRate = totalBets > 0 ? (totalWins / totalBets) * 100 : 0;
          const totalWinnings = tradeHistory
            .filter((t) => t.result === 'win')
            .reduce((sum, t) => sum + (t.payout || 0), 0);
          const totalLossAmount = tradeHistory
            .filter((t) => t.result === 'loss')
            .reduce((sum, t) => sum + t.amount, 0);
          const netProfit = totalWinnings - totalLossAmount;
          
          return {
            gameStats: {
              ...state.gameStats,
              totalBets,
              totalWins,
              totalLosses,
              winRate,
              totalWinnings,
              totalLossAmount,
              netProfit,
            },
          };
        }),
      
      resetStats: () =>
        set({ gameStats: initialGameStats }),

      // Player Tracking Actions
      addWatchedPlayer: (player) =>
        set((state) => ({
          watchedPlayers: [
            ...state.watchedPlayers,
            { ...player, id: `player_${Date.now()}` },
          ],
        })),

      removeWatchedPlayer: (playerId) =>
        set((state) => ({
          watchedPlayers: state.watchedPlayers.filter((p) => p.id !== playerId),
        })),

      updatePlayerStats: (playerId, stats) =>
        set((state) => ({
          watchedPlayers: state.watchedPlayers.map((p) =>
            p.id === playerId ? { ...p, ...stats } : p
          ),
        })),

      setSelectedPlayer: (player) =>
        set({ selectedPlayer: player }),

      setIsPlayerTrackerOpen: (open) =>
        set({ isPlayerTrackerOpen: open }),

      updatePlayerPreferences: (preferences) =>
        set((state) => ({
          playerPreferences: { ...state.playerPreferences, ...preferences },
        })),

      resetPlayerData: () =>
        set({
          watchedPlayers: [],
          selectedPlayer: null,
          isPlayerTrackerOpen: false,
          playerPreferences: {
            showProfit: true,
            showTrades: true,
            showWinRate: true,
            sortBy: 'profit',
            sortOrder: 'desc',
          },
        }),
      
      // Price Data Actions
      setPriceData: (data) =>
        set({ priceData: data }),
      
      addPricePoint: (point) =>
        set((state) => ({
          priceData: [...state.priceData, point].slice(-1000), // Keep last 1000 points
        })),
      
      updatePriceStats: (stats) =>
        set((state) => ({
          priceStats: { ...state.priceStats, ...stats },
        })),
      
      startSimulation: () =>
        set({ isSimulating: true }),
      
      stopSimulation: () =>
        set({ isSimulating: false }),
      
      // Complex Actions
      hitCell: (cellId) =>
        set((state) => ({
          gridCells: state.gridCells.map((cell) =>
            cell.id === cellId ? { ...cell, state: 'hit', hitTime: Date.now() } : cell
          ),
        })),
      
      missCell: (cellId) =>
        set((state) => ({
          gridCells: state.gridCells.map((cell) =>
            cell.id === cellId ? { ...cell, state: 'missed' } : cell
          ),
        })),
      
      processGameTick: () =>
        set((state) => ({
          currentTime: state.currentTime + 1,
          lastUpdate: Date.now(),
        })),
      
      resetGame: () =>
        set({
          gridCells: [],
          activePositions: [],
          isGameActive: false,
          isGamePaused: false,
          currentTime: 0,
          selectedCells: [],
          hoveredCell: null,
        }),
      
      resetTradingData: () =>
        set({
          activeTrades: [],
          tradeHistory: [],
          gameStats: initialGameStats,
        }),
      
      // Computed Values
      getSelectedCells: () => {
        const state = get();
        return state.gridCells.filter((cell) =>
          state.selectedCells.includes(cell.id)
        );
      },
      
      getActivePositions: () => {
        const state = get();
        return state.activePositions.filter((pos) => pos.isActive);
      },
      
      getTotalPotentialPayout: () => {
        const state = get();
        return state.activePositions.reduce(
          (total, pos) => total + pos.potentialPayout,
          0
        );
      },
      
      getGameProgress: () => {
        const state = get();
        if (state.gridCells.length === 0) return 0;
        const totalCells = state.gridCells.length;
        const processedCells = state.gridCells.filter(
          (cell) => cell.state === 'hit' || cell.state === 'missed'
        ).length;
        return (processedCells / totalCells) * 100;
      },
    })),
    {
      name: 'trading-store',
      partialize: (state) => ({
        gameStats: state.gameStats,
        tradeHistory: state.tradeHistory,
        priceData: state.priceData.slice(-100), // Only persist last 100 price points
        priceStats: state.priceStats,
      }),
    }
  ),
  { name: 'TradingStore' }
)
);
