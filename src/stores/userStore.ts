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
  status?: 'pending' | 'confirmed' | 'failed'; // Track settlement status
  error?: string; // Error message if trade failed
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
  
  // Trade status tracking
  pendingTrades: Map<string, { tradeId: string; status: 'pending' | 'confirmed' | 'failed'; timestamp: number }>;
  
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
  addTrade: (trade: Omit<Trade, 'id'> & { id?: string }) => void;
  updateTrade: (tradeId: string, updates: Partial<Trade>) => void;
  removeTrade: (tradeId: string) => void;
  settleTrade: (tradeId: string, result: 'win' | 'loss', payout?: number) => void;
  clearTrades: () => void;
  
  // Trade Status Actions
  markTradeAsPending: (tradeId: string) => void;
  markTradeAsConfirmed: (tradeId: string) => void;
  markTradeAsFailed: (tradeId: string, reason?: string) => void;
  
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
      pendingTrades: new Map(),
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
          try {
            // Validate trade data
            if (!tradeData.contractId || !tradeData.amount || tradeData.amount <= 0) {
              console.error('❌ Invalid trade data:', tradeData);
              throw new Error('Invalid trade data: contractId and amount are required');
            }

            // Check if trade already exists by contractId
            const existingTrade = state.activeTrades.find((t) => t.contractId === tradeData.contractId);
            if (existingTrade) {
              console.warn('⚠️ Trade already exists for contractId:', tradeData.contractId, 'Skipping duplicate add.');
              return state;
            }

            const newTrade: Trade = {
              ...tradeData,
              id: tradeData.id || tradeData.contractId || `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              result: 'pending',
              status: 'pending', // Initially pending until server confirms
            };
            
            console.log('➕ userStore.addTrade called:', {
              tradeData,
              newTrade,
              activeTradesCount: state.activeTrades.length,
              existingTradeIds: state.activeTrades.map(t => ({ id: t.id, contractId: t.contractId }))
            });
            
            return {
              activeTrades: [...state.activeTrades, newTrade],
            };
          } catch (error) {
            console.error('❌ Error in addTrade:', error);
            return state; // Return unchanged state on error
          }
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
          try {
            console.log('🔄 userStore.settleTrade called:', { tradeId, result, payout });
            console.log('📋 Current activeTrades:', state.activeTrades.map(t => ({ id: t.id, contractId: t.contractId, amount: t.amount, result: t.result })));
            
            // Validate parameters
            if (!tradeId || !result || !['win', 'loss'].includes(result)) {
              console.error('❌ Invalid settleTrade parameters:', { tradeId, result, payout });
              throw new Error('Invalid settleTrade parameters: tradeId and result (win/loss) are required');
            }

            if (result === 'win' && payout < 0) {
              console.error('❌ Invalid payout for winning trade:', payout);
              throw new Error('Payout cannot be negative for winning trades');
            }
            
            const trade = state.activeTrades.find((t) => t.id === tradeId);
            if (!trade) {
              console.warn('⚠️ Trade not found in activeTrades:', tradeId);
              return state;
            }
          
          const settledTrade: Trade = {
            ...trade,
            result,
            payout,
            settledAt: new Date(),
          };
          
          // Update balance
          const balanceChange = result === 'win' ? payout : -trade.amount;
          const newBalance = state.balance + balanceChange;
          
          // Calculate updated stats after settling trade
          const allTrades = [...state.tradeHistory, settledTrade];
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
          
          console.log('📊 userStore.settleTrade - Profit calculation:', {
            settledTradesCount: settledTrades.length,
            tradeBreakdown: settledTrades.map(t => ({
              id: t.id,
              result: t.result,
              amount: t.amount,
              payout: t.payout,
              profit: t.result === 'win' ? (t.payout || 0) - t.amount : -t.amount
            })),
            totalProfit,
            calculationBreakdown: settledTrades.map(t => {
              if (t.result === 'win' && t.payout) return `${t.payout} - ${t.amount} = ${t.payout - t.amount}`;
              if (t.result === 'loss') return `-${t.amount}`;
              return '0';
            })
          });
          
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
          
          console.log('🔄 userStore.settleTrade - Final state update:', {
            removingFromActive: tradeId,
            activeTradesBefore: state.activeTrades.length,
            activeTradesAfter: state.activeTrades.filter((t) => t.id !== tradeId).length,
            addingToHistory: settledTrade.id,
            tradeHistoryLength: [settledTrade, ...state.tradeHistory].length
          });

            return {
              activeTrades: state.activeTrades.filter((t) => t.id !== tradeId),
              tradeHistory: [settledTrade, ...state.tradeHistory].slice(0, 1000), // Keep last 1000 trades
              balance: newBalance,
              balanceHistory: [
                ...state.balanceHistory,
                { timestamp: Date.now(), balance: newBalance, change: balanceChange },
              ].slice(-100),
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
          } catch (error) {
            console.error('❌ Error in settleTrade:', error);
            return state; // Return unchanged state on error
          }
        }),
      
      clearTrades: () =>
        set({
          activeTrades: [],
        }),
      
      // Trade Status Actions (Pessimistic - wait for server confirmation)
      markTradeAsPending: (tradeId) =>
        set((state) => {
          try {
            console.log('⏳ Marking trade as pending:', tradeId);
            
            const newPendingTrades = new Map(state.pendingTrades);
            newPendingTrades.set(tradeId, {
              tradeId,
              status: 'pending',
              timestamp: Date.now(),
            });

            return {
              pendingTrades: newPendingTrades,
            };
          } catch (error) {
            console.error('❌ Error in markTradeAsPending:', error);
            return state;
          }
        }),

      markTradeAsConfirmed: (tradeId) =>
        set((state) => {
          try {
            console.log('✅ Marking trade as confirmed:', tradeId);
            
            const newPendingTrades = new Map(state.pendingTrades);
            const pendingTrade = newPendingTrades.get(tradeId);
            if (pendingTrade) {
              newPendingTrades.set(tradeId, {
                ...pendingTrade,
                status: 'confirmed',
                timestamp: Date.now(),
              });
            }

            return {
              pendingTrades: newPendingTrades,
            };
          } catch (error) {
            console.error('❌ Error in markTradeAsConfirmed:', error);
            return state;
          }
        }),

      markTradeAsFailed: (tradeId, reason = 'Unknown error') =>
        set((state) => {
          try {
            console.log('❌ Marking trade as failed:', { tradeId, reason });
            
            const newPendingTrades = new Map(state.pendingTrades);
            const pendingTrade = newPendingTrades.get(tradeId);
            if (pendingTrade) {
              newPendingTrades.set(tradeId, {
                ...pendingTrade,
                status: 'failed',
                timestamp: Date.now(),
              });
            }

            return {
              pendingTrades: newPendingTrades,
            };
          } catch (error) {
            console.error('❌ Error in markTradeAsFailed:', error);
            return state;
          }
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
      partialize: (state) => ({
        user: state.user,
        balance: state.balance,
        balanceHistory: state.balanceHistory,
        tradeHistory: state.tradeHistory.slice(0, 100), // Only persist last 100 trades
        stats: state.stats,
        // Note: activeTrades and pendingTrades are intentionally not persisted
        // They should be session-only state for financial accuracy
      }),
    }
  )
);

