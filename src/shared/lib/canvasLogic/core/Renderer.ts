import type { Theme } from '../config/theme';
import { defaultTheme } from '../config/theme';
import type { WorldCoordinateSystem } from './WorldCoordinateSystem';

/**
 * Base class for all game renderers
 * Provides common rendering interface and lifecycle methods
 */
export abstract class Renderer {
  protected ctx: CanvasRenderingContext2D;
  protected theme: Theme;
  protected world?: WorldCoordinateSystem;

  constructor(
    ctx: CanvasRenderingContext2D,
    theme?: Theme,
    world?: WorldCoordinateSystem
  ) {
    this.ctx = ctx;
    this.theme = theme ?? defaultTheme;
    this.world = world;
  }

  /**
   * Render a single frame
   * Must be implemented by subclasses (can have different signatures)
   */
  public render?(...args: unknown[]): void;

  /**
   * Handle resize events
   * Called when the canvas size changes
   * @param width - New width
   * @param height - New height
   */
  public resize?(width: number, height: number): void {
    // Optional: subclasses can override
  }

  /**
   * Update the theme
   * @param theme - New theme to use
   */
  public setTheme(theme: Theme): void {
    this.theme = theme;
  }

  /**
   * Get the current theme
   */
  public getTheme(): Theme {
    return this.theme;
  }

  /**
   * Get the canvas rendering context
   */
  public getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * Get the world coordinate system (if available)
   */
  public getWorld(): WorldCoordinateSystem | undefined {
    return this.world;
  }

  /**
   * Save the current canvas context state
   * Useful helper for render operations
   */
  protected saveContext(): void {
    this.ctx.save();
  }

  /**
   * Restore the canvas context state
   * Useful helper for render operations
   */
  protected restoreContext(): void {
    this.ctx.restore();
  }

  /**
   * Enable high-quality anti-aliasing
   * Common setup for smooth rendering
   */
  protected enableAntiAliasing(): void {
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  /**
   * Clear the canvas
   * @param x - X position (default: 0)
   * @param y - Y position (default: 0)
   * @param width - Width (default: canvas width)
   * @param height - Height (default: canvas height)
   */
  protected clearCanvas(
    x: number = 0,
    y: number = 0,
    width?: number,
    height?: number
  ): void {
    const w = width ?? this.ctx.canvas.width;
    const h = height ?? this.ctx.canvas.height;
    this.ctx.clearRect(x, y, w, h);
  }
}

