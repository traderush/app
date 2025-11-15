import { GameType } from '@/shared/types';
import { Manager } from '../../../core/Manager';
import type { BackendBox, BackendMultiplierMap, SquareAnimation } from '../types';
import type { Camera } from '../../../core/WorldCoordinateSystem';

interface BoxControllerProps {
  getWidth: () => number;
  getPixelsPerPoint: () => number;
  getGameType: () => GameType;
  getTotalDataPoints: () => number;
  getCamera: () => Camera;
  getVisibleSquares: () => Set<string>;
  getNow: () => number;
  getPerformanceNow: () => number;
  debug: (...args: unknown[]) => void;
  getBackendMultipliers: () => BackendMultiplierMap;
  setBackendMultipliers: (map: BackendMultiplierMap) => void;
  boxClickabilityCache: Map<string, boolean>;
  pendingSquareIds: Set<string>;
  selectedSquareIds: Set<string>;
  highlightedSquareIds: Set<string>;
  hitBoxes: Set<string>;
  missedBoxes: Set<string>;
  processedBoxes: Set<string>;
  squareAnimations: Map<string, SquareAnimation>;
  emitSelectionChanged: () => void;
  getLastDebugLog: () => number;
  setLastDebugLog: (value: number) => void;
}

export class BoxController extends Manager {
  constructor(private readonly props: BoxControllerProps) {
    super();
    this.initialized = true;
  }

  public updateMultipliers(multipliers: BackendMultiplierMap): void {
    const now = this.props.getNow();
    const lastDebugLog = this.props.getLastDebugLog();
    if (now - lastDebugLog > 2000) {
      this.props.debug('🔍 GridGame: updateMultipliers called', {
        newMultiplierCount: Object.keys(multipliers).length,
        existingBoxCount: Object.keys(this.props.getBackendMultipliers()).length,
      });
      this.props.setLastDebugLog(now);
    }

    const backendMultipliers = this.props.getBackendMultipliers();
    const boxClickabilityCache = this.props.boxClickabilityCache;
    const pendingSquareIds = this.props.pendingSquareIds;

    const newBoxIds = new Set(Object.keys(multipliers));
    const oldBoxIds = new Set(Object.keys(backendMultipliers));

    for (const oldId of oldBoxIds) {
      if (!newBoxIds.has(oldId)) {
        delete backendMultipliers[oldId];
        boxClickabilityCache.delete(oldId);
        pendingSquareIds.delete(oldId);
      }
    }

    for (const [contractId, newContract] of Object.entries(multipliers)) {
      const existingContract = backendMultipliers[contractId];
      if (
        !existingContract ||
        existingContract.totalTrades !== newContract.totalTrades ||
        existingContract.userTrade !== newContract.userTrade ||
        existingContract.value !== newContract.value ||
        existingContract.worldX !== newContract.worldX ||
        existingContract.worldY !== newContract.worldY
      ) {
        backendMultipliers[contractId] = newContract;
      }
    }

    const boxCount = Object.keys(backendMultipliers).length;
    if (boxCount > 800) {
      const totalDataPoints = this.props.getTotalDataPoints();
      const pixelsPerPoint = this.props.getPixelsPerPoint();
      const currentWorldX = (totalDataPoints - 1) * pixelsPerPoint;
      const camera = this.props.getCamera();
      const width = this.props.getWidth();
      const cameraX = camera.x || 1;
      const viewportWidth = width / cameraX;
      const keepBehindDistance = viewportWidth * 2;
      const minWorldXToKeep = currentWorldX - keepBehindDistance;

      const boxesToKeep: Array<[string, BackendBox]> = [];
      const boxesToRemove: string[] = [];

      Object.entries(backendMultipliers).forEach(([id, box]) => {
        if (box.worldX >= minWorldXToKeep) {
          boxesToKeep.push([id, box]);
        } else {
          boxesToRemove.push(id);
        }
      });

      const updatedMap = Object.fromEntries(boxesToKeep);
      this.props.setBackendMultipliers(updatedMap);

      const remainingIds = new Set(Object.keys(updatedMap));

      const hitBoxesToRemove: string[] = [];
      const missedBoxesToRemove: string[] = [];

      this.props.hitBoxes.forEach((id) => {
        if (!remainingIds.has(id)) {
          hitBoxesToRemove.push(id);
        }
      });

      this.props.missedBoxes.forEach((id) => {
        if (!remainingIds.has(id)) {
          missedBoxesToRemove.push(id);
        }
      });

      hitBoxesToRemove.forEach((id) => this.props.hitBoxes.delete(id));
      missedBoxesToRemove.forEach((id) => this.props.missedBoxes.delete(id));

      this.props.processedBoxes.clear();

      const animationKeysToRemove: string[] = [];
      this.props.squareAnimations.forEach((_, key) => {
        if (!remainingIds.has(key)) {
          animationKeysToRemove.push(key);
        }
      });
      animationKeysToRemove.forEach((key) => this.props.squareAnimations.delete(key));

      if (now - this.props.getLastDebugLog() > 5000) {
        this.props.debug('🧹 Backend cleanup:', {
          totalBefore: boxCount,
          keptBoxes: boxesToKeep.length,
          removedBoxes: boxesToRemove.length,
          removedFromHit: hitBoxesToRemove.length,
          removedFromMissed: missedBoxesToRemove.length,
          removedAnimations: animationKeysToRemove.length,
        });
        this.props.setLastDebugLog(now);
      }
    } else {
      this.props.setBackendMultipliers(backendMultipliers);
    }
  }

  public markContractAsHit(contractId: string): void {
    this.props.hitBoxes.add(contractId);
    this.props.pendingSquareIds.delete(contractId);

    const backendMultipliers = this.props.getBackendMultipliers();
    if (backendMultipliers[contractId]) {
      backendMultipliers[contractId].status = 'hit';
      this.props.squareAnimations.set(contractId, {
        progress: 0,
        type: 'activate',
        startTime: this.props.getPerformanceNow(),
      });
    }

    this.props.highlightedSquareIds.delete(contractId);
    this.props.emitSelectionChanged();
  }

  public markContractAsMissed(contractId: string): void {
    this.props.missedBoxes.add(contractId);
    this.props.pendingSquareIds.delete(contractId);

    const backendMultipliers = this.props.getBackendMultipliers();
    if (backendMultipliers[contractId]) {
      backendMultipliers[contractId].status = 'missed';
      this.props.squareAnimations.set(contractId, {
        progress: 0,
        type: 'activate',
        startTime: this.props.getPerformanceNow(),
      });
    }

    this.props.highlightedSquareIds.delete(contractId);
    this.props.emitSelectionChanged();
  }

  public confirmSelectedContract(contractId: string): void {
    const wasPending = this.props.pendingSquareIds.delete(contractId);
    if (!wasPending) {
      return;
    }

    if (!this.props.selectedSquareIds.has(contractId)) {
      this.props.selectedSquareIds.add(contractId);
    }

    this.props.squareAnimations.set(contractId, {
      startTime: this.props.getPerformanceNow(),
      progress: 0,
      type: 'select',
    });

    this.props.emitSelectionChanged();
  }

  public cancelPendingContract(contractId: string, options?: { keepHighlight?: boolean }): void {
    const keepHighlight = options?.keepHighlight ?? false;
    const wasPending = this.props.pendingSquareIds.delete(contractId);
    const wasSelected = this.props.selectedSquareIds.delete(contractId);
    const wasHighlighted = this.props.highlightedSquareIds.has(contractId);

    if (keepHighlight) {
      this.props.highlightedSquareIds.add(contractId);
    } else {
      this.props.highlightedSquareIds.delete(contractId);
    }

    if (wasPending || wasSelected || keepHighlight || wasHighlighted) {
      this.props.squareAnimations.delete(contractId);
      this.props.emitSelectionChanged();
    }
  }

  public cancelAllPendingContracts(options?: { keepHighlight?: boolean }): void {
    const ids = Array.from(this.props.pendingSquareIds);
    ids.forEach((id) => this.cancelPendingContract(id, options));
  }

  public forEachSelectableBox(
    callback: (squareId: string, box: BackendBox) => void
  ): void {
    const backendMultipliers = this.props.getBackendMultipliers();
    const visibleSquares = this.props.getVisibleSquares();

    Object.entries(backendMultipliers).forEach(([squareId, box]) => {
      if (visibleSquares.size > 0 && !visibleSquares.has(squareId)) {
        return;
      }
      if (box.isEmpty || box.isClickable === false) {
        return;
      }
      if (!this.isBoxClickable(box)) {
        return;
      }
      callback(squareId, box);
    });
  }

  public isBoxClickable(box: BackendBox): boolean {
    const pixelsPerPoint = this.props.getPixelsPerPoint();
    const currentWorldX = (this.props.getTotalDataPoints() - 1) * pixelsPerPoint;
    const boxRightEdge = box.worldX + box.width;

    const gameType = this.props.getGameType();
    const bufferColumns =
      gameType === GameType.SKETCH || gameType === GameType.COBRA ? 1 : 2;
    const bufferPixels = box.width * bufferColumns;

    return boxRightEdge >= currentWorldX + bufferPixels;
  }
}

