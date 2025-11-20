import { GameType } from '@/shared/types';
import type { Theme } from '../../../config/theme';
import type { WorldCoordinateSystem } from '../../../core/WorldCoordinateSystem';
import { Renderer } from '../../../core/Renderer';
import type { PriceData } from '../types';
import { LineRenderer, Point } from './LineRenderer';

interface PriceLineRendererConfig {
  width: number;
  height: number;
  gameType: GameType;
  lineEndSmoothing: number;
  theme: Theme;
}

interface SmoothLineEnd {
  x: number;
  y: number;
}

interface PriceLineRendererProps {
  ctx: CanvasRenderingContext2D;
  world: WorldCoordinateSystem;
  lineRenderer: LineRenderer;
  getConfig: () => PriceLineRendererConfig;
  getSmoothLineEnd: () => SmoothLineEnd;
  setSmoothLineEnd: (value: SmoothLineEnd) => void;
}

export interface PriceLineRenderParams {
  priceData: PriceData[];
  dataOffset: number;
}

export interface PriceLineRenderResult {
  dotX: number | null;
  dotY: number | null;
}

export class PriceLineRenderer extends Renderer {
  constructor(private readonly props: PriceLineRendererProps) {
    super(props.ctx, props.getConfig().theme, props.world);
  }

  public render(params: PriceLineRenderParams): PriceLineRenderResult {
    const { priceData, dataOffset } = params;
    const { ctx, world, lineRenderer } = this.props;
    const config = this.props.getConfig();
    const { width, height, gameType, lineEndSmoothing, theme } = config;

    const points: Point[] = [];
    let { x: smoothLineEndX, y: smoothLineEndY } = this.props.getSmoothLineEnd();

    for (let i = 0; i < priceData.length; i++) {
      const worldPos = world.getLinePosition(i, dataOffset, Math.max(0, priceData[i].price));
      const screenPos = world.worldToScreen(worldPos.x, worldPos.y);

      if (screenPos.x >= -100) {
        points.push(screenPos);
      }
    }

    if (priceData.length > 0) {
      const latestIndex = priceData.length - 1;
      const latestWorldPos = world.getLinePosition(
        latestIndex,
        dataOffset,
        Math.max(0, priceData[latestIndex].price)
      );
      const latestScreenPos = world.worldToScreen(latestWorldPos.x, latestWorldPos.y);
      const rawEndX = latestScreenPos.x;
      const rawEndY = latestScreenPos.y;
      const smoothingFactor = Number.isFinite(lineEndSmoothing) ? lineEndSmoothing : 0.88;

      if (smoothLineEndX === 0 && smoothLineEndY === 0) {
        smoothLineEndX = rawEndX;
        smoothLineEndY = rawEndY;
      } else {
        smoothLineEndX =
          smoothLineEndX * smoothingFactor + rawEndX * (1 - smoothingFactor);
        smoothLineEndY =
          smoothLineEndY * smoothingFactor + rawEndY * (1 - smoothingFactor);
      }
    }

    this.props.setSmoothLineEnd({
      x: smoothLineEndX,
      y: smoothLineEndY,
    });

    if (points.length > 0 && smoothLineEndX !== 0) {
      const endY =
        gameType === GameType.SKETCH ? height / 2 : smoothLineEndY;
      points[points.length - 1] = {
        x: smoothLineEndX,
        y: endY,
      };
      lineRenderer.render({ points, smooth: true });
    } else if (points.length > 0) {
      lineRenderer.render({ points, smooth: true });
    }

    let dotX: number | null = null;
    let dotY: number | null = null;

    if (priceData.length > 0) {
      const smoothInitialized = !(smoothLineEndX === 0 && smoothLineEndY === 0);
      if (smoothInitialized) {
        dotX = smoothLineEndX;
        dotY = gameType === GameType.SKETCH ? height / 2 : smoothLineEndY;
      } else {
        const latestIndex = priceData.length - 1;
        const latestWorldPos = world.getLinePosition(
          latestIndex,
          dataOffset,
          Math.max(0, priceData[latestIndex].price)
        );
        const latestScreenPos = world.worldToScreen(latestWorldPos.x, latestWorldPos.y);
        dotX = latestScreenPos.x;
        dotY = gameType === GameType.SKETCH ? height / 2 : latestScreenPos.y;
      }

      if (dotX !== null && dotY !== null && dotX >= 0 && dotX <= width) {
        ctx.save();
        const primaryColor = theme.colors?.primary || '#3b82f6';
        const r = parseInt(primaryColor.slice(1, 3), 16);
        const g = parseInt(primaryColor.slice(3, 5), 16);
        const b = parseInt(primaryColor.slice(5, 7), 16);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(dotX, 0);
        ctx.lineTo(dotX, height);
        ctx.stroke();
        ctx.restore();
      }

      if (
        dotX !== null &&
        dotY !== null &&
        dotX >= 0 &&
        dotX <= width &&
        dotY >= 0 &&
        dotY <= height
      ) {
        const primaryColor = theme.colors?.primary || '#3b82f6';
        lineRenderer.renderDot(dotX, dotY, 5, primaryColor);

        const latestPrice = priceData[priceData.length - 1].price;
        ctx.save();
        const tickerX = dotX - 45;
        const tickerY = dotY;
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.roundRect(tickerX - 35, tickerY - 10, 70, 20, 4);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`$${latestPrice.toFixed(2)}`, tickerX, tickerY + 4);
        ctx.restore();
      }
    }

    return { dotX, dotY };
  }
}

