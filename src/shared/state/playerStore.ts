import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createPersistentStorage } from '@/shared/utils/persistence';

export interface WatchedPlayer {
  id: string;
  name: string;
  address: string;
  avatar: string;
  game: string;
  isOnline: boolean;
  lastSeen?: number;
  totalBets?: number;
  totalWins?: number;
  winRate?: number;
  currentStreak?: number;
  bestStreak?: number;
  favoriteGame?: string;
  joinDate?: number;
}

export interface PlayerStats {
  totalPlayers: number;
  onlinePlayers: number;
  topPerformers: WatchedPlayer[];
  recentActivity: {
    playerId: string;
    action: string;
    timestamp: number;
  }[];
}

export interface PlayerPreferences {
  showOnlineOnly: boolean;
  sortBy: 'name' | 'winRate' | 'streak' | 'lastSeen';
  sortOrder: 'asc' | 'desc';
  groupByGame: boolean;
  showStats: boolean;
}

interface PlayerState {
  // Player Data
  watchedPlayers: WatchedPlayer[];
  playerStats: PlayerStats;
  preferences: PlayerPreferences;
  
  // UI State
  selectedPlayer: WatchedPlayer | null;
  isPlayerTrackerOpen: boolean;
  isWatchlistOpen: boolean;
  searchQuery: string;
  
  // Actions
  setWatchedPlayers: (players: WatchedPlayer[]) => void;
  addWatchedPlayer: (player: Omit<WatchedPlayer, 'id'>) => void;
  updateWatchedPlayer: (playerId: string, updates: Partial<WatchedPlayer>) => void;
  removeWatchedPlayer: (playerId: string) => void;
  togglePlayerOnlineStatus: (playerId: string) => void;
  
  updatePlayerStats: (stats: Partial<PlayerStats>) => void;
  addRecentActivity: (activity: PlayerStats['recentActivity'][0]) => void;
  clearRecentActivity: () => void;
  
  updatePreferences: (prefs: Partial<PlayerPreferences>) => void;
  
  setSelectedPlayer: (player: WatchedPlayer | null) => void;
  setIsPlayerTrackerOpen: (open: boolean) => void;
  setIsWatchlistOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  
  // Complex Actions
  importPlayers: (players: WatchedPlayer[]) => void;
  exportPlayers: () => WatchedPlayer[];
  resetPlayerData: () => void;
  
  // Computed Values
  getFilteredPlayers: () => WatchedPlayer[];
  getOnlinePlayers: () => WatchedPlayer[];
  getPlayersByGame: (game: string) => WatchedPlayer[];
  getPlayerById: (id: string) => WatchedPlayer | undefined;
  getTopPerformers: (limit?: number) => WatchedPlayer[];
}

const defaultWatchlist: WatchedPlayer[] = [
  {
    id: '1',
    name: 'CryptoTrader',
    address: '0x1234...5678',
    avatar: 'https://pbs.twimg.com/profile_images/1944058901713805312/Hl1bsg0D_400x400.jpg',
    game: 'Box Hit',
    isOnline: true,
    lastSeen: Date.now(),
    totalBets: 156,
    totalWins: 89,
    winRate: 0.57,
    currentStreak: 5,
    bestStreak: 12,
    favoriteGame: 'Box Hit',
    joinDate: Date.now() - 86400000 * 30, // 30 days ago
  },
  {
    id: '2',
    name: 'DeFiMaster',
    address: '0x2345...6789',
    avatar: 'https://pbs.twimg.com/profile_images/1785913384590061568/OcNP_wnv_400x400.png',
    game: 'Box Hit',
    isOnline: false,
    lastSeen: Date.now() - 3600000, // 1 hour ago
    totalBets: 89,
    totalWins: 45,
    winRate: 0.51,
    currentStreak: 0,
    bestStreak: 8,
    favoriteGame: 'Box Hit',
    joinDate: Date.now() - 86400000 * 15, // 15 days ago
  },
  {
    id: '3',
    name: 'BlockchainPro',
    address: '0x3456...7890',
    avatar: 'https://pbs.twimg.com/profile_images/1760274165070798848/f5V5qbs9_400x400.jpg',
    game: 'Box Hit',
    isOnline: true,
    lastSeen: Date.now(),
    totalBets: 234,
    totalWins: 134,
    winRate: 0.57,
    currentStreak: 3,
    bestStreak: 15,
    favoriteGame: 'Box Hit',
    joinDate: Date.now() - 86400000 * 45, // 45 days ago
  },
  {
    id: '4',
    name: 'TradingGuru',
    address: '0x4567...8901',
    avatar: 'https://pbs.twimg.com/profile_images/1935120379137134592/Khgw5Kfn_400x400.jpg',
    game: 'Box Hit',
    isOnline: false,
    lastSeen: Date.now() - 7200000, // 2 hours ago
    totalBets: 178,
    totalWins: 98,
    winRate: 0.55,
    currentStreak: 0,
    bestStreak: 11,
    favoriteGame: 'Box Hit',
    joinDate: Date.now() - 86400000 * 60, // 60 days ago
  },
];

const initialPlayerStats: PlayerStats = {
  totalPlayers: 0,
  onlinePlayers: 0,
  topPerformers: [],
  recentActivity: [],
};

const initialPreferences: PlayerPreferences = {
  showOnlineOnly: false,
  sortBy: 'winRate',
  sortOrder: 'desc',
  groupByGame: false,
  showStats: true,
};

type PersistedPlayerState = Pick<PlayerState, 'watchedPlayers' | 'preferences'>;

export const usePlayerStore = create<PlayerState>()(
  persist<PlayerState, [], [], PersistedPlayerState>(
    (set, get) => ({
      // Initial State
      watchedPlayers: defaultWatchlist,
      playerStats: initialPlayerStats,
      preferences: initialPreferences,
      selectedPlayer: null,
      isPlayerTrackerOpen: false,
      isWatchlistOpen: false,
      searchQuery: '',

      // Basic Actions
      setWatchedPlayers: (players) =>
        set((state) => ({
          watchedPlayers: players,
          playerStats: {
            ...state.playerStats,
            totalPlayers: players.length,
            onlinePlayers: players.filter((p) => p.isOnline).length,
          },
        })),

      addWatchedPlayer: (playerData) =>
        set((state) => {
          const newPlayer: WatchedPlayer = {
            ...playerData,
            id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          };

          const updatedPlayers = [...state.watchedPlayers, newPlayer];
          return {
            watchedPlayers: updatedPlayers,
            playerStats: {
              ...state.playerStats,
              totalPlayers: updatedPlayers.length,
              onlinePlayers: updatedPlayers.filter((p) => p.isOnline).length,
            },
          };
        }),

      updateWatchedPlayer: (playerId, updates) =>
        set((state) => ({
          watchedPlayers: state.watchedPlayers.map((player) =>
            player.id === playerId ? { ...player, ...updates } : player
          ),
        })),

      removeWatchedPlayer: (playerId) =>
        set((state) => {
          const updatedPlayers = state.watchedPlayers.filter((p) => p.id !== playerId);
          return {
            watchedPlayers: updatedPlayers,
            playerStats: {
              ...state.playerStats,
              totalPlayers: updatedPlayers.length,
              onlinePlayers: updatedPlayers.filter((p) => p.isOnline).length,
            },
          };
        }),

      togglePlayerOnlineStatus: (playerId) =>
        set((state) => {
          const updatedPlayers = state.watchedPlayers.map((player) =>
            player.id === playerId
              ? {
                  ...player,
                  isOnline: !player.isOnline,
                  lastSeen: Date.now(),
                }
              : player
          );

          return {
            watchedPlayers: updatedPlayers,
            playerStats: {
              ...state.playerStats,
              onlinePlayers: updatedPlayers.filter((p) => p.isOnline).length,
            },
          };
        }),

      // Stats Management
      updatePlayerStats: (stats) =>
        set((state) => ({
          playerStats: { ...state.playerStats, ...stats },
        })),

      addRecentActivity: (activity) =>
        set((state) => ({
          playerStats: {
            ...state.playerStats,
            recentActivity: [activity, ...state.playerStats.recentActivity].slice(0, 50), // Keep last 50
          },
        })),

      clearRecentActivity: () =>
        set((state) => ({
          playerStats: {
            ...state.playerStats,
            recentActivity: [],
          },
        })),

      // Preferences
      updatePreferences: (prefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        })),

      // UI State
      setSelectedPlayer: (player) => set({ selectedPlayer: player }),
      setIsPlayerTrackerOpen: (open) => set({ isPlayerTrackerOpen: open }),
      setIsWatchlistOpen: (open) => set({ isWatchlistOpen: open }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      // Complex Actions
      importPlayers: (players) =>
        set((state) => {
          // Merge with existing players, avoiding duplicates by address
          const existingAddresses = new Set(state.watchedPlayers.map((p) => p.address));
          const newPlayers = players.filter((p) => !existingAddresses.has(p.address));

          const updatedPlayers = [...state.watchedPlayers, ...newPlayers];
          return {
            watchedPlayers: updatedPlayers,
            playerStats: {
              ...state.playerStats,
              totalPlayers: updatedPlayers.length,
              onlinePlayers: updatedPlayers.filter((p) => p.isOnline).length,
            },
          };
        }),

      exportPlayers: () => {
        const state = get();
        return state.watchedPlayers;
      },

      resetPlayerData: () =>
        set({
          watchedPlayers: defaultWatchlist,
          playerStats: initialPlayerStats,
          preferences: initialPreferences,
          selectedPlayer: null,
          searchQuery: '',
        }),

      // Computed Values
      getFilteredPlayers: () => {
        const state = get();
        let filtered = state.watchedPlayers;

        // Apply search filter
        if (state.searchQuery) {
          const query = state.searchQuery.toLowerCase();
          filtered = filtered.filter(
            (player) =>
              player.name.toLowerCase().includes(query) ||
              player.address.toLowerCase().includes(query) ||
              player.game.toLowerCase().includes(query)
          );
        }

        // Apply online filter
        if (state.preferences.showOnlineOnly) {
          filtered = filtered.filter((player) => player.isOnline);
        }

        // Apply sorting
        const direction = state.preferences.sortOrder === 'asc' ? 1 : -1;
        filtered.sort((a, b) => {
          const getValue = (player: WatchedPlayer) => {
            switch (state.preferences.sortBy) {
              case 'name':
                return player.name.toLowerCase();
              case 'winRate':
                return player.winRate ?? 0;
              case 'streak':
                return player.currentStreak ?? 0;
              case 'lastSeen':
                return player.lastSeen ?? 0;
              default:
                return 0;
            }
          };

          const aValue = getValue(a);
          const bValue = getValue(b);

          if (typeof aValue === 'number' && typeof bValue === 'number') {
            return (aValue - bValue) * direction;
          }

          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return aValue.localeCompare(bValue) * direction;
          }

          return 0;
        });

        return filtered;
      },

      getOnlinePlayers: () => {
        const state = get();
        return state.watchedPlayers.filter((player) => player.isOnline);
      },

      getPlayersByGame: (game) => {
        const state = get();
        return state.watchedPlayers.filter((player) => player.game === game);
      },

      getPlayerById: (id) => {
        const state = get();
        return state.watchedPlayers.find((player) => player.id === id);
      },

      getTopPerformers: (limit = 10) => {
        const state = get();
        return state.watchedPlayers
          .filter((player) => player.totalBets && player.totalBets > 0)
          .sort((a, b) => (b.winRate || 0) - (a.winRate || 0))
          .slice(0, limit);
      },
    }),
    {
      name: 'player-store',
      storage: createPersistentStorage<PersistedPlayerState>('player'),
      partialize: (state) => ({
        watchedPlayers: state.watchedPlayers,
        preferences: state.preferences,
      }),
    }
  )
);
