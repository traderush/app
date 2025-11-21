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
  private horizontalScale: number = 1
  private verticalScale: number = 1
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
    // Apply verticalScale (zoom level) to priceScale, similar to horizontalScale
    this.priceScale = (fixedReferenceViewportHeight / visiblePriceRange) * this.verticalScale
  }
  
  setPixelsPerPoint(pixelsPerPoint: number): void {
    this.pixelsPerPoint = pixelsPerPoint
  }

  setHorizontalScale(scale: number): void {
    if (Number.isFinite(scale) && scale > 0) {
      this.horizontalScale = scale
    }
  }

  getHorizontalScale(): number {
    return this.horizontalScale
  }

  setVerticalScale(scale: number): void {
    if (Number.isFinite(scale) && scale > 0) {
      this.verticalScale = scale
      // Recalculate priceScale with new verticalScale if viewport is already initialized
      if (this.visiblePriceRange > 0) {
        const fixedReferenceViewportHeight = 1145
        this.priceScale = (fixedReferenceViewportHeight / this.visiblePriceRange) * this.verticalScale
      }
    }
  }

  getVerticalScale(): number {
    return this.verticalScale
  }

  worldToScreen(worldX: number, worldY: number): ScreenPoint {
    const screenX = (worldX - this.camera.x) * this.horizontalScale
    const screenY = this.canvasHeight / 2 - (worldY - this.camera.y) * this.priceScale
    return { x: screenX, y: screenY }
  }

  screenToWorld(screenX: number, screenY: number): WorldPoint {
    const worldX = screenX / this.horizontalScale + this.camera.x
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
      x: screenSquareSize / this.horizontalScale,
      y: screenSquareSize / this.priceScale
    }
  }

  getVisibleWorldBounds(buffer: number = 0): WorldBounds {
    const halfRange = this.visiblePriceRange / 2
    const bufferInWorld = buffer / this.horizontalScale
    const bufferInPrice = buffer / this.priceScale

    return {
      left: this.camera.x - bufferInWorld,
      right: this.camera.x + this.canvasWidth / this.horizontalScale + bufferInWorld,
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