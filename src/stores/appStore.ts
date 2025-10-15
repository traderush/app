import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';

// User Profile
export interface UserProfile {
  userId: string;
  username: string;
  email?: string;
  avatar?: string;
  level?: number;
  xp?: number;
  joinedAt?: Date;
}

// Game Settings (consolidated from gameStore)
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

// UI State (consolidated from uiStore)
export interface UITheme {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  borderRadius: string;
  fontSize: 'sm' | 'md' | 'lg';
  density: 'compact' | 'comfortable' | 'spacious';
}

export interface UILayout {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  panelWidth: number;
  gridSize: 'small' | 'medium' | 'large';
  showGrid: boolean;
  showStats: boolean;
  showPlayerTracker: boolean;
}

export interface UISettings {
  soundEnabled: boolean;
  animationsEnabled: boolean;
  autoSave: boolean;
  notificationsEnabled: boolean;
  compactMode: boolean;
  developerMode: boolean;
}

export interface ModalState {
  isOpen: boolean;
  type: string | null;
  data?: unknown;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  timestamp: number;
  read?: boolean;
}

// Consolidated App State
interface AppState {
  // User & Auth
  user: UserProfile | null;
  isAuthenticated: boolean;
  balance: number;
  balanceHistory: Array<{ timestamp: number; balance: number; change: number }>;
  
  // Game Settings
  gameSettings: GameSettings;
  
  // UI State
  modals: Record<string, ModalState>;
  notifications: ToastNotification[];
  theme: UITheme;
  layout: UILayout;
  settings: UISettings;
  signatureColor: string;
  favoriteAssets: Set<'BTC' | 'ETH' | 'SOL' | 'DEMO'>;
  isAssetDropdownOpen: boolean;
  isLoading: boolean;
  loadingMessage: string;
  lastActivity: number;
  
  // Actions - User & Auth
  setUser: (userId: string, username: string, profile?: Partial<UserProfile>) => void;
  updateUser: (updates: Partial<UserProfile>) => void;
  clearUser: () => void;
  updateBalance: (newBalance: number) => void;
  addBalanceChange: (change: number, reason?: string) => void;
  resetBalance: () => void;
  
  // Actions - Game Settings
  updateGameSettings: (settings: Partial<GameSettings>) => void;
  
  // Actions - Modals
  openModal: (type: string, data?: unknown) => void;
  closeModal: (type: string) => void;
  closeAllModals: () => void;
  isModalOpen: (type: string) => boolean;
  getModalData: (type: string) => unknown;
  
  // Actions - Notifications
  addNotification: (notification: Omit<ToastNotification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  markAllAsRead: () => void;
  
  // Actions - Theme & Layout
  updateTheme: (theme: Partial<UITheme>) => void;
  updateLayout: (layout: Partial<UILayout>) => void;
  updateSettings: (settings: Partial<UISettings>) => void;
  
  // Actions - Signature Color
  setSignatureColor: (color: string) => void;
  resetSignatureColor: () => void;
  
  // Actions - Asset Preferences
  toggleFavoriteAsset: (asset: 'BTC' | 'ETH' | 'SOL' | 'DEMO') => void;
  setFavoriteAssets: (assets: ('BTC' | 'ETH' | 'SOL' | 'DEMO')[]) => void;
  
  // Actions - Dropdowns
  setAssetDropdownOpen: (isOpen: boolean) => void;
  toggleAssetDropdown: () => void;
  
  // Actions - Global State
  setLoading: (loading: boolean, message?: string) => void;
  updateActivity: () => void;
  
  // Complex Actions
  toggleSidebar: () => void;
  toggleSound: () => void;
  resetApp: () => void;
  
  // Computed Values
  getActiveModals: () => string[];
  getUnreadNotifications: () => ToastNotification[];
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
  selectedAsset: 'DEMO',
  timeframe: 2000,
};

const initialTheme: UITheme = {
  primaryColor: '#FA5616',
  backgroundColor: '#09090B',
  textColor: '#FFFFFF',
  accentColor: '#2FE3AC',
  borderRadius: '8px',
  fontSize: 'md',
  density: 'comfortable',
};

const initialLayout: UILayout = {
  sidebarCollapsed: false,
  sidebarWidth: 64,
  panelWidth: 400,
  gridSize: 'medium',
  showGrid: true,
  showStats: true,
  showPlayerTracker: true,
};

const initialSettings: UISettings = {
  soundEnabled: true,
  animationsEnabled: true,
  autoSave: true,
  notificationsEnabled: true,
  compactMode: false,
  developerMode: false,
};

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
      // Initial State
      user: null,
      isAuthenticated: false,
      balance: 10000,
      balanceHistory: [],
      gameSettings: initialGameSettings,
      modals: {},
      notifications: [],
      theme: initialTheme,
      layout: initialLayout,
      settings: initialSettings,
      signatureColor: '#FA5616',
      favoriteAssets: new Set(),
      isAssetDropdownOpen: false,
      isLoading: false,
      loadingMessage: '',
      lastActivity: Date.now(),
      
      // User & Auth Actions
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
      
      addBalanceChange: (change, reason) =>
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
      
      // Game Settings Actions
      updateGameSettings: (settings) =>
        set((state) => ({
          gameSettings: { ...state.gameSettings, ...settings },
        })),
      
      // Modal Actions
      openModal: (type, data) =>
        set((state) => ({
          modals: {
            ...state.modals,
            [type]: { isOpen: true, type, data },
          },
        })),
      
      closeModal: (type) =>
        set((state) => ({
          modals: {
            ...state.modals,
            [type]: { isOpen: false, type: null, data: undefined },
          },
        })),
      
      closeAllModals: () =>
        set({
          modals: {},
        }),
      
      isModalOpen: (type) => get().modals[type]?.isOpen || false,
      
      getModalData: (type) => get().modals[type]?.data,
      
      // Notification Actions
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            ...state.notifications,
            {
              ...notification,
              id: `notification-${Date.now()}-${Math.random()}`,
              timestamp: Date.now(),
              read: false,
            },
          ],
        })),
      
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
      
      clearAllNotifications: () =>
        set({
          notifications: [],
        }),
      
      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),
      
      // Theme & Layout Actions
      updateTheme: (theme) =>
        set((state) => ({
          theme: { ...state.theme, ...theme },
        })),
      
      updateLayout: (layout) =>
        set((state) => ({
          layout: { ...state.layout, ...layout },
        })),
      
      updateSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        })),
      
      // Signature Color Actions
      setSignatureColor: (color) =>
        set({ signatureColor: color }),
      
      resetSignatureColor: () =>
        set({ signatureColor: '#FA5616' }),
      
      // Asset Preferences Actions
      toggleFavoriteAsset: (asset) =>
        set((state) => {
          const newFavorites = new Set(state.favoriteAssets);
          if (newFavorites.has(asset)) {
            newFavorites.delete(asset);
          } else {
            newFavorites.add(asset);
          }
          return { favoriteAssets: newFavorites };
        }),
      
      setFavoriteAssets: (assets) =>
        set({ favoriteAssets: new Set(assets) }),
      
      // Dropdown Actions
      setAssetDropdownOpen: (isOpen) =>
        set({ isAssetDropdownOpen: isOpen }),
      
      toggleAssetDropdown: () =>
        set((state) => ({ isAssetDropdownOpen: !state.isAssetDropdownOpen })),
      
      // Global State Actions
      setLoading: (loading, message = '') =>
        set({
          isLoading: loading,
          loadingMessage: message,
        }),
      
      updateActivity: () =>
        set({ lastActivity: Date.now() }),
      
      // Complex Actions
      toggleSidebar: () =>
        set((state) => ({
          layout: {
            ...state.layout,
            sidebarCollapsed: !state.layout.sidebarCollapsed,
          },
        })),
      
      toggleSound: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            soundEnabled: !state.settings.soundEnabled,
          },
          gameSettings: {
            ...state.gameSettings,
            soundEnabled: !state.gameSettings.soundEnabled,
          },
        })),
      
      resetApp: () =>
        set({
          user: null,
          isAuthenticated: false,
          balance: 10000,
          balanceHistory: [],
          gameSettings: initialGameSettings,
          modals: {},
          notifications: [],
          theme: initialTheme,
          layout: initialLayout,
          settings: initialSettings,
          signatureColor: '#FA5616',
          favoriteAssets: new Set(),
          isAssetDropdownOpen: false,
          isLoading: false,
          loadingMessage: '',
          lastActivity: Date.now(),
        }),
      
      // Computed Values
      getActiveModals: () => {
        const state = get();
        return Object.keys(state.modals).filter(
          (key) => state.modals[key].isOpen
        );
      },
      
      getUnreadNotifications: () => {
        const state = get();
        return state.notifications.filter((n) => !n.read);
      },
    })),
    {
      name: 'app-store',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        balance: state.balance,
        balanceHistory: state.balanceHistory,
        gameSettings: state.gameSettings,
        theme: state.theme,
        layout: state.layout,
        settings: state.settings,
        signatureColor: state.signatureColor,
        favoriteAssets: Array.from(state.favoriteAssets), // Convert Set to Array for serialization
      }),
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.favoriteAssets)) {
          state.favoriteAssets = new Set(state.favoriteAssets);
        }
      },
    }
  ),
  { name: 'AppStore' }
)
);
