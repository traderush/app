import { GameType } from '@/shared/types';
import type { IronCondorGameType } from '@/shared/types';
import { BaseGame } from '../core/BaseGame';
import type { GameConfig } from '../core/BaseGame';
import { WorldCoordinateSystem } from '../core/WorldCoordinateSystem';
import type { Camera } from '../core/WorldCoordinateSystem';
import { LineRenderer } from '../rendering/LineRenderer';
import type { Point } from '../rendering/LineRenderer';
import { SquareRenderer } from '../rendering/SquareRenderer';
import type {
  SquareRenderOptions,
} from '../rendering/SquareRenderer';
import { playSelectionSound } from '@/shared/lib/sound/SoundManager';

export interface PriceData {
  price: number;
  timestamp?: number;
}

export interface SquareAnimation {
  startTime: number;
  progress: number;
  type?: 'select' | 'activate';
}

/**
 * Configuration options for GridGame
 * 
 * @property multipliers - Array of multiplier strings to display
 * @property pixelsPerPoint - Pixels per data point for horizontal spacing
 * @property pricePerPixel - Price units per pixel for vertical scaling
 * @property verticalMarginRatio - Ratio of vertical margin to total height
 * @property cameraOffsetRatio - Camera offset ratio for positioning
 * @property smoothingFactorX - Horizontal camera smoothing (0-1, higher = more smoothing)
 * @property smoothingFactorY - Vertical camera smoothing (0-1, higher = more smoothing)
 * @property lineEndSmoothing - Price line end point smoothing factor
 * @property animationDuration - Duration of animations in milliseconds
 * @property maxDataPoints - Maximum number of price data points to retain
 * @property showMultiplierOverlay - Whether to show multiplier values on boxes
 * @property externalDataSource - Whether price data comes from external source
 * @property visibleSquares - Array of squares to show (for boxes mode)
 * @property showDashedGrid - Whether to show dashed grid background
 * @property debugMode - Whether to show debug info overlays
 * @property gameType - Game type for rendering adjustments
 * @property showProbabilities - Whether to show probability heatmap overlay
 * @property showOtherPlayers - Whether to show other players' selections
 * @property minMultiplier - Minimum multiplier threshold to display
 */
export interface GridGameConfig extends GameConfig {
  multipliers?: string[];
  pixelsPerPoint?: number;
  pricePerPixel?: number;
  verticalMarginRatio?: number;
  cameraOffsetRatio?: number;
  smoothingFactorX?: number;
  smoothingFactorY?: number;
  lineEndSmoothing?: number;
  animationDuration?: number;
  maxDataPoints?: number;
  showMultiplierOverlay?: boolean;
  externalDataSource?: boolean;
  visibleSquares?: Array<{ gridX: number; gridY: number }>;
  showDashedGrid?: boolean;
  debugMode?: boolean;
  gameType?: IronCondorGameType;
  showProbabilities?: boolean;
  showOtherPlayers?: boolean;
  minMultiplier?: number;
}

export interface BackendBox {
  value: number;
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  width: number;
  height: number;
  totalTrades: number;
  userTrade?: number;
  timestampRange?: {
    start: number;
    end: number;
  };
  priceRange?: {
    min: number;
    max: number;
  };
  status?: 'hit' | 'missed';
  isEmpty?: boolean;
  isClickable?: boolean;
}

export type BackendMultiplierMap = Record<string, BackendBox>;

export class GridGame extends BaseGame {
  private frameCount: number = 0;
  private priceData: PriceData[] = [];
  private camera: Camera = {
    x: 0,
    y: 100, // Start centered on initial price
    targetX: 0,
    targetY: 100, // Start centered on initial price
    smoothX: 0,
    smoothY: 100, // Start centered on initial price
  };

  // Drag functionality state
  private isDragging: boolean = false;
  private isPointerDown: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragStartCameraX: number = 0;
  private dragStartCameraY: number = 0;
  private isFollowingPrice: boolean = true; // Track if camera should follow price
  private static readonly DRAG_ACTIVATION_THRESHOLD = 6;

  // Bound event handlers for cleanup
  private boundHandleMouseDown: (e: MouseEvent) => void;
  private boundHandleMouseUp: (e: MouseEvent) => void;
  
  // Debug logging throttle
  private lastDebugLog: number = 0;
  private debug(...args: unknown[]) {
    if (this.config.debugMode || process.env.NODE_ENV === 'development') {
      console.debug(...args);
    }
  }

  protected smoothLineEndX: number = 0;
  protected smoothLineEndY: number = 0;
  protected totalDataPoints: number = 0;
  protected dataOffset: number = 0;

  protected selectedSquareIds: Set<string> = new Set();
  protected pendingSquareIds: Set<string> = new Set();
  protected highlightedSquareIds: Set<string> = new Set();
  protected squareAnimations: Map<string, SquareAnimation> = new Map();
  protected hitBoxes: Set<string> = new Set(); // Boxes that have been hit based on WebSocket events
  protected missedBoxes: Set<string> = new Set(); // Boxes that were missed (not hit)
  protected processedBoxes: Set<string> = new Set(); // Boxes that have already been checked (to prevent re-processing)
  protected mouseX: number = 0;
  protected mouseY: number = 0;
  protected visibleSquares: Set<string> = new Set(); // For boxes mode
  protected visiblePriceRange: number = 10; // Calculated in update()
  protected emptyBoxes: Record<string, {
    worldX: number;
    worldY: number;
    width: number;
    height: number;
    isEmpty: boolean;
    isClickable: boolean;
    value?: number; // Random multiplier for heatmap visualization
  }> = {}; // Generated empty boxes to fill viewport
  private msPerPointEstimate: number = 500;
  private gridColumnWidth: number = 50;
  private gridRowHeight: number = 1;
  private gridColumnOrigin: number = 0;
  private gridRowOrigin: number = 0;
  
  // CRITICAL: Store grid offset once and never recalculate
  // Prevents grid from shifting when old boxes are cleaned up after 150+ seconds
  private gridOffsetX: number | null = null;
  private gridOffsetY: number | null = null;

  // Other players data
  private otherPlayerCounts: {[key: string]: number} = {};
  private otherPlayerSelections: {[key: string]: Array<{id: string, name: string, avatar: string, type: string}>} = {};
  private otherPlayerImages: {[key: string]: HTMLImageElement} = {};

  protected world: WorldCoordinateSystem;
  protected eventSource: EventSource | null = null;
  protected squareRenderer: SquareRenderer;
  protected lineRenderer: LineRenderer;
  protected backendMultipliers: BackendMultiplierMap = {};
  protected boxClickabilityCache: Map<string, boolean> = new Map();

  protected config: Required<GridGameConfig>;

  constructor(container: HTMLElement, config?: GridGameConfig) {
    super(container, config);
    
    // Bind event handlers once
    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);

    // Initialize default config
    this.config = {
      theme: this.theme,
      width: this.width,
      height: this.height,
      dpr: this.dpr,
      fps: 60,
      multipliers: ['2X', '5X', '10X', '25X', '50X', '100X'],
      pixelsPerPoint: 5,
      pricePerPixel: 0.8,
      verticalMarginRatio: 0.1,
      cameraOffsetRatio: 0.2,
      smoothingFactorX: 0.95, // High smoothing for fluid camera movement
      smoothingFactorY: 0.92, // Smooth Y-axis following
      lineEndSmoothing: 0.88,
      animationDuration: 300, // Quick, responsive animations
      maxDataPoints: 500,
      showMultiplierOverlay: true,
      externalDataSource: false,
      visibleSquares: [],
      showDashedGrid: true, // Enable unified grid system for better performance
      debugMode: false,
      gameType: GameType.GRID,
      showProbabilities: false,
      showOtherPlayers: false,
      minMultiplier: 1.0,
      ...config,
    };

    // Initialize visible squares (for boxes mode)
    if (config?.visibleSquares) {
      config.visibleSquares.forEach((square) => {
        this.visibleSquares.add(`${square.gridX}_${square.gridY}`);
      });
    }

    this.world = new WorldCoordinateSystem(this.camera);
    this.world.setPixelsPerPoint(this.config.pixelsPerPoint);
    this.squareRenderer = new SquareRenderer(this.ctx, this.theme);
    this.lineRenderer = new LineRenderer(this.ctx, this.theme);

    // Initialize world coordinate system with current canvas size
    this.world.updateCanvasSize(this.width, this.height);

    this.on('resize', ({ width, height }) => {
      this.world.updateCanvasSize(width, height);
    });

    // Add mouse event listeners for dragging
    this.canvas.addEventListener('mousedown', this.boundHandleMouseDown);
    this.canvas.addEventListener('mouseup', this.boundHandleMouseUp);
    this.canvas.addEventListener('mouseleave', this.boundHandleMouseUp);

    // Only connect to internal websocket if not using external data
    if (!config?.externalDataSource) {
      this.connectWebSocket();
    }
  }

  private connectWebSocket(): void {
    // WebSocket connection is now handled by the React component
    // Data is provided through addPriceData() method
    // This method is kept empty to avoid breaking existing calls
  }

  protected handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Prepare for possible drag
    this.isPointerDown = true;
    this.isDragging = false;
    this.dragStartX = x;
    this.dragStartY = y;
    this.dragStartCameraX = this.camera.x;
    this.dragStartCameraY = this.camera.y;
    
    this.canvas.style.cursor = 'grabbing';
  }

  protected handleMouseUp(e: MouseEvent): void {
    this.isPointerDown = false;
    this.isDragging = false;
    this.canvas.style.cursor = 'grab';

    super.handleMouseUp(e);
  }

  protected handleClick(e: MouseEvent): void {
    // Don't handle box clicks if we just finished dragging
    if (!this.isDragging) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Calculate if this was a drag vs click
      const dragDistance = Math.sqrt(
        Math.pow(x - this.dragStartX, 2) + Math.pow(y - this.dragStartY, 2)
      );
      
      // Only handle as click if drag distance was small
      if (dragDistance <= 10) {
        let clickedSquareId: string | null = null;
        let minDistance = Infinity;

        // Check clicks against all boxes (backend + empty, but empty boxes are never clickable)
        Object.entries(this.backendMultipliers).forEach(([squareId, box]) => {
          // Skip if we have visible squares defined and this square is not in the list
          if (this.visibleSquares.size > 0 && !this.visibleSquares.has(squareId)) {
            return;
          }

          // Check if box is clickable
          // Empty boxes are never clickable
          if (
            box.isEmpty ||
            !this.isBoxClickable(box) ||
            box.isClickable === false
          ) {
            return;
          }

          // Use actual world coordinates from backend
          const worldX = box.worldX;
          const worldY = box.worldY;
          const boxWidth = box.width;
          const boxHeight = box.height;

          // Convert world coordinates to screen
          const topLeft = this.world.worldToScreen(worldX, worldY + boxHeight);
          const bottomRight = this.world.worldToScreen(worldX + boxWidth, worldY);

          // Check if click is within box bounds
          if (
            x >= topLeft.x &&
            x < bottomRight.x &&
            y >= topLeft.y &&
            y < bottomRight.y
          ) {
            const centerX = (topLeft.x + bottomRight.x) / 2;
            const centerY = (topLeft.y + bottomRight.y) / 2;
            const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

            if (distance < minDistance) {
              minDistance = distance;
              clickedSquareId = squareId;
            }
          }
        });

        if (clickedSquareId) {
          const alreadyPending = this.pendingSquareIds.has(clickedSquareId);
          const alreadySelected = this.selectedSquareIds.has(clickedSquareId);

          if (!alreadyPending && !alreadySelected) {
            // Single click - send order and move to pending state (yellow) until confirmation arrives
            this.highlightedSquareIds.clear();
            this.selectedSquareIds.add(clickedSquareId);
            this.pendingSquareIds.add(clickedSquareId);
            this.squareAnimations.delete(clickedSquareId); // defer select animation until confirmation
            // Play selection sound
            this.debug('🔊 About to play selection sound for box:', clickedSquareId);
            void playSelectionSound();
            this.emit('squareSelected', { squareId: clickedSquareId });
          }
        } else {
          // Clicked outside any box - clear highlights
          this.highlightedSquareIds.clear();
        }
      }
    }

    super.handleClick(e);
  }

  protected handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;

    // Handle dragging
    if (this.isPointerDown) {
      const deltaX = this.mouseX - this.dragStartX;
      const deltaY = this.mouseY - this.dragStartY;
      const dragDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (!this.isDragging && dragDistance > GridGame.DRAG_ACTIVATION_THRESHOLD) {
        this.isDragging = true;
        this.isFollowingPrice = false;
        this.emit('cameraFollowingChanged', { isFollowing: false });
      }

      if (!this.isDragging) {
        return;
      }
      
      // Convert screen delta to world delta
      // For X: screen space maps 1:1 to world space
      // Invert X direction for natural dragging (drag right = move viewport left)
      const worldDeltaX = -deltaX;
      
      // For Y: need to account for price scale
      // Get the price scale from viewport settings
      const verticalMargin = this.height * this.config.verticalMarginRatio;
      const viewportHeight = this.height - 2 * verticalMargin;
      // Use a default if visiblePriceRange hasn't been calculated yet
      const effectivePriceRange = this.visiblePriceRange > 0 ? this.visiblePriceRange : 10;
      const priceScale = viewportHeight / effectivePriceRange;
      
      // For Y: drag up should move view up (show higher prices), drag down should move view down
      // Since screen Y increases downward, and world Y (price) increases upward, we need positive delta
      const worldDeltaY = deltaY / priceScale;
      
      // Update camera position directly
      this.camera.x = this.dragStartCameraX + worldDeltaX;
      this.camera.y = this.dragStartCameraY + worldDeltaY;
      
      // Clamp camera X to prevent going negative
      this.camera.x = Math.max(0, this.camera.x);
      
      // Also update target positions to prevent smooth interpolation from fighting the drag
      this.camera.targetX = this.camera.x;
      this.camera.targetY = this.camera.y;
      this.camera.smoothX = this.camera.x;
      this.camera.smoothY = this.camera.y;
      
      return;
    }

    // Update cursor based on state
    if (this.isDragging) {
      this.canvas.style.cursor = 'grabbing';
    } else {
      // Don't change cursor for sketch and cobra games since boxes are invisible
      if (
        this.config.gameType !== GameType.SKETCH &&
        this.config.gameType !== GameType.COBRA
      ) {
        // Check if mouse is over a square and set cursor pointer
        const isOverSquare = this.isMouseOverSquare(this.mouseX, this.mouseY);
        this.canvas.style.cursor = isOverSquare ? 'pointer' : 'grab';
      } else {
        // For sketch and cobra, always show grab cursor since no boxes are visible
        this.canvas.style.cursor = 'grab';
      }
    }

    super.handleMouseMove(e);
  }

  protected handleMouseLeave(e: MouseEvent): void {
    this.mouseX = -1;
    this.mouseY = -1;
    this.canvas.style.cursor = 'grab';
    const shouldHandleMouseUp = this.isPointerDown || this.isDragging;
    
    if (shouldHandleMouseUp) {
      // Delegate to mouse up handler while drag state is intact so it doesn't auto-follow again
      this.handleMouseUp(e);
    } else {
      this.isPointerDown = false;
      this.isDragging = false;
    }
    
    super.handleMouseLeave(e);
  }

  protected update(_deltaTime: number): void {
    // Increment frame count
    this.frameCount++;

    // Always set up viewport for rendering boxes
    const verticalMargin = this.height * this.config.verticalMarginRatio;
    const viewportTop = verticalMargin;
    const viewportBottom = this.height - verticalMargin;
    const viewportHeight = viewportBottom - viewportTop;

    // Base range fallback when we don't have enough data yet.
    // Keep modest so small price moves remain visible.
    const basePriceRange = 12;
    let targetPriceRange = basePriceRange;

    // Use backend box heights when available so future contracts fit on screen.
    const boxValues = Object.values(this.backendMultipliers);
    if (boxValues.length > 0 && boxValues[0]) {
      const boxHeight = Math.max(0.1, boxValues[0].height);
      const boxesVisible =
        this.config.gameType === GameType.SKETCH ||
        this.config.gameType === GameType.COBRA
          ? 30
          : 10;
      targetPriceRange = Math.max(targetPriceRange, boxHeight * boxesVisible);
    }

    const data = this.priceData;
    if (data.length >= 2) {
      const sampleCount = Math.min(data.length, 240);
      let minPrice = Number.POSITIVE_INFINITY;
      let maxPrice = Number.NEGATIVE_INFINITY;
      for (let i = data.length - sampleCount; i < data.length; i++) {
        const price = Math.max(0, data[i].price);
        if (price < minPrice) minPrice = price;
        if (price > maxPrice) maxPrice = price;
      }
      if (Number.isFinite(minPrice) && Number.isFinite(maxPrice)) {
        const dataRange = Math.max(0.05, maxPrice - minPrice);
        const paddedRange = Math.max(0.5, dataRange * 1.8);
        targetPriceRange = Math.max(paddedRange, targetPriceRange);
      }
    }

    if (!Number.isFinite(targetPriceRange) || targetPriceRange <= 0) {
      targetPriceRange = basePriceRange;
    }

    const smoothing = 0.85;
    if (this.visiblePriceRange === 0) {
      this.visiblePriceRange = targetPriceRange;
    } else {
      this.visiblePriceRange =
        this.visiblePriceRange * smoothing + targetPriceRange * (1 - smoothing);
    }

    // Clamp to sane bounds to avoid over-zooming
    this.visiblePriceRange = Math.max(0.5, Math.min(this.visiblePriceRange, 500));

    // Update world viewport with smoothed range
    this.world.updateViewport(viewportHeight, this.visiblePriceRange);

    if (data.length < 2) {
      // Even without price data, we should still update camera for box visibility
      // Set initial camera position
      if (this.camera.x === 0 && this.camera.y === 100) {
        this.camera.targetX = 0;
        this.camera.targetY = 100;
        this.camera.smoothX = 0;
        this.camera.smoothY = 100;
      }
      return;
    }

    const latestData = data[data.length - 1];
    if (
      !latestData ||
      typeof latestData.price !== 'number' ||
      isNaN(latestData.price)
    ) {
      return;
    }

    const pixelsPerPoint = this.config.pixelsPerPoint;
    const latestPrice = Math.max(0, latestData.price);

    const lineEndWorldX = (this.totalDataPoints - 1) * pixelsPerPoint;
    const lineEndWorldY = latestPrice;

    // Only update camera targets if following price
    if (this.isFollowingPrice) {
      const targetOffsetX = this.width * this.config.cameraOffsetRatio;
      const newTargetX = lineEndWorldX - targetOffsetX;
      this.camera.targetX = Math.max(0, newTargetX);

      // Always follow the latest price vertically to keep movement visible.
      this.camera.targetY = lineEndWorldY;

      if (this.config.gameType === GameType.SKETCH) {
        this.camera.smoothY = lineEndWorldY;
        this.camera.y = lineEndWorldY;
      }
    }

    // Only apply smoothing if following price
    if (this.isFollowingPrice) {
      if (this.camera.smoothX === 0 && this.camera.targetX > 0) {
        this.camera.smoothX = this.camera.targetX;
      }
      if (this.camera.smoothY === 0 && this.camera.targetY > 0) {
        this.camera.smoothY = this.camera.targetY;
      }

      // Apply smoothing to X position
      this.camera.smoothX =
        this.camera.smoothX * this.config.smoothingFactorX +
        this.camera.targetX * (1 - this.config.smoothingFactorX);

      // Skip Y smoothing for sketch since we set it directly above
      if (this.config.gameType !== GameType.SKETCH) {
        this.camera.smoothY =
          this.camera.smoothY * this.config.smoothingFactorY +
          this.camera.targetY * (1 - this.config.smoothingFactorY);
        this.camera.y = Math.max(this.visiblePriceRange / 2, this.camera.smoothY);
      }

      // Use smooth X directly to prevent jitter from rounding
      this.camera.x = this.camera.smoothX;
    } else {
      // When not following price, keep camera stable to prevent grid movement
      // Don't update camera position unless explicitly changed by user interaction
    }

    // Update square animations and clean up completed ones
    this.squareAnimations.forEach((animation, squareId) => {
      const elapsed = performance.now() - animation.startTime;
      animation.progress = Math.min(elapsed / this.config.animationDuration, 1);
      
      // Remove completed animations to prevent memory leak
      if (animation.progress >= 1) {
        this.squareAnimations.delete(squareId);
      }
    });

    // Update empty boxes based on viewport changes (DISABLED - filler grid archived)
    // this.updateEmptyBoxes();
  }

  protected render(): void {
    this.clearCanvas();

    const hasBoxes = Object.keys(this.backendMultipliers).length > 0;

    // Draw dashed grid first (if enabled and no backend boxes yet)
    if (this.config.showDashedGrid && !hasBoxes) {
      this.renderDashedGrid();
    }

    // Draw unified border grid for multiplier boxes (performance optimization)
    this.renderUnifiedBorderGrid();

    const data = [...this.priceData];

    // Check for immediate price collisions with selected boxes (HIT detection)
    this.checkPriceCollisions();
    
    // Check for boxes that have passed the NOW line without being hit (MISS detection)
    this.checkBoxesPastNowLine();

    // Draw multiplier overlay first (grid boxes)
    if (this.config.showMultiplierOverlay) {
      this.renderMultiplierOverlay();
    }

    // Draw probabilities heatmap overlay on top (so it's visible)
    if (this.config.showProbabilities) {
      this.renderProbabilitiesHeatmap();
    }

    if (data.length < 2) {
      // Still render Y-axis and X-axis even without price data
      this.renderYAxis();
      this.renderXAxis();

      // Draw a message when waiting for data
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.font = '16px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(
        'Waiting for price data...',
        this.width / 2,
        this.height / 2
      );
      this.ctx.restore();

      return;
    }

    // Draw price line
    this.renderPriceLine(data);

    // Draw Y-axis last (on top as overlay)
    this.renderYAxis();

    // Draw X-axis
    this.renderXAxis();

    // Selectability boundary (dashed vertical line) disabled for cleaner look
    // if (
    //   this.config.gameType === GameType.SKETCH ||
    //   this.config.gameType === GameType.COBRA
    // ) {
    //   this.renderSelectabilityBoundary();
    // }
  }

  private renderPriceLine(data: PriceData[]): void {
    const points: Point[] = [];

    for (let i = 0; i < data.length; i++) {
      const worldPos = this.world.getLinePosition(
        i,
        this.dataOffset,
        Math.max(0, data[i].price)
      );
      const screenPos = this.world.worldToScreen(worldPos.x, worldPos.y);

      // Include points that are on screen or slightly off to the right
      if (screenPos.x >= -100) {
        points.push(screenPos);
      }
    }

    // Don't return early - we still need to update smooth positions and render indicators
    // if (points.length === 0) return;

    // Always update smooth line end position (for dot and horizontal line)
    // This needs to happen even when not following price
    if (data.length > 0) {
      // Use the actual data index, not totalDataPoints which might be offset
      const dataIndex = data.length - 1;
      const worldPos = this.world.getLinePosition(
        dataIndex,
        this.dataOffset,
        Math.max(0, data[dataIndex].price)
      );
      
      // Convert to screen coordinates
      const latestScreenPos = this.world.worldToScreen(worldPos.x, worldPos.y);
      const rawEndX = latestScreenPos.x;
      const rawEndY = latestScreenPos.y;

      // Initialize if needed
      if (this.smoothLineEndX === 0 && this.smoothLineEndY === 0) {
        this.smoothLineEndX = rawEndX;
        this.smoothLineEndY = rawEndY;
      } else {
        // Always update smoothed positions, even if off-screen
        this.smoothLineEndX =
          this.smoothLineEndX * this.config.lineEndSmoothing +
          rawEndX * (1 - this.config.lineEndSmoothing);
        this.smoothLineEndY =
          this.smoothLineEndY * this.config.lineEndSmoothing +
          rawEndY * (1 - this.config.lineEndSmoothing);
      }
    }

    // Only render the line if we have visible points
    if (points.length > 0) {
      // Replace the last point with the smoothed position to ensure line ends at dot
      if (this.smoothLineEndX !== 0) {
        // For sketch game, force the last point to be at exactly 50% height
        const endY =
          this.config.gameType === GameType.SKETCH
            ? this.height / 2
            : this.smoothLineEndY;
        points[points.length - 1] = {
          x: this.smoothLineEndX,
          y: endY,
        };
      }

      // Render line with smoothed end point
      this.lineRenderer.render({ points, smooth: true });
    }

    // Render horizontal line and dot - always render if we have data
    if (data.length > 0) {
      // Calculate the current position
      let dotX: number;
      let dotY: number;
      
      // Always use smoothed positions if they've been initialized
      // Check if either X or Y has been set (not both zero)
      const smoothedInitialized = !(this.smoothLineEndX === 0 && this.smoothLineEndY === 0);
      
      if (smoothedInitialized) {
        dotX = this.smoothLineEndX;
        dotY = this.config.gameType === GameType.SKETCH
          ? this.height / 2
          : this.smoothLineEndY;
      } else {
        // Fallback to calculating from latest data using same method as smooth update
        const dataIndex = data.length - 1;
        const worldPos = this.world.getLinePosition(
          dataIndex,
          this.dataOffset,
          Math.max(0, data[dataIndex].price)
        );
        const latestScreenPos = this.world.worldToScreen(worldPos.x, worldPos.y);
        dotX = latestScreenPos.x;
        dotY = this.config.gameType === GameType.SKETCH
          ? this.height / 2
          : latestScreenPos.y;
      }
      
      // Draw vertical NOW line instead of horizontal line
      if (dotX >= 0 && dotX <= this.width) {
        this.ctx.save();
        // Use signature color (theme.colors.primary) with 30% opacity
        const signatureColor = this.theme.colors?.primary || '#3b82f6';
        const r = parseInt(signatureColor.slice(1, 3), 16);
        const g = parseInt(signatureColor.slice(3, 5), 16);
        const b = parseInt(signatureColor.slice(5, 7), 16);
        this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]); // Dashed line
        this.ctx.beginPath();
        this.ctx.moveTo(dotX, 0);
        this.ctx.lineTo(dotX, this.height);
        this.ctx.stroke();
        this.ctx.restore();
      }
      
      // Render the price dot if it's within screen bounds
      if (dotX >= 0 && dotX <= this.width && dotY >= 0 && dotY <= this.height) {
        // Use signature color for the dot
        const dotColor = this.theme.colors?.primary || '#3b82f6';
        this.lineRenderer.renderDot(dotX, dotY, 5, dotColor);
        
        // Draw current price ticker at the dot position (to the left of the vertical NOW line)
        const latestPrice = data[data.length - 1].price;
        this.ctx.save();
        
        // Position ticker to the left of the vertical line
        const tickerX = dotX - 45; // 45px to the left of NOW line
        const tickerY = dotY;
        
        // Draw rounded background box using signature color (theme.colors.primary)
        const tickerColor = this.theme.colors?.primary || '#3b82f6';
        this.ctx.fillStyle = tickerColor;
        this.ctx.beginPath();
        this.ctx.roundRect(tickerX - 35, tickerY - 10, 70, 20, 4);
        this.ctx.fill();
        
        // Draw price text
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
          `$${latestPrice.toFixed(2)}`,
          tickerX,
          tickerY + 4
        );
        
        this.ctx.restore();
      }
    }
  }

  /**
   * Calculate viewport bounds in world coordinates for culling
   * @param buffer - Extra space around viewport to include partially visible boxes
   * @returns Viewport bounds in world space
   */
  private getViewportBoundsForCulling(buffer: number = 100): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    const viewportBounds = this.world.getVisibleWorldBounds(0);
    return {
      minX: viewportBounds.left - buffer,
      maxX: viewportBounds.right + buffer,
      minY: viewportBounds.bottom - buffer,
      maxY: viewportBounds.top + buffer,
    };
  }

  /**
   * Check if a box is outside the viewport (for early culling)
   * @param box - Box with worldX, worldY, width, height
   * @param viewport - Viewport bounds in world coordinates
   * @returns true if box is outside viewport, false if visible
   */
  private isBoxOutsideViewport(
    box: { worldX: number; worldY: number; width: number; height: number },
    viewport: { minX: number; maxX: number; minY: number; maxY: number }
  ): boolean {
    const boxRightEdge = box.worldX + box.width;
    const boxTopEdge = box.worldY + box.height;
    return (
      boxRightEdge < viewport.minX ||
      box.worldX > viewport.maxX ||
      boxTopEdge < viewport.minY ||
      box.worldY > viewport.maxY
    );
  }

  /**
   * Render probability heatmap overlay on unselected boxes
   * Uses color coding: Green (high probability) -> Yellow (medium) -> Red (low probability)
   * Probability is calculated based on multiplier values (lower multiplier = higher probability)
   * Only renders on boxes that haven't been selected and meet minimum multiplier threshold
   */
  private renderProbabilitiesHeatmap(): void {
    // Only render heatmap if enabled
    if (!this.config.showProbabilities) {
      return;
    }

    // Skip rendering for sketch and cobra games - boxes are only in memory
    if (
      this.config.gameType === GameType.SKETCH ||
      this.config.gameType === GameType.COBRA
    ) {
      return;
    }
    
    // ⚡ VIEWPORT CULLING: Calculate viewport bounds in world coordinates
    const viewport = this.getViewportBoundsForCulling();
    
    // Combine backend boxes with empty boxes for rendering
    // NOTE: Empty boxes do NOT have multiplier values - heatmap only shows on backend boxes
    const allBoxes = {
      ...this.backendMultipliers,
      ...Object.fromEntries(
        Object.entries(this.emptyBoxes).map(([id, box]) => [
          id,
          {
            ...box,
            value: 0, // Empty boxes have NO multiplier - heatmap won't render on them
            x: 0,
            y: 0,
            totalTrades: 0,
            status: undefined,
            timestampRange: undefined,
            priceRange: undefined,
            userTrade: undefined
          }
        ])
      )
    };

    let renderedCount = 0;
    let skippedVisibility = 0;
    let skippedSelected = 0;
    let skippedEmpty = 0;
    let skippedNoValue = 0;
    let skippedMinMult = 0;
    let skippedOffscreen = 0;
    let skippedViewportCull = 0;

    const now = Date.now();
    if (now - this.lastDebugLog > 2000) {
      this.debug('🔍 GridGame: Heatmap rendering', {
        backendBoxes: Object.keys(this.backendMultipliers).length,
        emptyBoxes: Object.keys(this.emptyBoxes).length,
        totalBoxes: Object.keys(allBoxes).length,
        minMultiplier: this.config.minMultiplier,
      });
    }

    Object.entries(allBoxes).forEach(([squareId, box]) => {
      // ⚡ EARLY VIEWPORT CULL: Check world coordinates before expensive worldToScreen conversion
      if (this.isBoxOutsideViewport(box, viewport)) {
        skippedViewportCull++;
        return;
      }
      
      // Skip if we have visible squares defined and this square is not in the list
      if (this.visibleSquares.size > 0 && !this.visibleSquares.has(squareId)) {
        skippedVisibility++;
        return;
      }

      // Skip if box is selected (heatmap only shows on unselected boxes)
      if (this.selectedSquareIds.has(squareId) || this.pendingSquareIds.has(squareId)) {
        skippedSelected++;
        return;
      }

      // Skip if box has no multiplier data or below min multiplier
      // Note: Only show heatmap on boxes with actual multiplier values (backend boxes)
      // Empty boxes (isEmpty: true) should NOT show heatmap - they're just grid placeholders
      if (box.isEmpty) {
        skippedEmpty++;
        return;
      }
      
      if (!box.value || box.value === 0) {
        skippedNoValue++;
        return;
      }
      
      if (box.value < this.config.minMultiplier) {
        skippedMinMult++;
        return;
      }

      // Use actual world coordinates from backend
      const worldX = box.worldX;
      const worldY = box.worldY;
      const boxWidth = box.width;
      const boxHeight = box.height;

      // Convert world coordinates to screen
      const topLeft = this.world.worldToScreen(worldX, worldY + boxHeight);
      const bottomRight = this.world.worldToScreen(worldX + boxWidth, worldY);

      const screenX = topLeft.x;
      const screenY = topLeft.y;
      const screenWidth = bottomRight.x - topLeft.x;
      const screenHeight = bottomRight.y - topLeft.y;

      // Skip if off-screen
      if (
        screenX > this.width ||
        screenX + screenWidth < 0 ||
        screenY > this.height ||
        screenY + screenHeight < 0
      ) {
        skippedOffscreen++;
        return;
      }

      renderedCount++;

      // Calculate probability based on multiplier
      // Lower multipliers = higher probability (green)
      const probability = Math.max(0, Math.min(1, (15 - box.value) / 14));
      
      // Create heatmap colors using TRADING_COLORS with shade variation based on multiplier
      // TRADING_COLORS.positive = #2fe3ac = rgb(47, 227, 172)
      // Proper trading red = #ef4444 = rgb(239, 68, 68) - NOT the pink #ec397a
      // Yellow = #facc15 = rgb(250, 204, 21)
      let heatmapColor;
      if (probability > 0.7) {
        // High probability - green (#2fe3ac)
        // Vary opacity more granularly: mult 1.0 = lighter, mult 5.0 = darker green
        const normalizedProb = (probability - 0.7) / 0.3; // 0 to 1 within green range
        const opacity = 0.04 + normalizedProb * 0.08; // 0.04 to 0.12 opacity (very subtle)
        heatmapColor = `rgba(47, 227, 172, ${opacity})`;
      } else if (probability > 0.4) {
        // Medium probability - yellow (#facc15)
        // Vary opacity: mult ~5.0-8.0 with gradual intensity
        const normalizedProb = (probability - 0.4) / 0.3; // 0 to 1 within yellow range
        const opacity = 0.05 + normalizedProb * 0.09; // 0.05 to 0.14 opacity (very subtle)
        heatmapColor = `rgba(250, 204, 21, ${opacity})`;
      } else {
        // Low probability - proper red (#ef4444)
        // Vary opacity: mult 8.0+ = darker red, up to mult 15.0
        const normalizedProb = (0.4 - probability) / 0.4; // 0 to 1 within red range
        const opacity = 0.06 + normalizedProb * 0.12; // 0.06 to 0.18 opacity (very subtle)
        heatmapColor = `rgba(239, 68, 68, ${opacity})`;
      }
      
      // Draw heatmap overlay only on unselected boxes
      this.ctx.fillStyle = heatmapColor;
      this.ctx.fillRect(screenX + 0.5, screenY + 0.5, screenWidth - 1, screenHeight - 1);
    });

    if (now - this.lastDebugLog > 2000) {
      this.debug('🔍 GridGame: Heatmap rendering complete', {
        rendered: renderedCount,
        skipped: {
          viewportCull: skippedViewportCull,
          visibility: skippedVisibility,
          selected: skippedSelected,
          empty: skippedEmpty,
          noValue: skippedNoValue,
          minMult: skippedMinMult,
          offscreen: skippedOffscreen,
          total: skippedViewportCull + skippedVisibility + skippedSelected + skippedEmpty + skippedNoValue + skippedMinMult + skippedOffscreen,
        }
      });
      this.lastDebugLog = now;
    }
  }

  private renderMultiplierOverlay(): void {
    // Skip rendering for sketch and cobra games - boxes are only in memory
    if (
      this.config.gameType === GameType.SKETCH ||
      this.config.gameType === GameType.COBRA
    ) {
      return;
    }

    // ⚡ VIEWPORT CULLING: Calculate viewport bounds in world coordinates
    const viewport = this.getViewportBoundsForCulling(100);

    // Use only backend boxes (filler grid archived)
    const allBoxes = {
      ...this.backendMultipliers
      // ...this.emptyBoxes - DISABLED: filler grid archived
    };

    // Reduced logging for performance

    // Render all boxes (backend + empty)
    Object.entries(allBoxes).forEach(([squareId, box]) => {
      // ⚡ EARLY VIEWPORT CULL: Check world coordinates before expensive worldToScreen conversion
      if (this.isBoxOutsideViewport(box, viewport)) {
        return;
      }
      
      // Skip if we have visible squares defined and this square is not in the list
      if (this.visibleSquares.size > 0 && !this.visibleSquares.has(squareId)) {
        return;
      }

      // Use actual world coordinates from backend
      const worldX = box.worldX;
      const worldY = box.worldY;
      const boxWidth = box.width;
      const boxHeight = box.height;

      // Convert world coordinates to screen
      const topLeft = this.world.worldToScreen(worldX, worldY + boxHeight);
      const bottomRight = this.world.worldToScreen(worldX + boxWidth, worldY);

      const screenWidth = bottomRight.x - topLeft.x;
      const screenHeight = bottomRight.y - topLeft.y;

      // Skip if off-screen
      if (
        topLeft.x > this.width ||
        bottomRight.x < 0 ||
        topLeft.y > this.height ||
        bottomRight.y < 0
      ) {
        return;
      }

      // Apply min multiplier filtering
      const shouldShow = box.isEmpty || box.value >= this.config.minMultiplier;
      
      const text = box.isEmpty ? '' : (shouldShow ? `${box.value.toFixed(1)}X` : '--');

      // Check if box is clickable - use cached value if available
      let isClickable = this.boxClickabilityCache.get(squareId);
      if (isClickable === undefined) {
        isClickable = this.isBoxClickable(box);
        this.boxClickabilityCache.set(squareId, isClickable);
      }

      // Update clickability cache every 10 frames to reduce flashing
      if (this.frameCount % 10 === 0) {
        const newClickability = this.isBoxClickable(box);
        if (newClickability !== isClickable) {
          this.boxClickabilityCache.set(squareId, newClickability);
        }
      }

      // Check if mouse is over this box (only if clickable)
      const isHovered =
        isClickable &&
        this.mouseX >= 0 &&
        this.mouseY >= 0 &&
        this.mouseX >= topLeft.x &&
        this.mouseX < bottomRight.x &&
        this.mouseY >= topLeft.y &&
        this.mouseY < bottomRight.y;

      const isPending = this.pendingSquareIds.has(squareId);
      const isSelected = this.selectedSquareIds.has(squareId);
      const isHighlighted = this.highlightedSquareIds.has(squareId);

      // Use backend status or WebSocket-based hit tracking
      const hasBeenHit = box.status === 'hit' || this.hitBoxes.has(squareId);
      const hasBeenMissed = this.missedBoxes.has(squareId);

      let state:
        | 'default'
        | 'hovered'
        | 'highlighted'
        | 'pending'
        | 'selected'
        | 'activated'
        | 'missed' = 'default';
      let animation: SquareRenderOptions['animation'] = undefined;

      if (hasBeenHit) {
        state = 'activated'; // Box has been hit (from WebSocket event)
        // Check for hit animation
        const animationData = this.squareAnimations.get(squareId);
        if (animationData && animationData.progress < 1) {
          animation = {
            progress: animationData.progress,
            type: 'activate',
          };
        }
      } else if (hasBeenMissed) {
        state = 'missed'; // Box was not hit
        // Check for miss animation
        const animationData = this.squareAnimations.get(squareId);
        if (animationData && animationData.progress < 1) {
          animation = {
            progress: animationData.progress,
            type: 'activate',
          };
        }
      } else if (isPending) {
        state = 'pending';
      } else if (isSelected) {
        state = 'selected';
        const animationData = this.squareAnimations.get(squareId);
        if (animationData && animationData.progress < 1) {
          animation = {
            progress: animationData.progress,
            type: 'select',
          };
        }
      } else if (isHighlighted) {
        state = 'highlighted';
      } else if (isHovered) {
        state = 'hovered';
      }

      // Calculate fade effect for boxes with dynamic thresholds
      const boxRightEdgeWorld = box.worldX + box.width;
      const boxRightEdgeScreenX = this.world.worldToScreen(boxRightEdgeWorld, 0).x;
      const pixelsPerPoint = this.config.pixelsPerPoint;
      const currentWorldX = (this.totalDataPoints - 1) * pixelsPerPoint;
      const bufferColumns =
        this.config.gameType === GameType.SKETCH ||
        this.config.gameType === GameType.COBRA
          ? 1
          : 2;
      const bufferPixels = box.width * bufferColumns;
      const clickableThreshold = currentWorldX + bufferPixels;
      const thresholdScreenX = this.world.worldToScreen(clickableThreshold, 0).x;
      const hasNowLine = Number.isFinite(this.smoothLineEndX) && this.smoothLineEndX > 0;
      const baseFadeDistance = Math.max(160, Math.abs(screenWidth) * 2.5);
      const shouldDelayFade = isSelected || state === 'activated' || state === 'missed';

      let opacity = 1.0;
      let fadeProgress = 0;

      if (
        !shouldDelayFade &&
        !isClickable &&
        Number.isFinite(thresholdScreenX) &&
        Number.isFinite(boxRightEdgeScreenX)
      ) {
        const distancePastThreshold = thresholdScreenX - boxRightEdgeScreenX;
        if (distancePastThreshold > 0) {
          fadeProgress = Math.min(distancePastThreshold / baseFadeDistance, 1);
        }
      }

      if (hasNowLine && Number.isFinite(boxRightEdgeScreenX)) {
        const delayPx = shouldDelayFade ? Math.max(30, Math.abs(screenWidth) * 0.2) : 0;
        const distancePastNow = this.smoothLineEndX - boxRightEdgeScreenX - delayPx;
        if (distancePastNow > 0 && Number.isFinite(distancePastNow)) {
          const progress = Math.min(distancePastNow / baseFadeDistance, 1);
          fadeProgress = Math.max(fadeProgress, progress);
        }
      } else if (
        shouldDelayFade &&
        !isClickable &&
        Number.isFinite(thresholdScreenX) &&
        Number.isFinite(boxRightEdgeScreenX)
      ) {
        const fallbackDistance = thresholdScreenX - boxRightEdgeScreenX;
        if (fallbackDistance > 0) {
          const progress = Math.min(fallbackDistance / baseFadeDistance, 1);
          fadeProgress = Math.max(fadeProgress, progress);
        }
      }

      if (fadeProgress > 0) {
        const eased = 1 - Math.pow(1 - fadeProgress, 2);
        opacity = Math.max(0, 1 - eased);
      }

      // Use actual screen size from backend coordinates
      this.squareRenderer.render({
        x: topLeft.x,
        y: topLeft.y,
        width: Math.abs(screenWidth),
        height: Math.abs(screenHeight),
        text: isHighlighted ? '?' : text,
        state: state || 'default',
        animation,
        opacity,
        showProbabilities: this.config.showProbabilities, // Pass heatmap setting for text brightness
        showUnifiedGrid: true, // Enable unified grid optimization to skip individual borders
        // Never show price ranges or timestamp ranges - only show multipliers
        timestampRange: undefined,
        priceRange: undefined,
        contractId: undefined,
      });

      // Render other players if enabled
      if (this.config.showOtherPlayers) {
        this.renderOtherPlayers(squareId, topLeft, screenWidth, screenHeight, opacity, isSelected);
      }

    });
  }

  private renderOtherPlayers(
    squareId: string, 
    topLeft: { x: number; y: number }, 
    screenWidth: number, 
    screenHeight: number, 
    opacity: number,
    isSelected: boolean = false
  ): void {
    const playerCount = this.otherPlayerCounts[squareId];
    const trackedPlayers = this.otherPlayerSelections[squareId];
    
    
    if (!playerCount || !trackedPlayers) return;

    // EXACT match to normal box-hit canvas styling
    const rectSize = 18; // Exact same size as normal canvas
    const overlapAmount = 2; // Exact same overlap
    const rectY = topLeft.y + 4; // 4px from top edge (exact match)
    
    // Calculate total elements in stack (tracked players + number box)
    const hasPlayerCount = playerCount > 0 ? 1 : 0;
    const totalElements = trackedPlayers.length + hasPlayerCount;
    
    if (totalElements > 0) {
      // Calculate total stack width for positioning
      const stackWidth = (totalElements * rectSize) - ((totalElements - 1) * overlapAmount);
      const startX = topLeft.x + screenWidth - stackWidth - 4; // Start from right edge, accounting for stack width
      
      // Apply fade opacity for other player elements (same as grid cells)
      const otherPlayerOpacity = opacity;
      
      // Draw elements so leftmost appears on top (draw rightmost first, leftmost last)
      
      // 1. Draw number box first (rightmost, will be behind others) - EXACT match
      if (playerCount > 0) {
        const playerCountValue = Math.max(playerCount, trackedPlayers.length);
        const numberBoxX = startX + (trackedPlayers.length * (rectSize - overlapAmount));
        
        // Rectangle background (match grid cell background) with fade
        this.ctx.fillStyle = `rgba(14,14,14,${otherPlayerOpacity})`;
        this.ctx.beginPath();
        this.ctx.roundRect(numberBoxX, rectY, rectSize, rectSize, 4);
        this.ctx.fill();
        
        // Rectangle border (match grid cell border styling) with fade
        let borderColor = '#2b2b2b';
        let borderWidth = 0.6;
        if (isSelected) {
          borderColor = this.theme.colors?.primary || '#3b82f6';
          borderWidth = 1;
        }
        this.ctx.strokeStyle = `rgba(${borderColor === '#2b2b2b' ? '43,43,43' : borderColor.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(',')},${otherPlayerOpacity})`;
        this.ctx.lineWidth = borderWidth;
        this.ctx.stroke();
        
        // Player count text (match grid cell text styling) with fade
        let textColor = 'rgba(255,255,255,0.12)';
        if (isSelected) {
          textColor = `rgba(255,255,255,${opacity})`;
        }
        // Apply fade to text color
        const textOpacity = textColor.includes('0.12') ? 0.12 * otherPlayerOpacity : parseFloat(textColor.split(',')[3].replace(')', '')) * otherPlayerOpacity;
        this.ctx.fillStyle = `rgba(255,255,255,${textOpacity})`;
        this.ctx.font = '14px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(playerCountValue.toString(), numberBoxX + rectSize / 2, rectY + rectSize / 2);
      }
      
      // 2. Draw tracked player boxes from right to left (so leftmost appears on top) - EXACT match
      for (let i = trackedPlayers.length - 1; i >= 0; i--) {
        const player = trackedPlayers[i];
        const boxX = startX + (i * (rectSize - overlapAmount));
        
        // Draw rectangular box background (match grid cell background) with fade
        this.ctx.fillStyle = `rgba(14,14,14,${otherPlayerOpacity})`;
        this.ctx.beginPath();
        this.ctx.roundRect(boxX, rectY, rectSize, rectSize, 4);
        this.ctx.fill();
        
        // Draw box border (match grid cell border styling) with fade
        let borderColor = '#2b2b2b';
        let borderWidth = 0.6;
        if (isSelected) {
          borderColor = this.theme.colors?.primary || '#3b82f6';
          borderWidth = 1;
        }
        this.ctx.strokeStyle = `rgba(${borderColor === '#2b2b2b' ? '43,43,43' : borderColor.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(',')},${otherPlayerOpacity})`;
        this.ctx.lineWidth = borderWidth;
        this.ctx.stroke();
        
        // Draw profile image if loaded, otherwise fallback to letter
        const img = this.otherPlayerImages[player.id];
        if (img) {
          // Draw the preloaded image inside the box with fade
          this.ctx.save();
          this.ctx.globalAlpha = otherPlayerOpacity;
          this.ctx.beginPath();
          this.ctx.roundRect(boxX + 1, rectY + 1, rectSize - 2, rectSize - 2, 3);
          this.ctx.clip();
          this.ctx.drawImage(img, boxX + 1, rectY + 1, rectSize - 2, rectSize - 2);
          this.ctx.restore();
        } else {
          // Fallback to first letter if image not loaded yet (match grid cell text styling) with fade
          let textColor = 'rgba(255,255,255,0.12)';
          if (isSelected) {
            textColor = `rgba(255,255,255,${opacity})`;
          }
          // Apply fade to text color
          const textOpacity = textColor.includes('0.12') ? 0.12 * otherPlayerOpacity : parseFloat(textColor.split(',')[3].replace(')', '')) * otherPlayerOpacity;
          this.ctx.fillStyle = `rgba(255,255,255,${textOpacity})`;
          this.ctx.font = '14px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(player.name.charAt(0).toUpperCase(), boxX + rectSize / 2, rectY + rectSize / 2);
        }
      }
    }
  }

  private renderXAxis(): void {
    const ctx = this.ctx;
    ctx.save();

    // Draw black background at bottom to cover boxes behind axis
    const axisY = this.height - 30;
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, axisY - 5, this.width, this.height - (axisY - 5));

    // Set up styling - make more visible when heatmap is enabled
    const axisOpacity = this.config.showProbabilities ? 0.6 : 0.3;
    const textOpacity = this.config.showProbabilities ? 0.9 : 0.6;
    ctx.strokeStyle = `rgba(255, 255, 255, ${axisOpacity})`;
    ctx.fillStyle = `rgba(255, 255, 255, ${textOpacity})`;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Draw horizontal line at bottom
    ctx.beginPath();
    ctx.moveTo(0, axisY);
    ctx.lineTo(this.width, axisY);
    ctx.stroke();

    const worldBounds = this.world.getVisibleWorldBounds(0);
    const startTimestamp = this.getTimestampForWorldX(worldBounds.left);
    const endTimestamp = this.getTimestampForWorldX(worldBounds.right);

    if (
      startTimestamp !== null
      && endTimestamp !== null
      && endTimestamp !== startTimestamp
    ) {
      const timeRangeMs = Math.max(1, endTimestamp - startTimestamp);
      const minPixelsPerTick = 100;
      const maxTicks = Math.max(1, Math.floor(this.width / minPixelsPerTick));
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
        const worldPos = this.getWorldXForTimestamp(ts);
        if (worldPos === null) continue;
        const screenX = this.world.worldToScreen(worldPos, 0).x;
        if (screenX < -40 || screenX > this.width + 40) continue;

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
        const worldPos = this.getWorldXForTimestamp(ts);
        if (worldPos === null) continue;
        const screenX = this.world.worldToScreen(worldPos, 0).x;
        if (screenX < -40 || screenX > this.width + 40) continue;

        ctx.beginPath();
        ctx.moveTo(screenX, axisY - 2);
        ctx.lineTo(screenX, axisY + 2);
        ctx.stroke();
      }
    }


    ctx.restore();
  }

  private renderYAxis(): void {
    const ctx = this.ctx;
    const minVisiblePrice = this.camera.y - this.visiblePriceRange / 2;
    const maxVisiblePrice = this.camera.y + this.visiblePriceRange / 2;

    const axisWidth = 46;
    const axisX = this.width - axisWidth;

    ctx.save();

    // Draw background strip similar to X-axis styling
    ctx.fillStyle = '#09090b';
    ctx.fillRect(axisX, 0, axisWidth, this.height);

    const axisOpacity = this.config.showProbabilities ? 0.6 : 0.3;
    const textOpacity = this.config.showProbabilities ? 0.9 : 0.65;

    ctx.strokeStyle = `rgba(255, 255, 255, ${axisOpacity})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(axisX, 0);
    ctx.lineTo(axisX, this.height);
    ctx.stroke();

    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(255, 255, 255, ${textOpacity})`;

    // Choose nice step based on visible range
    const targetTickCount = Math.max(5, Math.floor(this.height / 120));
    const roughStep = this.visiblePriceRange / targetTickCount;
    const niceSteps = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
    const step = niceSteps.find((value) => roughStep <= value) ?? niceSteps[niceSteps.length - 1];

    const startPrice = Math.floor(minVisiblePrice / step) * step;
    const endPrice = Math.ceil(maxVisiblePrice / step) * step;

    for (let price = startPrice; price <= endPrice; price += step) {
      const screenPos = this.world.worldToScreen(0, price);
      const y = screenPos.y;
      if (y < 10 || y > this.height - 10) continue;

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
        const screenPos = this.world.worldToScreen(0, minorPrice);
        const y = screenPos.y;
        if (y < 10 || y > this.height - 10) continue;

        ctx.beginPath();
        ctx.moveTo(axisX, y);
        ctx.lineTo(axisX + 4, y);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  private calculatePriceStep(priceRange: number): number {
    // Calculate appropriate step size for price markings
    // For sketch game, show more markings since boxes are smaller
    const targetMarkings =
      this.config.gameType === GameType.SKETCH ||
      this.config.gameType === GameType.COBRA
        ? 24
        : 8;
    const roughStep = priceRange / targetMarkings;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const normalizedStep = roughStep / magnitude;

    let step;
    if (normalizedStep <= 1) step = 1;
    else if (normalizedStep <= 2) step = 2;
    else if (normalizedStep <= 5) step = 5;
    else step = 10;

    return step * magnitude;
  }

  private renderSelectabilityBoundary(): void {
    // For sketch, draw a vertical line at the current price position
    // This shows where the non-selectable area ends (everything to the right is selectable)

    // Use the smoothed line end position for consistency
    if (this.smoothLineEndX > 0) {
      const screenX = this.smoothLineEndX;

      // Draw vertical line
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; // Same color as axis
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([5, 5]); // Dashed line
      this.ctx.beginPath();
      this.ctx.moveTo(screenX, 0);
      this.ctx.lineTo(screenX, this.height);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private renderDashedGrid(): void {
    const ctx = this.ctx;
    const gridSize = 50;
    ctx.save();

    const gridOpacity = this.config.showProbabilities ? 0.4 : 0.18;
    ctx.strokeStyle = `rgba(180, 180, 180, ${gridOpacity})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // Vertical lines follow camera.x
    const startWorldX = Math.floor((this.camera.x - gridSize * 2) / gridSize) * gridSize;
    const endWorldX = this.camera.x + this.width + gridSize * 2;

    for (let worldX = startWorldX; worldX <= endWorldX; worldX += gridSize) {
      const screenX = this.world.worldToScreen(worldX, this.camera.y).x;
      if (screenX < -gridSize || screenX > this.width + gridSize) continue;
      ctx.beginPath();
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, this.height);
      ctx.stroke();
    }

    // Horizontal lines track price scale
    const verticalMargin = this.height * this.config.verticalMarginRatio;
    const viewportHeight = this.height - 2 * verticalMargin;
    const pricePerPixel = this.visiblePriceRange > 0 ? this.visiblePriceRange / viewportHeight : 1;
    const gridStepPrice = gridSize * pricePerPixel;
    if (!Number.isFinite(gridStepPrice) || gridStepPrice <= 0) {
      ctx.restore();
      return;
    }
    const minPrice = this.camera.y - this.visiblePriceRange / 2 - gridStepPrice * 2;
    const maxPrice = this.camera.y + this.visiblePriceRange / 2 + gridStepPrice * 2;

    for (
      let price = Math.floor(minPrice / gridStepPrice) * gridStepPrice;
      price <= maxPrice;
      price += gridStepPrice
    ) {
      const screenY = this.world.worldToScreen(0, price).y;
      if (screenY < -gridSize || screenY > this.height + gridSize) continue;
      ctx.beginPath();
      ctx.moveTo(0, screenY);
      ctx.lineTo(this.width, screenY);
      ctx.stroke();
    }

    ctx.restore();
  }

  private getWorldXForTimestamp(timestamp: number): number | null {
    if (!this.priceData.length) {
      return null;
    }
    const lastPoint = this.priceData[this.priceData.length - 1];
    if (!lastPoint?.timestamp) {
      return null;
    }
    const deltaMs = timestamp - lastPoint.timestamp;
    const currentWorldX = (this.totalDataPoints - 1) * this.config.pixelsPerPoint;
    const offsetPoints = deltaMs / Math.max(1, this.msPerPointEstimate);
    return currentWorldX + offsetPoints * this.config.pixelsPerPoint;
  }

  private getTimestampForWorldX(worldX: number): number | null {
    if (!this.priceData.length) {
      return null;
    }
    const lastPoint = this.priceData[this.priceData.length - 1];
    if (!lastPoint?.timestamp) {
      return null;
    }
    const currentWorldX = (this.totalDataPoints - 1) * this.config.pixelsPerPoint;
    const deltaPoints = (worldX - currentWorldX) / this.config.pixelsPerPoint;
    return lastPoint.timestamp + deltaPoints * this.msPerPointEstimate;
  }

  private formatTimestampLabel(timestamp: number, includeMillis: boolean = false): string {
    const date = new Date(timestamp);
    if (includeMillis) {
      const millis = String(date.getMilliseconds()).padStart(3, '0');
      return `${date.toLocaleTimeString('en-US', { hour12: false })}.${millis}`;
    }
    return date.toLocaleTimeString('en-US', { hour12: false });
  }

  public getWorldPositionForTimestamp(timestamp: number): { worldX: number } | null {
    const worldX = this.getWorldXForTimestamp(timestamp);
    if (worldX === null) {
      return null;
    }
    return { worldX };
  }

  public setGridScale(columnWidth: number, rowHeight: number): void {
    if (Number.isFinite(columnWidth) && columnWidth > 0) {
      this.gridColumnWidth = columnWidth;
    }
    if (Number.isFinite(rowHeight) && rowHeight > 0) {
      this.gridRowHeight = rowHeight;
    }
  }

  public setGridOrigin(columnOrigin: number, rowOrigin: number): void {
    if (Number.isFinite(columnOrigin)) {
      this.gridColumnOrigin = columnOrigin;
    }
    if (Number.isFinite(rowOrigin)) {
      this.gridRowOrigin = rowOrigin;
    }
  }

  private renderUnifiedBorderGrid(): void {
    // Draw unified border grid for multiplier boxes to optimize performance
    // This replaces individual box borders with a single grid system
    
    this.ctx.save();
    const borderOpacity = this.config.showProbabilities ? 0.55 : 0.35;
    this.ctx.strokeStyle = `rgba(43, 43, 43, ${borderOpacity})`; // Softer border to avoid glare
    const borderLineWidth = Math.max(1, Math.min(1.4, this.dpr * 0.6));
    const pixelAlignOffset = borderLineWidth % 2 === 0 ? 0 : 0.5;
    this.ctx.lineWidth = borderLineWidth;
    this.ctx.setLineDash([]);

    const columnWidth = Math.max(this.config.pixelsPerPoint, this.gridColumnWidth);
    const rowHeight = Math.max(0.05, this.gridRowHeight);

    const startWorldX = Math.floor((this.camera.x - columnWidth * 3 - this.gridColumnOrigin) / columnWidth) * columnWidth + this.gridColumnOrigin;
    const endWorldX = this.camera.x + this.width + columnWidth * 3;

    for (let worldX = startWorldX; worldX <= endWorldX; worldX += columnWidth) {
      const screenX = this.world.worldToScreen(worldX, 0).x;
      if (screenX < -columnWidth || screenX > this.width + columnWidth) continue;
      const alignedX = Math.round(screenX) + pixelAlignOffset;
      this.ctx.beginPath();
      this.ctx.moveTo(alignedX, 0);
      this.ctx.lineTo(alignedX, this.height);
      this.ctx.stroke();
    }

    const gridStepPrice = rowHeight;
    if (!Number.isFinite(gridStepPrice) || gridStepPrice <= 0) {
      this.ctx.restore();
      return;
    }
    const minPrice = this.camera.y - this.visiblePriceRange / 2 - gridStepPrice * 2;
    const maxPrice = this.camera.y + this.visiblePriceRange / 2 + gridStepPrice * 2;

    for (
      let price = Math.floor((minPrice - this.gridRowOrigin) / gridStepPrice) * gridStepPrice + this.gridRowOrigin;
      price <= maxPrice;
      price += gridStepPrice
    ) {
      const screenY = this.world.worldToScreen(0, price).y;
      if (screenY < -columnWidth || screenY > this.height + columnWidth) continue;
      const alignedY = Math.round(screenY) + pixelAlignOffset;
      this.ctx.beginPath();
      this.ctx.moveTo(0, alignedY);
      this.ctx.lineTo(this.width, alignedY);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private isBoxClickable(box: BackendBox): boolean {
    // Get current X position based on data points
    const pixelsPerPoint = this.config.pixelsPerPoint;
    const currentWorldX = (this.totalDataPoints - 1) * pixelsPerPoint;

    // Use the box's right edge for a more stable calculation
    const boxRightEdge = box.worldX + box.width;

    // For sketch game, only require 1 column buffer worth of pixels
    // For other games, require 2 columns buffer
    const bufferColumns =
      this.config.gameType === GameType.SKETCH ||
      this.config.gameType === GameType.COBRA
        ? 1
        : 2;
    const bufferPixels = box.width * bufferColumns;

    // Box is clickable if its right edge is far enough ahead of current position
    return boxRightEdge >= currentWorldX + bufferPixels;
  }

  private isMouseOverSquare(mouseX: number, mouseY: number): boolean {
    if (mouseX < 0 || mouseY < 0) return false;

    // Skip for sketch and cobra games since boxes are not visible
    if (
      this.config.gameType === GameType.SKETCH ||
      this.config.gameType === GameType.COBRA
    ) {
      return false;
    }

    // Check against backend boxes (empty boxes are not hoverable since they're not clickable)
    for (const [squareId, box] of Object.entries(this.backendMultipliers)) {
      // Skip if we have visible squares defined and this square is not in the list
      if (this.visibleSquares.size > 0 && !this.visibleSquares.has(squareId)) {
        continue;
      }

      // Check if box is clickable (not too close to current position)
      if (!this.isBoxClickable(box)) {
        continue;
      }

      // Use actual world coordinates from backend
      const worldX = box.worldX;
      const worldY = box.worldY;
      const boxWidth = box.width;
      const boxHeight = box.height;

      // Convert world coordinates to screen
      const topLeft = this.world.worldToScreen(worldX, worldY + boxHeight);
      const bottomRight = this.world.worldToScreen(worldX + boxWidth, worldY);

      // Check if mouse is within box bounds
      if (
        mouseX >= topLeft.x &&
        mouseX < bottomRight.x &&
        mouseY >= topLeft.y &&
        mouseY < bottomRight.y
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Add external price data to the game
   * Applies smoothing and manages data point limit
   * 
   * @param data - Price data with price value and optional timestamp
   */
  public addPriceData(data: PriceData): void {
    // Apply smoothing
    if (this.priceData.length > 0) {
      const lastPrice = this.priceData[this.priceData.length - 1].price;
      const smoothFactor = 0.85;
      data.price = lastPrice * (1 - smoothFactor) + data.price * smoothFactor;

      const lastTimestamp = this.priceData[this.priceData.length - 1]?.timestamp;
      if (
        typeof lastTimestamp === 'number'
        && typeof data.timestamp === 'number'
      ) {
        const delta = data.timestamp - lastTimestamp;
        if (delta > 0 && delta < 60_000) {
          const smoothing = 0.9;
          this.msPerPointEstimate =
            this.msPerPointEstimate * smoothing + delta * (1 - smoothing);
        }
      }
    } else if (typeof data.timestamp === 'number') {
      this.msPerPointEstimate = Math.max(1, this.msPerPointEstimate);
    }

    this.priceData.push(data);
    this.totalDataPoints++;

    if (this.priceData.length > this.config.maxDataPoints) {
      this.priceData.shift();
      this.dataOffset++;
    }
  }

  /**
   * Update multipliers from backend
   * Intelligently updates only changed properties for performance
   * Automatically removes old boxes and limits total box count
   * 
   * @param multipliers - Record of multiplier data keyed by contract ID
   */
  public updateMultipliers(multipliers: BackendMultiplierMap): void {
    const now = Date.now();
    if (now - this.lastDebugLog > 2000) {
      this.debug('🔍 GridGame: updateMultipliers called', {
        newMultiplierCount: Object.keys(multipliers).length,
        existingBoxCount: Object.keys(this.backendMultipliers).length,
      });
      this.lastDebugLog = now;
    }

    // Intelligently update boxes - only update changed properties
    const newBoxIds = new Set(Object.keys(multipliers));
    const oldBoxIds = new Set(Object.keys(this.backendMultipliers));

    // Remove boxes that no longer exist (original 942b425 simple logic)
    for (const oldId of oldBoxIds) {
      if (!newBoxIds.has(oldId)) {
        delete this.backendMultipliers[oldId];
        this.boxClickabilityCache.delete(oldId);
        this.pendingSquareIds.delete(oldId);
      }
    }

    // Update or add boxes
    for (const [contractId, newContract] of Object.entries(multipliers)) {
      const existingContract = this.backendMultipliers[contractId];

      // For sketch/cobra games, keep boxes in memory but limit total count
      // Don't filter out boxes based on clickability here since they should remain visible
      // even after becoming non-clickable

      // Only update if the box is new or has changed
      if (
        !existingContract ||
        existingContract.totalTrades !== newContract.totalTrades ||
        existingContract.userTrade !== newContract.userTrade ||
        existingContract.value !== newContract.value ||
        existingContract.worldX !== newContract.worldX ||
        existingContract.worldY !== newContract.worldY
      ) {
        this.backendMultipliers[contractId] = newContract;
      }
    }

    // CRITICAL: Smart cleanup to prevent performance degradation
    // Only remove boxes that are FAR BEHIND the NOW line (camera position)
    // NEVER remove future boxes (right side of NOW line)
    const boxCount = Object.keys(this.backendMultipliers).length;
    if (boxCount > 800) {
      const currentWorldX = (this.totalDataPoints - 1) * this.config.pixelsPerPoint;
      
      // Calculate how far behind NOW line we should keep boxes
      // Keep boxes within 2 viewport widths behind NOW line
      const viewportWidth = this.width / this.camera.x; // Approximate viewport width in world units
      const keepBehindDistance = viewportWidth * 2;
      const minWorldXToKeep = currentWorldX - keepBehindDistance;
      
      // Only remove boxes that are far behind the NOW line
      const boxesToKeep: Array<[string, BackendBox]> = [];
      const boxesToRemove: string[] = [];
      
      Object.entries(this.backendMultipliers).forEach(([id, box]) => {
        // Keep ALL boxes at or ahead of NOW line (right side)
        // Keep boxes behind NOW line that are within viewport buffer
        if (box.worldX >= minWorldXToKeep) {
          boxesToKeep.push([id, box]);
        } else {
          boxesToRemove.push(id);
        }
      });
      
      this.backendMultipliers = Object.fromEntries(boxesToKeep);
      
      // Also clear hit/missed boxes that are no longer in backend
      const remainingIds = new Set(Object.keys(this.backendMultipliers));
      const hitBoxesToRemove: string[] = [];
      const missedBoxesToRemove: string[] = [];
      
      this.hitBoxes.forEach(id => {
        if (!remainingIds.has(id)) {
          hitBoxesToRemove.push(id);
        }
      });
      
      this.missedBoxes.forEach(id => {
        if (!remainingIds.has(id)) {
          missedBoxesToRemove.push(id);
        }
      });
      
      hitBoxesToRemove.forEach(id => this.hitBoxes.delete(id));
      missedBoxesToRemove.forEach(id => this.missedBoxes.delete(id));
      
      // Clean up other data structures to prevent memory leaks
      this.processedBoxes.clear(); // This can be cleared since we're removing old boxes
      
      // Clean up animations for removed boxes
      const animationKeysToRemove: string[] = [];
      this.squareAnimations.forEach((_, key) => {
        if (!remainingIds.has(key)) {
          animationKeysToRemove.push(key);
        }
      });
      animationKeysToRemove.forEach(key => this.squareAnimations.delete(key));
      
      // Log cleanup for debugging
      const now = Date.now();
      if (now - this.lastDebugLog > 5000) {
        this.debug('🧹 Backend cleanup:', {
          totalBefore: boxCount,
          keptBoxes: boxesToKeep.length,
          removedBoxes: boxesToRemove.length,
          removedFromHit: hitBoxesToRemove.length,
          removedFromMissed: missedBoxesToRemove.length,
          removedAnimations: animationKeysToRemove.length,
        });
        this.lastDebugLog = now;
      }
    }
  }

  public clearHighlights(): void {
    this.highlightedSquareIds.clear();
  }

  // Method to start without internal websocket
  public startWithExternalData(): void {
    this.start();
  }

  public destroy(): void {
    if (this.eventSource) {
      this.eventSource.close();
    }

    // Remove dragging event listeners
    this.canvas.removeEventListener('mousedown', this.boundHandleMouseDown);
    this.canvas.removeEventListener('mouseup', this.boundHandleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.boundHandleMouseUp);

    super.destroy();
  }

  public markContractAsHit(contractId: string): void {
    this.hitBoxes.add(contractId);
    this.pendingSquareIds.delete(contractId);
    
    // Update backend data status if contract exists
    if (this.backendMultipliers[contractId]) {
      this.backendMultipliers[contractId].status = 'hit';
      
      // Trigger hit animation
      this.squareAnimations.set(contractId, {
        progress: 0,
        type: 'activate',
        startTime: performance.now(),
      });
    }
    
    // Clear from highlighted (but keep in selectedSquareIds so box stays visible)
    this.highlightedSquareIds.delete(contractId);
    // DON'T remove from selectedSquareIds - let the render state handle the visual change
    
    // Emit selection change event to update right panel
    this.emit('selectionChanged', {});
  }

  public markContractAsMissed(contractId: string): void {
    this.missedBoxes.add(contractId);
    this.pendingSquareIds.delete(contractId);
    
    // Update backend data status if contract exists (for consistency)
    if (this.backendMultipliers[contractId]) {
      this.backendMultipliers[contractId].status = 'missed';
      
      // Trigger missed animation
      this.squareAnimations.set(contractId, {
        progress: 0,
        type: 'activate',
        startTime: performance.now(),
      });
    }
    
    // Clear from highlighted (but keep in selectedSquareIds so box stays visible)
    this.highlightedSquareIds.delete(contractId);
    // DON'T remove from selectedSquareIds - let the render state handle the visual change
    
    // Emit selection change event to update right panel
    this.emit('selectionChanged', {});
  }

  public confirmSelectedContract(contractId: string): void {
    const wasPending = this.pendingSquareIds.delete(contractId);
    if (!wasPending) {
      return;
    }

    // Ensure the contract stays tracked as selected
    if (!this.selectedSquareIds.has(contractId)) {
      this.selectedSquareIds.add(contractId);
    }

    // Kick off the standard selection animation now that we have confirmation
    this.squareAnimations.set(contractId, {
      startTime: performance.now(),
      progress: 0,
      type: 'select',
    });

    this.emit('selectionChanged', {});
  }

  public cancelPendingContract(contractId: string, options?: { keepHighlight?: boolean }): void {
    const keepHighlight = options?.keepHighlight ?? false;
    const wasPending = this.pendingSquareIds.delete(contractId);
    const wasSelected = this.selectedSquareIds.delete(contractId);
    const wasHighlighted = this.highlightedSquareIds.has(contractId);

    if (keepHighlight) {
      this.highlightedSquareIds.add(contractId);
    } else {
      this.highlightedSquareIds.delete(contractId);
    }

    if (wasPending || wasSelected || keepHighlight || wasHighlighted) {
      this.squareAnimations.delete(contractId);
      this.emit('selectionChanged', {});
    }
  }

  public cancelAllPendingContracts(options?: { keepHighlight?: boolean }): void {
    const ids = Array.from(this.pendingSquareIds);
    ids.forEach((id) => this.cancelPendingContract(id, options));
  }

  /**
   * Liang-Barsky line-rectangle intersection algorithm
   * Checks if a line segment intersects with a rectangle
   */
  private segmentIntersectsRect(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    r: { x: number; y: number; w: number; h: number }
  ): boolean {
    let t0 = 0, t1 = 1;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const p = [-dx, dx, -dy, dy];
    const q = [p1.x - r.x, r.x + r.w - p1.x, p1.y - r.y, r.y + r.h - p1.y];
    
    for (let i = 0; i < 4; i++) {
      if (p[i] === 0) {
        if (q[i] < 0) return false;
      } else {
        const t = q[i] / p[i];
        if (p[i] < 0) {
          if (t > t1) return false;
          if (t > t0) t0 = t;
        } else {
          if (t < t0) return false;
          if (t < t1) t1 = t;
        }
      }
    }
    return true;
  }

  /**
   * Check for price line collisions with selected boxes (immediate HIT detection)
   * This runs every frame to detect hits as soon as price touches a box
   */
  protected checkPriceCollisions(): void {
    // Local collision-based hit detection disabled; rely on clearing house events.
  }

  /**
   * Check for boxes that have passed the NOW line and mark unselected as MISSED
   * This runs every frame to detect when boxes cross the NOW line
   * IMPORTANT: Only marks as MISS if selected but not yet hit
   */
  protected checkBoxesPastNowLine(): void {
    // Local miss detection disabled; rely on clearing house events.
  }

  public clearHitContract(contractId: string): void {
    this.hitBoxes.delete(contractId);
  }

  public clearMissedContract(contractId: string): void {
    this.missedBoxes.delete(contractId);
  }

  public clearAllHitContracts(): void {
    this.hitBoxes.clear();
  }

  public clearAllMissedContracts(): void {
    this.missedBoxes.clear();
  }

  public getHitBoxes(): string[] {
    return Array.from(this.hitBoxes);
  }

  public getMissedBoxes(): string[] {
    return Array.from(this.missedBoxes);
  }

  public getSelectedSquares(): string[] {
    return Array.from(this.selectedSquareIds);
  }

  /**
   * Update configuration values without recreating the game instance
   * Useful for updating heatmap visibility, min multiplier, and other settings
   * 
   * @param newConfig - Partial configuration to merge with existing config
   */
  public updateConfig(newConfig: Partial<GridGameConfig>): void {
    this.debug('🎯 GridGame: updateConfig called with:', newConfig);
    this.config = { ...this.config, ...newConfig };
    if (newConfig.pixelsPerPoint !== undefined) {
      this.world.setPixelsPerPoint(newConfig.pixelsPerPoint);
    }
    this.debug('🎯 GridGame: Updated config showOtherPlayers:', this.config.showOtherPlayers);
  }

  public setOtherPlayerData(
    playerCounts: {[key: string]: number}, 
    playerSelections: {[key: string]: Array<{id: string, name: string, avatar: string, type: string}>},
    playerImages: {[key: string]: HTMLImageElement}
  ): void {
    this.otherPlayerCounts = playerCounts;
    this.otherPlayerSelections = playerSelections;
    this.otherPlayerImages = playerImages;

  }

  public getBackendMultipliers(): BackendMultiplierMap {
    return this.backendMultipliers;
  }

  public getCurrentWorldX(): number {
    return (this.totalDataPoints - 1) * this.config.pixelsPerPoint;
  }


  public getViewportBounds(): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } | null {
    // Calculate viewport bounds based on camera position and visible range
    if (!this.camera || this.visiblePriceRange === 0) {
      return null;
    }

    // Calculate visible world X range
    // Use WorldCoordinateSystem to get actual visible bounds
    const worldBounds = this.world.getVisibleWorldBounds(0);
    
    // Add buffer for better coverage
    const bufferX = (worldBounds.right - worldBounds.left) * 0.5; // 50% buffer
    const bufferY = this.visiblePriceRange * 0.5; // 50% buffer
    
    // Calculate X bounds with buffer
    const minX = worldBounds.left - bufferX;
    const maxX = worldBounds.right + bufferX;

    // Calculate Y bounds with buffer  
    const minY = worldBounds.bottom - bufferY;
    const maxY = worldBounds.top + bufferY;

    const bounds = { minX, maxX, minY, maxY };
    return bounds;
  }

  // Method to reset camera to follow price
  public resetCameraToFollowPrice(): void {
    this.isFollowingPrice = true;

    if (this.priceData.length > 0) {
      const latest = this.priceData[this.priceData.length - 1];
      const latestPrice = typeof latest.price === 'number'
        ? Math.max(0, latest.price)
        : 0;

      // Align horizontal camera target with the latest data point
      const dataPoints = Math.max(1, this.totalDataPoints);
      const pixelsPerPoint = this.config.pixelsPerPoint;
      const cameraOffsetRatio = this.config.cameraOffsetRatio ?? 0;
      const targetOffsetX = this.width * cameraOffsetRatio;
      const lineEndWorldX = (dataPoints - 1) * pixelsPerPoint;
      const targetX = Math.max(0, lineEndWorldX - targetOffsetX);

      this.camera.targetX = targetX;
      this.camera.x = targetX;
      this.camera.smoothX = targetX;

      // Snap vertical position to the latest price while respecting current visible range
      const minVisibleY = this.visiblePriceRange > 0
        ? this.visiblePriceRange / 2
        : latestPrice;
      const targetY = Math.max(minVisibleY, latestPrice);

      this.camera.targetY = targetY;
      this.camera.y = targetY;
      this.camera.smoothY = targetY;
    }

    this.emit('cameraFollowingChanged', { isFollowing: true });
  }

  // Method to get current following state
  public isCameraFollowingPrice(): boolean {
    return this.isFollowingPrice;
  }

  /**
   * Generate basic empty boxes for mock backend when no backend contracts exist
   */
  private generateBasicEmptyBoxes(viewport: { minX: number; maxX: number; minY: number; maxY: number }): void {
    const boxWidth = 25; // Default box width
    const boxHeight = 10; // Default box height
    
    // Generate empty boxes in a simple grid pattern
    const startX = Math.floor(viewport.minX / boxWidth) * boxWidth;
    const startY = Math.floor(viewport.minY / boxHeight) * boxHeight;
    const endX = Math.ceil(viewport.maxX / boxWidth) * boxWidth + boxWidth;
    const endY = Math.ceil(viewport.maxY / boxHeight) * boxHeight + boxHeight;
    
    for (let worldX = startX; worldX <= endX; worldX += boxWidth) {
      for (let worldY = startY; worldY <= endY; worldY += boxHeight) {
        const emptyBoxId = `empty_${worldX}_${worldY}`;
        
        if (!this.emptyBoxes[emptyBoxId]) {
          this.emptyBoxes[emptyBoxId] = {
            worldX,
            worldY,
            width: boxWidth,
            height: boxHeight,
            isEmpty: true,
            isClickable: false,
            value: 0, // Will be generated in heatmap rendering
          };
        }
      }
    }
  }

  /**
   * Analyzes the current viewport and generates empty boxes to fill empty spaces
   * Based on the algorithm: for any existing box at (X,Y) with dimensions (w,h),
   * check positions X+m*w, Y+n*h where m,n are integers for empty spaces
   * 
   * ⚠️ CRITICAL PERFORMANCE NOTE:
   * - DO NOT clear this.emptyBoxes = {} - causes grid to regenerate and move jerkily
   * - DO NOT regenerate existing empty boxes - preserves multipliers and coordinates
   * - Only ADD new empty boxes for newly visible viewport areas
   * - Grid must stay STATIC while NOW line moves - this is the core design!
   */
  private generateEmptyBoxes(): void {
    // Get viewport bounds
    const viewport = this.getViewportBounds();
    if (!viewport) {
      return;
    }

    // Get existing boxes to understand the grid
    const existingBoxes = Object.values(this.backendMultipliers);
    if (existingBoxes.length === 0) {
      // Generate basic empty boxes for mock backend when no contracts exist
      this.generateBasicEmptyBoxes(viewport);
      return;
    }

    // Reduced logging for performance

    // Use first box to determine standard dimensions
    const standardBox = existingBoxes[0];
    if (!standardBox) return;

    const boxWidth = standardBox.width;
    const boxHeight = standardBox.height;

    // CRITICAL: DON'T clear existing empty boxes - causes jerky movement!
    // Only add new empty boxes for newly visible areas
    // this.emptyBoxes = {}; // ❌ REMOVED - was causing grid to regenerate and move

    // CRITICAL: Calculate grid offset ONCE and store it permanently
    // If we recalculate it every time, the grid will shift when old boxes are cleaned up
    // This was causing the grid to start moving/glitching after ~150 seconds
    if (this.gridOffsetX === null || this.gridOffsetY === null) {
      // First time - calculate and store grid offset from first backend box
      if (existingBoxes.length > 0) {
        const referenceBox = existingBoxes[0];
        this.gridOffsetX = referenceBox.worldX % boxWidth;
        this.gridOffsetY = referenceBox.worldY % boxHeight;
      } else {
        // No backend boxes yet - use zero offset
        this.gridOffsetX = 0;
        this.gridOffsetY = 0;
      }
    }
    
    // Use the stored grid offset (never recalculate after first time)
    const gridOffsetX = this.gridOffsetX;
    const gridOffsetY = this.gridOffsetY;

    // Create a set of occupied positions for quick lookup
    const occupiedPositions = new Set<string>();
    
    // Add all existing backend boxes to occupied set using grid-aligned positions
    Object.values(this.backendMultipliers).forEach(box => {
      // Calculate grid position based on aligned coordinates
      const alignedX = box.worldX - gridOffsetX;
      const alignedY = box.worldY - gridOffsetY;
      const gridX = Math.round(alignedX / boxWidth);
      const gridY = Math.round(alignedY / boxHeight);
      occupiedPositions.add(`${gridX}_${gridY}`);
    });

    // Calculate grid bounds using aligned viewport
    const alignedMinX = viewport.minX - gridOffsetX;
    const alignedMaxX = viewport.maxX - gridOffsetX;
    const alignedMinY = viewport.minY - gridOffsetY;
    const alignedMaxY = viewport.maxY - gridOffsetY;

    const minGridX = Math.floor(alignedMinX / boxWidth);
    const maxGridX = Math.ceil(alignedMaxX / boxWidth);
    const minGridY = Math.floor(alignedMinY / boxHeight);
    const maxGridY = Math.ceil(alignedMaxY / boxHeight);
    
    // Fill all grid positions within viewport bounds
    for (let gridX = minGridX; gridX <= maxGridX; gridX++) {
      for (let gridY = minGridY; gridY <= maxGridY; gridY++) {
        const positionKey = `${gridX}_${gridY}`;
        
        // Skip if position is already occupied by backend box
        if (occupiedPositions.has(positionKey)) {
          continue;
        }
        
        // Create empty box ID
        const emptyBoxId = `empty_${gridX}_${gridY}`;
        
        // CRITICAL: Only create if doesn't exist - prevents jerky movement
        // ⚠️ DO NOT regenerate existing empty boxes - causes grid to jump/move!
        if (!this.emptyBoxes[emptyBoxId]) {
        // Calculate world coordinates with grid alignment
        const worldX = gridX * boxWidth + gridOffsetX;
        const worldY = gridY * boxHeight + gridOffsetY;
        
        this.emptyBoxes[emptyBoxId] = {
          worldX,
          worldY,
          width: boxWidth,
          height: boxHeight,
          isEmpty: true,
            isClickable: false,
            // NO value - empty boxes are just grid placeholders
            // Heatmap only shows on backend boxes with actual multipliers
        };
      }
    }
    }
    // Reduced logging for performance
  }

  /**
   * Updates the viewport analysis and regenerates empty boxes
   * Should be called when camera position changes or viewport size changes
   */
  private updateEmptyBoxes(): void {
    // Only generate empty boxes for certain game types
    if (this.config.gameType === GameType.SKETCH || this.config.gameType === GameType.COBRA) {
      return; // Skip for games where boxes are not visible
    }

    // Throttle empty box generation to avoid performance issues
    if (this.frameCount % 30 === 0) { // Update every 30 frames (0.5 seconds at 60fps)
      this.generateEmptyBoxes();
      
      // CRITICAL: Clean up old empty boxes to prevent memory leaks
      // Empty boxes accumulate over time and slow down rendering
      this.cleanupOldEmptyBoxes();
    }
  }
  
  /**
   * Remove empty boxes that are FAR BEHIND the NOW line
   * NEVER remove future boxes (right side of NOW line)
   * This prevents the emptyBoxes object from growing indefinitely
   */
  private cleanupOldEmptyBoxes(): void {
    const currentWorldX = (this.totalDataPoints - 1) * this.config.pixelsPerPoint;
    const viewport = this.getViewportBounds();
    if (!viewport) return;
    
    // Calculate how far behind NOW line we should keep empty boxes
    // Keep boxes within 3 viewport widths behind NOW line
    const viewportWidth = viewport.maxX - viewport.minX;
    const viewportHeight = viewport.maxY - viewport.minY;
    const keepBehindDistance = viewportWidth * 3;
    const minWorldXToKeep = currentWorldX - keepBehindDistance;
    
    // Vertical buffer for Y axis (keep boxes slightly above/below viewport)
    const minY = viewport.minY - (viewportHeight * 2);
    const maxY = viewport.maxY + (viewportHeight * 2);
    
    // Remove empty boxes that are far behind NOW line or far outside Y viewport
    const emptyBoxIds = Object.keys(this.emptyBoxes);
    let removedCount = 0;
    
    for (const boxId of emptyBoxIds) {
      const box = this.emptyBoxes[boxId];
      
      // CRITICAL: Only remove boxes FAR BEHIND the NOW line (left side)
      // NEVER remove boxes at or ahead of NOW line (right side)
      // Also remove boxes that are way above or below viewport (Y axis)
      const isFarBehindNowLine = box.worldX + box.width < minWorldXToKeep;
      const isFarOutsideYViewport = box.worldY + box.height < minY || box.worldY > maxY;
      
      if (isFarBehindNowLine || isFarOutsideYViewport) {
        delete this.emptyBoxes[boxId];
        removedCount++;
      }
    }
    
    // Log cleanup periodically for debugging
    const now = Date.now();
    if (removedCount > 0 && now - this.lastDebugLog > 5000) {
      this.debug('🧹 Cleaned up old empty boxes:', {
        removed: removedCount,
        remaining: Object.keys(this.emptyBoxes).length,
        nowLineX: currentWorldX.toFixed(0),
        minXKept: minWorldXToKeep.toFixed(0),
      });
      this.lastDebugLog = now;
    }
  }

  // REMOVED: cleanupOldBoxes() function
  // This was added as an optimization but causes boxes to disappear
  // The original 942b425 implementation didn't have this
  // Simple box limiting in updateMultipliers() is sufficient
}
