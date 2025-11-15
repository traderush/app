import { Manager } from '../../../core/Manager';
import type { SquareAnimation } from '../types';

interface SelectionManagerProps {
  squareAnimations: Map<string, SquareAnimation>;
  emitSelectionChanged: () => void;
  emitSquareSelected: (squareId: string) => void;
  playSelectionSound: () => Promise<void>;
  debug: (...args: unknown[]) => void;
  animationDuration: number;
}

export class SelectionManager extends Manager {
  private readonly selectedSquareIds = new Set<string>();
  private readonly pendingSquareIds = new Set<string>();
  private readonly highlightedSquareIds = new Set<string>();
  private readonly hitBoxes = new Set<string>();
  private readonly missedBoxes = new Set<string>();

  constructor(private readonly props: SelectionManagerProps) {
    super();
    this.initialized = true;
  }

  public getSelectedSquareIds(): Set<string> {
    return this.selectedSquareIds;
  }

  public getPendingSquareIds(): Set<string> {
    return this.pendingSquareIds;
  }

  public getHighlightedSquareIds(): Set<string> {
    return this.highlightedSquareIds;
  }

  public getHitBoxes(): Set<string> {
    return this.hitBoxes;
  }

  public getMissedBoxes(): Set<string> {
    return this.missedBoxes;
  }

  public getSquareAnimations(): Map<string, SquareAnimation> {
    return this.props.squareAnimations;
  }

  public handleSquareClick(squareId: string | null): void {
    if (squareId) {
      const alreadyPending = this.pendingSquareIds.has(squareId);
      const alreadySelected = this.selectedSquareIds.has(squareId);

      if (!alreadyPending && !alreadySelected) {
        this.highlightedSquareIds.clear();
        this.selectedSquareIds.add(squareId);
        this.pendingSquareIds.add(squareId);
        this.props.squareAnimations.delete(squareId);

        this.props.debug('🔊 About to play selection sound for box:', squareId);
        void this.props.playSelectionSound();

        this.props.emitSquareSelected(squareId);
      }
    } else {
      this.highlightedSquareIds.clear();
    }
  }

  public clearHighlights(): void {
    this.highlightedSquareIds.clear();
  }

  public getSelectedSquaresArray(): string[] {
    return Array.from(this.selectedSquareIds);
  }

  public removeHit(contractId: string): void {
    this.hitBoxes.delete(contractId);
  }

  public removeMissed(contractId: string): void {
    this.missedBoxes.delete(contractId);
  }

  public clearHitBoxes(): void {
    this.hitBoxes.clear();
  }

  public clearMissedBoxes(): void {
    this.missedBoxes.clear();
  }

  public getHitSquaresArray(): string[] {
    return Array.from(this.hitBoxes);
  }

  public getMissedSquaresArray(): string[] {
    return Array.from(this.missedBoxes);
  }

  /**
   * Update square animations and clean up completed ones
   * This should be called every frame to update animation progress
   */
  public update(deltaTime?: number): void {
    this.updateAnimations();
  }

  /**
   * Update square animations and clean up completed ones
   * This should be called every frame to update animation progress
   */
  public updateAnimations(): void {
    const animations = this.props.squareAnimations;
    const animationDuration = this.props.animationDuration;

    animations.forEach((animation, squareId) => {
      const elapsed = performance.now() - animation.startTime;
      animation.progress = Math.min(elapsed / animationDuration, 1);

      // Remove completed animations to prevent memory leak
      if (animation.progress >= 1) {
        animations.delete(squareId);
      }
    });
  }
}

