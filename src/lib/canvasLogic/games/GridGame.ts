import { GameType, IronCondorGameType } from '@/types';
import { BaseGame, GameConfig } from '../core/BaseGame';
import { Camera, WorldCoordinateSystem } from '../core/WorldCoordinateSystem';
import { LineRenderer, Point } from '../rendering/LineRenderer';
import {
  SquareRenderer,
  SquareRenderOptions,
} from '../rendering/SquareRenderer';

export interface PriceData {
  price: number;
  timestamp?: number;
}

export interface SquareAnimation {
  startTime: number;
  progress: number;
}

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
  visibleSquares?: Array<{ gridX: number; gridY: number }>; // For boxes mode - only show these squares
  showDashedGrid?: boolean; // For boxes mode - show dashed grid background
  debugMode?: boolean; // Show debug info in corners
  gameType?: IronCondorGameType; // Game type for rendering adjustments
}

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
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragStartCameraX: number = 0;
  private dragStartCameraY: number = 0;
  private isFollowingPrice: boolean = true; // Track if camera should follow price
  
  // Bound event handlers for cleanup
  private boundHandleMouseDown: (e: MouseEvent) => void;
  private boundHandleMouseUp: (e: MouseEvent) => void;

  protected smoothLineEndX: number = 0;
  protected smoothLineEndY: number = 0;
  protected totalDataPoints: number = 0;
  protected dataOffset: number = 0;

  protected selectedSquareIds: Set<string> = new Set();
  protected highlightedSquareIds: Set<string> = new Set();
  protected squareAnimations: Map<string, SquareAnimation> = new Map();
  protected hitBoxes: Set<string> = new Set(); // Boxes that have been hit based on WebSocket events
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
  }> = {}; // Generated empty boxes to fill viewport

  protected world: WorldCoordinateSystem;
  protected eventSource: EventSource | null = null;
  protected squareRenderer: SquareRenderer;
  protected lineRenderer: LineRenderer;
  protected backendMultipliers: Record<
    string,
    {
      value: number;
      x: number;
      y: number;
      worldX: number;
      worldY: number;
      width: number;
      height: number;
      totalBets: number;
      userBet?: number;
      timestampRange?: {
        start: number;
        end: number;
      };
      priceRange?: {
        min: number;
        max: number;
      };
      status?: 'hit';
      isEmpty?: boolean;
      isClickable?: boolean;
    }
  > = {};
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
      smoothingFactorX: 0.3, // Light smoothing for fluid movement without excessive lag
      smoothingFactorY: 0.92,
      lineEndSmoothing: 0.88,
      animationDuration: 800,
      maxDataPoints: 500,
      showMultiplierOverlay: true,
      externalDataSource: false,
      visibleSquares: [],
      showDashedGrid: false,
      debugMode: false,
      gameType: GameType.GRID,
      ...config,
    };

    // Initialize visible squares (for boxes mode)
    if (config?.visibleSquares) {
      config.visibleSquares.forEach((square) => {
        this.visibleSquares.add(`${square.gridX}_${square.gridY}`);
      });
    }

    this.world = new WorldCoordinateSystem(this.camera);
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

    // Start drag
    this.isDragging = true;
    this.dragStartX = x;
    this.dragStartY = y;
    this.dragStartCameraX = this.camera.x;
    this.dragStartCameraY = this.camera.y;
    
    this.canvas.style.cursor = 'grabbing';
  }

  protected handleMouseUp(e: MouseEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.canvas.style.cursor = 'default';
      
      // If the user dragged significantly, disable price following
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const dragDistance = Math.sqrt(
        Math.pow(x - this.dragStartX, 2) + Math.pow(y - this.dragStartY, 2)
      );
      
      // If dragged more than 10 pixels, disable price following
      if (dragDistance > 10) {
        this.isFollowingPrice = false;
        this.emit('cameraFollowingChanged', { isFollowing: false });
      }
    }
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
          if (this.highlightedSquareIds.has(clickedSquareId)) {
            // Second click - select the square and clear highlight
            this.highlightedSquareIds.delete(clickedSquareId);
            this.selectedSquareIds.add(clickedSquareId);
            this.squareAnimations.set(clickedSquareId, {
              startTime: performance.now(),
              progress: 0,
            });
            this.emit('squareSelected', { squareId: clickedSquareId });
          } else if (!this.selectedSquareIds.has(clickedSquareId)) {
            // First click - highlight the square (clear any other highlights)
            this.highlightedSquareIds.clear();
            this.highlightedSquareIds.add(clickedSquareId);
            // Don't emit event on first click - wait for confirmation
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
    if (this.isDragging) {
      const deltaX = this.mouseX - this.dragStartX;
      const deltaY = this.mouseY - this.dragStartY;
      
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
    this.canvas.style.cursor = 'default';
    
    // Also handle as mouse up to stop dragging when leaving canvas
    if (this.isDragging) {
      this.handleMouseUp(e);
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

    // Calculate visible price range
    this.visiblePriceRange = viewportHeight * this.config.pricePerPixel;

    // If we have backend boxes, use their actual height
    const boxValues = Object.values(this.backendMultipliers);
    if (boxValues.length > 0 && boxValues[0]) {
      const boxHeight = boxValues[0].height;
      // Show more boxes for sketch and cobra games (30 boxes vs 10)
      const boxesVisible =
        this.config.gameType === GameType.SKETCH ||
        this.config.gameType === GameType.COBRA
          ? 30
          : 10;
      this.visiblePriceRange = boxHeight * boxesVisible;
    }

    // Update world viewport
    this.world.updateViewport(viewportHeight, this.visiblePriceRange);

    const data = this.priceData;
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

      // Camera Y following behavior
      if (this.config.gameType === GameType.SKETCH) {
        // For sketch game: directly set camera Y to keep price centered (no smoothing)
        this.camera.targetY = lineEndWorldY;
        this.camera.smoothY = lineEndWorldY;
        this.camera.y = lineEndWorldY;
      } else {
        // For other games: smart camera following - only follow when price is outside 40-59% bounds
        const currentPriceScreenY =
          this.height / 2 -
          (lineEndWorldY - this.camera.y) *
            (viewportHeight / this.visiblePriceRange);
        const screenPercent = currentPriceScreenY / this.height;

        // Only update target Y if price is outside 40-59% range
        if (screenPercent < 0.4 || screenPercent > 0.59) {
          this.camera.targetY = lineEndWorldY;
        }
        // Otherwise keep current target (don't follow)
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

      // Round camera X to whole pixels to prevent sub-pixel jitter
      this.camera.x = Math.round(this.camera.smoothX);
    }

    // Update square animations
    this.squareAnimations.forEach((animation, squareId) => {
      const elapsed = performance.now() - animation.startTime;
      // Use shorter duration for activation animations (400ms vs 800ms for selection)
      const isActivation = this.hitBoxes.has(squareId);
      const duration = isActivation ? 400 : this.config.animationDuration;
      animation.progress = Math.min(elapsed / duration, 1);
    });

    // Update empty boxes based on viewport changes
    this.updateEmptyBoxes();
  }

  protected render(): void {
    this.clearCanvas();

    // Draw dashed grid first (if enabled)
    if (this.config.showDashedGrid) {
      this.renderDashedGrid();
    }

    const data = [...this.priceData];

    // Draw multiplier overlay first (background)
    if (this.config.showMultiplierOverlay) {
      this.renderMultiplierOverlay();
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

  private renderMultiplierOverlay(): void {
    // Skip rendering for sketch and cobra games - boxes are only in memory
    if (
      this.config.gameType === GameType.SKETCH ||
      this.config.gameType === GameType.COBRA
    ) {
      return;
    }

    // Cache current world X to avoid recalculating for each box
    const currentWorldX =
      (this.totalDataPoints - 1) * this.config.pixelsPerPoint;

    // Combine backend boxes with empty boxes for rendering
    const allBoxes = {
      ...this.backendMultipliers,
      ...Object.fromEntries(
        Object.entries(this.emptyBoxes).map(([id, box]) => [
          id,
          {
            ...box,
            value: 0,
            x: 0,
            y: 0,
            totalBets: 0,
            status: undefined,
            timestampRange: undefined,
            priceRange: undefined,
            userBet: undefined
          }
        ])
      )
    };

    const emptyBoxCount = Object.keys(this.emptyBoxes).length;
    if (emptyBoxCount > 0) {
      console.log('🎨 Rendering with', emptyBoxCount, 'empty boxes');
    }

    // Render all boxes (backend + empty)
    Object.entries(allBoxes).forEach(([squareId, box]) => {
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

      const text = box.isEmpty ? '' : `${box.value.toFixed(1)}X`;

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

      const isSelected = this.selectedSquareIds.has(squareId);
      const isHighlighted = this.highlightedSquareIds.has(squareId);

      // Use backend status or WebSocket-based hit tracking
      const hasBeenHit = box.status === 'hit' || this.hitBoxes.has(squareId);

      let state:
        | 'default'
        | 'hovered'
        | 'highlighted'
        | 'selected'
        | 'activated' = 'default';
      let animation: SquareRenderOptions['animation'] = undefined;

      if (hasBeenHit) {
        state = 'activated'; // Box has been hit (from WebSocket event)
        const animationData = this.squareAnimations.get(squareId);
        if (animationData && animationData.progress < 1) {
          animation = {
            progress: animationData.progress,
            type: 'activate',
          };
        }
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

      // Calculate fade effect for boxes that have been passed by the NOW line
      let opacity = 1.0;
      if (this.smoothLineEndX > 0) {
        // Box center X position
        const boxCenterX = topLeft.x + Math.abs(screenWidth) / 2;
        
        // If box is to the left of the NOW line, fade it out
        if (boxCenterX < this.smoothLineEndX) {
          // Calculate distance from NOW line (in pixels)
          const distanceFromNow = this.smoothLineEndX - boxCenterX;
          
          // Fade out over 200 pixels
          const fadeDistance = 200;
          const fadeAmount = Math.min(distanceFromNow / fadeDistance, 1.0);
          
          // Opacity ranges from 1.0 (at NOW line) to 0.3 (far past)
          opacity = 1.0 - (fadeAmount * 0.7);
        }
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
        // Never show price ranges or timestamp ranges - only show multipliers
        timestampRange: undefined,
        priceRange: undefined,
        contractId: undefined,
      });

    });
  }

  private renderXAxis(): void {
    const ctx = this.ctx;
    ctx.save();

    // Draw black background at bottom to cover boxes behind axis
    const axisY = this.height - 30;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, axisY - 5, this.width, this.height - (axisY - 5));

    // Set up styling
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Draw horizontal line at bottom
    ctx.beginPath();
    ctx.moveTo(0, axisY);
    ctx.lineTo(this.width, axisY);
    ctx.stroke();

    // Get world bounds
    const worldBounds = this.world.getVisibleWorldBounds(0);

    // Calculate dynamic tick interval based on zoom level
    const worldRange = worldBounds.right - worldBounds.left;
    const minPixelsPerTick = 80; // Minimum pixels between ticks for readability
    const maxTicks = Math.floor(this.width / minPixelsPerTick);

    // Find a nice round interval in seconds
    // Convert world range to seconds (50 pixels = 1 second)
    const timeRangeSeconds = worldRange / 50;
    const rawIntervalSeconds = timeRangeSeconds / maxTicks;

    // Round to nice time intervals (1s, 2s, 5s, 10s, 20s, 30s, 60s, etc.)
    let tickIntervalSeconds: number;
    if (rawIntervalSeconds <= 1) tickIntervalSeconds = 1;
    else if (rawIntervalSeconds <= 2) tickIntervalSeconds = 2;
    else if (rawIntervalSeconds <= 5) tickIntervalSeconds = 5;
    else if (rawIntervalSeconds <= 10) tickIntervalSeconds = 10;
    else if (rawIntervalSeconds <= 20) tickIntervalSeconds = 20;
    else if (rawIntervalSeconds <= 30) tickIntervalSeconds = 30;
    else if (rawIntervalSeconds <= 60) tickIntervalSeconds = 60;
    else tickIntervalSeconds = Math.ceil(rawIntervalSeconds / 60) * 60;

    // Convert back to world units
    const tickInterval = tickIntervalSeconds * 50;

    const startTick =
      Math.floor(worldBounds.left / tickInterval) * tickInterval;
    const endTick = Math.ceil(worldBounds.right / tickInterval) * tickInterval;

    // Draw major ticks
    for (let worldX = startTick; worldX <= endTick; worldX += tickInterval) {
      const screenX = this.world.worldToScreen(worldX, 0).x;

      if (screenX < 0 || screenX > this.width) continue;

      // Draw tick
      ctx.beginPath();
      ctx.moveTo(screenX, axisY - 5);
      ctx.lineTo(screenX, axisY + 5);
      ctx.stroke();

      // Draw label - convert world units to seconds
      // Price moves at 5 pixels per 100ms = 50 pixels per second
      const timeInSeconds = worldX / 50;
      ctx.fillText(`${timeInSeconds.toFixed(0)}s`, screenX, axisY + 8);
    }

    // Draw minor ticks (no labels)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    // Minor ticks at 0.2 second intervals if major ticks are >= 1s
    const minorInterval = tickIntervalSeconds >= 1 ? 10 : tickInterval / 5; // 10 world units = 0.2s
    for (let worldX = startTick; worldX <= endTick; worldX += minorInterval) {
      if (worldX % tickInterval === 0) continue; // Skip major ticks

      const screenX = this.world.worldToScreen(worldX, 0).x;
      if (screenX < 0 || screenX > this.width) continue;

      ctx.beginPath();
      ctx.moveTo(screenX, axisY - 2);
      ctx.lineTo(screenX, axisY + 2);
      ctx.stroke();
    }

    // Draw current price position if we have data
    if (this.priceData.length > 0) {
      const currentWorldX =
        (this.totalDataPoints - 1) * this.config.pixelsPerPoint;
      const screenX = this.world.worldToScreen(currentWorldX, 0).x;

      // Highlight current position using signature color (theme.colors.primary)
      const signatureColor = this.theme.colors?.primary || '#3b82f6';
      const r = parseInt(signatureColor.slice(1, 3), 16);
      const g = parseInt(signatureColor.slice(3, 5), 16);
      const b = parseInt(signatureColor.slice(5, 7), 16);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.8)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(screenX, axisY - 5);
      ctx.lineTo(screenX, axisY + 5);
      ctx.stroke();

      // Label current position
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
      const currentTimeSeconds = currentWorldX / 50;
      ctx.fillText(
        `Now (${currentTimeSeconds.toFixed(1)}s)`,
        screenX,
        axisY + 15
      );
    }
    
    ctx.restore();
  }

  private renderYAxis(): void {
    // Render price labels in $0.10 increments
    // No vertical axis line, no background panel, just clean price labels
    
    const verticalMargin = this.height * this.config.verticalMarginRatio;
    const viewportTop = verticalMargin;
    const viewportBottom = this.height - verticalMargin;
    const viewportHeight = viewportBottom - viewportTop;
    const visiblePriceRange = viewportHeight * this.config.pricePerPixel;

    const canvasHeight = this.height;
    const extendedPriceRange =
      visiblePriceRange * (canvasHeight / viewportHeight);
    const centerPrice = this.camera.y;
    const minPrice = centerPrice - extendedPriceRange / 2;
    const maxPrice = centerPrice + extendedPriceRange / 2;

    this.ctx.save();

    // No background panel or vertical line - clean labels only
    
    // Price increment of 0.10
    const priceIncrement = 0.10;
    
    // Start at the first price that ends with .00, .10, .20, etc.
    const startPrice = Math.floor(minPrice / priceIncrement) * priceIncrement;

    // Draw price label every $0.10
    this.ctx.font = '11px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';

    for (let price = startPrice; price <= maxPrice; price += priceIncrement) {
      // Round to avoid floating point errors
      price = Math.round(price * 100) / 100;
      
      // Use world-to-screen transformation to find Y position
      const screenPos = this.world.worldToScreen(0, price);
      const y = screenPos.y;

      // Only render if on screen
      if (y < 10 || y > canvasHeight - 10) continue;
      
      // Draw price label at left edge (ending with .X0)
      this.ctx.fillText(`$${price.toFixed(2)}`, 5, y + 4);
    }

    this.ctx.restore();
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
    const squareSize = Math.min(this.width, this.height) / 9;
    const squareWorldSize = this.world.getSquareWorldSize(squareSize);
    const buffer = squareSize * 4; // Larger buffer for grid lines
    const worldBounds = this.world.getVisibleWorldBounds(buffer);

    const startGridX = Math.floor(worldBounds.left / squareWorldSize.x);
    const endGridX = Math.ceil(worldBounds.right / squareWorldSize.x);
    const startGridY = Math.floor(worldBounds.bottom / squareWorldSize.y);
    const endGridY = Math.ceil(worldBounds.top / squareWorldSize.y);

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(180, 180, 180, 0.15)';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([3, 3]);

    // Draw vertical lines
    for (let gridX = startGridX; gridX <= endGridX; gridX++) {
      const worldX = gridX * squareWorldSize.x;
      const startScreenPos = this.world.worldToScreen(
        worldX,
        worldBounds.bottom
      );
      const endScreenPos = this.world.worldToScreen(worldX, worldBounds.top);

      if (
        startScreenPos.x >= -buffer &&
        startScreenPos.x <= this.width + buffer
      ) {
        this.ctx.beginPath();
        this.ctx.moveTo(startScreenPos.x, 0);
        this.ctx.lineTo(endScreenPos.x, this.height);
        this.ctx.stroke();
      }
    }

    // Draw horizontal lines
    for (let gridY = startGridY; gridY <= endGridY; gridY++) {
      const worldY = gridY * squareWorldSize.y;
      const startScreenPos = this.world.worldToScreen(worldBounds.left, worldY);
      const endScreenPos = this.world.worldToScreen(worldBounds.right, worldY);

      if (
        startScreenPos.y >= -buffer &&
        startScreenPos.y <= this.height + buffer
      ) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, startScreenPos.y);
        this.ctx.lineTo(this.width, endScreenPos.y);
        this.ctx.stroke();
      }
    }

    this.ctx.restore();
  }

  private isBoxClickable(box: any): boolean {
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

  // Method to add external price data
  public addPriceData(data: PriceData): void {
    // Apply smoothing
    if (this.priceData.length > 0) {
      const lastPrice = this.priceData[this.priceData.length - 1].price;
      const smoothFactor = 0.85;
      data.price = lastPrice * (1 - smoothFactor) + data.price * smoothFactor;
    }

    this.priceData.push(data);
    this.totalDataPoints++;

    if (this.priceData.length > this.config.maxDataPoints) {
      this.priceData.shift();
      this.dataOffset++;
    }
  }

  // Method to update multipliers from backend
  public updateMultipliers(
    multipliers: Record<
      string,
      {
        value: number;
        x: number;
        y: number;
        worldX: number;
        worldY: number;
        width: number;
        height: number;
        totalBets: number;
        userBet?: number;
        timestampRange?: {
          start: number;
          end: number;
        };
        priceRange?: {
          min: number;
          max: number;
        };
        status?: 'hit';
      }
    >
  ): void {
    // Intelligently update boxes - only update changed properties
    const newBoxIds = new Set(Object.keys(multipliers));
    const oldBoxIds = new Set(Object.keys(this.backendMultipliers));

    // Remove boxes that no longer exist
    for (const oldId of oldBoxIds) {
      if (!newBoxIds.has(oldId)) {
        delete this.backendMultipliers[oldId];
        this.boxClickabilityCache.delete(oldId);
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
        existingContract.totalBets !== newContract.totalBets ||
        existingContract.userBet !== newContract.userBet ||
        existingContract.value !== newContract.value ||
        existingContract.worldX !== newContract.worldX ||
        existingContract.worldY !== newContract.worldY
      ) {
        this.backendMultipliers[contractId] = newContract;
      }
    }

    // Limit total boxes for all games to prevent performance issues
    const boxCount = Object.keys(this.backendMultipliers).length;
    if (boxCount > 1000) {
      // Keep only the most recent boxes (by world X position)
      const sortedBoxes = Object.entries(this.backendMultipliers)
        .sort(([, a], [, b]) => a.worldX - b.worldX) // Sort by world X position
        .slice(-800); // Keep last 800 boxes to allow some margin

      this.backendMultipliers = Object.fromEntries(sortedBoxes);
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
    console.log('📦 Marking contract as hit:', contractId);
    this.hitBoxes.add(contractId);
    // Update backend data status if contract exists
    if (this.backendMultipliers[contractId]) {
      this.backendMultipliers[contractId].status = 'hit';
    }
    // Start activation animation (quick flash/pulse effect - 400ms)
    this.squareAnimations.set(contractId, {
      startTime: performance.now(),
      progress: 0,
    });
    // Clear from highlighted/selected when hit
    this.highlightedSquareIds.delete(contractId);
    this.selectedSquareIds.delete(contractId);
  }

  public clearHitContract(contractId: string): void {
    this.hitBoxes.delete(contractId);
  }

  public clearAllHitContracts(): void {
    this.hitBoxes.clear();
  }


  public getViewportBounds(): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } | null {
    // Calculate viewport bounds based on camera position and visible range
    if (!this.camera || this.visiblePriceRange === 0) {
      console.log('🔍 getViewportBounds returning null:', { camera: !!this.camera, visiblePriceRange: this.visiblePriceRange });
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
    console.log('🔍 getViewportBounds returning:', bounds, 'camera:', this.camera);
    return bounds;
  }

  // Method to reset camera to follow price
  public resetCameraToFollowPrice(): void {
    this.isFollowingPrice = true;
    this.emit('cameraFollowingChanged', { isFollowing: true });
  }

  // Method to get current following state
  public isCameraFollowingPrice(): boolean {
    return this.isFollowingPrice;
  }

  /**
   * Analyzes the current viewport and generates empty boxes to fill empty spaces
   * Based on the algorithm: for any existing box at (X,Y) with dimensions (w,h),
   * check positions X+m*w, Y+n*h where m,n are integers for empty spaces
   */
  private generateEmptyBoxes(): void {
    // Get viewport bounds
    const viewport = this.getViewportBounds();
    if (!viewport) {
      console.log('🔍 No viewport bounds available');
      return;
    }

    // Get existing boxes to understand the grid
    const existingBoxes = Object.values(this.backendMultipliers);
    if (existingBoxes.length === 0) {
      console.log('🔍 No existing boxes to use as reference');
      return;
    }

    console.log('🔍 Generating empty boxes with viewport:', viewport);
    console.log('🔍 Canvas dimensions:', { width: this.width, height: this.height });
    console.log('🔍 Camera position:', this.camera);
    console.log('🔍 Existing boxes count:', existingBoxes.length);

    // Use first box to determine standard dimensions
    const standardBox = existingBoxes[0];
    if (!standardBox) return;

    const boxWidth = standardBox.width;
    const boxHeight = standardBox.height;

    // Clear existing empty boxes
    this.emptyBoxes = {};
    console.log('🔍 Box dimensions:', { boxWidth, boxHeight });

    // Find the grid alignment by looking at existing box positions
    // Real boxes are grid-aligned, so we need to match their alignment
    let gridOffsetX = 0;
    let gridOffsetY = 0;

    if (existingBoxes.length > 0) {
      // Use the first box to determine grid offset
      const referenceBox = existingBoxes[0];
      gridOffsetX = referenceBox.worldX % boxWidth;
      gridOffsetY = referenceBox.worldY % boxHeight;
      console.log('🔍 Grid offset from reference box:', { gridOffsetX, gridOffsetY });
    }

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
    
    const gridRangeX = maxGridX - minGridX + 1;
    const gridRangeY = maxGridY - minGridY + 1;
    
    console.log('🔍 Aligned viewport:', { alignedMinX, alignedMaxX, alignedMinY, alignedMaxY });
    console.log('🔍 Aligned grid bounds:', { minGridX, maxGridX, minGridY, maxGridY });
    console.log('🔍 Grid ranges:', { gridRangeX, gridRangeY });

    // Fill all grid positions within viewport bounds
    let generatedCount = 0;
    for (let gridX = minGridX; gridX <= maxGridX; gridX++) {
      for (let gridY = minGridY; gridY <= maxGridY; gridY++) {
        const positionKey = `${gridX}_${gridY}`;
        
        // Skip if position is already occupied by existing box
        if (occupiedPositions.has(positionKey)) {
          // Don't log every skip to reduce noise
          continue;
        }
        
        // Calculate world coordinates with grid alignment
        const worldX = gridX * boxWidth + gridOffsetX;
        const worldY = gridY * boxHeight + gridOffsetY;
        
        // Create empty box
        const emptyBoxId = `empty_${gridX}_${gridY}`;
        this.emptyBoxes[emptyBoxId] = {
          worldX,
          worldY,
          width: boxWidth,
          height: boxHeight,
          isEmpty: true,
          isClickable: false
        };
        generatedCount++;
      }
    }
    console.log('🔍 Generated', generatedCount, 'empty boxes');
    console.log('🔍 Occupied positions count:', occupiedPositions.size);
    console.log('🔍 Total potential positions:', gridRangeX * gridRangeY);
    
    console.log('🔍 Generated empty boxes count:', Object.keys(this.emptyBoxes).length);
    if (Object.keys(this.emptyBoxes).length > 0) {
      console.log('🔍 Sample empty box:', Object.values(this.emptyBoxes)[0]);
      console.log('🔍 Reference real box:', existingBoxes[0]);
    }
  }

  /**
   * Updates the viewport analysis and regenerates empty boxes
   * Should be called when camera position changes or viewport size changes
   */
  private updateEmptyBoxes(): void {
    // Only generate empty boxes for certain game types
    if (this.config.gameType === GameType.SKETCH || this.config.gameType === GameType.COBRA) {
      console.log('🔍 Skipping empty boxes for game type:', this.config.gameType);
      return; // Skip for games where boxes are not visible
    }

    // Throttle empty box generation to avoid performance issues
    if (this.frameCount % 5 === 0) { // Update every 5 frames for debugging
      console.log('🔍 updateEmptyBoxes called, frame:', this.frameCount);
      this.generateEmptyBoxes();
    }
  }
}
