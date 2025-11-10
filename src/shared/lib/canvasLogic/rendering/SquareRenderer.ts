import type { Theme } from '../config/theme';

export interface SquareRenderOptions {
  x: number;
  y: number;
  size?: number; // For backwards compatibility - if provided, creates a square
  width?: number; // For rectangles
  height?: number; // For rectangles
  text?: string;
  state: 'default' | 'hovered' | 'highlighted' | 'pending' | 'selected' | 'activated' | 'missed';
  animation?: {
    progress: number;
    type: 'select' | 'activate';
  };
  timestampRange?: {
    start: number;
    end: number;
  };
  priceRange?: {
    min: number;
    max: number;
  };
  isLost?: boolean; // Indicates if this contract was lost (passed without being hit)
  contractId?: string; // Contract ID to display in top left corner
  opacity?: number; // Overall opacity for fade effect (0-1)
  showProbabilities?: boolean; // Whether heatmap is enabled (affects text brightness)
  showUnifiedGrid?: boolean; // Whether unified grid is enabled (skip individual borders)
}

export class SquareRenderer {
  private ctx: CanvasRenderingContext2D;
  private theme: Theme;

  constructor(ctx: CanvasRenderingContext2D, theme: Theme) {
    this.ctx = ctx;
    this.theme = theme;
  }

  public setTheme(theme: Theme): void {
    this.theme = theme;
  }

  public render(options: SquareRenderOptions): void {
    const {
      x,
      y,
      size,
      width,
      height,
      text,
      state,
      animation,
      priceRange,
      isLost,
      contractId,
      opacity = 1.0,
      showProbabilities = false,
      showUnifiedGrid = false,
    } = options;
    // Determine actual dimensions
    const actualWidth = width ?? size ?? 50;
    const actualHeight = height ?? size ?? 50;
    const labelFontSize = Math.max(10, Math.min(16, actualWidth / 4));

    this.ctx.save();

    // Apply global opacity for fade effect
    this.ctx.globalAlpha = opacity;

    const rgba = (r: number, g: number, b: number, alpha: number): string => `rgba(${r}, ${g}, ${b}, ${alpha})`;

    const selectedColor = { r: 255, g: 120, b: 0 };
    const activatedColor = { r: 255, g: 94, b: 0 };

    // Draw base background fill (this persists after animation completes)
    if (state === 'activated') {
      // Hit state - vivid red-orange overlay
      this.ctx.fillStyle = rgba(activatedColor.r, activatedColor.g, activatedColor.b, 0.6);
      this.ctx.fillRect(x + 0.5, y + 0.5, actualWidth - 1, actualHeight - 1);
    } else if (state === 'missed') {
      // Missed state - permanent greyed out appearance
      this.ctx.fillStyle = 'rgba(60, 60, 60, 0.3)';
      this.ctx.fillRect(x + 0.5, y + 0.5, actualWidth - 1, actualHeight - 1);
    } else if (state === 'selected') {
      // Selected state - red-orange confirmation fill
      this.ctx.fillStyle = rgba(selectedColor.r, selectedColor.g, selectedColor.b, 0.32);
      this.ctx.fillRect(x + 0.5, y + 0.5, actualWidth - 1, actualHeight - 1);
    } else if (state === 'pending') {
      // Pending state (order sent, awaiting confirmation) - bright yellow
      this.ctx.fillStyle = 'rgba(255, 204, 0, 0.24)';
      this.ctx.fillRect(x + 0.5, y + 0.5, actualWidth - 1, actualHeight - 1);
    } else if (state === 'highlighted') {
      // Highlighted state (first click) - orange/yellow for pending confirmation
      this.ctx.fillStyle = 'rgba(255, 170, 0, 0.18)'; // Orange at 18% opacity
      this.ctx.fillRect(x + 0.5, y + 0.5, actualWidth - 1, actualHeight - 1);
    } else {
      // Default state - black background with slight fade for depth
      this.ctx.fillStyle = 'rgba(12, 12, 12, 0.82)';
      this.ctx.fillRect(x + 0.5, y + 0.5, actualWidth - 1, actualHeight - 1);
    }

    // Add hover overlay for hovered state
    if (state === 'hovered') {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      this.ctx.fillRect(x + 0.5, y + 0.5, actualWidth - 1, actualHeight - 1);
    }

    // Hit/Miss activation animation - simple flash overlay (no expanding, stays within borders)
    if ((state === 'activated' || state === 'missed') && animation?.type === 'activate' && animation.progress < 1) {
      // Flash effect - fade in then fade out
      let flashOpacity: number;
      if (animation.progress < 0.3) {
        // Quick fade in (0 -> 1 over first 30%)
        flashOpacity = animation.progress / 0.3;
      } else {
        // Slower fade out (1 -> 0 over remaining 70%)
        flashOpacity = 1 - ((animation.progress - 0.3) / 0.7);
      }
      
      if (state === 'activated') {
        // HIT animation - simple signature color flash overlay (stays within borders)
        const glowOpacity = 0.45 * flashOpacity;
        this.ctx.fillStyle = rgba(activatedColor.r, activatedColor.g, activatedColor.b, glowOpacity);
        this.ctx.fillRect(x + 0.5, y + 0.5, actualWidth - 1, actualHeight - 1);
      } else {
        // MISS animation - grey fade out effect (no glow, stays within borders)
        const dimOpacity = 0.25 * flashOpacity;
        this.ctx.fillStyle = `rgba(70, 70, 70, ${dimOpacity})`;
        this.ctx.fillRect(x + 0.5, y + 0.5, actualWidth - 1, actualHeight - 1);
        
        // Draw fading grey outline (stays within borders)
        const outlineOpacity = 0.4 * flashOpacity;
        this.ctx.strokeStyle = `rgba(100, 100, 100, ${outlineOpacity})`;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([]);
        this.ctx.strokeRect(x + 0.5, y + 0.5, actualWidth - 1, actualHeight - 1);
      }
    }
    
    // Selection animation - growing outline from center
    if (state === 'selected' && animation?.type === 'select' && animation.progress < 1) {
      // Easing function for smooth animation (cubic ease-out)
      const easeOut = 1 - Math.pow(1 - animation.progress, 3);
      
      // Start from 30% size instead of 0% for more natural appearance
      const minSize = 0.3;
      const sizeRange = 1 - minSize;
      const currentSize = minSize + (sizeRange * easeOut);
      
      const currentWidth = actualWidth * currentSize;
      const currentHeight = actualHeight * currentSize;
      const offsetX = (actualWidth - currentWidth) / 2;
      const offsetY = (actualHeight - currentHeight) / 2;
      
      // Fade in effect
      const fadeProgress = Math.min(animation.progress * 2, 1);
      const outlineOpacity = 0.8 * fadeProgress;
      const fillOpacity = 0.18 * fadeProgress;
      
      // Draw growing fill
      this.ctx.fillStyle = rgba(selectedColor.r, selectedColor.g, selectedColor.b, fillOpacity);
      this.ctx.fillRect(
        x + offsetX + 0.5,
        y + offsetY + 0.5,
        currentWidth - 1,
        currentHeight - 1
      );
      
      // Draw growing outline
      this.ctx.strokeStyle = rgba(selectedColor.r, selectedColor.g, selectedColor.b, outlineOpacity);
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([]);
      this.ctx.strokeRect(
        x + offsetX + 0.5,
        y + offsetY + 0.5,
        currentWidth - 1,
        currentHeight - 1
      );
    }
    
    // Draw borders for special states (always draw for selected, activated, missed, highlighted, hovered)
    // Skip only default state borders when unified grid is enabled
    const isSpecialState = state === 'selected' || state === 'activated' || state === 'missed' || 
                          state === 'pending' || state === 'highlighted' || state === 'hovered';
    const shouldDrawBorder = !(animation && animation.progress < 1) && 
                           (isSpecialState || !showUnifiedGrid);
    
    if (shouldDrawBorder) {
      let borderColor = '#3f3f3f';
      let borderWidth = 0.6;
      
      if (state === 'activated') {
        borderColor = rgba(activatedColor.r, activatedColor.g, activatedColor.b, 0.95);
        borderWidth = 1.2;
      } else if (state === 'selected') {
        borderColor = rgba(selectedColor.r, selectedColor.g, selectedColor.b, 0.95);
        borderWidth = 1.2;
      } else if (state === 'missed') {
        borderColor = 'rgba(100, 100, 100, 0.5)'; // Grey border for missed
        borderWidth = 1;
      } else if (state === 'pending') {
        borderColor = 'rgba(255, 204, 0, 0.9)'; // Bright yellow border while awaiting confirmation
        borderWidth = 1;
      } else if (state === 'highlighted') {
        borderColor = 'rgba(255, 170, 0, 0.9)'; // Orange border for pending confirmation
        borderWidth = 1;
      } else if (state === 'hovered') {
        borderColor = 'rgba(255, 255, 255, 0.4)';
        borderWidth = 1.2;
      }
      
      this.ctx.strokeStyle = borderColor;
      this.ctx.lineWidth = borderWidth;
      this.ctx.setLineDash([]);
      this.ctx.strokeRect(x + 0.5, y + 0.5, actualWidth - 1, actualHeight - 1);
    }

    // Draw red border for lost contracts
    if (isLost) {
      this.ctx.strokeStyle = '#ff0000';
      this.ctx.lineWidth = 3;
        this.ctx.strokeRect(x, y, actualWidth, actualHeight);
      this.ctx.setLineDash([]);
    }

    // Draw text
    if (text) {
      let textColor = 'rgba(255, 255, 255, 0.25)';
      if (state === 'selected' || state === 'activated') {
        textColor = 'rgba(255, 255, 255, 1.0)';
      } else if (state === 'missed') {
        textColor = 'rgba(120, 120, 120, 0.6)';
      } else if (state === 'highlighted') {
        textColor = 'rgba(255, 170, 0, 0.9)';
      } else if (state === 'hovered') {
        textColor = 'rgba(255, 255, 255, 0.3)';
      }
      if (showProbabilities && state === 'default') {
        textColor = `rgba(255,255,255,${0.85 * opacity})`;
      }

      this.ctx.fillStyle = textColor;
      this.ctx.font = `${labelFontSize}px sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      const textX = x + actualWidth / 2;
      const textY = y + actualHeight / 2;
      this.ctx.fillText(text, textX, textY);
    }

    // Draw "HIT" or "MISS" badge for outcome states (matches regular box-hit canvas)
    // Keep badges aligned with the same fade opacity as the cell
    if (state === 'activated') {
      this.ctx.save();
      const badgeOpacity = Math.max(0, Math.min(1, opacity));
      this.ctx.globalAlpha = badgeOpacity; // Match fade progression
      this.ctx.fillStyle = 'rgba(229, 229, 229, 1.0)'; // Bright light grey - clearly visible
      this.ctx.font = 'bold 11px sans-serif'; // Bold for emphasis
      this.ctx.textAlign = 'right';
      this.ctx.textBaseline = 'bottom';
      this.ctx.fillText('HIT', x + actualWidth - 8, y + actualHeight - 8);
      this.ctx.restore();
    } else if (state === 'missed') {
      this.ctx.save();
      const badgeOpacity = Math.max(0, Math.min(1, opacity));
      this.ctx.globalAlpha = badgeOpacity; // Match fade progression
      this.ctx.fillStyle = 'rgba(100, 100, 100, 0.7)'; // Darker grey for MISS (more subtle)
      this.ctx.font = 'bold 11px sans-serif'; // Bold for consistency
      this.ctx.textAlign = 'right';
      this.ctx.textBaseline = 'bottom';
      this.ctx.fillText('MISS', x + actualWidth - 8, y + actualHeight - 8);
      this.ctx.restore();
    }

    // Draw price range in bottom left corner
    if (priceRange) {
      this.ctx.font = '8px monospace';
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'bottom';

      // Format price range - show with 2 decimal places
      const priceText = `$${priceRange.min.toFixed(2)}-$${priceRange.max.toFixed(2)}`;
      this.ctx.fillText(priceText, x + 2, y + actualHeight - 2);
    }

    // Draw contract ID in top left corner
    if (contractId) {
      this.ctx.font = '8px monospace';
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'top';

      this.ctx.fillText(contractId, x + 2, y + 2);
    }

    this.ctx.restore();
  }

  private drawRoundedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fill: boolean
  ): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(
      x + width,
      y + height,
      x + width - radius,
      y + height
    );
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();

    if (fill) {
      this.ctx.fill();
    } else {
      this.ctx.stroke();
    }
  }

  private drawAnimatedBorder(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    progress: number
  ): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;

    const perimeter = 2 * (width + height);
    const animatedLength = progress * perimeter;

    if (animatedLength > 0) {
      this.ctx.beginPath();

      let remainingLength = animatedLength;

      // Top edge (left to right)
      if (remainingLength > 0) {
        this.ctx.moveTo(x, y);
        const topLength = Math.min(remainingLength, width);
        this.ctx.lineTo(x + topLength, y);
        remainingLength -= topLength;
      }

      // Right edge (top to bottom)
      if (remainingLength > 0) {
        this.ctx.moveTo(x + width, y);
        const rightLength = Math.min(remainingLength, height);
        this.ctx.lineTo(x + width, y + rightLength);
        remainingLength -= rightLength;
      }

      // Bottom edge (right to left)
      if (remainingLength > 0) {
        this.ctx.moveTo(x + width, y + height);
        const bottomLength = Math.min(remainingLength, width);
        this.ctx.lineTo(x + width - bottomLength, y + height);
        remainingLength -= bottomLength;
      }

      // Left edge (bottom to top)
      if (remainingLength > 0) {
        this.ctx.moveTo(x, y + height);
        const leftLength = Math.min(remainingLength, height);
        this.ctx.lineTo(x, y + height - leftLength);
      }

      this.ctx.stroke();
    }
  }
}
