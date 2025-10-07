import { Theme } from '../config/theme';

export interface SquareRenderOptions {
  x: number;
  y: number;
  size?: number; // For backwards compatibility - if provided, creates a square
  width?: number; // For rectangles
  height?: number; // For rectangles
  text?: string;
  state: 'default' | 'hovered' | 'highlighted' | 'selected' | 'activated' | 'missed';
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
      timestampRange,
      priceRange,
      isLost,
      contractId,
      opacity = 1.0,
    } = options;
    const squareConfig = this.theme.square[state];

    // Determine actual dimensions
    const actualWidth = width ?? size ?? 50;
    const actualHeight = height ?? size ?? 50;

    this.ctx.save();

    // Apply global opacity for fade effect
    this.ctx.globalAlpha = opacity;

    // Get signature color from theme (used for selections and hits)
    const signatureColor = this.theme.colors?.primary || '#3b82f6';

    // Helper to convert hex to rgba
    const hexToRgba = (hex: string, alpha: number): string => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // Draw base background fill
    if (state === 'activated') {
      // Hit state - higher opacity signature color
      this.ctx.fillStyle = hexToRgba(signatureColor, 0.28);
      this.ctx.fillRect(x + 0.5, y + 0.5, actualWidth - 1, actualHeight - 1);
    } else if (state === 'missed') {
      // Missed state - same as selected but for missed boxes
      this.ctx.fillStyle = hexToRgba(signatureColor, 0.18);
      this.ctx.fillRect(x + 0.5, y + 0.5, actualWidth - 1, actualHeight - 1);
    } else if (state === 'selected') {
      // Selected state - signature color with lower opacity
      this.ctx.fillStyle = hexToRgba(signatureColor, 0.18);
      this.ctx.fillRect(x + 0.5, y + 0.5, actualWidth - 1, actualHeight - 1);
    } else if (state === 'highlighted') {
      // Highlighted state (first click) - orange/yellow for pending confirmation
      this.ctx.fillStyle = 'rgba(255, 170, 0, 0.18)'; // Orange at 18% opacity
      this.ctx.fillRect(x + 0.5, y + 0.5, actualWidth - 1, actualHeight - 1);
    } else {
      // Default state - dark background
      this.ctx.fillStyle = '#0e0e0e';
      this.ctx.fillRect(x + 0.5, y + 0.5, actualWidth - 1, actualHeight - 1);
    }

    // Add hover overlay for hovered state
    if (state === 'hovered') {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      this.ctx.fillRect(x + 0.5, y + 0.5, actualWidth - 1, actualHeight - 1);
    }

    // Hit/Miss activation animation - expanding flash effect
    if ((state === 'activated' || state === 'missed') && animation?.type === 'activate' && animation.progress < 1) {
      // Easing function for smooth animation (cubic ease-out)
      const easeOut = 1 - Math.pow(1 - animation.progress, 3);
      
      // Flash effect - fade in then fade out
      let flashOpacity: number;
      if (animation.progress < 0.3) {
        // Quick fade in (0 -> 1 over first 30%)
        flashOpacity = animation.progress / 0.3;
      } else {
        // Slower fade out (1 -> 0 over remaining 70%)
        flashOpacity = 1 - ((animation.progress - 0.3) / 0.7);
      }
      
      // Pulsing expand effect
      const pulseScale = 1 + (0.15 * Math.sin(animation.progress * Math.PI));
      const pulseWidth = actualWidth * pulseScale;
      const pulseHeight = actualHeight * pulseScale;
      const pulseOffsetX = (actualWidth - pulseWidth) / 2;
      const pulseOffsetY = (actualHeight - pulseHeight) / 2;
      
      // Draw expanding glow (brighter for hit, dimmer for miss)
      const glowOpacity = (state === 'activated' ? 0.6 : 0.4) * flashOpacity;
      this.ctx.fillStyle = hexToRgba(signatureColor, glowOpacity);
      this.ctx.fillRect(
        x + pulseOffsetX + 0.5,
        y + pulseOffsetY + 0.5,
        pulseWidth - 1,
        pulseHeight - 1
      );
      
      // Draw pulsing outline
      const outlineOpacity = (state === 'activated' ? 0.9 : 0.6) * flashOpacity;
      this.ctx.strokeStyle = hexToRgba(signatureColor, outlineOpacity);
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([]);
      this.ctx.strokeRect(
        x + pulseOffsetX + 0.5,
        y + pulseOffsetY + 0.5,
        pulseWidth - 1,
        pulseHeight - 1
      );
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
      this.ctx.fillStyle = hexToRgba(signatureColor, fillOpacity);
      this.ctx.fillRect(
        x + offsetX + 0.5,
        y + offsetY + 0.5,
        currentWidth - 1,
        currentHeight - 1
      );
      
      // Draw growing outline
      this.ctx.strokeStyle = hexToRgba(signatureColor, outlineOpacity);
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([]);
      this.ctx.strokeRect(
        x + offsetX + 0.5,
        y + offsetY + 0.5,
        currentWidth - 1,
        currentHeight - 1
      );
    }
    
    // Draw borders for non-animating states
    if (!(animation && animation.progress < 1)) {
      // Draw border for non-animating states
      let borderColor = '#2b2b2b';
      let borderWidth = 0.6;
      
      if (state === 'activated' || state === 'selected' || state === 'missed') {
        borderColor = signatureColor;
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
      // Adjust text color based on state
      let textColor = 'rgba(255, 255, 255, 0.12)'; // Default faint text
      
      if (state === 'selected' || state === 'activated' || state === 'missed') {
        textColor = 'rgba(255, 255, 255, 1.0)'; // Bright text for selected/hit/missed
      } else if (state === 'highlighted') {
        textColor = 'rgba(255, 170, 0, 0.9)'; // Orange text for pending confirmation
      } else if (state === 'hovered') {
        textColor = 'rgba(255, 255, 255, 0.25)'; // Brighter on hover
      }
      
      this.ctx.fillStyle = textColor;
      this.ctx.font = '20px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      const centerX = x + actualWidth / 2;
      const centerY = y + actualHeight / 2;
      this.ctx.fillText(text, centerX, centerY + 4);
    }

    // Draw "HIT" or "MISS" badge for outcome states
    // Reset globalAlpha to full opacity for badges
    if (state === 'activated') {
      this.ctx.save();
      this.ctx.globalAlpha = 1.0; // Full opacity for badge
      this.ctx.fillStyle = 'rgba(229, 229, 229, 1.0)'; // Light grey for HIT
      this.ctx.font = '11px sans-serif';
      this.ctx.textAlign = 'right';
      this.ctx.textBaseline = 'bottom';
      this.ctx.fillText('HIT', x + actualWidth - 8, y + actualHeight - 8);
      this.ctx.restore();
    } else if (state === 'missed') {
      this.ctx.save();
      this.ctx.globalAlpha = 1.0; // Full opacity for badge
      this.ctx.fillStyle = 'rgba(156, 163, 175, 1.0)'; // Slightly darker grey for MISS
      this.ctx.font = '11px sans-serif';
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
