import type { Camera } from '../../../core/WorldCoordinateSystem';

interface PointerPosition {
  x: number;
  y: number;
}

interface PointerInteractionType {
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
  forEachSelectableBox: (
    cb: (
      squareId: string,
      box: { worldX: number; worldY: number; width: number; height: number }
    ) => void
  ) => void;
  onSquareClick: (squareId: string | null, event: MouseEvent) => void;
}

interface PointerInteractionManagerOptions {
  props: PointerInteractionType;
  dragActivationThreshold?: number;
}

export class PointerInteractionManager {
  private isPointerDown = false;
  private isDragging = false;
  private dragStart: PointerPosition = { x: 0, y: 0 };
  private dragStartCamera: PointerPosition = { x: 0, y: 0 };
  private mousePosition: PointerPosition = { x: 0, y: 0 };
  private readonly dragActivationThreshold: number;

  constructor(private readonly options: PointerInteractionManagerOptions) {
    this.dragActivationThreshold = options.dragActivationThreshold ?? 6;
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

    const worldDeltaX = -deltaX;
    const { width, height } = this.options.props.getCanvasDimensions();
    const verticalMargin = height * this.options.props.getVerticalMarginRatio();
    const viewportHeight = Math.max(1, height - 2 * verticalMargin);
    const effectivePriceRange = Math.max(0.0001, this.options.props.getVisiblePriceRange());
    const priceScale = viewportHeight / effectivePriceRange;
    const worldDeltaY = priceScale !== 0 ? deltaY / priceScale : 0;

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
}

