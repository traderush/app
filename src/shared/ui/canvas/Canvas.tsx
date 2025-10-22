'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';

import { GridGame } from '@/shared/lib/canvasLogic/games/GridGame';
import { defaultTheme } from '@/shared/lib/canvasLogic/config/theme';
import { useBoxHitEngine } from './hooks/useBoxHitEngine';
import { TimeframeSelector } from './components/TimeframeSelector';
import { TimeFrame, getTimeframeConfig } from '@/shared/types/timeframe';
import { useUIStore } from '@/shared/state/uiStore';
import { useUserStore } from '@/shared/state/userStore';
import { useConnectionStore } from '@/shared/state/connectionStore';
import type { BoxHitContract, BoxHitPosition, BoxHitPositionMap } from '@/shared/types/boxHit';
import type { EngineContractSnapshot, EnginePricePoint } from '@/shared/types/boxHitEngine';

const PIXELS_PER_POINT = 5;
const MISS_RESOLUTION_GRACE_MS = 1_000;

function estimateMsPerPoint(series: EnginePricePoint[]): number {
  // Estimate average delta from last up to 20 points; fallback to 500ms
  if (series.length < 2) return 500;
  const take = Math.min(series.length - 1, 20);
  let sum = 0;
  for (let i = series.length - take; i < series.length; i += 1) {
    const prev = series[i - 1];
    const cur = series[i];
    if (!prev || !cur) continue;
    const d = Math.max(1, (cur.timestamp ?? 0) - (prev.timestamp ?? 0));
    sum += d;
  }
  return Math.max(1, Math.round(sum / take));
}

const getTimeFrameFromMs = (ms?: number): TimeFrame => {
  switch (ms) {
    case 500:
      return TimeFrame.HALF_SECOND;
    case 1000:
      return TimeFrame.SECOND;
    case 2000:
      return TimeFrame.TWO_SECONDS;
    case 4000:
      return TimeFrame.FOUR_SECONDS;
    case 10000:
      return TimeFrame.TEN_SECONDS;
    default:
      return TimeFrame.TWO_SECONDS;
  }
};

interface CanvasMultiplier {
  value: number;
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  width: number;
  height: number;
  totalBets: number;
  userBet: number;
  timestampRange: {
    start: number;
    end: number;
  };
  priceRange: {
    min: number;
    max: number;
  };
  status?: 'hit' | 'missed';
  isClickable: boolean;
}

type GridAnchorState = {
  anchor: number | null;
  timeframe: TimeFrame | null;
};

interface CanvasProps {
  externalControl?: boolean;
  externalIsStarted?: boolean;
  onExternalStartChange?: (isStarted: boolean) => void;
  externalTimeframe?: number;
  onPositionsChange?: (
    positions: BoxHitPositionMap,
    contracts: BoxHitContract[],
    hitBoxes: string[],
    missedBoxes: string[],
  ) => void;
  betAmount?: number;
  onPriceUpdate?: (price: number) => void;
  onSelectionChange?: (count: number, best: number, multipliers: number[], averagePrice?: number | null) => void;
  showProbabilities?: boolean;
  showOtherPlayers?: boolean;
  minMultiplier?: number;
}

function buildMultipliers(
  contracts: EngineContractSnapshot[],
  timeframe: TimeFrame,
  game: GridGame | null,
  lastPrice: EnginePricePoint | undefined,
  positionsByContract: Map<string, BoxHitPosition>,
  msPerPoint: number,
  anchorState?: MutableRefObject<GridAnchorState>,
): Record<string, CanvasMultiplier> {
  if (!contracts.length) {
    return {};
  }

  const multipliers: Record<string, CanvasMultiplier> = {};
  const tfConfig = getTimeframeConfig(timeframe);
  const nowTs = lastPrice?.timestamp ?? Date.now();
  const basePrice = lastPrice?.price ?? 100;
  const currentWorldX = game?.getCurrentWorldX?.() ?? 0;
  const safeMsPerPoint = Math.max(1, msPerPoint);

  const numColumns = tfConfig.ironCondor.numColumns;
  const columnsBehind = tfConfig.ironCondor.columnsBehind;
  const priceStep = tfConfig.boxHeight;
  const numRows = tfConfig.ironCondor.rowsAbove + tfConfig.ironCondor.rowsBelow;
  const maxPrice = basePrice + (numRows * priceStep) / 2;
  const timeStep = timeframe;
  const pointsPerStep = Math.max(1, Math.round(timeStep / safeMsPerPoint));
  const columnWidthPx = pointsPerStep * PIXELS_PER_POINT;
  const currentColumnIdx = Math.floor(nowTs / timeStep);
  const currentColumnStartTs = currentColumnIdx * timeStep;
  const columnProgress = (nowTs - currentColumnStartTs) / timeStep;
  let columnAnchorX = currentWorldX - columnProgress * columnWidthPx;
  if (anchorState) {
    const state = anchorState.current;
    const threshold = Math.max(columnWidthPx * 0.6, PIXELS_PER_POINT);
    const candidate = columnAnchorX;
    const candidateIsFinite = Number.isFinite(candidate);
    if (state.timeframe !== timeframe) {
      state.timeframe = timeframe;
      state.anchor = candidateIsFinite ? candidate : state.anchor;
    } else if (state.anchor === null || !Number.isFinite(state.anchor)) {
      state.anchor = candidateIsFinite ? candidate : state.anchor;
    } else if (candidateIsFinite) {
      const delta = candidate - state.anchor;
      if (delta < 0 && Math.abs(delta) < threshold) {
        columnAnchorX = state.anchor;
      } else {
        state.anchor = candidate;
      }
    }
    if (state.anchor !== null && Number.isFinite(state.anchor)) {
      columnAnchorX = state.anchor;
    } else if (!candidateIsFinite) {
      columnAnchorX = 0;
    }
  }
  const rowAnchorPrice = Math.floor(basePrice / priceStep) * priceStep;
  game?.setGridScale?.(columnWidthPx, priceStep);
  game?.setGridOrigin?.(columnAnchorX, rowAnchorPrice);

  contracts.forEach((contract) => {
    const timeUntilStart = contract.startTime - nowTs;
    const timeSinceEnd = nowTs - contract.endTime;

    if (timeSinceEnd > timeStep * columnsBehind) {
      return;
    }

    const col = Math.floor(timeUntilStart / timeStep);
    if (col >= numColumns) {
      return;
    }

    const priceCenter = (contract.lowerStrike + contract.upperStrike) / 2;
    const row = Math.floor((maxPrice - priceCenter) / priceStep);
    // Anchor multiplier position to contract start time relative to latest price
    // so boxes render correctly both ahead of and behind the NOW line.
    const contractColumnIdx = Math.floor(contract.startTime / timeStep);
    const columnOffset = contractColumnIdx - currentColumnIdx;
    const worldX = columnAnchorX + columnOffset * columnWidthPx;
    const alignedLower = Math.floor(contract.lowerStrike / priceStep) * priceStep;
    const priceSpan = Math.max(priceStep, contract.upperStrike - contract.lowerStrike);
    const heightSteps = Math.max(1, Math.round(priceSpan / priceStep));
    const height = heightSteps * priceStep;
    const durationColumns = Math.max(1, Math.round((contract.endTime - contract.startTime) / timeStep));
    const width = durationColumns * columnWidthPx;

    const position = positionsByContract.get(contract.contractId);
    const status = position?.result === 'win'
      ? 'hit'
      : position?.result === 'loss'
        ? 'missed'
        : undefined;

    let resolvedWorldX = worldX;

    multipliers[contract.contractId] = {
      value: contract.returnMultiplier,
      x: col,
      y: row,
      worldX: resolvedWorldX,
      worldY: alignedLower,
      width,
      height,
      totalBets: contract.totalVolume,
      userBet: position?.amount ?? 0,
      timestampRange: {
        start: contract.startTime,
        end: contract.endTime,
      },
      priceRange: {
        min: contract.lowerStrike,
        max: contract.upperStrike,
      },
      status,
      isClickable: contract.status === 'active' && contract.startTime > nowTs,
    };
  });

  return multipliers;
}

function Canvas({
  externalControl = false,
  externalIsStarted = false,
  onExternalStartChange,
  externalTimeframe,
  onPositionsChange,
  betAmount = 100,
  onPriceUpdate,
  onSelectionChange,
  showProbabilities = false,
  showOtherPlayers = false,
  minMultiplier = 1.0,
}: CanvasProps = {}) {
  const { state, priceSeries, contracts, positions, lastPrice, lastPlaceTradeError, connect, disconnect, subscribe, placeTrade } = useBoxHitEngine();
  const signatureColor = useUIStore((store) => store.signatureColor);
  const updateBalance = useUserStore((store) => store.updateBalance);
  const setBackendConnected = useConnectionStore((store) => store.setBackendConnected);
  const addNotification = useUIStore((store) => store.addNotification);
  const betAmountRef = useRef(betAmount);

  const [internalIsStarted, setInternalIsStarted] = useState(false);
  const [internalTimeframe, setInternalTimeframe] = useState<TimeFrame>(TimeFrame.TWO_SECONDS);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [tradeErrorMessage, setTradeErrorMessage] = useState<string | null>(null);
  const [isCameraFollowing, setIsCameraFollowing] = useState(true);

  const isStarted = externalControl ? externalIsStarted : internalIsStarted;
  const effectiveTimeframe = externalControl && externalTimeframe
    ? getTimeFrameFromMs(externalTimeframe)
    : internalTimeframe;

  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<GridGame | null>(null);
  const processedTicksRef = useRef(0);
  const lastSnapshotVersionRef = useRef(0);
  const lastProcessedTimestampRef = useRef<number | undefined>(undefined);
  const confirmedContractsRef = useRef<Map<string, string | undefined>>(new Map());
  const resolvedContractsRef = useRef<Map<string, string | undefined>>(new Map());
  const lastTradeErrorHandledRef = useRef<number>(0);
  const gridAnchorStateRef = useRef<GridAnchorState>({ anchor: null, timeframe: null });
  const contractHistoryRef = useRef<Map<string, EngineContractSnapshot>>(new Map());

  const positionsByContract = useMemo(() => {
    const map = new Map<string, BoxHitPosition>();
    positions.forEach((position) => {
      const existing = map.get(position.contractId);
      if (!existing || (existing.timestamp ?? 0) < (position.timestamp ?? 0)) {
        map.set(position.contractId, position);
      }
    });
    return map;
  }, [positions]);

  const renderedContracts = useMemo(() => {
    const combined: EngineContractSnapshot[] = [];
    const seen = new Set<string>();

    contracts.forEach((contract) => {
      combined.push(contract);
      seen.add(contract.contractId);
    });

    positionsByContract.forEach((_, contractId) => {
      if (seen.has(contractId)) {
        return;
      }
      const snapshot = contractHistoryRef.current.get(contractId);
      if (snapshot) {
        combined.push(snapshot);
        seen.add(contractId);
      }
    });

    return combined;
  }, [contracts, positionsByContract]);

  const contractMap = useMemo(() => {
    const map = new Map<string, EngineContractSnapshot>();
    renderedContracts.forEach((contract) => {
      map.set(contract.contractId, contract);
    });
    return map;
  }, [renderedContracts]);

  // Keep a ref for event handlers that should read the latest contracts
  const contractMapRef = useRef(contractMap);
  useEffect(() => {
    contractMapRef.current = contractMap;
    contracts.forEach((contract) => {
      contractHistoryRef.current.set(contract.contractId, contract);
    });
  }, [contractMap, contracts]);

  const hitBoxes = useMemo(
    () => Array.from(positionsByContract.values())
      .filter((position) => position.result === 'win')
      .map((position) => position.contractId),
    [positionsByContract],
  );

  const missedBoxes = useMemo(
    () => Array.from(positionsByContract.values())
      .filter((position) => position.result === 'loss')
      .map((position) => position.contractId),
    [positionsByContract],
  );

  const contractsForCallback = useMemo< BoxHitContract[] >(
    () => renderedContracts.map((contract) => ({
      contractId: contract.contractId,
      startTime: contract.startTime,
      endTime: contract.endTime,
      lowerStrike: contract.lowerStrike,
      upperStrike: contract.upperStrike,
      returnMultiplier: contract.returnMultiplier,
      totalVolume: contract.totalVolume,
      isActive: contract.status === 'active',
      type: contract.type,
    })),
    [renderedContracts],
  );

  useEffect(() => {
    betAmountRef.current = betAmount;
  }, [betAmount]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    updateBalance(state.balance, state.locked);
  }, [state.balance, state.locked, updateBalance]);

  useEffect(() => {
    setBackendConnected(state.status === 'live');
    return () => {
      setBackendConnected(false);
    };
  }, [state.status, setBackendConnected]);

  useEffect(() => {
    if (!onPriceUpdate || !lastPrice) {
      return;
    }
    onPriceUpdate(lastPrice.price);
  }, [lastPrice, onPriceUpdate]);

  useEffect(() => {
    if (!onPositionsChange) {
      return;
    }
    const map: BoxHitPositionMap = new Map(positions);
    onPositionsChange(map, contractsForCallback, hitBoxes, missedBoxes);
  }, [onPositionsChange, positions, contractsForCallback, hitBoxes, missedBoxes]);

  useEffect(() => {
    if (!externalControl || externalTimeframe === undefined) {
      return;
    }
    setInternalTimeframe(getTimeFrameFromMs(externalTimeframe));
  }, [externalControl, externalTimeframe]);

  useEffect(() => {
    if (!isStarted) {
      disconnect();
      return;
    }

    if (state.status === 'idle' || state.status === 'disconnected' || state.status === 'error') {
      connect();
    }
  }, [connect, disconnect, isStarted, state.status]);

  useEffect(() => {
    if (!isStarted) {
      return;
    }
    if (!state.userId) {
      return;
    }
    subscribe(effectiveTimeframe);
  }, [isStarted, state.userId, effectiveTimeframe, subscribe]);

  useEffect(() => {
    if (!isStarted) {
      return;
    }
    if (state.snapshotVersion === 0) {
      return;
    }
    if (!canvasContainerRef.current) {
      return;
    }

    if (gameRef.current) {
      gameRef.current.destroy();
      gameRef.current = null;
    }

    const container = canvasContainerRef.current;
    container.innerHTML = '';

    const theme = {
      ...defaultTheme,
      colors: {
        ...defaultTheme.colors,
        primary: signatureColor,
      },
    };

    const game = new GridGame(container, {
      showProbabilities,
      minMultiplier,
      pixelsPerPoint: PIXELS_PER_POINT,
      theme,
    });

    gameRef.current = game;
    gridAnchorStateRef.current = { anchor: null, timeframe: effectiveTimeframe };
    confirmedContractsRef.current.clear();
    resolvedContractsRef.current.clear();

    priceSeries.forEach((point) => {
      game.addPriceData({
        price: point.price,
        timestamp: point.timestamp,
      });
    });
    processedTicksRef.current = priceSeries.length;
    if (priceSeries.length) {
      lastProcessedTimestampRef.current = priceSeries[priceSeries.length - 1]?.timestamp;
    } else {
      lastProcessedTimestampRef.current = undefined;
    }

    const multipliers = buildMultipliers(
      renderedContracts,
      effectiveTimeframe,
      game,
      lastPrice,
      positionsByContract,
      estimateMsPerPoint(priceSeries),
      gridAnchorStateRef,
    );
    game.updateMultipliers(multipliers);

    const updateSelectionStats = () => {
      if (!onSelectionChange) {
        return;
      }
      const selectedIds = game.getSelectedSquares();
      if (!selectedIds.length) {
        onSelectionChange(0, 0, [], null);
        return;
      }
      const values: number[] = [];
      const prices: number[] = [];
      selectedIds.forEach((id) => {
        const contract = contractMapRef.current.get(id);
        if (!contract) {
          return;
        }
        values.push(contract.returnMultiplier);
        prices.push((contract.lowerStrike + contract.upperStrike) / 2);
      });
      const best = values.length ? Math.max(...values) : 0;
      const avgPrice = prices.length
        ? prices.reduce((total, price) => total + price, 0) / prices.length
        : null;
      onSelectionChange(selectedIds.length, best, values, avgPrice);
    };

    const handleSquareSelected = ({ squareId }: { squareId: string }) => {
      updateSelectionStats();
      const wager = betAmountRef.current;
      placeTrade(squareId, wager);
    };

    game.on('squareSelected', handleSquareSelected);
    game.on('selectionChanged', updateSelectionStats);
    const handleCameraFollowingChanged = ({ isFollowing }: { isFollowing: boolean }) => {
      setIsCameraFollowing(isFollowing);
    };
    setIsCameraFollowing(game.isCameraFollowingPrice());
    game.on('cameraFollowingChanged', handleCameraFollowingChanged);

    game.startWithExternalData();

    lastSnapshotVersionRef.current = state.snapshotVersion;

    return () => {
      game.off('squareSelected', handleSquareSelected);
      game.off('selectionChanged', updateSelectionStats);
      game.off('cameraFollowingChanged', handleCameraFollowingChanged);
      game.destroy();
      if (gameRef.current === game) {
        gameRef.current = null;
      }
    };
    // We intentionally avoid re-running when derived data updates because dedicated effects handle those updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveTimeframe, isStarted, onSelectionChange, signatureColor, state.snapshotVersion]);

  useEffect(() => {
    if (!gameRef.current) {
      return;
    }
    const multipliers = buildMultipliers(
      renderedContracts,
      effectiveTimeframe,
      gameRef.current,
      lastPrice,
      positionsByContract,
      estimateMsPerPoint(priceSeries),
      gridAnchorStateRef,
    );
    gameRef.current.updateMultipliers(multipliers);
  }, [renderedContracts, effectiveTimeframe, lastPrice, positionsByContract, priceSeries]);

  useEffect(() => {
    if (!gameRef.current) {
      return;
    }
    gameRef.current.updateConfig({
      showProbabilities,
      minMultiplier,
      showOtherPlayers,
    });
  }, [showProbabilities, minMultiplier, showOtherPlayers]);

  useEffect(() => {
    if (!gameRef.current) {
      return;
    }
    if (state.status !== 'live') {
      return;
    }
    if (!priceSeries.length) {
      return;
    }
    if (state.snapshotVersion !== lastSnapshotVersionRef.current) {
      processedTicksRef.current = priceSeries.length;
      lastSnapshotVersionRef.current = state.snapshotVersion;
      lastProcessedTimestampRef.current = priceSeries.length
        ? priceSeries[priceSeries.length - 1]?.timestamp
        : undefined;
      return;
    }
    let startIndex = 0;
    const lastTimestamp = lastProcessedTimestampRef.current;
    if (lastTimestamp !== undefined) {
      startIndex = priceSeries.findIndex((tick) => (tick.timestamp ?? 0) > lastTimestamp);
      if (startIndex === -1) {
        processedTicksRef.current = priceSeries.length;
        return;
      }
    }
    for (let index = startIndex; index < priceSeries.length; index += 1) {
      const tick = priceSeries[index];
      gameRef.current.addPriceData({ price: tick.price, timestamp: tick.timestamp });
    }
    processedTicksRef.current = priceSeries.length;
    lastProcessedTimestampRef.current = priceSeries[priceSeries.length - 1]?.timestamp
      ?? lastProcessedTimestampRef.current;
  }, [priceSeries, state.snapshotVersion, state.status]);
  
  useEffect(() => {
    const game = gameRef.current;
    if (!game) {
      return;
    }

    const confirmed = confirmedContractsRef.current;
    const resolved = resolvedContractsRef.current;

    positionsByContract.forEach((position, contractId) => {
      const tradeKey = position.tradeId ?? '__no_trade_id__';
      const hasConfirmedEntry = confirmed.has(contractId);
      const lastConfirmed = confirmed.get(contractId);
      const hasResolvedEntry = resolved.has(contractId);
      const lastResolved = resolved.get(contractId);
      const contract = contractMapRef.current.get(contractId);

      if (!position.result) {
        if (!hasConfirmedEntry || lastConfirmed !== tradeKey) {
          game.confirmSelectedContract(contractId);
          confirmed.set(contractId, tradeKey);
        }
        if (hasResolvedEntry && lastResolved !== tradeKey) {
          resolved.delete(contractId);
        }
        const now = Date.now();
        const contractExpired = contract
          ? contract.status === 'expired' && contract.endTime <= now - MISS_RESOLUTION_GRACE_MS
          : false;
        const shouldMarkMiss = contractExpired && (!hasResolvedEntry || lastResolved !== tradeKey);
        if (shouldMarkMiss) {
          game.markContractAsMissed(contractId);
          resolved.set(contractId, tradeKey);
          confirmed.set(contractId, tradeKey);
        }
        return;
      }

      if (hasResolvedEntry && lastResolved === tradeKey) {
        return;
      }

      if (position.result === 'win') {
        game.markContractAsHit(contractId);
      } else if (position.result === 'loss') {
        game.markContractAsMissed(contractId);
      }

      resolved.set(contractId, tradeKey);
      confirmed.set(contractId, tradeKey);
    });
  }, [positionsByContract]);

  useEffect(() => {
    if (!lastPlaceTradeError) {
      return;
    }
    if (lastPlaceTradeError.at === lastTradeErrorHandledRef.current) {
      return;
    }
    lastTradeErrorHandledRef.current = lastPlaceTradeError.at ?? 0;

    const game = gameRef.current;
    if (game) {
      if (lastPlaceTradeError.contractId) {
        game.cancelPendingContract(lastPlaceTradeError.contractId, { keepHighlight: true });
        confirmedContractsRef.current.delete(lastPlaceTradeError.contractId);
        resolvedContractsRef.current.delete(lastPlaceTradeError.contractId);
      } else {
        game.cancelAllPendingContracts({ keepHighlight: true });
        confirmedContractsRef.current.clear();
        resolvedContractsRef.current.clear();
      }
    }

    addNotification({
      type: 'error',
      title: 'Trade Failed',
      message: lastPlaceTradeError.error,
    });
    setTradeErrorMessage(lastPlaceTradeError.error);
  }, [addNotification, lastPlaceTradeError]);

  useEffect(() => {
    if (!tradeErrorMessage) {
      return;
    }
    const timer = window.setTimeout(() => {
      setTradeErrorMessage(null);
    }, 3_000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [tradeErrorMessage]);

  const handleStart = useCallback(() => {
    const next = true;
    if (!externalControl) {
      setInternalIsStarted(next);
    }
    onExternalStartChange?.(next);
    if (!isStarted) {
      connect();
    }
  }, [connect, externalControl, isStarted, onExternalStartChange]);

  const handleStop = useCallback(() => {
    const next = false;
    if (!externalControl) {
      setInternalIsStarted(next);
    }
    onExternalStartChange?.(next);
    disconnect();
  }, [disconnect, externalControl, onExternalStartChange]);

  const handleTimeframeChange = useCallback((timeframe: TimeFrame) => {
    if (!externalControl) {
      setInternalTimeframe(timeframe);
    }
    subscribe(timeframe);
  }, [externalControl, subscribe]);

  const handleRecenter = useCallback(() => {
    const game = gameRef.current;
    if (!game) {
      return;
    }
    game.resetCameraToFollowPrice();
    setIsCameraFollowing(true);
  }, []);

  useEffect(() => {
    if (!isStarted) {
      setIsCameraFollowing(true);
    }
  }, [isStarted]);

  const statusLabel = useMemo(() => {
    let label: string | null;
    switch (state.status) {
      case 'connecting':
        label = 'Connecting to engine…';
        break;
      case 'handshake':
        label = 'Authenticating…';
        break;
      case 'awaiting_snapshot':
        label = 'Loading game snapshot…';
        break;
      case 'disconnected':
        label = 'Reconnecting…';
        break;
      case 'error':
        label = state.error ?? 'Engine error';
        break;
      default:
        label = null;
    }
    if (!label && state.error) {
      return state.error;
    }
    return label;
  }, [state.error, state.status]);

  return (
    <div
      className="flex h-full w-full flex-col"
      style={{ backgroundColor: '#0E0E0E', position: 'relative', touchAction: 'none' }}
      onMouseDown={(event) => event.stopPropagation()}
      onMouseUp={(event) => event.stopPropagation()}
      onMouseMove={(event) => event.stopPropagation()}
    >
      {!externalControl && (
        <div className="flex h-16 w-full items-center justify-between border-b border-gray-700 px-4">
          <div className="flex items-center gap-6 text-sm text-gray-300">
            <div>
              <span className="text-xs text-gray-500">Price</span>
              <div className="text-lg font-semibold text-white">
                {lastPrice ? `$${lastPrice.price.toFixed(2)}` : '--'}
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-500">Time</span>
              <div className="text-lg font-semibold text-white">
                {currentTime.toLocaleTimeString('en-US', { hour12: false })}
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-500">Balance</span>
              <div className="text-lg font-semibold text-white">
                ${state.balance.toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-500">Positions</span>
              <div className="text-lg font-semibold text-white">
                {positionsByContract.size}
              </div>
            </div>
            {statusLabel && (
              <div className="text-xs text-yellow-400">{statusLabel}</div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!isStarted ? (
              <button
                onClick={handleStart}
                className="rounded bg-green-600 px-4 py-2 text-white transition hover:bg-green-700"
              >
                Start
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="rounded bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
              >
                Stop
              </button>
            )}
            <TimeframeSelector
              selectedTimeframe={effectiveTimeframe}
              onTimeframeChange={handleTimeframeChange}
            />
          </div>
        </div>
      )}
      {tradeErrorMessage && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-50 -translate-x-1/2 rounded bg-red-500/90 px-3 py-2 text-xs font-medium text-white shadow-lg">
          {tradeErrorMessage}
        </div>
      )}
      <div className="relative flex-1">
        {isStarted && !isCameraFollowing && state.status === 'live' && (
          <button
            type="button"
            onClick={handleRecenter}
            className="absolute right-4 top-4 z-30 rounded-md bg-black/60 px-3 py-2 text-xs font-semibold text-white shadow-md backdrop-blur transition hover:bg-black/70"
          >
            Recenter
          </button>
        )}
        {!isStarted ? (
          <div className="flex h-full items-center justify-center text-center text-gray-400">
            <div>
              <h2 className="mb-2 text-2xl font-semibold text-white">TradeRush - Canvas Edition</h2>
              <p className="mb-4">Click Start to begin trading.</p>
              <p className="text-xs text-gray-500">
                The chart animates in real-time once connected to the clearing house engine.
              </p>
            </div>
          </div>
        ) : state.snapshotVersion === 0 || state.status === 'awaiting_snapshot' || state.status === 'handshake' || state.status === 'connecting' ? (
          <div className="flex h-full flex-col items-center justify-center text-sm text-gray-400">
            <div>Loading game configuration…</div>
            <div className="mt-2 text-xs text-gray-500">
              Status: {statusLabel ?? 'Preparing snapshot'}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              timeframe: {effectiveTimeframe}ms
            </div>
          </div>
        ) : state.status === 'error' ? (
          <div className="flex h-full flex-col items-center justify-center text-sm text-red-400">
            <div>Engine error. Attempting to reconnect…</div>
            {state.error && <div className="mt-2 text-xs">{state.error}</div>}
          </div>
        ) : (
          <div className="absolute inset-0" ref={canvasContainerRef} />
        )}
      </div>
    </div>
  );
}

export default memo(Canvas);
