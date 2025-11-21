import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createPersistentStorage } from '@/shared/utils/persistence';

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

export interface PnLCustomization {
  backgroundImage: string;
  backgroundOpacity: number;
  backgroundBlur: number;
  generalTextColor: string;
  balanceTextColor: string;
  pnlTextColor: string;
}

interface UIState {
  // Modal Management
  modals: Record<string, ModalState>;
  
  // Toast Notifications
  notifications: ToastNotification[];
  
  // Theme & Layout
  theme: UITheme;
  layout: UILayout;
  settings: UISettings;
  
  // Signature Color (user's custom color)
  signatureColor: string;

  // Trading Colors
  tradingPositiveColor: string;
  tradingNegativeColor: string;

  // PnL customization
  pnLCustomization: PnLCustomization;
  
  // Asset Preferences
  favoriteAssets: Set<'BTC' | 'ETH' | 'SOL' | 'DEMO'>;
  
  // Dropdown States
  isAssetDropdownOpen: boolean;
  
  // Global UI State
  isLoading: boolean;
  loadingMessage: string;
  isConnected: boolean;
  lastActivity: number;
  
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
  
  // Actions - Trading Colors
  setTradingPositiveColor: (color: string) => void;
  setTradingNegativeColor: (color: string) => void;
  resetTradingColors: () => void;
  
  updatePnLCustomization: (updates: Partial<PnLCustomization>) => void;
  resetPnLCustomization: () => void;
  
  // Actions - Asset Preferences
  toggleFavoriteAsset: (asset: 'BTC' | 'ETH' | 'SOL' | 'DEMO') => void;
  setFavoriteAssets: (assets: ('BTC' | 'ETH' | 'SOL' | 'DEMO')[]) => void;
  
  // Actions - Dropdowns
  setAssetDropdownOpen: (isOpen: boolean) => void;
  toggleAssetDropdown: () => void;
  
  // Actions - Global State
  setLoading: (loading: boolean, message?: string) => void;
  setConnected: (connected: boolean) => void;
  updateActivity: () => void;
  
  // Complex Actions
  toggleSidebar: () => void;
  toggleSound: () => void;
  resetUI: () => void;
  
  // Computed Values
  getActiveModals: () => string[];
  getUnreadNotifications: () => ToastNotification[];
  getNotificationCount: () => number;
}

const defaultPnLCustomization: PnLCustomization = {
  backgroundImage: 'https://www.carscoops.com/wp-content/uploads/2023/05/McLaren-750S-main.gif',
  backgroundOpacity: 100,
  backgroundBlur: 0,
  generalTextColor: '#ffffff',
  balanceTextColor: '#ff5a5f',
  pnlTextColor: '#2ecc71',
};

const initialTheme: UITheme = {
  primaryColor: '#3b82f6',
  backgroundColor: '#0f172a',
  textColor: '#f8fafc',
  accentColor: '#06b6d4',
  borderRadius: '8px',
  fontSize: 'md',
  density: 'comfortable',
};

const initialLayout: UILayout = {
  sidebarCollapsed: false,
  sidebarWidth: 280,
  panelWidth: 320,
  gridSize: 'medium',
  showGrid: true,
  showStats: true,
  showPlayerTracker: false,
};

const initialSettings: UISettings = {
  soundEnabled: true,
  animationsEnabled: true,
  autoSave: true,
  notificationsEnabled: true,
  compactMode: false,
  developerMode: false,
};

type PersistedUIState = {
  theme: UITheme;
  layout: UILayout;
  settings: UISettings;
  signatureColor: string;
  favoriteAssets: ('BTC' | 'ETH' | 'SOL' | 'DEMO')[];
  pnLCustomization: PnLCustomization;
};

export const useUIStore = create<UIState>()(
  persist<UIState, [], [], PersistedUIState>(
    (set, get) => ({
      // Initial State
      modals: {},
      notifications: [],
      theme: initialTheme,
      layout: initialLayout,
      settings: initialSettings,
      signatureColor: '#FA5616', // Default signature color (orange)
      tradingPositiveColor: '#2ecc71', // Default trading positive (green)
      tradingNegativeColor: '#ff5a5f', // Default trading negative (red)
      pnLCustomization: defaultPnLCustomization,
      favoriteAssets: new Set(['BTC']), // BTC is favorited by default
      isAssetDropdownOpen: false,
      isLoading: false,
      loadingMessage: '',
      isConnected: true,
      lastActivity: Date.now(),

      // Modal Actions
      openModal: (type, data) =>
        set((state) => ({
          modals: {
            ...state.modals,
            [type]: {
              isOpen: true,
              type,
              data,
            },
          },
        })),

      closeModal: (type) =>
        set((state) => ({
          modals: {
            ...state.modals,
            [type]: {
              ...state.modals[type],
              isOpen: false,
              data: undefined,
            },
          },
        })),

      closeAllModals: () =>
        set((state) => {
          const closedModals = Object.keys(state.modals).reduce((acc, key) => {
            acc[key] = {
              ...state.modals[key],
              isOpen: false,
              data: undefined,
            };
            return acc;
          }, {} as Record<string, ModalState>);

          return { modals: closedModals };
        }),

      isModalOpen: (type) => {
        const state = get();
        return state.modals[type]?.isOpen || false;
      },

      getModalData: (type) => {
        const state = get();
        return state.modals[type]?.data;
      },

      // Notification Actions
      addNotification: (notificationData) =>
        set((state) => {
          const notification: ToastNotification = {
            ...notificationData,
            id: `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            duration: notificationData.duration || 5000,
          };

          return {
            notifications: [notification, ...state.notifications].slice(0, 20), // Keep last 20
          };
        }),

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearAllNotifications: () => set({ notifications: [] }),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      // Theme & Layout Actions
      updateTheme: (themeUpdates) =>
        set((state) => ({
          theme: { ...state.theme, ...themeUpdates },
        })),

      updateLayout: (layoutUpdates) =>
        set((state) => ({
          layout: { ...state.layout, ...layoutUpdates },
        })),

      updateSettings: (settingsUpdates) =>
        set((state) => ({
          settings: { ...state.settings, ...settingsUpdates },
        })),

      // Signature Color Actions
      setSignatureColor: (color) =>
        set({ signatureColor: color }),

      resetSignatureColor: () =>
        set({ signatureColor: '#FA5616' }),

      // Trading Colors Actions
      setTradingPositiveColor: (color) =>
        set({ tradingPositiveColor: color }),

      setTradingNegativeColor: (color) =>
        set({ tradingNegativeColor: color }),

      resetTradingColors: () =>
        set({ 
          tradingPositiveColor: '#2ecc71',
          tradingNegativeColor: '#ff5a5f',
        }),

      updatePnLCustomization: (updates) =>
        set((state) => ({
          pnLCustomization: { ...state.pnLCustomization, ...updates },
        })),

      resetPnLCustomization: () =>
        set({ pnLCustomization: defaultPnLCustomization }),
      
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

      setConnected: (connected) =>
        set({
          isConnected: connected,
          lastActivity: connected ? Date.now() : get().lastActivity,
        }),

      updateActivity: () => set({ lastActivity: Date.now() }),

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
        })),

      resetUI: () =>
        set({
          modals: {},
          notifications: [],
          theme: initialTheme,
          layout: initialLayout,
          settings: initialSettings,
          pnLCustomization: defaultPnLCustomization,
          isLoading: false,
          loadingMessage: '',
          isConnected: true,
          lastActivity: Date.now(),
        }),

      // Computed Values
      getActiveModals: () => {
        const state = get();
        return Object.keys(state.modals).filter((key) => state.modals[key].isOpen);
      },

      getUnreadNotifications: () => {
        const state = get();
        return state.notifications.filter((n) => !n.read);
      },

      getNotificationCount: () => {
        const state = get();
        return state.notifications.filter((n) => !n.read).length;
      },
    }),
    {
      name: 'ui-store',
      storage: createPersistentStorage<PersistedUIState>('ui'),
      partialize: (state): PersistedUIState => ({
        theme: state.theme,
        layout: state.layout,
        settings: state.settings,
        signatureColor: state.signatureColor,
        tradingPositiveColor: state.tradingPositiveColor,
        tradingNegativeColor: state.tradingNegativeColor,
        pnLCustomization: state.pnLCustomization,
        favoriteAssets: Array.from(state.favoriteAssets),
      }),
      merge: (persistedState, currentState) => {
        if (!persistedState) return currentState;

        const persisted = persistedState as PersistedUIState;
        return {
          ...currentState,
          ...persisted,
          favoriteAssets: new Set(
            persisted.favoriteAssets?.length
              ? persisted.favoriteAssets
              : Array.from(currentState.favoriteAssets)
          ),
          pnLCustomization:
            persisted.pnLCustomization ?? currentState.pnLCustomization,
          tradingPositiveColor: persisted.tradingPositiveColor ?? currentState.tradingPositiveColor,
          tradingNegativeColor: persisted.tradingNegativeColor ?? currentState.tradingNegativeColor,
        };
      },
    }
  )
);

// Convenience hooks for common UI actions
export const useModal = (type: string) => {
  const isOpen = useUIStore((state) => state.isModalOpen(type));
  const data = useUIStore((state) => state.getModalData(type));
  const openModal = useUIStore((state) => state.openModal);
  const closeModal = useUIStore((state) => state.closeModal);

  return {
    isOpen,
    data,
    open: (modalData?: unknown) => openModal(type, modalData),
    close: () => closeModal(type),
  };
};

export const useNotifications = () => {
  const notifications = useUIStore((state) => state.notifications);
  const addNotification = useUIStore((state) => state.addNotification);
  const removeNotification = useUIStore((state) => state.removeNotification);
  const clearAllNotifications = useUIStore((state) => state.clearAllNotifications);

  return {
    notifications,
    add: addNotification,
    remove: removeNotification,
    clear: clearAllNotifications,
  };
};

export const useSidebar = () => {
  const isCollapsed = useUIStore((state) => state.layout.sidebarCollapsed);
  const toggle = useUIStore((state) => state.toggleSidebar);

  return {
    isCollapsed,
    toggle,
  };
};
