// CanvasRenderingContext2D is a built-in browser type
import { Renderer } from '../../../core/Renderer';
import type { GridAxisRenderer } from './GridAxisRenderer';
import type { BoxRenderer } from './BoxRenderer';
import type { HeatmapRenderer } from './HeatmapRenderer';
import type { PriceLineRenderer } from './PriceLineRenderer';
import type { PriceData } from '../types';

export interface GridFrameRendererConfig {
  width: number;
  height: number;
  showDashedGrid: boolean;
  showMultiplierOverlay: boolean;
  showProbabilities: boolean;
  hasBoxes: boolean;
}

export interface GridFrameRendererProps {
  ctx: CanvasRenderingContext2D;
  gridAxisRenderer: GridAxisRenderer;
  boxRenderer: BoxRenderer;
  heatmapRenderer: HeatmapRenderer;
  priceLineRenderer: PriceLineRenderer;
  getConfig: () => GridFrameRendererConfig;
  getPriceData: () => PriceData[];
  getDataOffset: () => number;
  hasEnoughData: () => boolean;
  checkPriceCollisions: () => void;
  checkBoxesPastNowLine: () => void;
}

/**
 * Orchestrates the rendering pipeline for GridGame
 * Handles render sequencing and conditional rendering
 */
export class GridFrameRenderer extends Renderer {
  constructor(private readonly props: GridFrameRendererProps) {
    super(props.ctx);
  }

  /**
   * Render a single frame
   */
  public render(): void {
    const { ctx, gridAxisRenderer, boxRenderer, heatmapRenderer, priceLineRenderer } = this.props;
    const config = this.props.getConfig();

    // Draw dashed grid first (if enabled and no backend boxes yet)
    if (config.showDashedGrid && !config.hasBoxes) {
      gridAxisRenderer.renderDashedGrid();
    }

    // Draw unified border grid for multiplier boxes (performance optimization)
    gridAxisRenderer.renderUnifiedBorderGrid();

    const data = this.props.getPriceData();

    // Check for immediate price collisions with selected boxes (HIT detection)
    this.props.checkPriceCollisions();

    // Check for boxes that have passed the NOW line without being hit (MISS detection)
    this.props.checkBoxesPastNowLine();

    // Draw multiplier overlay first (grid boxes)
    if (config.showMultiplierOverlay) {
      boxRenderer.renderMultiplierOverlay();
    }

    // Draw probabilities heatmap overlay on top (so it's visible)
    if (config.showProbabilities) {
      heatmapRenderer.render();
    }

    if (!this.props.hasEnoughData()) {
      // Still render Y-axis and X-axis even without price data
      //gridAxisRenderer.renderYAxis();
      //gridAxisRenderer.renderXAxis();

      // Draw a message when waiting for data
      this.saveContext();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        'Waiting for price data...',
        config.width / 2,
        config.height / 2
      );
      this.restoreContext();

      return;
    }

    // Draw price line
    priceLineRenderer.render({
      priceData: data,
      dataOffset: this.props.getDataOffset(),
    });

    // Draw Y-axis last (on top as overlay)
    //gridAxisRenderer.renderYAxis();

    // Draw X-axis
    //gridAxisRenderer.renderXAxis();
  }
}

