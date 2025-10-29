'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import RightPanel from '@/modules/box-hit/components/RightPanel';
import PositionsTable from '@/modules/box-hit/components/PositionsTable';
import { cleanupSoundManager } from '@/shared/lib/sound/SoundManager';
import { useGameStore, useUIStore } from '@/shared/state';
import { useUserStore } from '@/shared/state/userStore';
import ErrorBoundary from '@/shared/ui/ErrorBoundary';
import { logger } from '@/shared/utils/logger';
import Canvas from '@/shared/ui/canvas/Canvas';
import { Activity, ChevronDown, Clock, Settings, TrendingDown, TrendingUp, User, Users } from 'lucide-react';
import { ASSETS, DEFAULT_TRADE_AMOUNT, TIMEFRAME_OPTIONS } from './constants';
import type { AssetInfo, AssetKey } from './constants';
import { useToasts } from './hooks/useToasts';
import type { BoxHitContract, BoxHitPositionMap } from '@/shared/types/boxHit';

type ActivityAction = 'won' | 'lost';

interface ActivityEntry {
  id: number;
  player: string;
  action: ActivityAction;
  multiplier: string;
  amount: string;
  payout: string;
  time: string;
}

const MIN_CANVAS_HEIGHT = 520;

const isAssetKeySet = (value: unknown): value is Set<AssetKey> =>
  value instanceof Set;

const isAssetKeyArray = (value: unknown): value is AssetKey[] =>
  Array.isArray(value);

const ActivityPanel = () => {
  const [activities, setActivities] = useState<ActivityEntry[]>([
    { id: 1, player: 'Dc4q...5X4i', action: 'won', multiplier: '2.5x', amount: '$250', payout: '$625', time: '2s ago' },
    { id: 2, player: 'Kj8m...9Y2p', action: 'won', multiplier: '1.8x', amount: '$150', payout: '$270', time: '5s ago' },
    { id: 3, player: 'Xw2n...7H6q', action: 'won', multiplier: '3.0x', amount: '$450', payout: '$1,350', time: '8s ago' },
    { id: 4, player: 'Lp5v...3M8r', action: 'lost', multiplier: '2.2x', amount: '$100', payout: '$100', time: '12s ago' },
    { id: 5, player: 'Qr9t...1B4s', action: 'lost', multiplier: '2.0x', amount: '$200', payout: '$200', time: '15s ago' },
    { id: 6, player: 'Fh6u...8C2w', action: 'won', multiplier: '1.5x', amount: '$300', payout: '$450', time: '18s ago' },
    { id: 7, player: 'Gm7i...5E9x', action: 'won', multiplier: '1.8x', amount: '$180', payout: '$324', time: '22s ago' },
    { id: 8, player: 'Vk4o...2A7z', action: 'lost', multiplier: '2.8x', amount: '$75', payout: '$75', time: '25s ago' },
    { id: 9, player: 'Bw3l...6N1y', action: 'lost', multiplier: '2.1x', amount: '$120', payout: '$120', time: '28s ago' },
    { id: 10, player: 'Hj8p...4Q5t', action: 'won', multiplier: '1.2x', amount: '$500', payout: '$600', time: '32s ago' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const amount = Math.floor(Math.random() * 500) + 50;
      const multiplier = (Math.random() * 3 + 1).toFixed(1);
      const action: ActivityAction = Math.random() > 0.5 ? 'won' : 'lost';
      const payout =
        action === 'lost'
          ? `$${amount}`
          : `$${Math.floor(amount * Number(multiplier)).toLocaleString()}`;

      setActivities((prev) => [
        {
          id: Date.now(),
          player: `${Math.random().toString(36).slice(2, 6)}...${Math.random()
            .toString(36)
            .slice(2, 6)}`,
          action,
          multiplier: `${multiplier}x`,
          amount: `$${amount}`,
          payout,
          time: 'now',
        },
        ...prev.slice(0, 9),
      ]);
    }, 3000 + Math.random() * 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="overflow-hidden"
    >
      <div className="py-4">
        <div className="mb-3 border-t border-zinc-800/80 pt-4">
          <div className="flex items-center justify-between pb-2 px-4">
            <span className="text-sm font-medium text-zinc-300">Live Activity</span>
            <div className="flex items-center gap-1">
              <div
                className="h-3 w-3 rounded-full border-2 border-live-border bg-live"
              />
              <span className="text-xs font-medium text-zinc-400">Live</span>
            </div>
          </div>
          <div className="border-b border-zinc-800/80" />
        </div>

        <div className="-mx-4 max-h-80 space-y-1 overflow-y-auto px-4">
          {activities.map((activity) => {
            const isWin = activity.action === 'won';
            return (
              <div
                key={activity.id}
                className="flex items-center gap-2 px-4 py-1 transition-colors hover:bg-zinc-800/30"
              >
                <div className="flex-shrink-0">
                  <User size={16} className="text-muted-icon" />
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate text-xs font-medium text-zinc-300">
                    {activity.player}
                  </span>
                  <span className="text-[11px] text-zinc-500">{activity.action}</span>
                  <div className="flex items-center gap-1">
                    {isWin ? (
                      <TrendingUp size={12} className="text-trading-positive" />
                    ) : (
                      <TrendingDown size={12} className="text-trading-negative" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        isWin ? 'text-trading-positive' : 'text-trading-negative'
                      }`}
                    >
                      {activity.payout}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500">({activity.multiplier})</span>
                </div>
                <div className="flex flex-shrink-0 items-center">
                  <span className="text-[10px] text-zinc-500">{activity.time}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * Main ClientView component for the BoxHit trading game
 * 
 * Features:
 * - Mock backend trading simulation
 * - Real-time canvas rendering
 * - Comprehensive error handling and user feedback
 * - Zustand state management for game settings
 * - Toast notification system for user interactions
 * 
 * @returns JSX element containing the complete trading interface
 */
export default function ClientView() {
  // Cleanup sound manager on unmount
  useEffect(() => {
    return () => {
      cleanupSoundManager();
    };
  }, []);
  
  // Get signature color from UI store
  const signatureColor = useUIStore((state) => state.signatureColor);
  const { toasts, showToast, hideToast } = useToasts();
  
  // Zustand stores - get only the actions we need
  const updateGameSettings = useGameStore((state) => state.updateGameSettings);
  
  // UserStore integration for mock backend PnL tracking
  const addTrade = useUserStore((state) => state.addTrade);
  const settleTrade = useUserStore((state) => state.settleTrade);
  
  // Get individual values to avoid object recreation on every render
  // Use Zustand store for game settings - individual subscriptions to prevent infinite loops
  const minMultiplier = useGameStore((state) => state.gameSettings.minMultiplier);
  const showOtherPlayers = useGameStore((state) => state.gameSettings.showOtherPlayers);
  const showProbabilities = useGameStore((state) => state.gameSettings.showProbabilities);
  const timeframe = useGameStore((state) => state.gameSettings.timeframe);
  const selectedAsset = useGameStore((state) => state.gameSettings.selectedAsset);
  
  // UI store for dropdowns and preferences - stable subscription to prevent infinite loops
  const favoriteAssets = useUIStore((state) => state.favoriteAssets);
  const isAssetDropdownOpen = useUIStore((state) => state.isAssetDropdownOpen);
  const toggleFavoriteAsset = useUIStore((state) => state.toggleFavoriteAsset);
  const setAssetDropdownOpen = useUIStore((state) => state.setAssetDropdownOpen);
  const [isTimeframeDropdownOpen, setIsTimeframeDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const leftColumnRef = useRef<HTMLDivElement | null>(null);
  const topBarRef = useRef<HTMLDivElement | null>(null);
  const positionsContainerRef = useRef<HTMLDivElement | null>(null);
  const [availableColumnHeight, setAvailableColumnHeight] = useState<number | null>(null);
  const [topBarHeight, setTopBarHeight] = useState<number>(0);
  const [positionsNaturalHeight, setPositionsNaturalHeight] = useState<number>(0);
  const [isPositionsCollapsed, setIsPositionsCollapsed] = useState(false);
  const [isPositionsOverlayOpen, setIsPositionsOverlayOpen] = useState(false);
  const [positionsOverlayView, setPositionsOverlayView] = useState<'positions' | 'history'>('positions');
  
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
  }, [isAssetDropdownOpen, setAssetDropdownOpen]);
  
  type CanvasContract = BoxHitContract;
  
  // trade amount state - synced with right panel
  const [tradeAmount, setTradeAmount] = useState(DEFAULT_TRADE_AMOUNT);
  const [isCanvasStarted, setIsCanvasStarted] = useState(false); // Controls mock backend canvas
  const [mockBackendCurrentPrice, setMockBackendCurrentPrice] = useState(100);
  
  // Mock backend selection stats (updated immediately when boxes are selected)
  const [mockBackendSelectedCount, setMockBackendSelectedCount] = useState(0);
  const [mockBackendSelectedMultipliers, setMockBackendSelectedMultipliers] = useState<number[]>([]);
  const [mockBackendSelectedAveragePrice, setMockBackendSelectedAveragePrice] = useState<number | null>(null);

  const favoriteAssetSet = useMemo(() => {
    if (isAssetKeySet(favoriteAssets)) {
      return favoriteAssets;
    }
    if (isAssetKeyArray(favoriteAssets)) {
      return new Set(favoriteAssets);
    }
    return new Set<AssetKey>();
  }, [favoriteAssets]);

  const assetEntries = useMemo(
    () => Object.entries(ASSETS) as Array<[AssetKey, AssetInfo]>,
    [],
  );
  const selectedAssetKey = selectedAsset as AssetKey;
  const selectedAssetInfo = ASSETS[selectedAssetKey];
  const displayPrice = selectedAssetKey === 'DEMO'
    ? mockBackendCurrentPrice
    : selectedAssetInfo.price;
  const displayChange = selectedAssetKey === 'DEMO'
    ? 2.5
    : selectedAssetInfo.change24h;
  const handleShowProbabilitiesChange = useCallback(
    (value: boolean) => updateGameSettings({ showProbabilities: value }),
    [updateGameSettings],
  );

  const handleShowOtherPlayersChange = useCallback(
    (value: boolean) => updateGameSettings({ showOtherPlayers: value }),
    [updateGameSettings],
  );

  const handleMinMultiplierChange = useCallback(
    (value: number) => updateGameSettings({ minMultiplier: value }),
    [updateGameSettings],
  );

  const handleTimeframeChange = useCallback(
    (value: number) => updateGameSettings({ timeframe: value }),
    [updateGameSettings],
  );

  const handleAssetSelect = useCallback(
    (asset: AssetKey) => {
      updateGameSettings({ selectedAsset: asset });
      setAssetDropdownOpen(false);
    },
    [setAssetDropdownOpen, updateGameSettings],
  );

  const handleToggleFavorite = useCallback(
    (asset: AssetKey, event: React.MouseEvent) => {
      event.stopPropagation();
      toggleFavoriteAsset(asset);
    },
    [toggleFavoriteAsset],
  );
  const formatTimeframeLabel = useCallback((value: number) => {
    if (value === 500) {
      return '0.5s';
    }
    if (value < 1000) {
      return `${value}ms`;
    }
    return `${value / 1000}s`;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isTimeframeDropdownOpen) {
      return undefined;
    }
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.timeframe-dropdown')) {
        setIsTimeframeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTimeframeDropdownOpen]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('ResizeObserver' in window)) {
      return;
    }
    const element = leftColumnRef.current;
    if (!element) {
      return;
    }
    const observer = new window.ResizeObserver((entries) => {
      const [entry] = entries;
      if (entry) {
        setAvailableColumnHeight(entry.contentRect.height);
      }
    });
    observer.observe(element);
    setAvailableColumnHeight(element.offsetHeight);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('ResizeObserver' in window)) {
      return;
    }
    const element = topBarRef.current;
    if (!element) {
      return;
    }
    const observer = new window.ResizeObserver((entries) => {
      const [entry] = entries;
      if (entry) {
        setTopBarHeight(entry.contentRect.height);
      }
    });
    observer.observe(element);
    setTopBarHeight(element.offsetHeight);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('ResizeObserver' in window)) {
      return;
    }
    const element = positionsContainerRef.current;
    if (!element) {
      return;
    }
    const observer = new window.ResizeObserver((entries) => {
      const [entry] = entries;
      if (entry && entry.contentRect.height > 0) {
        setPositionsNaturalHeight(entry.contentRect.height);
      }
    });
    observer.observe(element);
    const initialHeight = element.offsetHeight;
    if (initialHeight > 0) {
      setPositionsNaturalHeight(initialHeight);
    }
    return () => {
      observer.disconnect();
    };
  }, [isPositionsCollapsed]);

  useEffect(() => {
    if (availableColumnHeight == null) {
      return;
    }
    const contentHeight = availableColumnHeight - topBarHeight;
    if (contentHeight <= 0) {
      return;
    }
    const requiredHeight = MIN_CANVAS_HEIGHT + positionsNaturalHeight;
    const shouldCollapse = requiredHeight > contentHeight;
    setIsPositionsCollapsed(shouldCollapse);
    if (!shouldCollapse && isPositionsOverlayOpen) {
      setIsPositionsOverlayOpen(false);
    }
  }, [availableColumnHeight, topBarHeight, positionsNaturalHeight, isPositionsOverlayOpen]);

  useEffect(() => {
    if (!isPositionsOverlayOpen) {
      setPositionsOverlayView('positions');
    }
  }, [isPositionsOverlayOpen]);

  // Keep track of previous positions using a ref to avoid infinite loops
  const previousPositionsRef = useRef<BoxHitPositionMap>(new Map());
  
  // Handle mock backend positions and contracts update
  // Keep this callback stable (no dependencies) to ensure Canvas always calls it properly
  const handleMockBackendPositionsChange = useCallback(
    (
      positions: BoxHitPositionMap,
      contracts: CanvasContract[],
      _hitBoxes: string[],
      _missedBoxes: string[],
    ) => {
      const previousPositions = previousPositionsRef.current;

      positions.forEach((position, positionKey) => {
        const tradeId = position.tradeId ?? positionKey;
        if (!previousPositions.has(tradeId)) {
          addTrade({
            id: tradeId,
            contractId: position.contractId,
            amount: position.amount ?? tradeAmount,
            placedAt: new Date(position.timestamp ?? Date.now()),
          });
        }

        const previous = previousPositions.get(tradeId);
        if (position.result && position.result !== previous?.result) {
          const contract = contracts.find((c) => c.contractId === position.contractId);
          const tradeValue = position.amount ?? previous?.amount ?? tradeAmount;
          const resolvedPayout = position.result === 'win'
            ? (typeof position.payout === 'number'
              ? position.payout
              : contract
                ? tradeValue * (contract.returnMultiplier || 1)
                : tradeValue)
            : 0;
          settleTrade(tradeId, position.result, resolvedPayout);
        }
      });

      previousPositionsRef.current = new Map(
        Array.from(positions.entries()).map(([key, value]) => {
          const tradeKey = value.tradeId ?? key;
          return [tradeKey, value];
        }),
      );
    },
    [addTrade, tradeAmount, settleTrade],
  );

  // Handle mock backend selection changes (immediate feedback when boxes are selected)
  const handleMockBackendSelectionChange = useCallback(
    (count: number, _best: number, multipliers: number[], averagePrice?: number | null) => {
      setMockBackendSelectedCount(count);
      setMockBackendSelectedMultipliers(multipliers);
      setMockBackendSelectedAveragePrice(averagePrice ?? null);
    },
    []
  );

  // Mock backend position count and multipliers for PositionsTable

  const handleTradingModeChange = useCallback((tradingMode: boolean) => {
    // Control canvas start/stop
    setIsCanvasStarted(tradingMode);
  }, []);

  const renderPositionsTable = useCallback(
    () => <PositionsTable currentBTCPrice={mockBackendCurrentPrice} />,
    [mockBackendCurrentPrice],
  );

  return (
    <>
      <div className="relative flex h-full w-full bg-zinc-950 text-white ">
        {/* Left side with header and canvas */}
        <div ref={leftColumnRef} className="flex flex-1 flex-col">
          {/* Top Bar - Only over Canvas */}
          <div
            ref={topBarRef}
            className="relative z-10 flex h-16 w-full items-center justify-between border-b border-zinc-800 bg-background px-3"
          >
            <div className="flex items-center gap-4">
              <div className="relative h-7 w-7 overflow-hidden rounded-lg">
                <Image
                  src={selectedAssetInfo.icon}
                  alt={selectedAssetInfo.name}
                  fill
                  className="object-cover"
                  sizes="28px"
                />
              </div>
              <div className="relative asset-dropdown">
                <div
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 transition-opacity hover:opacity-80"
                  onClick={() => setAssetDropdownOpen(!isAssetDropdownOpen)}
                  title="Select asset"
                >
                  <span className="text-lg font-medium text-white leading-none">
                    {selectedAssetInfo.symbol}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-zinc-400 transition-transform ${isAssetDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </div>
                {isAssetDropdownOpen && (
                  <div
                    className="absolute left-0 top-full z-50 mt-2 w-[360px] overflow-hidden rounded-lg border border-zinc-700/50 bg-[rgba(14,14,14,0.7)] shadow-2xl backdrop-blur-lg"
                  >
                    {assetEntries.map(([key, asset]) => {
                      const isFavorite = favoriteAssetSet.has(key as AssetKey);
                      const isSelectable = key === 'DEMO';
                      return (
                        <div
                          key={key}
                          className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                            selectedAsset === key ? 'bg-zinc-800/50' : 'hover:bg-zinc-800/40'
                          } ${isSelectable ? '' : 'opacity-50'}`}
                          onClick={() => {
                            if (isSelectable) {
                              handleAssetSelect(key as AssetKey);
                            }
                          }}
                          title={
                            isSelectable
                              ? `Select ${asset.name}`
                              : 'Asset selection not available in mock backend mode'
                          }
                        >
                          <button
                            type="button"
                            onClick={(event) => handleToggleFavorite(key as AssetKey, event)}
                            className="flex h-5 w-5 items-center justify-center rounded transition-colors hover:bg-zinc-700/50"
                          >
                            <svg
                              className={`h-3.5 w-3.5 transition-colors ${
                                isFavorite ? 'fill-yellow-400 text-yellow-400' : 'fill-none text-zinc-500'
                              }`}
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={isFavorite ? 0 : 1.5}
                            >
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          </button>
                          <div className="relative h-7 w-7 overflow-hidden rounded">
                            <Image
                              src={asset.icon}
                              alt={asset.name}
                              fill
                              className="object-cover"
                              sizes="28px"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-white">{asset.symbol}</div>
                            <div className="text-[11px] text-zinc-400">{asset.name}</div>
                          </div>
                          <div className="mr-2 text-right">
                            <div className="text-xs font-medium text-white">
                              {typeof asset.price === 'number'
                                ? asset.price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                                : <span className="text-zinc-500">--</span>}
                            </div>
                            <div
                              className={`text-[11px] font-medium ${
                                typeof asset.change24h === 'number'
                                  ? asset.change24h >= 0
                                    ? 'text-trading-positive'
                                    : 'text-trading-negative'
                                  : 'text-muted-icon'
                              }`}
                            >
                              {typeof asset.change24h === 'number'
                                ? `${asset.change24h >= 0 ? '+' : ''}${asset.change24h.toFixed(2)}%`
                                : '--'}
                            </div>
                          </div>
                          <div className="text-[11px] text-zinc-400">Vol: {asset.volume24h ?? '--'}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] font-semibold leading-none text-white">
                  ${displayPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                </span>
                <span
                  className={`text-sm font-semibold leading-none ${
                    displayChange >= 0 ? 'text-trading-positive' : 'text-trading-negative'
                  }`}
                >
                  {displayChange >= 0 ? '+' : ''}
                  {displayChange.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Multiplier:</span>
                <div
                  className="relative h-1 w-24 cursor-pointer rounded bg-zinc-800"
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const x = event.clientX - rect.left;
                    const percentage = x / rect.width;
                    const newValue = 1 + percentage * 14;
                    handleMinMultiplierChange(Math.max(1, Math.min(15, newValue)));
                  }}
                >
                  <div
                    className="absolute left-0 top-0 h-full bg-control-track"
                    style={{
                      width: `${((minMultiplier - 1) / 14) * 100}%`,
                    }}
                  />
                  <div
                    className="absolute top-1/2 h-3 w-1 -translate-y-1/2 bg-control-track"
                    style={{
                      left: `${((minMultiplier - 1) / 14) * 100}%`,
                      marginLeft: '-2px',
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-white">{minMultiplier.toFixed(1)}x</span>
              </div>
              <div className="relative timeframe-dropdown">
                <button
                  type="button"
                  onClick={() => setIsTimeframeDropdownOpen((prev) => !prev)}
                  className="flex h-8 items-center gap-1 rounded-lg bg-surface-900 px-3 text-xs text-white transition-colors hover:bg-surface-850"
                >
                  <span>{formatTimeframeLabel(timeframe)}</span>
                  <ChevronDown
                    size={12}
                    className={`text-zinc-500 transition-transform ${isTimeframeDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isTimeframeDropdownOpen && (
                  <div className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[96px] overflow-hidden rounded-lg border border-zinc-800 bg-surface-850 shadow-xl">
                    {TIMEFRAME_OPTIONS.map((option) => {
                      const isSelected = option === timeframe;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            handleTimeframeChange(option);
                            setIsTimeframeDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                            isSelected
                              ? 'bg-zinc-800 text-white'
                              : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                          }`}
                        >
                          {formatTimeframeLabel(option)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 items-center gap-2 rounded-lg bg-surface-900 px-3">
                  <Clock size={14} style={{ color: signatureColor }} />
                  <span className="text-sm font-medium" style={{ color: signatureColor }}>
                    {currentTime.toLocaleTimeString('en-US', {
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleShowProbabilitiesChange(!showProbabilities)}
                  className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-surface-900 transition-colors hover:bg-surface-850"
                  title="Toggle Heatmap Overlay"
                >
                  <Activity size={16} className="text-control-track" />
                  {!showProbabilities && (
                    <div className="pointer-events-none absolute inset-0">
                        <span
                          className="absolute left-1/2 top-1/2 h-[2px] w-7 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-control-track"
                        />
                    </div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleShowOtherPlayersChange(!showOtherPlayers)}
                  className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-surface-900 transition-colors hover:bg-surface-850"
                  title="Toggle Other Players"
                >
                  <Users size={16} className="text-control-track" />
                  {!showOtherPlayers && (
                    <div className="pointer-events-none absolute inset-0">
                    <span
                      className="absolute left-1/2 top-1/2 h-[2px] w-7 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-control-track"
                    />
                    </div>
                  )}
                </button>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-900 transition-colors hover:bg-surface-850"
                  title="Settings"
                >
                  <Settings size={16} className="text-control-track" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Canvas Area */}
          <div className="relative flex-1 flex flex-col overflow-hidden">
            <ErrorBoundary
              fallback={
                <div className="flex h-96 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900">
                  <div className="text-center">
                    <div className="mb-2 text-lg text-red-500">⚠️ Canvas Error</div>
                    <div className="text-sm text-zinc-400">The game canvas encountered an error. Please refresh the page.</div>
                  </div>
                </div>
              }
              onError={(error, errorInfo) => {
                logger.error('Canvas Error', { error, errorInfo }, 'CANVAS');
                showToast('⚠️ Game canvas error occurred. Please refresh if issues persist.');
              }}
            >
              {/* Show Canvas component controlled by Start Trading button */}
              <div className="relative flex-1">
                <div className="relative h-full min-h-[520px] w-full overflow-hidden bg-surface-950">
                  <Canvas
                    externalControl={true}
                    externalIsStarted={isCanvasStarted}
                    onExternalStartChange={setIsCanvasStarted}
                    externalTimeframe={timeframe}
                    onPositionsChange={handleMockBackendPositionsChange}
                    onSelectionChange={handleMockBackendSelectionChange}
                    tradeAmount={tradeAmount}
                    onPriceUpdate={setMockBackendCurrentPrice}
                    showProbabilities={showProbabilities}
                    showOtherPlayers={showOtherPlayers}
                    minMultiplier={minMultiplier}
                  />
                  {isPositionsCollapsed && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsPositionsOverlayOpen(true)}
                        className={`absolute bottom-0 left-0 z-30 flex items-center gap-2 rounded-none rounded-tr-lg border-t border-r border-zinc-800/80 bg-surface-950 px-3 py-2 text-sm font-medium text-zinc-300 shadow-lg transition-all duration-200 hover:bg-overlay-900 ${
                          isPositionsOverlayOpen ? 'pointer-events-none opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
                        }`}
                      >
                        <Activity size={16} className="text-zinc-400" />
                        <span className="tracking-tight">Positions</span>
                      </button>
                      <div
                        className={`absolute bottom-0 left-0 z-30 flex max-h-[70%] w-full max-w-[520px] flex-col overflow-hidden border-t border-zinc-800/80 bg-background transition-all duration-200 ease-out ${
                          isPositionsOverlayOpen
                            ? 'pointer-events-auto opacity-100 translate-y-0'
                            : 'pointer-events-none opacity-0 translate-y-6'
                        } rounded-none rounded-tr-xl`}
                        aria-hidden={!isPositionsOverlayOpen}
                      >
                        <div className="flex flex-nowrap items-center justify-between gap-3 bg-surface-800 px-3 py-2 text-sm font-medium text-zinc-300">
                          <div className="flex flex-nowrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPositionsOverlayView('positions')}
                              className={`rounded-none px-2 py-1 transition-colors ${
                                positionsOverlayView === 'positions'
                                  ? 'bg-zinc-800 text-zinc-100'
                                  : 'bg-transparent text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              Positions
                            </button>
                            <button
                              type="button"
                              onClick={() => setPositionsOverlayView('history')}
                              className={`rounded-none px-2 py-1 transition-colors ${
                                positionsOverlayView === 'history'
                                  ? 'bg-zinc-800 text-zinc-100'
                                  : 'bg-transparent text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              Positions History
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsPositionsOverlayOpen(false)}
                            className="flex h-8 w-8 items-center justify-center rounded-none border-t border-r border-zinc-800/80 bg-overlay-900 text-zinc-400 transition-colors hover:bg-neutral-900 hover:text-zinc-200"
                            aria-label="Collapse positions overlay"
                          >
                            <ChevronDown size={16} />
                          </button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="h-full w-full overflow-y-auto">
                            {positionsOverlayView === 'positions' ? (
                              renderPositionsTable()
                            ) : (
                              <div className="px-3 py-2 text-sm text-zinc-400">Positions history is not available yet.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </ErrorBoundary>

            {!isPositionsCollapsed && (
              <div
                ref={positionsContainerRef}
                className="flex-shrink-0 border-t border-zinc-800/80 bg-background"
              >
                {renderPositionsTable()}
              </div>
            )}
          </div>
        </div>
        
        {/* Right side: trading panel and activity panel */}
        <div className="flex h-full w-[400px] flex-shrink-0 flex-col gap-4 border-l border-zinc-800/80">
          <RightPanel 
            isTradingMode={isCanvasStarted}
            onTradingModeChange={handleTradingModeChange}
            selectedCount={mockBackendSelectedCount}
            selectedMultipliers={mockBackendSelectedMultipliers}
            currentBTCPrice={mockBackendCurrentPrice}
            averagePositionPrice={mockBackendSelectedAveragePrice || null}
            tradeAmount={tradeAmount}
            onTradeAmountChange={setTradeAmount}
          />
          <ActivityPanel />
        </div>
      </div>
      
      {/* Toast Notifications - Stacked from bottom-right, oldest on top, newest on bottom */}
      <div className="fixed bottom-4 right-4 z-50 space-y-3">
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            className={`bg-surface-900 border border-zinc-700 rounded-lg px-5 py-4 shadow-lg flex items-center gap-4 transition-all duration-300 ease-in-out transform ${
              toast.isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-2'
            }`}
            style={{ zIndex: 1000 + index }} // Ensure correct stacking order
          >
            <div className="flex-shrink-0">
              {toast.type === 'success' && <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              {toast.type === 'error' && <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              {toast.type === 'info' && <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              {toast.type === 'warning' && <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
            </div>
            <div className="flex-grow text-sm text-zinc-200">{toast.message}</div>
            <button onClick={() => hideToast(toast.id)} className="flex-shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
