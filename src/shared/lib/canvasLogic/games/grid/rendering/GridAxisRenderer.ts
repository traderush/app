import type { Camera } from '../../../core/WorldCoordinateSystem';
import { WorldCoordinateSystem } from '../../../core/WorldCoordinateSystem';
import { Renderer } from '../../../core/Renderer';
import { calculatePriceStep } from '../utils/gridGameUtils';

interface GridAxisRendererOptions {
  width: number;
  height: number;
  showProbabilities: boolean;
  verticalMarginRatio: number;
  camera: Camera;
  isSketchOrCobra: boolean;
  pixelsPerPoint: number;
  visiblePriceRange: number;
  dpr: number;
  gridColumnWidth: number;
  gridRowHeight: number;
  gridColumnOrigin: number;
  gridRowOrigin: number;
}

export class GridAxisRenderer extends Renderer {
  constructor(
    ctx: CanvasRenderingContext2D,
    world: WorldCoordinateSystem,
    private getOptions: () => GridAxisRendererOptions,
    private getWorldXForTimestamp: (timestamp: number) => number | null,
    private getTimestampForWorldX: (worldX: number) => number | null,
    private formatTimestampLabel: (timestamp: number, includeMillis?: boolean) => string
  ) {
    super(ctx, undefined, world);
  }

  public renderXAxis(): void {
    const world = this.world;
    if (!world) return;
    const options = this.getOptions();
    const { width, height, showProbabilities } = options;
    const ctx = this.ctx;

    ctx.save();

    // Draw black background at bottom to cover boxes behind axis
    const axisY = height - 30;
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, axisY - 5, width, height - (axisY - 5));

    // Set up styling - make more visible when heatmap is enabled
    const axisOpacity = showProbabilities ? 0.6 : 0.3;
    const textOpacity = showProbabilities ? 0.9 : 0.6;
    ctx.strokeStyle = `rgba(255, 255, 255, ${axisOpacity})`;
    ctx.fillStyle = `rgba(255, 255, 255, ${textOpacity})`;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Draw horizontal line at bottom
    ctx.beginPath();
    ctx.moveTo(0, axisY);
    ctx.lineTo(width, axisY);
    ctx.stroke();

    const worldBounds = world.getVisibleWorldBounds(0);
    const startTimestamp = this.getTimestampForWorldX(worldBounds.left);
    const endTimestamp = this.getTimestampForWorldX(worldBounds.right);

    if (
      startTimestamp !== null &&
      endTimestamp !== null &&
      endTimestamp !== startTimestamp
    ) {
      const timeRangeMs = Math.max(1, endTimestamp - startTimestamp);
      const minPixelsPerTick = 100;
      const maxTicks = Math.max(1, Math.floor(width / minPixelsPerTick));
      const rawIntervalMs = timeRangeMs / maxTicks;

      const intervalsMs = [
        250, 500, 1000, 2000, 5000, 10_000, 15_000, 30_000,
        60_000, 120_000, 300_000, 600_000, 1_800_000, 3_600_000,
      ];
      let tickIntervalMs = intervalsMs[intervalsMs.length - 1];
      for (const candidate of intervalsMs) {
        if (rawIntervalMs <= candidate) {
          tickIntervalMs = candidate;
          break;
        }
      }

      const includeMillis = tickIntervalMs < 1000;
      const firstTickTs = Math.floor(startTimestamp / tickIntervalMs) * tickIntervalMs;

      // Draw major ticks with formatted labels
      ctx.strokeStyle = `rgba(255, 255, 255, ${axisOpacity})`;
      for (
        let ts = firstTickTs;
        ts <= endTimestamp + tickIntervalMs;
        ts += tickIntervalMs
      ) {
        const worldX = this.getWorldXForTimestamp(ts);
        if (worldX === null) continue;
        const screenX = world.worldToScreen(worldX, 0).x;
        if (screenX < -40 || screenX > width + 40) continue;

        ctx.beginPath();
        ctx.moveTo(screenX, axisY - 5);
        ctx.lineTo(screenX, axisY + 5);
        ctx.stroke();

        ctx.fillText(
          this.formatTimestampLabel(ts, includeMillis),
          screenX,
          axisY + 8,
        );
      }

      // Draw minor ticks (without labels)
      const minorDivisions = tickIntervalMs >= 60_000 ? 4 : 5;
      const minorIntervalMs = tickIntervalMs / minorDivisions;
      ctx.strokeStyle = `rgba(255, 255, 255, ${axisOpacity * 0.6})`;
      for (let ts = firstTickTs; ts <= endTimestamp + tickIntervalMs; ts += minorIntervalMs) {
        const offset = (ts - firstTickTs) % tickIntervalMs;
        if (Math.abs(offset) < 1) {
          continue;
        }
        const worldX = this.getWorldXForTimestamp(ts);
        if (worldX === null) continue;
        const screenX = world.worldToScreen(worldX, 0).x;
        if (screenX < -40 || screenX > width + 40) continue;

        ctx.beginPath();
        ctx.moveTo(screenX, axisY - 2);
        ctx.lineTo(screenX, axisY + 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  public renderYAxis(): void {
    const world = this.world;
    if (!world) return;
    const options = this.getOptions();
    const {
      width,
      height,
      showProbabilities,
      camera,
      visiblePriceRange,
      isSketchOrCobra,
    } = options;
    const ctx = this.ctx;
    const minVisiblePrice = camera.y - visiblePriceRange / 2;
    const maxVisiblePrice = camera.y + visiblePriceRange / 2;

    const axisWidth = 46;
    const axisX = width - axisWidth;

    ctx.save();

    // Draw background strip similar to X-axis styling
    ctx.fillStyle = '#09090b';
    ctx.fillRect(axisX, 0, axisWidth, height);

    const axisOpacity = showProbabilities ? 0.6 : 0.3;
    const textOpacity = showProbabilities ? 0.9 : 0.65;

    ctx.strokeStyle = `rgba(255, 255, 255, ${axisOpacity})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(axisX, 0);
    ctx.lineTo(axisX, height);
    ctx.stroke();

    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(255, 255, 255, ${textOpacity})`;

    const step = calculatePriceStep(visiblePriceRange, isSketchOrCobra);
    const startPrice = Math.floor(minVisiblePrice / step) * step;
    const endPrice = Math.ceil(maxVisiblePrice / step) * step;

    for (let price = startPrice; price <= endPrice; price += step) {
      const screenPos = world.worldToScreen(0, price);
      const y = screenPos.y;
      if (y < 10 || y > height - 10) continue;

      // Tick mark
      ctx.strokeStyle = `rgba(255, 255, 255, ${axisOpacity})`;
      ctx.beginPath();
      ctx.moveTo(axisX, y);
      ctx.lineTo(axisX + 6, y);
      ctx.stroke();

      ctx.fillText(`$${price.toFixed(step < 1 ? 2 : 0)}`, axisX + 10, y);
    }

    // Minor ticks between major intervals (match X-axis styling)
    const minorDivisions = step >= 1 ? 5 : 4;
    const minorStep = step / minorDivisions;
    const minorOpacity = axisOpacity * 0.6;
    ctx.strokeStyle = `rgba(255, 255, 255, ${minorOpacity})`;

    for (let price = startPrice; price < endPrice; price += step) {
      for (let i = 1; i < minorDivisions; i++) {
        const minorPrice = price + i * minorStep;
        if (minorPrice <= minVisiblePrice || minorPrice >= maxVisiblePrice) {
          continue;
        }
        const screenPos = world.worldToScreen(0, minorPrice);
        const y = screenPos.y;
        if (y < 10 || y > height - 10) continue;

        ctx.beginPath();
        ctx.moveTo(axisX, y);
        ctx.lineTo(axisX + 4, y);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  public renderDashedGrid(): void {
    const world = this.world;
    if (!world) return;
    const options = this.getOptions();
    const {
      width,
      height,
      showProbabilities,
      camera,
      verticalMarginRatio,
      visiblePriceRange,
    } = options;
    const ctx = this.ctx;
    const gridSize = 50;
    ctx.save();

    const gridOpacity = showProbabilities ? 0.4 : 0.18;
    ctx.strokeStyle = `rgba(180, 180, 180, ${gridOpacity})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // Vertical lines follow camera.x
    const startWorldX = Math.floor((camera.x - gridSize * 2) / gridSize) * gridSize;
    const endWorldX = camera.x + width + gridSize * 2;

    for (let worldX = startWorldX; worldX <= endWorldX; worldX += gridSize) {
      const screenX = world.worldToScreen(worldX, camera.y).x;
      if (screenX < -gridSize || screenX > width + gridSize) continue;
      ctx.beginPath();
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, height);
      ctx.stroke();
    }

    // Horizontal lines track price scale
    const verticalMargin = height * verticalMarginRatio;
    const viewportHeight = height - 2 * verticalMargin;
    const pricePerPixel = visiblePriceRange > 0 ? visiblePriceRange / viewportHeight : 1;
    const gridStepPrice = gridSize * pricePerPixel;
    if (!Number.isFinite(gridStepPrice) || gridStepPrice <= 0) {
      ctx.restore();
      return;
    }
    const minPrice = camera.y - visiblePriceRange / 2 - gridStepPrice * 2;
    const maxPrice = camera.y + visiblePriceRange / 2 + gridStepPrice * 2;

    for (
      let price = Math.floor(minPrice / gridStepPrice) * gridStepPrice;
      price <= maxPrice;
      price += gridStepPrice
    ) {
      const screenY = world.worldToScreen(0, price).y;
      if (screenY < -gridSize || screenY > height + gridSize) continue;
      ctx.beginPath();
      ctx.moveTo(0, screenY);
      ctx.lineTo(width, screenY);
      ctx.stroke();
    }

    ctx.restore();
  }

  public renderUnifiedBorderGrid(): void {
    return;
    const world = this.world;
    if (!world) return;
    const options = this.getOptions();
    const {
      width,
      height,
      dpr,
      pixelsPerPoint,
      gridColumnWidth,
      gridRowHeight,
      gridColumnOrigin,
      gridRowOrigin,
      camera,
    } = options;
    const ctx = this.ctx;

    ctx.save();
    const borderOpacity = 1;
    ctx.strokeStyle = `rgba(43, 43, 43, ${borderOpacity})`;
    const borderLineWidth = Math.max(1, Math.min(1.4, dpr * 0.6));
    const pixelAlignOffset = borderLineWidth % 2 === 0 ? 0 : 0.5;
    ctx.lineWidth = borderLineWidth;
    ctx.setLineDash([]);

    const columnWidth = Math.max(pixelsPerPoint, gridColumnWidth);
    const rowHeight = Math.max(0.05, gridRowHeight);

    const startWorldX =
      Math.floor((camera.x - columnWidth * 3 - gridColumnOrigin) / columnWidth) * columnWidth +
      gridColumnOrigin;
    const endWorldX = camera.x + width + columnWidth * 3;

    for (let worldX = startWorldX; worldX <= endWorldX; worldX += columnWidth) {
      const screenX = world.worldToScreen(worldX, 0).x;
      if (screenX < -columnWidth || screenX > width + columnWidth) continue;
      const alignedX = Math.round(screenX) + pixelAlignOffset;
      ctx.beginPath();
      ctx.moveTo(alignedX, 0);
      ctx.lineTo(alignedX, height);
      ctx.stroke();
    }

    const gridStepPrice = rowHeight;
    if (!Number.isFinite(gridStepPrice) || gridStepPrice <= 0) {
      ctx.restore();
      return;
    }
    const minPrice = camera.y - options.visiblePriceRange / 2 - gridStepPrice * 2;
    const maxPrice = camera.y + options.visiblePriceRange / 2 + gridStepPrice * 2;

    for (
      let price = Math.floor((minPrice - gridRowOrigin) / gridStepPrice) * gridStepPrice + gridRowOrigin;
      price <= maxPrice;
      price += gridStepPrice
    ) {
      const screenY = world.worldToScreen(0, price).y;
      if (screenY < -columnWidth || screenY > height + columnWidth) continue;
      const alignedY = Math.round(screenY) + pixelAlignOffset;
      ctx.beginPath();
      ctx.moveTo(0, alignedY);
      ctx.lineTo(width, alignedY);
      ctx.stroke();
    }

    ctx.restore();
  }
}

