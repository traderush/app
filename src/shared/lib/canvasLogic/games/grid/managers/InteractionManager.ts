import type { Camera } from '../../../core/WorldCoordinateSystem';
import { clampUserZoomLevel } from '../utils/gridGameUtils';

interface PointerPosition {
  x: number;
  y: number;
}

interface InteractionBindings {
  camera: Camera;
  setCameraPosition: (coords: { x: number; y: number }) => void;
  syncCameraTargets: (coords: { x: number; y: number }) => void;
  setCameraFollowing: (value: boolean) => void;
  emitCameraFollowingChanged: (isFollowing: boolean) => void;
  isSketchOrCobra: () => boolean;
  getVerticalMarginRatio: () => number;
  getVisiblePriceRange: () => number;
  getCanvasDimensions: () => { width: number; height: number };
  getWorldToScreen: (worldX: number, worldY: number) => { x: number; y: number };
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number };
  forEachSelectableBox: (
    cb: (
      squareId: string,
      box: { worldX: number; worldY: number; width: number; height: number }
    ) => void
  ) => void;
  onSquareClick: (squareId: string | null, event: MouseEvent) => void;
  getZoomLevel: () => number;
  setZoomLevel: (zoomLevel: number, skipClamp?: boolean) => void;
  isCameraFollowing: () => boolean;
  getHorizontalScale: () => number;
  getPriceScale: () => number;
}

interface InteractionManagerOptions {
  props: InteractionBindings;
  dragActivationThreshold?: number;
  wheelSensitivity?: number;
}

export class InteractionManager {
  private isPointerDown = false;
  private isDragging = false;
  private dragStart: PointerPosition = { x: 0, y: 0 };
  private dragStartCamera: PointerPosition = { x: 0, y: 0 };
  private mousePosition: PointerPosition = { x: 0, y: 0 };
  private readonly dragActivationThreshold: number;
  private wheelDeltaAccumulator = 0;
  private wheelFrameId: number | null = null;
  private readonly wheelSensitivity: number;

  constructor(private readonly options: InteractionManagerOptions) {
    this.dragActivationThreshold = options.dragActivationThreshold ?? 6;
    this.wheelSensitivity = options.wheelSensitivity ?? 0.0008;
  }

  public handleMouseDown(event: MouseEvent, canvas: HTMLCanvasElement): void {
    const position = this.extractCanvasPosition(event, canvas);
    this.isPointerDown = true;
    this.isDragging = false;
    this.dragStart = position;

    const { camera } = this.options.props;
    this.dragStartCamera = { x: camera.x, y: camera.y };

    canvas.style.cursor = 'grabbing';
  }

  public handleMouseUp(_event: MouseEvent, canvas: HTMLCanvasElement): void {
    this.isPointerDown = false;
    this.isDragging = false;
    canvas.style.cursor = 'grab';
  }

  public handleMouseLeave(event: MouseEvent, canvas: HTMLCanvasElement): void {
    this.mousePosition = { x: -1, y: -1 };
    canvas.style.cursor = 'grab';

    if (this.isPointerDown || this.isDragging) {
      this.handleMouseUp(event, canvas);
    } else {
      this.isPointerDown = false;
      this.isDragging = false;
    }
  }

  public handleMouseMove(event: MouseEvent, canvas: HTMLCanvasElement): void {
    this.mousePosition = this.extractCanvasPosition(event, canvas);
    if (this.isPointerDown) {
      this.processDrag();
      return;
    }

    if (this.isDragging) {
      canvas.style.cursor = 'grabbing';
      return;
    }

    if (this.options.props.isSketchOrCobra()) {
      canvas.style.cursor = 'grab';
      return;
    }

    const hovering = this.isMouseOverSquare();
    canvas.style.cursor = hovering ? 'pointer' : 'grab';
  }

  public handleClick(event: MouseEvent, canvas: HTMLCanvasElement): void {
    console.log('handleClick', this.mousePosition);
    if (this.isDragging) {
      return;
    }

    const position = this.extractCanvasPosition(event, canvas);
    const dragDistance = Math.sqrt(
      (position.x - this.dragStart.x) ** 2 + (position.y - this.dragStart.y) ** 2
    );

    if (dragDistance > 10) {
      return;
    }

    let clickedSquareId: string | null = null;
    let minDistance = Infinity;

    this.options.props.forEachSelectableBox((squareId, box) => {
      const topLeft = this.options.props.getWorldToScreen(box.worldX, box.worldY + box.height);
      const bottomRight = this.options.props.getWorldToScreen(box.worldX + box.width, box.worldY);

      if (
        position.x >= topLeft.x &&
        position.x < bottomRight.x &&
        position.y >= topLeft.y &&
        position.y < bottomRight.y
      ) {
        const centerX = (topLeft.x + bottomRight.x) / 2;
        const centerY = (topLeft.y + bottomRight.y) / 2;
        const distance = Math.sqrt(
          (position.x - centerX) ** 2 + (position.y - centerY) ** 2
        );

        if (distance < minDistance) {
          minDistance = distance;
          clickedSquareId = squareId;
        }
      }
    });

    this.options.props.onSquareClick(clickedSquareId, event);
  }

  public handleWheel(event: WheelEvent): void {
    event.preventDefault();
    this.wheelDeltaAccumulator += this.normalizeWheelDelta(event);

    if (this.wheelFrameId !== null) {
      return;
    }

    this.wheelFrameId = window.requestAnimationFrame(() => {
      const currentZoom = this.options.props.getZoomLevel();
      const nextZoom = clampUserZoomLevel(currentZoom - this.wheelDeltaAccumulator * this.wheelSensitivity);

      if (nextZoom !== currentZoom) {
        // If following price, just update zoom (existing behavior)
        if (this.options.props.isCameraFollowing()) {
          this.options.props.setZoomLevel(nextZoom, true); // Skip clamp, already clamped to user limits
        } else {
          // When not following, zoom towards viewport center
          const { width, height } = this.options.props.getCanvasDimensions();
          const centerScreenX = width / 2;
          const centerScreenY = height / 2;

          // Get world coordinates of viewport center before zoom
          const centerWorld = this.options.props.screenToWorld(centerScreenX, centerScreenY);

          // Apply zoom change (skip clamp, already clamped to user limits)
          this.options.props.setZoomLevel(nextZoom, true);

          // Get new scales after zoom
          const horizontalScale = this.options.props.getHorizontalScale();
          const priceScale = this.options.props.getPriceScale();

          // Calculate new camera position to keep the same world point at screen center
          // From screenToWorld: worldX = screenX / horizontalScale + camera.x
          // Solving for camera.x: camera.x = worldX - screenX / horizontalScale
          const newCameraX = Math.max(0, centerWorld.x - centerScreenX / horizontalScale);
          // For Y: worldY = camera.y + (height/2 - screenY) / priceScale
          // Solving: camera.y = worldY - (height/2 - screenY) / priceScale
          const newCameraY = centerWorld.y - (height / 2 - centerScreenY) / priceScale;

          // Update camera position
          this.options.props.setCameraPosition({ x: newCameraX, y: newCameraY });
          this.options.props.syncCameraTargets({ x: newCameraX, y: newCameraY });
        }
      }

      this.wheelDeltaAccumulator = 0;
      this.wheelFrameId = null;
    });
  }

  public getMousePosition(): PointerPosition {
    return this.mousePosition;
  }

  public isDraggingActive(): boolean {
    return this.isDragging;
  }

  private processDrag(): void {
    const { x, y } = this.mousePosition;
    const deltaX = x - this.dragStart.x;
    const deltaY = y - this.dragStart.y;
    const dragDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (!this.isDragging && dragDistance > this.dragActivationThreshold) {
      this.isDragging = true;
      this.options.props.setCameraFollowing(false);
      this.options.props.emitCameraFollowingChanged(false);
    }

    if (!this.isDragging) {
      return;
    }

    // Use the same horizontalScale and priceScale as the world renderer so that
    // dragging the camera moves the entire world layer rigidly in screen space.
    const horizontalScale = this.options.props.getHorizontalScale();
    const priceScale = this.options.props.getPriceScale() || 1;

    const worldDeltaX = -deltaX / (horizontalScale || 1);
    const worldDeltaY = deltaY / (priceScale || 1);

    const newX = Math.max(0, this.dragStartCamera.x + worldDeltaX);
    const newY = this.dragStartCamera.y + worldDeltaY;

    this.options.props.setCameraPosition({ x: newX, y: newY });
    this.options.props.syncCameraTargets({ x: newX, y: newY });
  }

  private extractCanvasPosition(event: MouseEvent, canvas: HTMLCanvasElement): PointerPosition {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  private isMouseOverSquare(): boolean {
    if (this.mousePosition.x < 0 || this.mousePosition.y < 0) {
      return false;
    }

    let hovering = false;
    this.options.props.forEachSelectableBox((squareId, box) => {
      if (hovering) {
        return;
      }

      const topLeft = this.options.props.getWorldToScreen(box.worldX, box.worldY + box.height);
      const bottomRight = this.options.props.getWorldToScreen(box.worldX + box.width, box.worldY);

      if (
        this.mousePosition.x >= topLeft.x &&
        this.mousePosition.x < bottomRight.x &&
        this.mousePosition.y >= topLeft.y &&
        this.mousePosition.y < bottomRight.y
      ) {
        hovering = true;
      }
    });

    return hovering;
  }

  private normalizeWheelDelta(event: WheelEvent): number {
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
      return event.deltaY * 16;
    }
    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      return event.deltaY * window.innerHeight;
    }
    return event.deltaY;
  }

  public destroy(): void {
    if (this.wheelFrameId !== null) {
      cancelAnimationFrame(this.wheelFrameId);
      this.wheelFrameId = null;
    }
  }
}

