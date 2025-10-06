import { Theme } from '../config/theme';

export interface SquareRenderOptions {
  x: number;
  y: number;
  size?: number; // For backwards compatibility - if provided, creates a square
  width?: number; // For rectangles
  height?: number; // For rectangles
  text?: string;
  state: 'default' | 'hovered' | 'highlighted' | 'selected' | 'activated';
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
    } = options;
    const squareConfig = this.theme.square[state];

    // Determine actual dimensions
    const actualWidth = width ?? size ?? 50;
    const actualHeight = height ?? size ?? 50;

    this.ctx.save();

    // Draw background fill if specified
    if (squareConfig.fillColor) {
      this.ctx.fillStyle = squareConfig.fillColor;
      if (squareConfig.cornerRadius) {
        this.drawRoundedRect(
          x,
          y,
          actualWidth,
          actualHeight,
          squareConfig.cornerRadius,
          true
        );
      } else {
        this.ctx.fillRect(x, y, actualWidth, actualHeight);
      }
    }

    // Draw shadow if specified
    if (squareConfig.shadow?.enabled) {
      this.ctx.shadowColor = squareConfig.shadow.color;
      this.ctx.shadowBlur = squareConfig.shadow.blur;
      this.ctx.shadowOffsetX = squareConfig.shadow.offsetX;
      this.ctx.shadowOffsetY = squareConfig.shadow.offsetY;
    }

    // Draw border
    if (animation?.type === 'select' && animation.progress < 1) {
      this.drawAnimatedBorder(
        x,
        y,
        actualWidth,
        actualHeight,
        squareConfig.borderColor,
        animation.progress
      );
    } else {
      this.ctx.strokeStyle = squareConfig.borderColor;
      this.ctx.lineWidth = squareConfig.borderWidth;

      if (squareConfig.cornerRadius) {
        this.drawRoundedRect(
          x,
          y,
          actualWidth,
          actualHeight,
          squareConfig.cornerRadius,
          false
        );
      } else {
        this.ctx.strokeRect(x, y, actualWidth, actualHeight);
      }
    }

    // Draw red border for lost contracts
    if (isLost) {
      this.ctx.strokeStyle = '#ff0000';
      this.ctx.lineWidth = 3;

      if (squareConfig.cornerRadius) {
        this.drawRoundedRect(
          x,
          y,
          actualWidth,
          actualHeight,
          squareConfig.cornerRadius,
          false
        );
      } else {
        this.ctx.strokeRect(x, y, actualWidth, actualHeight);
      }

      this.ctx.setLineDash([]); // Reset line dash
    }

    // Draw text
    if (text) {
      this.ctx.fillStyle = squareConfig.textColor;
      this.ctx.font = `${squareConfig.fontSize}px ${squareConfig.font}`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      const centerX = x + actualWidth / 2;
      const centerY = y + actualHeight / 2;
      this.ctx.fillText(text, centerX, centerY);
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
