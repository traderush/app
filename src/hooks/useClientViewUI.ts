/**
 * useClientViewUI Hook
 * 
 * Manages UI-specific interactions and dropdown states for the ClientView component.
 * Separates UI logic from business logic.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useUIStore } from '@/stores';
import { handleCanvasError } from '@/lib/errorHandler';

export interface ClientViewUIActions {
  setShowProbabilities: (show: boolean) => void;
  setShowOtherPlayers: (show: boolean) => void;
  setMinMultiplier: (mult: number) => void;
  setTimeframe: (ms: number) => void;
  setSelectedAsset: (asset: 'BTC' | 'ETH' | 'SOL' | 'DEMO') => void;
  toggleFavorite: (asset: 'BTC' | 'ETH' | 'SOL' | 'DEMO', event: React.MouseEvent) => void;
}

export interface UseClientViewUIProps {
  updateGameSettings: (settings: Record<string, unknown>) => void;
}

export const useClientViewUI = ({
  updateGameSettings,
}: UseClientViewUIProps): ClientViewUIActions => {
  
  // Use refs to avoid infinite loops
  const toggleFavoriteAssetRef = useRef(useUIStore.getState().toggleFavoriteAsset);
  const isAssetDropdownOpen = useUIStore((state) => state.isAssetDropdownOpen);
  const setAssetDropdownOpenRef = useRef(useUIStore.getState().setAssetDropdownOpen);

  // Update refs when store actions change
  useEffect(() => {
    toggleFavoriteAssetRef.current = useUIStore.getState().toggleFavoriteAsset;
    setAssetDropdownOpenRef.current = useUIStore.getState().setAssetDropdownOpen;
  });

  // Memoized setter functions for stable references
  const setShowProbabilities = useCallback((show: boolean) => {
    try {
      updateGameSettings({ showProbabilities: show });
    } catch (error) {
      handleCanvasError(error, {
        component: 'ClientViewUI',
        action: 'setShowProbabilities'
      });
    }
  }, [updateGameSettings]);

  const setShowOtherPlayers = useCallback((show: boolean) => {
    try {
      updateGameSettings({ showOtherPlayers: show });
    } catch (error) {
      handleCanvasError(error, {
        component: 'ClientViewUI',
        action: 'setShowOtherPlayers'
      });
    }
  }, [updateGameSettings]);

  const setMinMultiplier = useCallback((mult: number) => {
    try {
      updateGameSettings({ minMultiplier: mult });
    } catch (error) {
      handleCanvasError(error, {
        component: 'ClientViewUI',
        action: 'setMinMultiplier'
      });
    }
  }, [updateGameSettings]);

  const setTimeframe = useCallback((ms: number) => {
    try {
      updateGameSettings({ timeframe: ms });
    } catch (error) {
      handleCanvasError(error, {
        component: 'ClientViewUI',
        action: 'setTimeframe'
      });
    }
  }, [updateGameSettings]);

  const setSelectedAsset = useCallback((asset: 'BTC' | 'ETH' | 'SOL' | 'DEMO') => {
    try {
      updateGameSettings({ selectedAsset: asset });
    } catch (error) {
      handleCanvasError(error, {
        component: 'ClientViewUI',
        action: 'setSelectedAsset'
      });
    }
  }, [updateGameSettings]);

  const toggleFavorite = useCallback((asset: 'BTC' | 'ETH' | 'SOL' | 'DEMO', event: React.MouseEvent) => {
    try {
      event.stopPropagation(); // Prevent dropdown from closing
      toggleFavoriteAssetRef.current(asset);
    } catch (error) {
      handleCanvasError(error, {
        component: 'ClientViewUI',
        action: 'toggleFavorite'
      });
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.asset-dropdown') && isAssetDropdownOpen) {
        setAssetDropdownOpenRef.current(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAssetDropdownOpen]);

  return {
    setShowProbabilities,
    setShowOtherPlayers,
    setMinMultiplier,
    setTimeframe,
    setSelectedAsset,
    toggleFavorite,
  };
};
