import { GameType } from '@/shared/types';
import { Game } from '../../core/Game';
import { WorldCoordinateSystem } from '../../core/WorldCoordinateSystem';
import type { Camera } from '../../core/WorldCoordinateSystem';
import { LineRenderer } from './rendering/LineRenderer';
import { SquareRenderer } from './rendering/SquareRenderer';
import { playSelectionSound } from '@/shared/lib/sound/SoundManager';
import { CameraController } from '../../core/CameraController';
import { GridAxisRenderer } from './rendering/GridAxisRenderer';
import { BoxRenderer } from './rendering/BoxRenderer';
import { HeatmapRenderer } from './rendering/HeatmapRenderer';
import { PriceLineRenderer } from './rendering/PriceLineRenderer';
import { GridFrameRenderer } from './rendering/GridFrameRenderer';
import { EmptyBoxManager } from './managers/EmptyBoxManager';
import { BoxController } from './managers/BoxController';
import { SelectionManager } from './managers/SelectionManager';
import { PriceSeriesManager } from './managers/PriceSeriesManager';
import { ViewportManager } from './managers/ViewportManager';
import { GridStateManager } from './managers/GridStateManager';
import { OtherPlayerManager } from './managers/OtherPlayerManager';
import { InteractionManager } from './managers/InteractionManager';
import { getViewportBounds as calculateViewportBounds } from '../../utils/viewportUtils';
import { clampZoomLevel, calculateZoomFromWidth, ZOOM_REFERENCE_WIDTH, ZOOM_MIN, ZOOM_MAX } from './utils/gridGameUtils';
import {
  defaultGridGameConfig,
  defaultViewportManagerConfig,
  defaultPriceSeriesManagerConfig,
} from '../../config/defaultConfig';
import type {
  PriceData,
  SquareAnimation,
  GridGameConfig,
  BackendBox,
  BackendMultiplierMap,
} from './types';

// Re-export types for backward compatibility
export type {
  PriceData,
  SquareAnimation,
  GridGameConfig,
  BackendBox,
  BackendMultiplierMap,
} from './types';

export class GridGame extends Game {
  private frameCount: number = 0;
  private camera: Camera = {
    x: 0,
    y: 100, // Start centered on initial price
    targetX: 0,
    targetY: 100, // Start centered on initial price
    smoothX: 0,
    smoothY: 100, // Start centered on initial price
  };

  private isFollowingPrice: boolean = true; // Track if camera should follow price

  // Price series manager
  private priceSeriesManager!: PriceSeriesManager;
  
  // Viewport manager
  private viewportManager!: ViewportManager;
  
  // Grid state manager
  private gridStateManager!: GridStateManager;
  
  // Other player manager
  private otherPlayerManager!: OtherPlayerManager;
  
  // Camera controller
  private cameraController!: CameraController;

  // Box renderer / controller / managers
  private boxRenderer!: BoxRenderer;
  private heatmapRenderer!: HeatmapRenderer;
  private priceLineRenderer!: PriceLineRenderer;
  private boxController!: BoxController;
  private emptyBoxManager!: EmptyBoxManager;

  // Grid axis renderer
  private gridAxisRenderer!: GridAxisRenderer;
  private gridFrameRenderer!: GridFrameRenderer;
  private interactionManager!: InteractionManager;
  private selectionManager!: SelectionManager;
  private readonly onCanvasMouseDown = (event: MouseEvent): void => {
    this.interactionManager.handleMouseDown(event, this.canvas);
    super.handleMouseDown(event);
  };
  private readonly onCanvasMouseUp = (event: MouseEvent): void => {
    this.interactionManager.handleMouseUp(event, this.canvas);
    super.handleMouseUp(event);
  };
  private readonly onCanvasMouseLeave = (event: MouseEvent): void => {
    this.interactionManager.handleMouseLeave(event, this.canvas);
    super.handleMouseLeave(event);
  };
  private readonly onCanvasMouseMove = (event: MouseEvent): void => {
    this.interactionManager.handleMouseMove(event, this.canvas);
    super.handleMouseMove(event);
  };
  private readonly onCanvasClick = (event: MouseEvent): void => {
    this.interactionManager.handleClick(event, this.canvas);
    super.handleClick(event);
  };
  private readonly onCanvasWheel = (event: WheelEvent): void => {
    this.interactionManager.handleWheel(event);
  };
  
  // Debug logging throttle
  private lastDebugLog: number = 0;
  private debug(...args: unknown[]) {
    if (this.config.debugMode || process.env.NODE_ENV === 'development') {
      console.debug(...args);
    }
  }

  protected smoothLineEndX: number = 0;
  protected smoothLineEndY: number = 0;

  protected squareAnimations: Map<string, SquareAnimation> = new Map();
  protected processedBoxes: Set<string> = new Set(); // Boxes that have already been checked (to prevent re-processing)
  protected visibleSquares: Set<string> = new Set(); // For boxes mode
  protected emptyBoxes: Record<string, {
    worldX: number;
    worldY: number;
    width: number;
    height: number;
    isEmpty: boolean;
    isClickable: boolean;
    value?: number; // Random multiplier for heatmap visualization
  }> = {}; // Generated empty boxes to fill viewport
  
  // CRITICAL: Store grid offset once and never recalculate
  // Prevents grid from shifting when old boxes are cleaned up after 150+ seconds
  private gridOffsetX: number | null = null;
  private gridOffsetY: number | null = null;

  protected world!: WorldCoordinateSystem;
  protected eventSource: EventSource | null = null;
  protected squareRenderer!: SquareRenderer;
  protected lineRenderer!: LineRenderer;
  protected backendMultipliers: BackendMultiplierMap = {};
  protected boxClickabilityCache: Map<string, boolean> = new Map();

  protected config!: Required<GridGameConfig>;
  private zoomLevel: number = 1.0; // Zoom level: < 1.0 zooms out, > 1.0 zooms in

  constructor(container: HTMLElement, config?: GridGameConfig) {
    super(container, config);
    
    // Initialize configuration
    this.initializeConfig(config);
    
    // Initialize visible squares (for boxes mode)
    this.initializeVisibleSquares(config);
    
    // Initialize world coordinate system
    this.initializeWorld();
    
    // Initialize managers
    this.initializeManagers();
    
    // Initialize renderers (must be after managers since they depend on them)
    this.initializeRenderers();
    
    // Initialize interaction manager (must be after renderers)
    this.initializeInteraction();

    // Re-setup event listeners now that interactionManager is initialized
    // This ensures the InteractionManager handlers are properly attached
    this.setupEventListeners();

    // Setup resize handler
    this.setupResizeHandler();
    
    // Only connect to internal websocket if not using external data
    if (!config?.externalDataSource) {
      this.connectWebSocket();
    }
  }

  /**
   * Initialize configuration with defaults
   */
  private initializeConfig(config?: GridGameConfig): void {
    this.config = {
      theme: this.theme,
      width: this.width,
      height: this.height,
      dpr: this.dpr,
      ...defaultGridGameConfig,
      ...config,
    };
    // Initialize zoom level from config (uses default from defaultGridGameConfig if not provided)
    // If using default, will be recalculated from width in initializeWorld()
    this.zoomLevel = clampZoomLevel(this.config.zoomLevel ?? 1.0);
  }

  /**
   * Initialize visible squares (for boxes mode)
   */
  private initializeVisibleSquares(config?: GridGameConfig): void {
    if (config?.visibleSquares) {
      config.visibleSquares.forEach((square) => {
        this.visibleSquares.add(`${square.gridX}_${square.gridY}`);
      });
    }
  }


  /**
   * Initialize world coordinate system
   */
  private initializeWorld(): void {
    this.world = new WorldCoordinateSystem(this.camera);
    this.world.setPixelsPerPoint(this.config.pixelsPerPoint);
    
    // Calculate initial zoom from canvas width if using default config value
    // Otherwise, use the configured zoom level
    if (this.config.zoomLevel === defaultGridGameConfig.zoomLevel) {
      // Auto-calculate from width if using default
      this.zoomLevel = calculateZoomFromWidth(this.width);
    } else {
      // Use explicitly configured zoom level (clamped to valid range)
      this.zoomLevel = clampZoomLevel(this.config.zoomLevel);
    }
    
    this.world.setHorizontalScale(this.zoomLevel);
    this.world.setVerticalScale(this.zoomLevel);
    this.world.updateCanvasSize(this.width, this.height);
  }

  /**
   * Initialize all managers
   */
  private initializeManagers(): void {
    // Initialize price series manager
    this.priceSeriesManager = new PriceSeriesManager({
      maxDataPoints: this.config.maxDataPoints,
      pixelsPerPoint: this.config.pixelsPerPoint,
      ...defaultPriceSeriesManagerConfig,
    });
    
    // Initialize viewport manager
    this.viewportManager = new ViewportManager({
      height: this.height,
      verticalMarginRatio: this.config.verticalMarginRatio,
      gameType: this.config.gameType,
      ...defaultViewportManagerConfig,
    });
    this.viewportManager.setVerticalScale(this.zoomLevel);
    
    // Initialize grid state manager
    this.gridStateManager = new GridStateManager();
    
    // Initialize other player manager
    this.otherPlayerManager = new OtherPlayerManager();
    
    // Initialize selection manager
    this.selectionManager = new SelectionManager({
      squareAnimations: this.squareAnimations,
      emitSelectionChanged: () => this.emit('selectionChanged', {}),
      emitSquareSelected: (squareId) => this.emit('squareSelected', { squareId }),
      playSelectionSound: () => playSelectionSound(),
      debug: this.debug.bind(this),
      animationDuration: this.config.animationDuration,
    });
    
    // Initialize box controller
    this.boxController = new BoxController({
      getWidth: () => this.width,
      getPixelsPerPoint: () => this.config.pixelsPerPoint,
      getGameType: () => this.config.gameType,
      getTotalDataPoints: () => this.priceSeriesManager.getTotalDataPoints(),
      getCamera: () => this.camera,
      getVisibleSquares: () => this.visibleSquares,
      getNow: () => Date.now(),
      getPerformanceNow: () => performance.now(),
      debug: this.debug.bind(this),
      getBackendMultipliers: () => this.backendMultipliers,
      setBackendMultipliers: (map) => {
        this.backendMultipliers = map;
      },
      boxClickabilityCache: this.boxClickabilityCache,
      pendingSquareIds: this.selectionManager.getPendingSquareIds(),
      selectedSquareIds: this.selectionManager.getSelectedSquareIds(),
      highlightedSquareIds: this.selectionManager.getHighlightedSquareIds(),
      hitBoxes: this.selectionManager.getHitBoxes(),
      missedBoxes: this.selectionManager.getMissedBoxes(),
      processedBoxes: this.processedBoxes,
      squareAnimations: this.selectionManager.getSquareAnimations(),
      emitSelectionChanged: () => this.emit('selectionChanged', {}),
      getLastDebugLog: () => this.lastDebugLog,
      setLastDebugLog: (value) => {
        this.lastDebugLog = value;
      },
    });
    
    // Initialize empty box manager
    this.emptyBoxManager = new EmptyBoxManager({
      getEmptyBoxes: () => this.emptyBoxes,
      setEmptyBoxes: (boxes) => {
        this.emptyBoxes = boxes;
      },
      getGridOffsets: () => ({
        gridOffsetX: this.gridOffsetX,
        gridOffsetY: this.gridOffsetY,
      }),
      setGridOffsets: ({ gridOffsetX, gridOffsetY }) => {
        this.gridOffsetX = gridOffsetX;
        this.gridOffsetY = gridOffsetY;
      },
      getBackendBoxes: () => Object.values(this.backendMultipliers),
      getViewportBounds: this.getViewportBounds.bind(this),
      getFrameCount: () => this.frameCount,
      getTotalDataPoints: () => this.priceSeriesManager.getTotalDataPoints(),
      getPixelsPerPoint: () => this.config.pixelsPerPoint,
      getCamera: () => this.camera,
      getConfig: () => ({ gameType: this.config.gameType }),
      debug: this.debug.bind(this),
      getLastDebugLog: () => this.lastDebugLog,
      setLastDebugLog: (value) => {
        this.lastDebugLog = value;
      },
      getNow: () => Date.now(),
    });
    
    // Initialize camera controller
    this.cameraController = new CameraController(
      this.camera,
      () => this.priceSeriesManager.getPriceData(),
      () => this.priceSeriesManager.getTotalDataPoints(),
      () => ({
        pixelsPerPoint: this.config.pixelsPerPoint,
        cameraOffsetRatio: this.config.cameraOffsetRatio,
        width: this.width,
        visiblePriceRange: this.viewportManager.getVisiblePriceRange(),
        horizontalScale: this.world.getHorizontalScale(),
      })
    );
  }

  /**
   * Initialize all renderers
   */
  private initializeRenderers(): void {
    // Initialize basic renderers
    this.squareRenderer = new SquareRenderer(this.ctx, this.theme);
    this.lineRenderer = new LineRenderer(this.ctx, this.theme);
    
    // Initialize price line renderer
    this.priceLineRenderer = new PriceLineRenderer({
      ctx: this.ctx,
      world: this.world,
      lineRenderer: this.lineRenderer,
      getConfig: () => ({
        width: this.width,
        height: this.height,
        gameType: this.config.gameType,
        lineEndSmoothing: this.config.lineEndSmoothing ?? 0.88,
        theme: this.theme,
      }),
      getSmoothLineEnd: () => ({
        x: this.smoothLineEndX,
        y: this.smoothLineEndY,
      }),
      setSmoothLineEnd: ({ x, y }) => {
        this.smoothLineEndX = x;
        this.smoothLineEndY = y;
      },
    });
    
    // Get conversion helpers from price series manager
    const conversionHelpers = this.priceSeriesManager.getConversionHelpers();
    
    // Initialize grid axis renderer
    this.gridAxisRenderer = new GridAxisRenderer(
      this.ctx,
      this.world,
      () => ({
        width: this.width,
        height: this.height,
        showProbabilities: this.config.showProbabilities,
        verticalMarginRatio: this.config.verticalMarginRatio,
        camera: this.camera,
        isSketchOrCobra:
          this.config.gameType === GameType.SKETCH ||
          this.config.gameType === GameType.COBRA,
        pixelsPerPoint: this.config.pixelsPerPoint,
        visiblePriceRange: this.viewportManager.getVisiblePriceRange(),
        dpr: this.dpr,
        ...this.gridStateManager.getGridState(),
      }),
      conversionHelpers.getWorldXForTimestamp,
      conversionHelpers.getTimestampForWorldX,
      conversionHelpers.formatTimestampLabel
    );
    
    // Initialize box renderer
    this.boxRenderer = new BoxRenderer({
      ctx: this.ctx,
      world: this.world,
      squareRenderer: this.squareRenderer,
      getDimensions: () => ({ width: this.width, height: this.height }),
      getConfig: () => ({
        showProbabilities: this.config.showProbabilities,
        minMultiplier: this.config.minMultiplier,
        gameType: this.config.gameType,
        theme: this.theme,
        showOtherPlayers: this.config.showOtherPlayers,
      }),
      getState: () => ({
        backendMultipliers: this.backendMultipliers,
        visibleSquares: this.visibleSquares,
        boxClickabilityCache: this.boxClickabilityCache,
        selectedSquareIds: this.selectionManager.getSelectedSquareIds(),
        pendingSquareIds: this.selectionManager.getPendingSquareIds(),
        highlightedSquareIds: this.selectionManager.getHighlightedSquareIds(),
        hitBoxes: this.selectionManager.getHitBoxes(),
        missedBoxes: this.selectionManager.getMissedBoxes(),
        squareAnimations: this.squareAnimations,
        ...this.otherPlayerManager.getOtherPlayerData(),
      }),
      getFrameCount: () => this.frameCount,
      getMousePosition: () => {
        const { x, y } = this.interactionManager?.getMousePosition() ?? { x: -1, y: -1 };
        return { mouseX: x, mouseY: y };
      },
      getSmoothLineEndX: () => this.smoothLineEndX,
      getTotalDataPoints: () => this.priceSeriesManager.getTotalDataPoints(),
      getPixelsPerPoint: () => this.config.pixelsPerPoint,
      getVisiblePriceRange: () => this.viewportManager.getVisiblePriceRange(),
      isBoxClickable: (box) => this.boxController.isBoxClickable(box),
    });
    
    // Initialize heatmap renderer
    this.heatmapRenderer = new HeatmapRenderer({
      ctx: this.ctx,
      world: this.world,
      getDimensions: () => ({ width: this.width, height: this.height }),
      getConfig: () => ({
        showProbabilities: this.config.showProbabilities,
        gameType: this.config.gameType,
        minMultiplier: this.config.minMultiplier,
        theme: this.theme,
      }),
      getState: () => ({
        backendMultipliers: this.backendMultipliers,
        emptyBoxes: this.emptyBoxes,
        selectedSquareIds: this.selectionManager.getSelectedSquareIds(),
        pendingSquareIds: this.selectionManager.getPendingSquareIds(),
        visibleSquares: this.visibleSquares,
      }),
      debug: this.debug.bind(this),
      getLastDebugLog: () => this.lastDebugLog,
      setLastDebugLog: (value) => {
        this.lastDebugLog = value;
      },
      getNow: () => Date.now(),
    });
    
    // Initialize grid frame renderer (must be after all other renderers)
    this.gridFrameRenderer = new GridFrameRenderer({
      ctx: this.ctx,
      gridAxisRenderer: this.gridAxisRenderer,
      boxRenderer: this.boxRenderer,
      heatmapRenderer: this.heatmapRenderer,
      priceLineRenderer: this.priceLineRenderer,
      getConfig: () => ({
        width: this.width,
        height: this.height,
        showDashedGrid: this.config.showDashedGrid,
        showMultiplierOverlay: this.config.showMultiplierOverlay,
        showProbabilities: this.config.showProbabilities,
        hasBoxes: Object.keys(this.backendMultipliers).length > 0,
      }),
      getPriceData: () => this.priceSeriesManager.getPriceData(),
      getDataOffset: () => this.priceSeriesManager.getDataOffset(),
      hasEnoughData: () => this.priceSeriesManager.hasEnoughData(),
      checkPriceCollisions: () => this.checkPriceCollisions(),
      checkBoxesPastNowLine: () => this.checkBoxesPastNowLine(),
    });
  }

  /**
   * Setup resize handler
   */
  private setupResizeHandler(): void {
    this.on('resize', ({ width, height }) => {
      this.world.updateCanvasSize(width, height);
      // Update viewport manager with new height
      this.viewportManager.updateConfig({ height });
      
      // Auto-adjust zoom based on screen width
      // Smaller screens = zoom out more, larger screens = zoom in more
      const newZoomLevel = calculateZoomFromWidth(width);
      this.setZoomLevel(newZoomLevel);
    });
  }

  /**
   * Initialize pointer interaction manager
   */
  private initializeInteraction(): void {
    this.interactionManager = new InteractionManager({
      props: {
        camera: this.camera,
        setCameraPosition: ({ x, y }) => {
          this.camera.x = Math.max(0, x);
          this.camera.y = y;
        },
        syncCameraTargets: ({ x, y }) => {
          this.camera.targetX = x;
          this.camera.targetY = y;
          this.camera.smoothX = x;
          this.camera.smoothY = y;
        },
        setCameraFollowing: (value) => {
          this.isFollowingPrice = value;
          // Freeze/unfreeze reference point based on following state
          if (value) {
            this.priceSeriesManager.unfreezeReferencePoint();
          } else {
            this.priceSeriesManager.freezeReferencePoint();
          }
        },
        emitCameraFollowingChanged: (isFollowing) => {
          this.emit('cameraFollowingChanged', { isFollowing });
        },
        isSketchOrCobra: () =>
          this.config.gameType === GameType.SKETCH || this.config.gameType === GameType.COBRA,
        getVerticalMarginRatio: () => this.config.verticalMarginRatio,
        getVisiblePriceRange: () => this.viewportManager.getVisiblePriceRange(),
        getCanvasDimensions: () => ({ width: this.width, height: this.height }),
        getWorldToScreen: (worldX, worldY) => this.world.worldToScreen(worldX, worldY),
        screenToWorld: (screenX, screenY) => this.world.screenToWorld(screenX, screenY),
        forEachSelectableBox: (cb) => this.boxController.forEachSelectableBox(cb),
        onSquareClick: (squareId, event) => this.handlePointerSquareClick(squareId, event),
        getZoomLevel: () => this.getZoomLevel(),
        setZoomLevel: (zoomLevel, skipClamp) => {
          this.setZoomLevel(zoomLevel, skipClamp);
        },
        isCameraFollowing: () => this.isCameraFollowingPrice(),
        getHorizontalScale: () => this.world.getHorizontalScale(),
        getPriceScale: () => this.world.getPriceScale(),
      },
    });
  }

  private connectWebSocket(): void {
    // WebSocket connection is now handled by the React component
    // Data is provided through addPriceData() method
    // This method is kept empty to avoid breaking existing calls
  }

  private handlePointerSquareClick(squareId: string | null, _event: MouseEvent): void {
    this.selectionManager.handleSquareClick(squareId);
  }

  /**
   * Override Game's setupEventListeners to add InteractionManager handlers
   * This ensures our custom handlers are used while still calling base class setup
   */
  protected setupEventListeners(): void {
    // Call base class setup first (handles resize observer, etc.)
    super.setupEventListeners();
    
    // Remove base class mouse listeners and replace with our own
    // (Game adds listeners in its setupEventListeners, so we need to remove them)
    this.canvas.removeEventListener('click', this.handleClick);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    
    // Add our custom handlers that delegate to InteractionManager
    // These will fire in addition to base class handlers
    if (this.interactionManager) {
      this.canvas.addEventListener('mousedown', this.onCanvasMouseDown);
      this.canvas.addEventListener('mouseup', this.onCanvasMouseUp);
      this.canvas.addEventListener('mouseleave', this.onCanvasMouseLeave);
      this.canvas.addEventListener('mousemove', this.onCanvasMouseMove);
      this.canvas.addEventListener('click', this.onCanvasClick);
      this.canvas.addEventListener('wheel', this.onCanvasWheel, { passive: false });
    }
  }

  protected update(_deltaTime: number): void {
    // Increment frame count
    this.frameCount++;

    // Update viewport calculations
    const data = this.priceSeriesManager.getPriceData();
    const viewportResult = this.viewportManager.updateViewport(
      this.backendMultipliers,
      data,
      this.world
    );
    const visiblePriceRange = viewportResult.visiblePriceRange;

    if (!this.priceSeriesManager.hasEnoughData()) {
      // Even without price data, we should still update camera for box visibility
      // Initialize camera to default position
      this.cameraController.initializeCameraPosition();
      return;
    }

    const latestData = this.priceSeriesManager.getLatestPriceData();
    if (
      !latestData ||
      typeof latestData.price !== 'number' ||
      isNaN(latestData.price)
    ) {
      return;
    }

    const latestPrice = Math.max(0, latestData.price);
    const currentWorldX = this.priceSeriesManager.getCurrentWorldX();

    // Delegate camera follow updates to CameraController
    this.cameraController.updateFollowPrice({
      isFollowingPrice: this.isFollowingPrice,
      smoothingFactorX: this.config.smoothingFactorX,
      smoothingFactorY: this.config.smoothingFactorY,
      gameType: this.config.gameType,
      currentWorldX,
      latestPrice,
      visiblePriceRange: visiblePriceRange,
    });

    // Update square animations and clean up completed ones
    this.selectionManager.updateAnimations();

    this.emptyBoxManager.update();
  }

  protected render(): void {
    this.clearCanvas();
    this.gridFrameRenderer.render();
  }

  public getWorldPositionForTimestamp(timestamp: number): { worldX: number } | null {
    const worldX = this.priceSeriesManager.getWorldXForTimestamp(timestamp);
    if (worldX === null) {
      return null;
    }
    return { worldX };
  }

  public setGridScale(columnWidth: number, rowHeight: number): void {
    this.gridStateManager.setGridScale(columnWidth, rowHeight);
  }

  public setGridOrigin(columnOrigin: number, rowOrigin: number): void {
    this.gridStateManager.setGridOrigin(columnOrigin, rowOrigin);
  }

  /**
   * Add external price data to the game
   * Applies smoothing and manages data point limit
   * 
   * @param data - Price data with price value and optional timestamp
   */
  public addPriceData(data: PriceData): void {
    this.priceSeriesManager.addPriceData(data);
  }

  /**
   * Update multipliers from backend
   * Intelligently updates only changed properties for performance
   * Automatically removes old boxes and limits total box count
   * 
   * @param multipliers - Record of multiplier data keyed by contract ID
   */
  public updateMultipliers(multipliers: BackendMultiplierMap): void {
    this.boxController.updateMultipliers(multipliers);
  }

  public clearHighlights(): void {
    this.selectionManager.clearHighlights();
  }

  // Method to start without internal websocket
  public startWithExternalData(): void {
    this.start();
  }

  public destroy(): void {
    if (this.eventSource) {
      this.eventSource.close();
    }

    // Clean up camera controller
    this.cameraController.destroy();

    // Remove pointer interaction listeners
    this.canvas.removeEventListener('mousedown', this.onCanvasMouseDown);
    this.canvas.removeEventListener('mouseup', this.onCanvasMouseUp);
    this.canvas.removeEventListener('mouseleave', this.onCanvasMouseLeave);
    this.canvas.removeEventListener('mousemove', this.onCanvasMouseMove);
    this.canvas.removeEventListener('click', this.onCanvasClick);

    super.destroy();
  }

  public markContractAsHit(contractId: string): void {
    this.boxController.markContractAsHit(contractId);
  }

  public markContractAsMissed(contractId: string): void {
    this.boxController.markContractAsMissed(contractId);
  }

  public confirmSelectedContract(contractId: string): void {
    this.boxController.confirmSelectedContract(contractId);
  }

  public cancelPendingContract(contractId: string, options?: { keepHighlight?: boolean }): void {
    this.boxController.cancelPendingContract(contractId, options);
  }

  public cancelAllPendingContracts(options?: { keepHighlight?: boolean }): void {
    this.boxController.cancelAllPendingContracts(options);
  }

  /**
   * Check for price line collisions with selected boxes (immediate HIT detection)
   * This runs every frame to detect hits as soon as price touches a box
   * Note: Local collision-based hit detection disabled; rely on clearing house events.
   */
  protected checkPriceCollisions(): void {
    // No-op: Local collision detection disabled
  }

  /**
   * Check for boxes that have passed the NOW line and mark unselected as MISSED
   * This runs every frame to detect when boxes cross the NOW line
   * IMPORTANT: Only marks as MISS if selected but not yet hit
   * Note: Local miss detection disabled; rely on clearing house events.
   */
  protected checkBoxesPastNowLine(): void {
    // No-op: Local miss detection disabled
  }

  public clearHitContract(contractId: string): void {
    this.selectionManager.removeHit(contractId);
  }

  public clearMissedContract(contractId: string): void {
    this.selectionManager.removeMissed(contractId);
  }

  public clearAllHitContracts(): void {
    this.selectionManager.clearHitBoxes();
  }

  public clearAllMissedContracts(): void {
    this.selectionManager.clearMissedBoxes();
  }

  public getHitBoxes(): string[] {
    return this.selectionManager.getHitSquaresArray();
  }

  public getMissedBoxes(): string[] {
    return this.selectionManager.getMissedSquaresArray();
  }

  public getSelectedSquares(): string[] {
    return this.selectionManager.getSelectedSquaresArray();
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
    // Only update zoom if it's actually different (prevents re-clamping user zoom values)
    // If the new zoom is outside responsive range, it's user zoom - skip clamping
    if (newConfig.zoomLevel !== undefined && Math.abs(newConfig.zoomLevel - this.zoomLevel) > 1e-6) {
      const isUserZoom = newConfig.zoomLevel < ZOOM_MIN || newConfig.zoomLevel > ZOOM_MAX;
      this.setZoomLevel(newConfig.zoomLevel, isUserZoom);
    }
    this.debug('🎯 GridGame: Updated config showOtherPlayers:', this.config.showOtherPlayers);
  }

  public setOtherPlayerData(
    playerCounts: {[key: string]: number}, 
    playerSelections: {[key: string]: Array<{id: string, name: string, avatar: string, type: string}>},
    playerImages: {[key: string]: HTMLImageElement}
  ): void {
    this.otherPlayerManager.setOtherPlayerData(playerCounts, playerSelections, playerImages);
  }

  public getBackendMultipliers(): BackendMultiplierMap {
    return this.backendMultipliers;
  }

  public getCurrentWorldX(): number {
    return this.priceSeriesManager.getCurrentWorldX();
  }


  public getViewportBounds(): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } | null {
    return calculateViewportBounds(this.world, this.viewportManager.getVisiblePriceRange());
  }

  // Method to reset camera to follow price
  public resetCameraToFollowPrice(): void {
    this.isFollowingPrice = true;
    // Unfreeze reference point when resuming following
    this.priceSeriesManager.unfreezeReferencePoint();

    this.cameraController.resetToFollowPrice(
      this.width,
      this.priceSeriesManager.getPriceData(),
      this.priceSeriesManager.getTotalDataPoints(),
      {
        pixelsPerPoint: this.config.pixelsPerPoint,
        cameraOffsetRatio: this.config.cameraOffsetRatio,
        visiblePriceRange: this.viewportManager.getVisiblePriceRange(),
        horizontalScale: this.world.getHorizontalScale(),
      }
    );

    this.emit('cameraFollowingChanged', { isFollowing: true });
  }

  // Method to get current following state
  public isCameraFollowingPrice(): boolean {
    return this.isFollowingPrice;
  }

  // Method to get visible price range
  public getVisiblePriceRange(): number {
    return this.viewportManager.getVisiblePriceRange();
  }

  // Method to get current priceScale from WorldCoordinateSystem
  public getPriceScale(): number {
    return this.world.getPriceScale();
  }

  // Method to get current horizontal scale
  public getHorizontalScale(): number {
    return this.world.getHorizontalScale();
  }

  // Method to set zoom level (affects horizontalScale and verticalScale)
  // @param skipClamp - If true, skip clamping (for user-controlled zoom that's already clamped)
  public setZoomLevel(zoomLevel: number, skipClamp: boolean = false): void {
    this.zoomLevel = skipClamp ? zoomLevel : clampZoomLevel(zoomLevel);
    this.world.setHorizontalScale(this.zoomLevel);
    this.world.setVerticalScale(this.zoomLevel);
    this.viewportManager.setVerticalScale(this.zoomLevel);
    this.emit('zoomLevelChanged', { zoomLevel: this.zoomLevel });
  }

  // Method to get current zoom level
  public getZoomLevel(): number {
    return this.zoomLevel;
  }

}
