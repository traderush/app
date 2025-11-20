import { GameType } from '@/shared/types';
import type { WorldCoordinateSystem } from '../../../core/WorldCoordinateSystem';
import { Renderer } from '../../../core/Renderer';
import type { BackendBox, BackendMultiplierMap } from '../types';
import type { Theme } from '../../../config/theme';
import { getViewportBoundsForCulling, isBoxOutsideViewport } from '../../../utils/viewportUtils';

interface HeatmapRendererConfig {
  showProbabilities: boolean;
  gameType: GameType;
  minMultiplier: number;
  theme: Theme;
}

type HeatmapEmptyBoxEntry = {
  worldX: number;
  worldY: number;
  width: number;
  height: number;
  isEmpty: boolean;
  isClickable: boolean;
  value?: number;
};

interface HeatmapRendererState {
  backendMultipliers: BackendMultiplierMap;
  emptyBoxes: Record<string, HeatmapEmptyBoxEntry>;
  selectedSquareIds: Set<string>;
  pendingSquareIds: Set<string>;
  visibleSquares: Set<string>;
}

interface HeatmapRendererProps {
  ctx: CanvasRenderingContext2D;
  world: WorldCoordinateSystem;
  getDimensions: () => { width: number; height: number };
  getConfig: () => HeatmapRendererConfig;
  getState: () => HeatmapRendererState;
  debug: (...args: unknown[]) => void;
  getLastDebugLog: () => number;
  setLastDebugLog: (value: number) => void;
  getNow: () => number;
}

export class HeatmapRenderer extends Renderer {
  constructor(private readonly props: HeatmapRendererProps) {
    super(props.ctx, props.getConfig().theme, props.world);
  }

  public render(): void {
    const config = this.props.getConfig();
    if (!config.showProbabilities) {
      return;
    }

    if (config.gameType === GameType.SKETCH || config.gameType === GameType.COBRA) {
      return;
    }

    const state = this.props.getState();
    const { width, height } = this.props.getDimensions();
    const viewport = getViewportBoundsForCulling(this.props.world);

    const allBoxes: Record<string, BackendBox | HeatmapEmptyBoxEntry> = {
      ...state.backendMultipliers,
      ...Object.fromEntries(
        Object.entries(state.emptyBoxes).map(([id, box]) => [
          id,
          {
            ...box,
            value: 0,
            x: 0,
            y: 0,
            totalTrades: 0,
            status: undefined,
            timestampRange: undefined,
            priceRange: undefined,
            userTrade: undefined,
          } as BackendBox,
        ])
      ),
    };

    let renderedCount = 0;
    let skippedVisibility = 0;
    let skippedSelected = 0;
    let skippedEmpty = 0;
    let skippedNoValue = 0;
    let skippedMinMult = 0;
    let skippedOffscreen = 0;
    let skippedViewportCull = 0;

    const now = this.props.getNow();
    if (now - this.props.getLastDebugLog() > 2000) {
      this.props.debug('🔍 GridGame: Heatmap rendering', {
        backendBoxes: Object.keys(state.backendMultipliers).length,
        emptyBoxes: Object.keys(state.emptyBoxes).length,
        totalBoxes: Object.keys(allBoxes).length,
        minMultiplier: config.minMultiplier,
      });
    }

    Object.entries(allBoxes).forEach(([squareId, box]) => {
      if (isBoxOutsideViewport(box, viewport)) {
        skippedViewportCull++;
        return;
      }

      if (state.visibleSquares.size > 0 && !state.visibleSquares.has(squareId)) {
        skippedVisibility++;
        return;
      }

      if (state.selectedSquareIds.has(squareId) || state.pendingSquareIds.has(squareId)) {
        skippedSelected++;
        return;
      }

      if ((box as HeatmapEmptyBoxEntry).isEmpty) {
        skippedEmpty++;
        return;
      }

      if (!box.value || box.value === 0) {
        skippedNoValue++;
        return;
      }

      if (box.value < config.minMultiplier) {
        skippedMinMult++;
        return;
      }

      const { world } = this.props;
      const topLeft = world.worldToScreen(box.worldX, box.worldY + box.height);
      const bottomRight = world.worldToScreen(box.worldX + box.width, box.worldY);

      const screenX = topLeft.x;
      const screenY = topLeft.y;
      const screenWidth = bottomRight.x - topLeft.x;
      const screenHeight = bottomRight.y - topLeft.y;

      if (
        screenX > width ||
        screenX + screenWidth < 0 ||
        screenY > height ||
        screenY + screenHeight < 0
      ) {
        skippedOffscreen++;
        return;
      }

      renderedCount++;

      const probability = Math.max(0, Math.min(1, (15 - box.value) / 14));
      let heatmapColor: string;
      if (probability > 0.7) {
        const normalizedProb = (probability - 0.7) / 0.3;
        const opacity = 0.04 + normalizedProb * 0.08;
        heatmapColor = `rgba(47, 227, 172, ${opacity})`;
      } else if (probability > 0.4) {
        const normalizedProb = (probability - 0.4) / 0.3;
        const opacity = 0.05 + normalizedProb * 0.09;
        heatmapColor = `rgba(250, 204, 21, ${opacity})`;
      } else {
        const normalizedProb = (0.4 - probability) / 0.4;
        const opacity = 0.06 + normalizedProb * 0.12;
        heatmapColor = `rgba(239, 68, 68, ${opacity})`;
      }

      this.props.ctx.fillStyle = heatmapColor;
      this.props.ctx.fillRect(
        screenX + 0.5,
        screenY + 0.5,
        screenWidth - 1,
        screenHeight - 1
      );
    });

    if (now - this.props.getLastDebugLog() > 2000) {
      this.props.debug('🔍 GridGame: Heatmap rendering complete', {
        rendered: renderedCount,
        skipped: {
          viewportCull: skippedViewportCull,
          visibility: skippedVisibility,
          selected: skippedSelected,
          empty: skippedEmpty,
          noValue: skippedNoValue,
          minMult: skippedMinMult,
          offscreen: skippedOffscreen,
          total:
            skippedViewportCull +
            skippedVisibility +
            skippedSelected +
            skippedEmpty +
            skippedNoValue +
            skippedMinMult +
            skippedOffscreen,
        },
      });
      this.props.setLastDebugLog(now);
    }
  }
}

