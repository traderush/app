import { GameType } from '@/shared/types';
import { Manager } from '../../../core/Manager';
import type { BackendBox } from '../types';

export interface EmptyBoxEntry {
  worldX: number;
  worldY: number;
  width: number;
  height: number;
  isEmpty: boolean;
  isClickable: boolean;
  value?: number;
}

interface EmptyBoxManagerProps {
  getEmptyBoxes: () => Record<string, EmptyBoxEntry>;
  setEmptyBoxes: (emptyBoxes: Record<string, EmptyBoxEntry>) => void;
  getGridOffsets: () => { gridOffsetX: number | null; gridOffsetY: number | null };
  setGridOffsets: (offsets: { gridOffsetX: number; gridOffsetY: number }) => void;
  getBackendBoxes: () => BackendBox[];
  getViewportBounds: () => {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } | null;
  getFrameCount: () => number;
  getTotalDataPoints: () => number;
  getPixelsPerPoint: () => number;
  getCamera: () => { x: number; y: number };
  getConfig: () => { gameType: GameType };
  debug: (...args: unknown[]) => void;
  getLastDebugLog: () => number;
  setLastDebugLog: (value: number) => void;
  getNow: () => number;
}

export class EmptyBoxManager extends Manager {
  constructor(private readonly props: EmptyBoxManagerProps) {
    super();
    this.initialized = true;
  }

  public update(deltaTime?: number): void {
    const config = this.props.getConfig();
    if (config.gameType === GameType.SKETCH || config.gameType === GameType.COBRA) {
      return;
    }

    const frameCount = this.props.getFrameCount();
    if (frameCount % 30 === 0) {
      this.generateEmptyBoxes();
      this.cleanupOldEmptyBoxes();
    }
  }

  private generateBasicEmptyBoxes(viewport: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }): void {
    const emptyBoxes = this.props.getEmptyBoxes();
    const boxWidth = 25;
    const boxHeight = 10;

    const startX = Math.floor(viewport.minX / boxWidth) * boxWidth;
    const startY = Math.floor(viewport.minY / boxHeight) * boxHeight;
    const endX = Math.ceil(viewport.maxX / boxWidth) * boxWidth + boxWidth;
    const endY = Math.ceil(viewport.maxY / boxHeight) * boxHeight + boxHeight;

    for (let worldX = startX; worldX <= endX; worldX += boxWidth) {
      for (let worldY = startY; worldY <= endY; worldY += boxHeight) {
        const emptyBoxId = `empty_${worldX}_${worldY}`;
        if (!emptyBoxes[emptyBoxId]) {
          emptyBoxes[emptyBoxId] = {
            worldX,
            worldY,
            width: boxWidth,
            height: boxHeight,
            isEmpty: true,
            isClickable: false,
            value: 0,
          };
        }
      }
    }
  }

  private generateEmptyBoxes(): void {
    const viewport = this.props.getViewportBounds();
    if (!viewport) {
      return;
    }

    const backendBoxes = this.props.getBackendBoxes();
    const emptyBoxes = this.props.getEmptyBoxes();

    if (backendBoxes.length === 0) {
      this.generateBasicEmptyBoxes(viewport);
      this.props.setEmptyBoxes(emptyBoxes);
      return;
    }

    const { gridOffsetX, gridOffsetY } = this.props.getGridOffsets();
    let offsetX = gridOffsetX;
    let offsetY = gridOffsetY;

    const standardBox = backendBoxes[0];
    if (!standardBox) {
      return;
    }

    const boxWidth = standardBox.width;
    const boxHeight = standardBox.height;

    if (offsetX === null || offsetY === null) {
      if (backendBoxes.length > 0) {
        const referenceBox = backendBoxes[0];
        offsetX = referenceBox.worldX % boxWidth;
        offsetY = referenceBox.worldY % boxHeight;
      } else {
        offsetX = 0;
        offsetY = 0;
      }
      this.props.setGridOffsets({ gridOffsetX: offsetX, gridOffsetY: offsetY });
    }

    const effectiveOffsetX = offsetX ?? 0;
    const effectiveOffsetY = offsetY ?? 0;

    const occupiedPositions = new Set<string>();
    backendBoxes.forEach((box) => {
      const alignedX = box.worldX - effectiveOffsetX;
      const alignedY = box.worldY - effectiveOffsetY;
      const gridX = Math.round(alignedX / boxWidth);
      const gridY = Math.round(alignedY / boxHeight);
      occupiedPositions.add(`${gridX}_${gridY}`);
    });

    const alignedMinX = viewport.minX - effectiveOffsetX;
    const alignedMaxX = viewport.maxX - effectiveOffsetX;
    const alignedMinY = viewport.minY - effectiveOffsetY;
    const alignedMaxY = viewport.maxY - effectiveOffsetY;

    const minGridX = Math.floor(alignedMinX / boxWidth);
    const maxGridX = Math.ceil(alignedMaxX / boxWidth);
    const minGridY = Math.floor(alignedMinY / boxHeight);
    const maxGridY = Math.ceil(alignedMaxY / boxHeight);

    for (let gridX = minGridX; gridX <= maxGridX; gridX++) {
      for (let gridY = minGridY; gridY <= maxGridY; gridY++) {
        const positionKey = `${gridX}_${gridY}`;
        if (occupiedPositions.has(positionKey)) {
          continue;
        }

        const emptyBoxId = `empty_${gridX}_${gridY}`;
        if (!emptyBoxes[emptyBoxId]) {
          const worldX = gridX * boxWidth + effectiveOffsetX;
          const worldY = gridY * boxHeight + effectiveOffsetY;
          emptyBoxes[emptyBoxId] = {
            worldX,
            worldY,
            width: boxWidth,
            height: boxHeight,
            isEmpty: true,
            isClickable: false,
          };
        }
      }
    }

    this.props.setEmptyBoxes(emptyBoxes);
  }

  private cleanupOldEmptyBoxes(): void {
    const emptyBoxes = this.props.getEmptyBoxes();
    const totalDataPoints = this.props.getTotalDataPoints();
    const pixelsPerPoint = this.props.getPixelsPerPoint();
    const currentWorldX = (totalDataPoints - 1) * pixelsPerPoint;
    const viewport = this.props.getViewportBounds();
    if (!viewport) return;

    const viewportWidth = viewport.maxX - viewport.minX;
    const viewportHeight = viewport.maxY - viewport.minY;
    const keepBehindDistance = viewportWidth * 3;
    const minWorldXToKeep = currentWorldX - keepBehindDistance;

    const minY = viewport.minY - viewportHeight * 2;
    const maxY = viewport.maxY + viewportHeight * 2;

    const emptyBoxIds = Object.keys(emptyBoxes);
    let removedCount = 0;

    for (const boxId of emptyBoxIds) {
      const box = emptyBoxes[boxId];
      const isFarBehindNowLine = box.worldX + box.width < minWorldXToKeep;
      const isFarOutsideYViewport = box.worldY + box.height < minY || box.worldY > maxY;

      if (isFarBehindNowLine || isFarOutsideYViewport) {
        delete emptyBoxes[boxId];
        removedCount++;
      }
    }

    this.props.setEmptyBoxes(emptyBoxes);

    const now = this.props.getNow();
    if (removedCount > 0 && now - this.props.getLastDebugLog() > 5000) {
      this.props.debug('🧹 Cleaned up old empty boxes:', {
        removed: removedCount,
        remaining: Object.keys(emptyBoxes).length,
        nowLineX: currentWorldX.toFixed(0),
        minXKept: minWorldXToKeep.toFixed(0),
      });
      this.props.setLastDebugLog(now);
    }
  }
}

