import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist } from 'zustand/middleware';
import { createPersistentStorage } from '@/utils/persistence';

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

export interface UserProfile {
  userId: string;
  username: string;
  email?: string;
  avatar?: string;
  level?: number;
  xp?: number;
  joinedAt?: Date;
}

export interface UserStats {
  totalTrades: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  totalVolume: number;
  totalProfit: number;
  bestStreak: number;
  currentStreak: number;
}

interface UserState {
  // User Profile
  user: UserProfile | null;
  isAuthenticated: boolean;
  
  // Balance
  balance: number;
  balanceHistory: Array<{ timestamp: number; balance: number; change: number }>;
  
  // Trades
  activeTrades: Trade[];
  tradeHistory: Trade[];
  
  // Stats
  stats: UserStats;
  
  // Actions - Profile
  setUser: (userId: string, username: string, profile?: Partial<UserProfile>) => void;
  updateUser: (updates: Partial<UserProfile>) => void;
  clearUser: () => void;
  
  // Actions - Balance
  updateBalance: (newBalance: number) => void;
  addBalanceChange: (change: number, reason?: string) => void;
  resetBalance: () => void;
  
  // Actions - Trades
  addTrade: (trade: Omit<Trade, 'id'>) => void;
  updateTrade: (tradeId: string, updates: Partial<Trade>) => void;
  removeTrade: (tradeId: string) => void;
  settleTrade: (tradeId: string, result: 'win' | 'loss', payout?: number) => void;
  clearTrades: () => void;
  
  // Actions - Stats
  updateStats: (stats: Partial<UserStats>) => void;
  calculateStats: () => void;
  resetStats: () => void;
  
  // Complex Actions
  resetUserData: () => void;
}

const initialStats: UserStats = {
  totalTrades: 0,
  totalWins: 0,
  totalLosses: 0,
  winRate: 0,
  totalVolume: 0,
  totalProfit: 0,
  bestStreak: 0,
  currentStreak: 0,
};

export const useUserStore = create<UserState>()(
  persist(
    subscribeWithSelector((set, get) => ({
      // Initial State
      user: null,
      isAuthenticated: false,
      balance: 10000, // Starting balance
      balanceHistory: [],
      activeTrades: [],
      tradeHistory: [],
      stats: initialStats,
      
      // Profile Actions
      setUser: (userId, username, profile = {}) =>
        set({
          user: {
            userId,
            username,
            ...profile,
          },
          isAuthenticated: true,
        }),
      
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      
      clearUser: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),
      
      // Balance Actions
      updateBalance: (newBalance) =>
        set((state) => {
          const change = newBalance - state.balance;
          const newHistory = [
            ...state.balanceHistory,
            { timestamp: Date.now(), balance: newBalance, change },
          ].slice(-100); // Keep last 100 balance changes
          
          return {
            balance: newBalance,
            balanceHistory: newHistory,
          };
        }),
      
      addBalanceChange: (change) =>
        set((state) => {
          const newBalance = state.balance + change;
          const newHistory = [
            ...state.balanceHistory,
            { timestamp: Date.now(), balance: newBalance, change },
          ].slice(-100);
          
          return {
            balance: newBalance,
            balanceHistory: newHistory,
          };
        }),
      
      resetBalance: () =>
        set({
          balance: 10000,
          balanceHistory: [],
        }),
      
      // Trade Actions
      addTrade: (tradeData) =>
        set((state) => {
          const newTrade: Trade = {
            ...tradeData,
            id: tradeData.contractId || `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            result: 'pending',
          };
          
          return {
            activeTrades: [...state.activeTrades, newTrade],
          };
        }),
      
      updateTrade: (tradeId, updates) =>
        set((state) => ({
          activeTrades: state.activeTrades.map((trade) =>
            trade.id === tradeId ? { ...trade, ...updates } : trade
          ),
          tradeHistory: state.tradeHistory.map((trade) =>
            trade.id === tradeId ? { ...trade, ...updates } : trade
          ),
        })),
      
      removeTrade: (tradeId) =>
        set((state) => ({
          activeTrades: state.activeTrades.filter((trade) => trade.id !== tradeId),
        })),
      
      settleTrade: (tradeId, result, payout = 0) =>
        set((state) => {
          const trade = state.activeTrades.find((t) => t.id === tradeId);
          if (!trade) return state;
          
          const settledTrade: Trade = {
            ...trade,
            result,
            payout,
            settledAt: new Date(),
          };
          
          // Update balance
          const balanceChange = result === 'win' ? payout : -trade.amount;
          const newBalance = state.balance + balanceChange;
          
          return {
            activeTrades: state.activeTrades.filter((t) => t.id !== tradeId),
            tradeHistory: [settledTrade, ...state.tradeHistory].slice(0, 1000), // Keep last 1000 trades
            balance: newBalance,
            balanceHistory: [
              ...state.balanceHistory,
              { timestamp: Date.now(), balance: newBalance, change: balanceChange },
            ].slice(-100),
          };
        }),
      
      clearTrades: () =>
        set({
          activeTrades: [],
        }),
      
      // Stats Actions
      updateStats: (stats) =>
        set((state) => ({
          stats: { ...state.stats, ...stats },
        })),
      
      calculateStats: () =>
        set((state) => {
          const allTrades = [...state.tradeHistory, ...state.activeTrades];
          const settledTrades = allTrades.filter((t) => t.result && t.result !== 'pending');
          
          const totalTrades = settledTrades.length;
          const totalWins = settledTrades.filter((t) => t.result === 'win').length;
          const totalLosses = settledTrades.filter((t) => t.result === 'loss').length;
          const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
          
          const totalVolume = settledTrades.reduce((sum, t) => sum + t.amount, 0);
          const totalProfit = settledTrades.reduce((sum, t) => {
            if (t.result === 'win' && t.payout) return sum + (t.payout - t.amount);
            if (t.result === 'loss') return sum - t.amount;
            return sum;
          }, 0);
          
          // Calculate best streak
          let currentStreak = 0;
          let bestStreak = 0;
          let streakType: 'win' | 'loss' | null = null;
          
          settledTrades.forEach((trade) => {
            if (trade.result === 'win') {
              if (streakType === 'win') {
                currentStreak++;
              } else {
                currentStreak = 1;
                streakType = 'win';
              }
            } else if (trade.result === 'loss') {
              if (streakType === 'loss') {
                currentStreak++;
              } else {
                currentStreak = 1;
                streakType = 'loss';
              }
            }
            
            if (streakType === 'win') {
              bestStreak = Math.max(bestStreak, currentStreak);
            }
          });
          
          return {
            stats: {
              totalTrades,
              totalWins,
              totalLosses,
              winRate,
              totalVolume,
              totalProfit,
              bestStreak,
              currentStreak: streakType === 'win' ? currentStreak : 0,
            },
          };
        }),
      
      resetStats: () =>
        set({
          stats: initialStats,
        }),
      
      // Complex Actions
      resetUserData: () =>
        set({
          user: null,
          isAuthenticated: false,
          balance: 10000,
          balanceHistory: [],
          activeTrades: [],
          tradeHistory: [],
          stats: initialStats,
        }),
    })),
    {
      name: 'user-store',
      storage: createPersistentStorage('user'),
      partialize: (state) => ({
        user: state.user,
        balance: state.balance,
        balanceHistory: state.balanceHistory,
        tradeHistory: state.tradeHistory.slice(0, 100), // Only persist last 100 trades
        stats: state.stats,
      }),
    }
  )
);

