import { Manager } from '../../../core/Manager';

/**
 * Manages grid scale and origin state
 * Used for aligning grid columns and rows
 */
export class GridStateManager extends Manager {
  private gridColumnWidth: number = 50;
  private gridRowHeight: number = 1;
  private gridColumnOrigin: number = 0;
  private gridRowOrigin: number = 0;

  constructor() {
    super();
    this.initialized = true;
  }

  /**
   * Set grid column width and row height
   */
  public setGridScale(columnWidth: number, rowHeight: number): void {
    if (Number.isFinite(columnWidth) && columnWidth > 0) {
      this.gridColumnWidth = columnWidth;
    }
    if (Number.isFinite(rowHeight) && rowHeight > 0) {
      this.gridRowHeight = rowHeight;
    }
  }

  /**
   * Set grid column and row origin
   */
  public setGridOrigin(columnOrigin: number, rowOrigin: number): void {
    if (Number.isFinite(columnOrigin)) {
      this.gridColumnOrigin = columnOrigin;
    }
    if (Number.isFinite(rowOrigin)) {
      this.gridRowOrigin = rowOrigin;
    }
  }

  /**
   * Get grid state
   */
  public getGridState(): {
    gridColumnWidth: number;
    gridRowHeight: number;
    gridColumnOrigin: number;
    gridRowOrigin: number;
  } {
    return {
      gridColumnWidth: this.gridColumnWidth,
      gridRowHeight: this.gridRowHeight,
      gridColumnOrigin: this.gridColumnOrigin,
      gridRowOrigin: this.gridRowOrigin,
    };
  }

  /**
   * Get grid column width
   */
  public getGridColumnWidth(): number {
    return this.gridColumnWidth;
  }

  /**
   * Get grid row height
   */
  public getGridRowHeight(): number {
    return this.gridRowHeight;
  }

  /**
   * Get grid column origin
   */
  public getGridColumnOrigin(): number {
    return this.gridColumnOrigin;
  }

  /**
   * Get grid row origin
   */
  public getGridRowOrigin(): number {
    return this.gridRowOrigin;
  }
}

