import { GameType } from '@/shared/types';
import type { Theme } from '../../../config/theme';
import { WorldCoordinateSystem } from '../../../core/WorldCoordinateSystem';
import { Renderer } from '../../../core/Renderer';
import { getViewportBoundsForCulling, isBoxOutsideViewport } from '../../../utils/viewportUtils';
import type { BackendBox, SquareAnimation } from '../types';
import type { SquareRenderer } from './SquareRenderer';
import type { SquareRenderOptions } from './SquareRenderer';

interface OtherPlayerSelection {
  id: string;
  name: string;
  avatar: string;
  type: string;
}

interface BoxRendererConfig {
  showProbabilities: boolean;
  minMultiplier: number;
  gameType: GameType;
  theme: Theme;
  showOtherPlayers: boolean;
}

interface BoxRendererDimensions {
  width: number;
  height: number;
}

interface BoxRendererState {
  backendMultipliers: Record<string, BackendBox>;
  visibleSquares: Set<string>;
  boxClickabilityCache: Map<string, boolean>;
  selectedSquareIds: Set<string>;
  pendingSquareIds: Set<string>;
  highlightedSquareIds: Set<string>;
  hitBoxes: Set<string>;
  missedBoxes: Set<string>;
  squareAnimations: Map<string, SquareAnimation>;
  otherPlayerCounts: Record<string, number>;
  otherPlayerSelections: Record<string, OtherPlayerSelection[]>;
  otherPlayerImages: Record<string, HTMLImageElement>;
}

interface BoxRendererProps {
  ctx: CanvasRenderingContext2D;
  world: WorldCoordinateSystem;
  squareRenderer: SquareRenderer;
  getDimensions: () => BoxRendererDimensions;
  getConfig: () => BoxRendererConfig;
  getState: () => BoxRendererState;
  getFrameCount: () => number;
  getMousePosition: () => { mouseX: number; mouseY: number };
  getSmoothLineEndX: () => number;
  getTotalDataPoints: () => number;
  getPixelsPerPoint: () => number;
  getVisiblePriceRange: () => number;
  isBoxClickable: (box: BackendBox) => boolean;
}

export class BoxRenderer extends Renderer {
  constructor(private readonly props: BoxRendererProps) {
    super(props.ctx, props.getConfig().theme, props.world);
  }

  public renderMultiplierOverlay(): void {
    const {
      ctx,
      world,
      squareRenderer,
      getDimensions,
      getConfig,
      getState,
      getFrameCount,
      getMousePosition,
      getSmoothLineEndX,
      getTotalDataPoints,
      getPixelsPerPoint,
      getVisiblePriceRange,
      isBoxClickable,
    } = this.props;

    const { width, height } = getDimensions();
    const config = getConfig();
    const state = getState();
    const frameCount = getFrameCount();
    const { mouseX, mouseY } = getMousePosition();
    const smoothLineEndX = getSmoothLineEndX();
    const totalDataPoints = getTotalDataPoints();
    const pixelsPerPoint = getPixelsPerPoint();
    const visiblePriceRange = getVisiblePriceRange();

    // Skip rendering for sketch and cobra games - boxes are only in memory
    if (config.gameType === GameType.SKETCH || config.gameType === GameType.COBRA) {
      return;
    }

    const viewport = getViewportBoundsForCulling(this.props.world, 100);
    const backendBoxes = state.backendMultipliers;

    Object.entries(backendBoxes).forEach(([squareId, box]) => {
      if (isBoxOutsideViewport(box, viewport)) {
        return;
      }

      if (state.visibleSquares.size > 0 && !state.visibleSquares.has(squareId)) {
        return;
      }

      const worldX = box.worldX;
      const worldY = box.worldY;
      const boxWidth = box.width;
      const boxHeight = box.height;

      const topLeft = world.worldToScreen(worldX, worldY + boxHeight);
      const bottomRight = world.worldToScreen(worldX + boxWidth, worldY);

      const screenWidth = bottomRight.x - topLeft.x;
      const screenHeight = bottomRight.y - topLeft.y;

      if (
        topLeft.x > width ||
        bottomRight.x < 0 ||
        topLeft.y > height ||
        bottomRight.y < 0
      ) {
        return;
      }

      const shouldShow = box.isEmpty || (box.value ?? 0) >= config.minMultiplier;
      const text = box.isEmpty ? '' : shouldShow ? `${box.value.toFixed(1)}X` : '--';

      let isClickable = state.boxClickabilityCache.get(squareId);
      if (isClickable === undefined) {
        isClickable = isBoxClickable(box);
        state.boxClickabilityCache.set(squareId, isClickable);
      }

      if (frameCount % 10 === 0) {
        const newClickability = isBoxClickable(box);
        if (newClickability !== isClickable) {
          state.boxClickabilityCache.set(squareId, newClickability);
          isClickable = newClickability;
        }
      }

      const isHovered =
        isClickable &&
        mouseX >= 0 &&
        mouseY >= 0 &&
        mouseX >= topLeft.x &&
        mouseX < bottomRight.x &&
        mouseY >= topLeft.y &&
        mouseY < bottomRight.y;

      const isPending = state.pendingSquareIds.has(squareId);
      const isSelected = state.selectedSquareIds.has(squareId);
      const isHighlighted = state.highlightedSquareIds.has(squareId);

      const hasBeenHit = box.status === 'hit' || state.hitBoxes.has(squareId);
      const hasBeenMissed = state.missedBoxes.has(squareId);

      let stateName:
        | 'default'
        | 'hovered'
        | 'highlighted'
        | 'pending'
        | 'selected'
        | 'activated'
        | 'missed' = 'default';
      let animation: SquareRenderOptions['animation'] = undefined;

      if (hasBeenHit) {
        stateName = 'activated';
        const animationData = state.squareAnimations.get(squareId);
        if (animationData && animationData.progress < 1) {
          animation = {
            progress: animationData.progress,
            type: 'activate',
          };
        }
      } else if (hasBeenMissed) {
        stateName = 'missed';
        const animationData = state.squareAnimations.get(squareId);
        if (animationData && animationData.progress < 1) {
          animation = {
            progress: animationData.progress,
            type: 'activate',
          };
        }
      } else if (isPending) {
        stateName = 'pending';
      } else if (isSelected) {
        stateName = 'selected';
        const animationData = state.squareAnimations.get(squareId);
        if (animationData && animationData.progress < 1) {
          animation = {
            progress: animationData.progress,
            type: 'select',
          };
        }
      } else if (isHighlighted) {
        stateName = 'highlighted';
      } else if (isHovered) {
        stateName = 'hovered';
      }

      const boxRightEdgeWorld = box.worldX + box.width;
      const boxRightEdgeScreenX = world.worldToScreen(boxRightEdgeWorld, 0).x;
      const currentWorldX = (totalDataPoints - 1) * pixelsPerPoint;
      const bufferColumns =
        config.gameType === GameType.SKETCH || config.gameType === GameType.COBRA ? 1 : 2;
      const bufferPixels = box.width * bufferColumns;
      const clickableThreshold = currentWorldX + bufferPixels;
      const thresholdScreenX = world.worldToScreen(clickableThreshold, 0).x;
      const hasNowLine = Number.isFinite(smoothLineEndX) && smoothLineEndX > 0;
      const zoomLevel = world.getHorizontalScale();
      // Longer fade distance and slightly earlier start for smoother transition
      const baseFadeDistance = 280 * zoomLevel;
      const fadeStartOffset = zoomLevel * 40;
      const shouldDelayFade = isSelected || stateName === 'activated' || stateName === 'missed';

      let opacity = 1.0;
      let fadeProgress = 0;

      if (
        !shouldDelayFade &&
        !isClickable &&
        Number.isFinite(thresholdScreenX) &&
        Number.isFinite(boxRightEdgeScreenX)
      ) {
        const distancePastThreshold = thresholdScreenX - boxRightEdgeScreenX - fadeStartOffset;
        if (distancePastThreshold > 0) {
          fadeProgress = Math.min(distancePastThreshold / baseFadeDistance, 1);
        }
      }

      if (hasNowLine && Number.isFinite(boxRightEdgeScreenX)) {
        const delayPx = shouldDelayFade ? Math.max(30, Math.abs(screenWidth) * 0.2) : 0;
        const distancePastNow = smoothLineEndX - boxRightEdgeScreenX - delayPx - fadeStartOffset;
        if (distancePastNow > 0 && Number.isFinite(distancePastNow)) {
          const progress = Math.min(distancePastNow / baseFadeDistance, 1);
          fadeProgress = Math.max(fadeProgress, progress);
        }
      } else if (
        shouldDelayFade &&
        !isClickable &&
        Number.isFinite(thresholdScreenX) &&
        Number.isFinite(boxRightEdgeScreenX)
      ) {
        const fallbackDistance = thresholdScreenX - boxRightEdgeScreenX - fadeStartOffset;
        if (fallbackDistance > 0) {
          const progress = Math.min(fallbackDistance / baseFadeDistance, 1);
          fadeProgress = Math.max(fadeProgress, progress);
        }
      }

      if (fadeProgress > 0) {
        // Use a slightly softer easing so opacity falls off more gradually
        const eased = 1 - Math.pow(1 - fadeProgress, 3);
        opacity = Math.max(0, 1 - eased);
      }
      
      squareRenderer.render({
        x: topLeft.x,
        y: topLeft.y,
        width: Math.abs(screenWidth),
        height: Math.abs(screenHeight),
        text: isHighlighted ? '?' : text,
        state: stateName,
        animation,
        opacity,
        showProbabilities: config.showProbabilities,
        showUnifiedGrid: true,
        timestampRange: undefined,
        priceRange: undefined,
        contractId: undefined,
      });

      if (config.showOtherPlayers) {
        this.renderOtherPlayers(
          squareId,
          topLeft,
          screenWidth,
          screenHeight,
          opacity,
          isSelected,
          config.theme,
          state
        );
      }
    });
  }

  private renderOtherPlayers(
    squareId: string,
    topLeft: { x: number; y: number },
    screenWidth: number,
    screenHeight: number,
    opacity: number,
    isSelected: boolean,
    theme: Theme,
    state: BoxRendererState
  ): void {
    const { ctx } = this.props;
    const playerCount = state.otherPlayerCounts[squareId];
    const trackedPlayers = state.otherPlayerSelections[squareId];

    if (!playerCount || !trackedPlayers) return;

    const rectSize = 18;
    const overlapAmount = 2;
    const rectY = topLeft.y + 4;

    const hasPlayerCount = playerCount > 0 ? 1 : 0;
    const totalElements = trackedPlayers.length + hasPlayerCount;

    if (totalElements > 0) {
      const stackWidth = totalElements * rectSize - (totalElements - 1) * overlapAmount;
      const startX = topLeft.x + screenWidth - stackWidth - 4;

      const otherPlayerOpacity = opacity;

      if (playerCount > 0) {
        const playerCountValue = Math.max(playerCount, trackedPlayers.length);
        const numberBoxX = startX + trackedPlayers.length * (rectSize - overlapAmount);

        ctx.fillStyle = `rgba(14,14,14,${otherPlayerOpacity})`;
        ctx.beginPath();
        ctx.roundRect(numberBoxX, rectY, rectSize, rectSize, 4);
        ctx.fill();

        let borderColor = '#2b2b2b';
        let borderWidth = 0.6;
        if (isSelected) {
          borderColor = theme.colors?.primary || '#3b82f6';
          borderWidth = 1;
        }
        const [r, g, b] = borderColor.replace('#', '').match(/.{2}/g)?.map((hex) => parseInt(hex, 16)) ?? [43, 43, 43];
        ctx.strokeStyle = `rgba(${r},${g},${b},${otherPlayerOpacity})`;
        ctx.lineWidth = borderWidth;
        ctx.stroke();

        const baseTextOpacity = isSelected ? opacity : 0.12 * otherPlayerOpacity;
        ctx.fillStyle = `rgba(255,255,255,${baseTextOpacity})`;
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(playerCountValue.toString(), numberBoxX + rectSize / 2, rectY + rectSize / 2);
      }

      for (let i = trackedPlayers.length - 1; i >= 0; i--) {
        const player = trackedPlayers[i];
        const boxX = startX + i * (rectSize - overlapAmount);

        ctx.fillStyle = `rgba(14,14,14,${otherPlayerOpacity})`;
        ctx.beginPath();
        ctx.roundRect(boxX, rectY, rectSize, rectSize, 4);
        ctx.fill();

        let borderColor = '#2b2b2b';
        let borderWidth = 0.6;
        if (isSelected) {
          borderColor = theme.colors?.primary || '#3b82f6';
          borderWidth = 1;
        }
        const [r, g, b] = borderColor.replace('#', '').match(/.{2}/g)?.map((hex) => parseInt(hex, 16)) ?? [43, 43, 43];
        ctx.strokeStyle = `rgba(${r},${g},${b},${otherPlayerOpacity})`;
        ctx.lineWidth = borderWidth;
        ctx.stroke();

        const img = state.otherPlayerImages[player.id];
        if (img) {
          ctx.save();
          ctx.globalAlpha = otherPlayerOpacity;
          ctx.beginPath();
          ctx.roundRect(boxX + 1, rectY + 1, rectSize - 2, rectSize - 2, 3);
          ctx.clip();
          ctx.drawImage(img, boxX + 1, rectY + 1, rectSize - 2, rectSize - 2);
          ctx.restore();
        } else {
          const baseTextOpacity = isSelected ? opacity : 0.12 * otherPlayerOpacity;
          ctx.fillStyle = `rgba(255,255,255,${baseTextOpacity})`;
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(player.name.charAt(0).toUpperCase(), boxX + rectSize / 2, rectY + rectSize / 2);
        }
      }
    }
  }
}

