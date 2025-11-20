export interface Camera {
  x: number
  y: number
  targetX: number
  targetY: number
  smoothX: number
  smoothY: number
}

export interface WorldPoint {
  x: number
  y: number
}

export interface ScreenPoint {
  x: number
  y: number
}

export interface WorldBounds {
  left: number
  right: number
  top: number
  bottom: number
}

export interface WorldSize {
  x: number
  y: number
}

export class WorldCoordinateSystem {
  private camera: Camera
  private pixelsPerPoint: number = 5
  private canvasWidth: number = 0
  private canvasHeight: number = 0
  private viewportHeight: number = 0
  private visiblePriceRange: number = 0
  private priceScale: number = 0

  constructor(camera: Camera) {
    this.camera = camera
  }

  updateCanvasSize(width: number, height: number): void {
    this.canvasWidth = width
    this.canvasHeight = height
  }

  updateViewport(viewportHeight: number, visiblePriceRange: number): void {
    this.viewportHeight = viewportHeight
    this.visiblePriceRange = visiblePriceRange
    const fixedReferenceViewportHeight = 1145; // Fixed reference height
    this.priceScale = fixedReferenceViewportHeight / visiblePriceRange
  }
  
  setPixelsPerPoint(pixelsPerPoint: number): void {
    this.pixelsPerPoint = pixelsPerPoint
  }

  worldToScreen(worldX: number, worldY: number): ScreenPoint {
    const screenX = worldX - this.camera.x
    const screenY = this.canvasHeight / 2 - (worldY - this.camera.y) * this.priceScale
    return { x: screenX, y: screenY }
  }

  screenToWorld(screenX: number, screenY: number): WorldPoint {
    const worldX = screenX + this.camera.x
    const worldY = this.camera.y + (this.canvasHeight / 2 - screenY) / this.priceScale
    return { x: worldX, y: worldY }
  }

  getLinePosition(dataIndex: number, dataOffset: number, price: number): WorldPoint {
    return {
      x: (dataIndex + dataOffset) * this.pixelsPerPoint,
      y: price
    }
  }

  getSquareWorldSize(screenSquareSize: number): WorldSize {
    return {
      x: screenSquareSize,
      y: screenSquareSize / this.priceScale
    }
  }

  getVisibleWorldBounds(buffer: number = 0): WorldBounds {
    const halfRange = this.visiblePriceRange / 2
    const bufferInPrice = buffer / this.priceScale

    return {
      left: this.camera.x - buffer,
      right: this.camera.x + this.canvasWidth + buffer,
      top: this.camera.y + halfRange + bufferInPrice,
      bottom: this.camera.y - halfRange - bufferInPrice
    }
  }

  isWorldPointVisible(worldX: number, worldY: number, margin: number = 0): boolean {
    const screen = this.worldToScreen(worldX, worldY)
    return screen.x >= -margin && screen.x <= this.canvasWidth + margin &&
           screen.y >= -margin && screen.y <= this.canvasHeight + margin
  }

  /**
   * Get the current priceScale used for rendering
   */
  public getPriceScale(): number {
    return this.priceScale
  }
}