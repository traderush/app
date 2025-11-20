import { GridGame } from '@/shared/lib/canvasLogic/games/grid/GridGame';
import { defaultTheme } from '@/shared/lib/canvasLogic/config/theme';
import { getTimeframeConfig, getAllTimeframes, TimeFrame } from '@/shared/types/timeframe';
import type { BoxHitContract, BoxHitPosition, BoxHitPositionMap } from '@/shared/types/boxHit';
import type { EngineContractSnapshot, EnginePricePoint } from '@/shared/types/boxHitEngine';
import { getBoxHitEngineService, type BoxHitEngineService, type EngineState } from '@/shared/lib/boxHitEngine/BoxHitEngineService';
import { useUIStore } from '@/shared/state/uiStore';
import { useUserStore } from '@/shared/state/userStore';
import { useConnectionStore } from '@/shared/state/connectionStore';

const PIXELS_PER_POINT = 5;
const MISS_RESOLUTION_GRACE_MS = 1_000;

function estimateMsPerPoint(series: EnginePricePoint[]): number {
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
  totalTrades: number;
  userTrade: number;
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
  columnIdx: number | null;
  columnWidth: number | null;
};

export interface CanvasProps {
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
  tradeAmount?: number;
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
  anchorState?: GridAnchorState,
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
  const idealPointsPerStep = timeStep / safeMsPerPoint;
  const rawColumnWidthPx = Math.max(PIXELS_PER_POINT, idealPointsPerStep * PIXELS_PER_POINT);
  const currentColumnIdx = Math.floor(nowTs / timeStep);
  const currentColumnStartTs = currentColumnIdx * timeStep;
  const columnProgress = (nowTs - currentColumnStartTs) / timeStep;
  const currentColumnStartWorldX = game?.getWorldPositionForTimestamp?.(currentColumnStartTs)?.worldX ?? null;
  const nextColumnStartWorldX = game?.getWorldPositionForTimestamp?.(currentColumnStartTs + timeStep)?.worldX ?? null;
  const measuredColumnSpan = (currentColumnStartWorldX !== null && nextColumnStartWorldX !== null)
    ? nextColumnStartWorldX - currentColumnStartWorldX
    : null;

  let columnWidthPx = Number.isFinite(measuredColumnSpan ?? NaN) && (measuredColumnSpan ?? 0) > 0
    ? Math.max(PIXELS_PER_POINT, measuredColumnSpan as number)
    : rawColumnWidthPx;
  let columnAnchorX = currentColumnStartWorldX ?? currentWorldX - columnProgress * columnWidthPx;

  if (anchorState) {
    if (anchorState.timeframe !== timeframe) {
      anchorState.timeframe = timeframe;
      anchorState.anchor = null;
      anchorState.columnIdx = null;
      anchorState.columnWidth = null;
    }

    if (
      typeof measuredColumnSpan === 'number'
      && Number.isFinite(measuredColumnSpan)
      && measuredColumnSpan > 0
    ) {
      if (typeof anchorState.columnWidth !== 'number' || !Number.isFinite(anchorState.columnWidth)) {
        anchorState.columnWidth = Math.max(PIXELS_PER_POINT, measuredColumnSpan);
      } else {
        const smoothing = 0.2;
        anchorState.columnWidth =
          anchorState.columnWidth * (1 - smoothing)
          + Math.max(PIXELS_PER_POINT, measuredColumnSpan) * smoothing;
      }
    }

    // Use smoothed columnWidth from anchorState if available
    if (typeof anchorState.columnWidth === 'number' && Number.isFinite(anchorState.columnWidth)) {
      columnWidthPx = anchorState.columnWidth;
    }

    // Update anchor based on current column position
    if (typeof currentColumnStartWorldX === 'number' && Number.isFinite(currentColumnStartWorldX)) {
      columnAnchorX = currentColumnStartWorldX;
      anchorState.anchor = currentColumnStartWorldX;
      anchorState.columnIdx = currentColumnIdx;
    } else if (typeof anchorState.anchor === 'number' && Number.isFinite(anchorState.anchor)) {
      const lastIdx = anchorState.columnIdx ?? currentColumnIdx;
      const deltaColumns = currentColumnIdx - lastIdx;
      if (deltaColumns !== 0) {
        columnAnchorX = anchorState.anchor + deltaColumns * columnWidthPx;
        anchorState.anchor = columnAnchorX;
        anchorState.columnIdx = currentColumnIdx;
      } else {
        columnAnchorX = anchorState.anchor;
      }
    } else {
      anchorState.anchor = columnAnchorX;
      anchorState.columnIdx = currentColumnIdx;
    }

    // Ensure anchorState.columnWidth is set for next iteration if not already set
    if (typeof anchorState.columnWidth !== 'number' || !Number.isFinite(anchorState.columnWidth)) {
      anchorState.columnWidth = columnWidthPx;
    }
  }
  const rowAnchorPrice = Math.floor(basePrice / priceStep) * priceStep;
  const safeColumnWidthPx = Number.isFinite(columnWidthPx) && columnWidthPx > 0 ? columnWidthPx : rawColumnWidthPx;
  const safeColumnAnchorX = Number.isFinite(columnAnchorX) ? columnAnchorX : 0;
  columnWidthPx = safeColumnWidthPx;
  columnAnchorX = safeColumnAnchorX;
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
    const contractColumnIdx = Math.floor(contract.startTime / timeStep);
    const columnOffset = contractColumnIdx - currentColumnIdx;
    const contractStartWorldX = game?.getWorldPositionForTimestamp?.(contract.startTime)?.worldX ?? null;
    const contractEndWorldX = game?.getWorldPositionForTimestamp?.(contract.endTime)?.worldX ?? null;
    const fallbackWorldX = columnAnchorX + columnOffset * columnWidthPx;
    const startWorldX = typeof contractStartWorldX === 'number' && Number.isFinite(contractStartWorldX)
      ? contractStartWorldX
      : null;
    const alignedWorldX = startWorldX ?? fallbackWorldX;
    const alignedLower = Math.floor(contract.lowerStrike / priceStep) * priceStep;
    const priceSpan = Math.max(priceStep, contract.upperStrike - contract.lowerStrike);
    const heightSteps = Math.max(1, Math.round(priceSpan / priceStep));
    const height = heightSteps * priceStep;
    const durationColumns = Math.max(1, Math.round((contract.endTime - contract.startTime) / timeStep));
    const endWorldX = typeof contractEndWorldX === 'number' && Number.isFinite(contractEndWorldX)
      ? contractEndWorldX
      : null;
    let width = endWorldX !== null
      ? Math.max(columnWidthPx * 0.25, endWorldX - alignedWorldX)
      : durationColumns * columnWidthPx;
    if (!Number.isFinite(width) || width <= 0) {
      width = durationColumns * columnWidthPx;
    }

    const position = positionsByContract.get(contract.contractId);
    const status = position?.result === 'win'
      ? 'hit'
      : position?.result === 'loss'
        ? 'missed'
        : undefined;

    multipliers[contract.contractId] = {
      value: contract.returnMultiplier,
      x: col,
      y: row,
      worldX: alignedWorldX,
      worldY: alignedLower,
      width,
      height,
      totalTrades: contract.totalVolume,
      userTrade: position?.amount ?? 0,
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

interface CanvasElements {
  root: HTMLDivElement;
  header?: HTMLDivElement;
  priceValue?: HTMLDivElement;
  timeValue?: HTMLDivElement;
  balanceValue?: HTMLDivElement;
  positionsValue?: HTMLDivElement;
  statusValue?: HTMLDivElement;
  startButton?: HTMLButtonElement;
  stopButton?: HTMLButtonElement;
  timeframeContainer?: HTMLDivElement;
  recenterButton: HTMLButtonElement;
  placeholderView: HTMLDivElement;
  loadingView: HTMLDivElement;
  errorView: HTMLDivElement;
  canvasView: HTMLDivElement;
  canvasContainer: HTMLDivElement;
  canvasMask: HTMLDivElement;
  tradeErrorBanner: HTMLDivElement;
}

interface SelectionStats {
  count: number;
  best: number;
  multipliers: number[];
  averagePrice: number | null;
}

const createSelectionStats = (): SelectionStats => ({
  count: 0,
  best: 0,
  multipliers: [],
  averagePrice: null,
});

const buildContractsForCallback = (contracts: EngineContractSnapshot[]): BoxHitContract[] => {
  return contracts.map((contract) => ({
    contractId: contract.contractId,
    startTime: contract.startTime,
    endTime: contract.endTime,
    lowerStrike: contract.lowerStrike,
    upperStrike: contract.upperStrike,
    returnMultiplier: contract.returnMultiplier,
    totalVolume: contract.totalVolume,
    isActive: contract.status === 'active',
    type: contract.type,
  }));
};

export class CanvasController {
  private readonly service: BoxHitEngineService;
  private readonly root: HTMLElement;
  private readonly elements: CanvasElements;

  private options: CanvasProps;
  private signatureColor: string;
  private tradeAmount: number;
  private showProbabilities: boolean;
  private showOtherPlayers: boolean;
  private minMultiplier: number;

  private unsubscribeSignature?: () => void;
  private unsubscribeState?: () => void;
  private unsubscribeTradeError?: () => void;

  private clockTimer: ReturnType<typeof setInterval> | null = null;
  private tradeErrorTimer: ReturnType<typeof setTimeout> | null = null;

  private game: GridGame | null = null;
  private processedTicks = 0;
  private lastSnapshotVersion = 0;
  private lastProcessedTimestamp: number | undefined = undefined;
  private confirmedContracts = new Map<string, string | undefined>();
  private resolvedContracts = new Map<string, string | undefined>();
  private gridAnchorState: GridAnchorState = {
    anchor: null,
    timeframe: null,
    columnIdx: null,
    columnWidth: null,
  };
  private contractHistory = new Map<string, EngineContractSnapshot>();
  private contractMap = new Map<string, EngineContractSnapshot>();
  private positionsByContract = new Map<string, BoxHitPosition>();

  private isCameraFollowing = true;
  private selectionStats: SelectionStats = createSelectionStats();

  private isStarted = false;
  private isInteractionLocked = true;
  private timeframe: TimeFrame = TimeFrame.TWO_SECONDS;
  private isEngineConnected = false;
  private initialCoverActive = true;
  private initialCoverTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  private shouldShowInitialCover = true;

  constructor(root: HTMLElement, options: CanvasProps = {}) {
    this.root = root;
    this.options = { ...options };
    this.tradeAmount = options.tradeAmount ?? 100;
    this.showProbabilities = options.showProbabilities ?? false;
    this.showOtherPlayers = options.showOtherPlayers ?? false;
    this.minMultiplier = options.minMultiplier ?? 1.0;
    this.service = getBoxHitEngineService();

    this.signatureColor = useUIStore.getState().signatureColor;

    this.elements = this.buildLayout();
    this.activateInitialCover();
    this.applyInteractionLock();
    this.attachGlobalHandlers();
    this.attachControls();

    this.unsubscribeSignature = useUIStore.subscribe((state, prevState) => {
      if (prevState?.signatureColor === state.signatureColor) {
        return;
      }

      this.signatureColor = state.signatureColor;
      if (this.game) {
        this.game.updateConfig({
          theme: {
            ...defaultTheme,
            colors: { ...defaultTheme.colors, primary: state.signatureColor },
          },
        });
      }
    });

    this.unsubscribeState = this.service.subscribeToState((state) => this.handleEngineState(state));
    this.unsubscribeTradeError = this.service.subscribeToTradeErrors((error) => this.handleTradeError(error));

    this.timeframe = this.resolveInitialTimeframe();
    this.ensureEngineConnection();
    this.updateTimeframeButtons();
    this.syncStartState();
    this.startClock();
    this.handleEngineState(this.service.getState());
  }

  update(options: CanvasProps = {}): void {
    const next = { ...options };
    this.tradeAmount = next.tradeAmount ?? this.tradeAmount;
    this.showProbabilities = next.showProbabilities ?? this.showProbabilities;
    this.showOtherPlayers = next.showOtherPlayers ?? this.showOtherPlayers;
    this.minMultiplier = next.minMultiplier ?? this.minMultiplier;
    this.options = next;

    const newTimeframe = this.resolveInitialTimeframe();
    if (newTimeframe !== this.timeframe) {
      this.timeframe = newTimeframe;
      if (this.isEngineConnected) {
        this.service.subscribe(this.timeframe);
      }
      this.updateTimeframeButtons();
    }

    this.syncStartState();

    if (this.game) {
      this.game.updateConfig({
        showProbabilities: this.showProbabilities,
        showOtherPlayers: this.showOtherPlayers,
        minMultiplier: this.minMultiplier,
      });
    }
  }

  destroy(): void {
    this.stopClock();
    this.unsubscribeSignature?.();
    this.unsubscribeState?.();
    this.unsubscribeTradeError?.();
    if (this.initialCoverTimer) {
      clearTimeout(this.initialCoverTimer);
      this.initialCoverTimer = null;
    }
    this.teardownEngineConnection();
    this.teardownGame();
    useConnectionStore.getState().setBackendConnected(false);
    this.root.innerHTML = '';
  }

  private resolveInitialTimeframe(): TimeFrame {
    if (this.options.externalControl && this.options.externalTimeframe !== undefined) {
      return getTimeFrameFromMs(this.options.externalTimeframe);
    }
    return this.timeframe ?? TimeFrame.TWO_SECONDS;
  }

  private syncStartState(): void {
    const targetStarted = this.options.externalControl
      ? Boolean(this.options.externalIsStarted)
      : this.isStarted;

    if (targetStarted !== this.isStarted) {
      if (targetStarted) {
        this.startEngine();
      } else {
        this.stopEngine();
      }
    }

    if (this.options.externalControl) {
      this.toggleHeader(false);
    } else {
      this.toggleHeader(true);
    }
  }

  private buildLayout(): CanvasElements {
    const root = document.createElement('div');
    root.className = 'flex h-full w-full flex-col';
    root.style.backgroundColor = '#0E0E0E';
    root.style.position = 'relative';
    root.style.touchAction = 'none';
    this.root.appendChild(root);

    let header: HTMLDivElement | undefined;
    let priceValue: HTMLDivElement | undefined;
    let timeValue: HTMLDivElement | undefined;
    let balanceValue: HTMLDivElement | undefined;
    let positionsValue: HTMLDivElement | undefined;
    let statusValue: HTMLDivElement | undefined;
    let startButton: HTMLButtonElement | undefined;
    let stopButton: HTMLButtonElement | undefined;
    let timeframeContainer: HTMLDivElement | undefined;

    if (!this.options.externalControl) {
      header = document.createElement('div');
      header.className = 'flex h-16 w-full items-center justify-between border-b border-gray-700 px-4';

      const statsGroup = document.createElement('div');
      statsGroup.className = 'flex items-center gap-6 text-sm text-gray-300';

      const priceBlock = this.createHeaderStat('Price');
      priceValue = priceBlock.value;
      statsGroup.appendChild(priceBlock.container);

      const timeBlock = this.createHeaderStat('Time');
      timeValue = timeBlock.value;
      statsGroup.appendChild(timeBlock.container);

      const balanceBlock = this.createHeaderStat('Balance');
      balanceValue = balanceBlock.value;
      statsGroup.appendChild(balanceBlock.container);

      const positionsBlock = this.createHeaderStat('Positions');
      positionsValue = positionsBlock.value;
      statsGroup.appendChild(positionsBlock.container);

      statusValue = document.createElement('div');
      statusValue.className = 'text-xs text-yellow-400';
      statsGroup.appendChild(statusValue);

      const controlsGroup = document.createElement('div');
      controlsGroup.className = 'flex items-center gap-3';

      startButton = document.createElement('button');
      startButton.className = 'rounded bg-green-600 px-4 py-2 text-white transition hover:bg-green-700';
      startButton.textContent = 'Start';

      stopButton = document.createElement('button');
      stopButton.className = 'rounded bg-red-600 px-4 py-2 text-white transition hover:bg-red-700';
      stopButton.textContent = 'Stop';
      stopButton.style.display = 'none';

      timeframeContainer = document.createElement('div');
      timeframeContainer.className = 'flex items-center space-x-2';
      const tfLabel = document.createElement('span');
      tfLabel.className = 'text-xs text-gray-500';
      tfLabel.textContent = 'Timeframe:';
      timeframeContainer.appendChild(tfLabel);
      this.populateTimeframeButtons(timeframeContainer);

      controlsGroup.appendChild(startButton);
      controlsGroup.appendChild(stopButton);
      controlsGroup.appendChild(timeframeContainer);

      header.appendChild(statsGroup);
      header.appendChild(controlsGroup);
      root.appendChild(header);
    }

    const tradeErrorBanner = document.createElement('div');
    tradeErrorBanner.className = 'pointer-events-none absolute left-1/2 top-4 z-50 -translate-x-1/2 rounded bg-red-500/90 px-3 py-2 text-xs font-medium text-white shadow-lg';
    tradeErrorBanner.style.display = 'none';
    root.appendChild(tradeErrorBanner);

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'relative flex-1';
    root.appendChild(contentWrapper);

    const recenterButton = document.createElement('button');
    recenterButton.type = 'button';
    recenterButton.textContent = 'Recenter';
    recenterButton.className = 'absolute right-4 top-4 z-30 rounded-md bg-black/60 px-3 py-2 text-xs font-semibold text-white shadow-md backdrop-blur transition hover:bg-black/70';
    recenterButton.style.display = 'none';
    contentWrapper.appendChild(recenterButton);

    const placeholderView = document.createElement('div');
    placeholderView.className = 'pointer-events-none absolute inset-0 hidden';
    placeholderView.innerHTML = '';
    contentWrapper.appendChild(placeholderView);

    const loadingView = document.createElement('div');
    loadingView.className = 'hidden h-full flex-col items-center justify-center text-sm text-gray-400';
    loadingView.innerHTML = `
      <div>Loading game configuration…</div>
      <div class="mt-2 text-xs text-gray-500" data-status></div>
      <div class="mt-1 text-xs text-gray-500" data-timeframe></div>
    `;
    contentWrapper.appendChild(loadingView);

    const errorView = document.createElement('div');
    errorView.className = 'hidden h-full flex-col items-center justify-center text-sm text-red-400';
    errorView.innerHTML = `
      <div>Engine error. Attempting to reconnect…</div>
      <div class="mt-2 text-xs" data-error-details></div>
    `;
    contentWrapper.appendChild(errorView);

    const canvasView = document.createElement('div');
    canvasView.className = 'hidden absolute inset-0';
    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'absolute inset-0';
    canvasView.appendChild(canvasContainer);

    const canvasMask = document.createElement('div');
    canvasMask.className = 'absolute inset-0 z-40 flex items-center justify-center bg-[#09090bcc] backdrop-blur-sm transition-opacity duration-500';
    canvasMask.style.opacity = '1';
    canvasMask.innerHTML = `
      <div class="flex items-center gap-3 text-sm text-gray-300">
        <span class="h-2 w-2 animate-pulse rounded-full bg-green-400"></span>
        <span>Preparing live feed…</span>
      </div>
    `;
    canvasView.appendChild(canvasMask);

    contentWrapper.appendChild(canvasView);

    return {
      root,
      header,
      priceValue,
      timeValue,
      balanceValue,
      positionsValue,
      statusValue,
      startButton,
      stopButton,
      timeframeContainer,
      recenterButton,
      placeholderView,
      loadingView,
      errorView,
      canvasView,
      canvasContainer,
      canvasMask,
      tradeErrorBanner,
    };
  }

  private createHeaderStat(label: string): { container: HTMLDivElement; value: HTMLDivElement } {
    const container = document.createElement('div');
    const span = document.createElement('span');
    span.className = 'text-xs text-gray-500';
    span.textContent = label;
    const value = document.createElement('div');
    value.className = 'text-lg font-semibold text-white';
    value.textContent = '--';
    container.appendChild(span);
    container.appendChild(value);
    return { container, value };
  }

  private populateTimeframeButtons(container: HTMLDivElement): void {
    const timeframes = getAllTimeframes();
    timeframes.forEach((timeframe) => {
      const config = getTimeframeConfig(timeframe);
      const button = document.createElement('button');
      button.className = 'border px-3 py-1 text-xs transition-colors border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300';
      button.textContent = config.shortName;
      button.dataset.timeframe = String(timeframe);
      button.addEventListener('click', () => {
        this.setTimeframe(timeframe);
      });
      container.appendChild(button);
    });
    this.updateTimeframeButtons();
  }

  private attachControls(): void {
    this.elements.startButton?.addEventListener('click', () => this.startEngine(true));
    this.elements.stopButton?.addEventListener('click', () => this.stopEngine(true));
    this.elements.recenterButton.addEventListener('click', () => this.resetCamera());
  }

  private attachGlobalHandlers(): void {
    const stopPropagation = (event: Event) => event.stopPropagation();
    this.root.addEventListener('mousedown', stopPropagation);
    this.root.addEventListener('mouseup', stopPropagation);
    this.root.addEventListener('mousemove', stopPropagation);
  }

  private startClock(): void {
    this.updateClock();
    this.clockTimer = setInterval(() => this.updateClock(), 1_000);
  }

  private stopClock(): void {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
  }

  private updateClock(): void {
    if (!this.elements.timeValue) {
      return;
    }
    const now = new Date();
    this.elements.timeValue.textContent = now.toLocaleTimeString('en-US', { hour12: false });
  }

  private startEngine(triggeredByUser?: boolean): void {
    if (this.isStarted) {
      return;
    }
    this.isStarted = true;
    this.ensureEngineConnection();
    this.updateStartStopVisibility();
    this.hideInitialCover();
    this.shouldShowInitialCover = false;
    if (triggeredByUser) {
      this.options.onExternalStartChange?.(true);
    }
    this.handleEngineState(this.service.getState());
  }

  private stopEngine(triggeredByUser?: boolean): void {
    if (!this.isStarted) {
      return;
    }
    this.isStarted = false;
    this.updateStartStopVisibility();
    this.showPlaceholder();
    if (triggeredByUser) {
      this.options.onExternalStartChange?.(false);
      this.teardownEngineConnection();
      this.teardownGame();
    }
    this.resetCameraFollowing(true);
  }

  private setTimeframe(timeframe: TimeFrame): void {
    if (this.options.externalControl) {
      return;
    }
    this.timeframe = timeframe;
    this.updateTimeframeButtons();
    if (this.isEngineConnected) {
      this.service.subscribe(timeframe);
    }
  }

  private updateTimeframeButtons(): void {
    if (!this.elements.timeframeContainer) {
      return;
    }
    const buttons = Array.from(this.elements.timeframeContainer.querySelectorAll<HTMLButtonElement>('button[data-timeframe]'));
    buttons.forEach((button) => {
      const timeframeValue = Number(button.dataset.timeframe) as TimeFrame;
      const selected = timeframeValue === this.timeframe;
      button.className = selected
        ? 'border px-3 py-1 text-xs transition-colors border-green-600 bg-green-600/20 text-green-400'
        : 'border px-3 py-1 text-xs transition-colors border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300';
    });
  }

  private toggleHeader(isVisible: boolean): void {
    if (!this.elements.header) {
      return;
    }
    this.elements.header.style.display = isVisible ? '' : 'none';
  }

  private updateStartStopVisibility(): void {
    if (!this.elements.startButton || !this.elements.stopButton) {
      return;
    }
    if (this.isStarted) {
      this.elements.startButton.style.display = 'none';
      this.elements.stopButton.style.display = '';
    } else {
      this.elements.startButton.style.display = '';
      this.elements.stopButton.style.display = 'none';
    }
  }

  private applyInteractionLock(): void {
    const container = this.elements.canvasContainer;
    const canvasView = this.elements.canvasView;
    if (canvasView) {
      canvasView.style.pointerEvents = this.isInteractionLocked ? 'none' : 'auto';
    }
    if (container) {
      container.style.pointerEvents = this.isInteractionLocked ? 'none' : 'auto';
    }
    if (this.game?.canvas) {
      this.game.canvas.style.pointerEvents = this.isInteractionLocked ? 'none' : 'auto';
    }
  }

  private setInteractionLocked(isLocked: boolean): void {
    if (this.isInteractionLocked === isLocked) {
      this.applyInteractionLock();
      return;
    }
    this.isInteractionLocked = isLocked;
    this.applyInteractionLock();
  }

  private activateInitialCover(force = false): void {
    if (!force && !this.shouldShowInitialCover && !this.initialCoverActive) {
      return;
    }
    if (!force && this.initialCoverActive && this.initialCoverTimer) {
      return;
    }
    if (this.initialCoverTimer) {
      if (force) {
        clearTimeout(this.initialCoverTimer);
        this.initialCoverTimer = null;
      } else {
        return;
      }
    }
    const mask = this.elements.canvasMask;
    if (!mask) {
      return;
    }
    this.initialCoverActive = true;
    this.shouldShowInitialCover = true;
    mask.style.display = '';
    mask.style.opacity = '1';
    mask.style.pointerEvents = 'auto';
  }

  private scheduleInitialCoverRelease(): void {
    if (!this.initialCoverActive) {
      return;
    }
    if (this.initialCoverTimer) {
      return;
    }
    this.initialCoverTimer = globalThis.setTimeout(() => {
      this.initialCoverTimer = null;
      this.hideInitialCover();
    }, 2000);
  }

  private hideInitialCover(): void {
    if (!this.initialCoverActive) {
      return;
    }
    const mask = this.elements.canvasMask;
    if (!mask) {
      this.initialCoverActive = false;
      return;
    }
    this.initialCoverActive = false;
    this.shouldShowInitialCover = false;
    mask.style.opacity = '0';
    mask.style.pointerEvents = 'none';
    window.setTimeout(() => {
      if (!this.initialCoverActive) {
        mask.style.display = 'none';
      }
    }, 500);
  }

  private ensureEngineConnection(): void {
    if (this.isEngineConnected) {
      return;
    }
    this.service.connect();
    this.service.subscribe(this.timeframe);
    this.isEngineConnected = true;
  }

  private teardownEngineConnection(): void {
    if (!this.isEngineConnected) {
      return;
    }
    this.service.disconnect();
    this.isEngineConnected = false;
  }

  private placeholderToLoading(): void {
    this.elements.placeholderView.style.display = 'none';
    this.elements.loadingView.classList.remove('hidden');
    this.elements.errorView.classList.add('hidden');
    this.elements.canvasView.classList.add('hidden');
    this.setInteractionLocked(true);
    this.activateInitialCover();
  }

  private showPlaceholder(): void {
    this.elements.placeholderView.style.display = 'none';
    this.elements.loadingView.classList.add('hidden');
    this.elements.errorView.classList.add('hidden');
    this.elements.canvasView.classList.remove('hidden');
    this.elements.recenterButton.style.display = 'none';
    this.setInteractionLocked(true);
    this.activateInitialCover();
    this.scheduleInitialCoverRelease();
  }

  private showLoading(state: EngineState): void {
    this.elements.placeholderView.style.display = 'none';
    this.elements.loadingView.classList.remove('hidden');
    this.elements.errorView.classList.add('hidden');
    this.elements.canvasView.classList.add('hidden');
    this.setInteractionLocked(true);
    this.activateInitialCover();
    const statusEl = this.elements.loadingView.querySelector('[data-status]');
    const tfEl = this.elements.loadingView.querySelector('[data-timeframe]');
    if (statusEl) {
      statusEl.textContent = `Status: ${this.getStatusLabel(state) ?? 'Preparing snapshot'}`;
    }
    if (tfEl) {
      tfEl.textContent = `timeframe: ${this.timeframe}ms`;
    }
  }

  private showError(state: EngineState): void {
    this.elements.placeholderView.style.display = 'none';
    this.elements.loadingView.classList.add('hidden');
    this.elements.errorView.classList.remove('hidden');
    this.elements.canvasView.classList.add('hidden');
    this.setInteractionLocked(true);
    this.activateInitialCover();
    const details = this.elements.errorView.querySelector('[data-error-details]');
    if (details) {
      details.textContent = state.error ?? '';
    }
    this.elements.recenterButton.style.display = 'none';
  }

  private showCanvas(): void {
    this.elements.placeholderView.style.display = 'none';
    this.elements.loadingView.classList.add('hidden');
    this.elements.errorView.classList.add('hidden');
    this.elements.canvasView.classList.remove('hidden');
    this.setInteractionLocked(false);
    this.scheduleInitialCoverRelease();
  }

  private updateHeaderState(state: EngineState): void {
    if (this.elements.priceValue) {
      const price = state.lastTick?.price;
      this.elements.priceValue.textContent = typeof price === 'number'
        ? `$${price.toFixed(2)}`
        : '--';
    }
    if (this.elements.balanceValue) {
      this.elements.balanceValue.textContent = `$${state.balance.toFixed(2)}`;
    }
    if (this.elements.positionsValue) {
      this.elements.positionsValue.textContent = String(this.positionsByContract.size);
    }
    if (this.elements.statusValue) {
      const label = this.getStatusLabel(state);
      this.elements.statusValue.textContent = label ?? '';
      this.elements.statusValue.style.display = label ? '' : 'none';
    }
  }

  private getStatusLabel(state: EngineState): string | null {
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
  }

  private handleEngineState(state: EngineState): void {
    this.updateHeaderState(state);
    useUserStore.getState().updateBalance(state.balance, state.locked);
    const isConnected = state.status === 'live';
    useConnectionStore.getState().setBackendConnected(isConnected);

    if (this.options.onPriceUpdate && state.lastTick?.price !== undefined) {
      this.options.onPriceUpdate(state.lastTick.price);
    }

    this.updatePositions(state);

    if (!this.isStarted) {
      this.ensureGameInitialized(state);
      if (this.game) {
        this.showCanvas();
        this.updateMultipliersAndSelections(state);
        this.processPriceSeries(state);
        this.updateContractResolutions();
      }
      else {
        this.showPlaceholder();
      }
      
      return;
    }

    if (state.status === 'error') {
      this.showError(state);
      return;
    }

    const isPreLive = state.snapshotVersion === 0
      || state.status === 'awaiting_snapshot'
      || state.status === 'handshake'
      || state.status === 'connecting';

    if (isPreLive) {
      if (!this.game) {
        this.showLoading(state);
      } else {
        this.showCanvas();
      }
      return;
    }

    this.ensureGameInitialized(state);
    if (!this.game) {
      this.showLoading(state);
      return;
    }

    this.showCanvas();
    this.updateMultipliersAndSelections(state);
    this.processPriceSeries(state);
    this.updateContractResolutions();
    this.elements.recenterButton.style.display = (!this.isCameraFollowing && state.status === 'live') ? '' : 'none';
  }

  private ensureGameInitialized(state: EngineState): void {
    if (this.game && this.lastSnapshotVersion === state.snapshotVersion) {
      return;
    }

    this.teardownGame();

    const theme = {
      ...defaultTheme,
      colors: {
        ...defaultTheme.colors,
        primary: this.signatureColor,
      },
    };

    const game = new GridGame(this.elements.canvasContainer, {
      showProbabilities: this.showProbabilities,
      showOtherPlayers: this.showOtherPlayers,
      minMultiplier: this.minMultiplier,
      pixelsPerPoint: PIXELS_PER_POINT,
      theme,
    });

    this.game = game;
    this.gridAnchorState = {
      anchor: null,
      timeframe: this.timeframe,
      columnIdx: null,
      columnWidth: null,
    };
    this.confirmedContracts.clear();
    this.resolvedContracts.clear();
    this.processedTicks = state.priceSeries.length;
    this.lastSnapshotVersion = state.snapshotVersion;
    this.lastProcessedTimestamp = state.priceSeries.length
      ? state.priceSeries[state.priceSeries.length - 1]?.timestamp
      : undefined;

    state.priceSeries.forEach((point) => {
      game.addPriceData({
        price: point.price,
        timestamp: point.timestamp,
      });
    });

    this.contractHistory.clear();
    state.contracts.forEach((contract) => {
      this.contractHistory.set(contract.contractId, contract);
    });

    this.contractMap = new Map<string, EngineContractSnapshot>();
    state.contracts.forEach((contract) => {
      this.contractMap.set(contract.contractId, contract);
    });

    const multipliers = buildMultipliers(
      this.getRenderedContracts(state),
      this.timeframe,
      game,
      state.lastTick,
      this.positionsByContract,
      estimateMsPerPoint(state.priceSeries),
      this.gridAnchorState,
    );
    game.updateMultipliers(multipliers);

    game.on('squareSelected', ({ squareId }: { squareId: string }) => {
      this.updateSelectionStats();
      const tradeValue = this.tradeAmount;
      this.service.placeTrade(squareId, tradeValue);
    });

    game.on('selectionChanged', () => {
      this.updateSelectionStats();
    });

    game.on('cameraFollowingChanged', ({ isFollowing }: { isFollowing: boolean }) => {
      this.isCameraFollowing = isFollowing;
      this.elements.recenterButton.style.display = (!isFollowing && state.status === 'live') ? '' : 'none';
    });

    this.isCameraFollowing = game.isCameraFollowingPrice();
    game.startWithExternalData();
    this.applyInteractionLock();
  }

  private teardownGame(): void {
    if (!this.game) {
      return;
    }
    this.game.destroy();
    this.game = null;
  }

  private updateMultipliersAndSelections(state: EngineState): void {
    if (!this.game) {
      return;
    }

    const multipliers = buildMultipliers(
      this.getRenderedContracts(state),
      this.timeframe,
      this.game,
      state.lastTick,
      this.positionsByContract,
      estimateMsPerPoint(state.priceSeries),
      this.gridAnchorState,
    );
    this.game.updateMultipliers(multipliers);
    this.updateSelectionStats();
  }

  private getRenderedContracts(state: EngineState): EngineContractSnapshot[] {
    const combined: EngineContractSnapshot[] = [];
    const seen = new Set<string>();

    state.contracts.forEach((contract) => {
      combined.push(contract);
      this.contractHistory.set(contract.contractId, contract);
      this.contractMap.set(contract.contractId, contract);
      seen.add(contract.contractId);
    });

    this.positionsByContract.forEach((_, contractId) => {
      if (seen.has(contractId)) {
        return;
      }
      const snapshot = this.contractHistory.get(contractId);
      if (snapshot) {
        combined.push(snapshot);
        this.contractMap.set(contractId, snapshot);
        seen.add(contractId);
      }
    });

    return combined;
  }

  private processPriceSeries(state: EngineState): void {
    if (!this.game) {
      return;
    }
    if (!state.priceSeries.length) {
      return;
    }
    if (state.snapshotVersion !== this.lastSnapshotVersion) {
      this.processedTicks = state.priceSeries.length;
      this.lastSnapshotVersion = state.snapshotVersion;
      this.lastProcessedTimestamp = state.priceSeries[state.priceSeries.length - 1]?.timestamp;
      return;
    }
    let startIndex = 0;
    if (this.lastProcessedTimestamp !== undefined) {
      startIndex = state.priceSeries.findIndex((tick) => (tick.timestamp ?? 0) > this.lastProcessedTimestamp!);
      if (startIndex === -1) {
        this.processedTicks = state.priceSeries.length;
        return;
      }
    }
    for (let index = startIndex; index < state.priceSeries.length; index += 1) {
      const tick = state.priceSeries[index];
      this.game.addPriceData({ price: tick.price, timestamp: tick.timestamp });
    }
    this.processedTicks = state.priceSeries.length;
    this.lastProcessedTimestamp = state.priceSeries[state.priceSeries.length - 1]?.timestamp ?? this.lastProcessedTimestamp;
  }

  private updateContractResolutions(): void {
    const game = this.game;
    if (!game) {
      return;
    }

    this.positionsByContract.forEach((position, contractId) => {
      const tradeKey = position.tradeId ?? '__no_trade_id__';
      const hasConfirmedEntry = this.confirmedContracts.has(contractId);
      const lastConfirmed = this.confirmedContracts.get(contractId);
      const hasResolvedEntry = this.resolvedContracts.has(contractId);
      const lastResolved = this.resolvedContracts.get(contractId);
      const contract = this.contractMap.get(contractId);

      if (!position.result) {
        if (!hasConfirmedEntry || lastConfirmed !== tradeKey) {
          game.confirmSelectedContract(contractId);
          this.confirmedContracts.set(contractId, tradeKey);
        }
        if (hasResolvedEntry && lastResolved !== tradeKey) {
          this.resolvedContracts.delete(contractId);
        }
        const now = Date.now();
        const contractExpired = contract
          ? contract.status === 'expired' && contract.endTime <= now - MISS_RESOLUTION_GRACE_MS
          : false;
        const shouldMarkMiss = contractExpired && (!hasResolvedEntry || lastResolved !== tradeKey);
        if (shouldMarkMiss) {
          game.markContractAsMissed(contractId);
          this.resolvedContracts.set(contractId, tradeKey);
          this.confirmedContracts.set(contractId, tradeKey);
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

      this.resolvedContracts.set(contractId, tradeKey);
      this.confirmedContracts.set(contractId, tradeKey);
    });
  }

  private resetCamera(): void {
    if (!this.game) {
      return;
    }
    this.game.resetCameraToFollowPrice();
    this.resetCameraFollowing(true);
  }

  private resetCameraFollowing(isFollowing: boolean): void {
    this.isCameraFollowing = isFollowing;
    this.elements.recenterButton.style.display = isFollowing ? 'none' : '';
  }

  private updatePositions(state: EngineState): void {
    this.positionsByContract = new Map<string, BoxHitPosition>();
    Object.values(state.positions).forEach((position) => {
      const existing = this.positionsByContract.get(position.contractId);
      if (!existing || (existing.timestamp ?? 0) < (position.timestamp ?? 0)) {
        this.positionsByContract.set(position.contractId, position);
      }
    });

    if (this.options.onPositionsChange) {
      const map: BoxHitPositionMap = new Map(this.positionsByContract.entries());
      const contracts = buildContractsForCallback(this.getRenderedContracts(state));
      const hitBoxes = Array.from(this.positionsByContract.values())
        .filter((position) => position.result === 'win')
        .map((position) => position.contractId);
      const missedBoxes = Array.from(this.positionsByContract.values())
        .filter((position) => position.result === 'loss')
        .map((position) => position.contractId);
      this.options.onPositionsChange(map, contracts, hitBoxes, missedBoxes);
    }
  }

  private updateSelectionStats(): void {
    if (!this.game || !this.options.onSelectionChange) {
      return;
    }
    const selectedIds = this.game.getSelectedSquares();
    if (!selectedIds.length) {
      this.selectionStats = createSelectionStats();
      this.options.onSelectionChange(0, 0, [], null);
      return;
    }
    const values: number[] = [];
    const prices: number[] = [];
    selectedIds.forEach((id) => {
      const contract = this.contractMap.get(id);
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
    this.selectionStats = {
      count: selectedIds.length,
      best,
      multipliers: values,
      averagePrice: avgPrice,
    };
    this.options.onSelectionChange(selectedIds.length, best, values, avgPrice);
  }

  private handleTradeError(error?: EngineState['lastPlaceTradeError']): void {
    if (!error) {
      return;
    }

    const { addNotification } = useUIStore.getState();
    addNotification({
      type: 'error',
      title: 'Trade Failed',
      message: error.error,
    });

    if (this.tradeErrorTimer) {
      clearTimeout(this.tradeErrorTimer);
    }
    this.elements.tradeErrorBanner.textContent = error.error;
    this.elements.tradeErrorBanner.style.display = '';
    this.tradeErrorTimer = setTimeout(() => {
      this.elements.tradeErrorBanner.style.display = 'none';
    }, 3_000);

    if (!this.game) {
      return;
    }
    if (error.contractId) {
      this.game.cancelPendingContract(error.contractId, { keepHighlight: true });
      this.confirmedContracts.delete(error.contractId);
      this.resolvedContracts.delete(error.contractId);
    } else {
      this.game.cancelAllPendingContracts({ keepHighlight: true });
      this.confirmedContracts.clear();
      this.resolvedContracts.clear();
    }
  }
}
