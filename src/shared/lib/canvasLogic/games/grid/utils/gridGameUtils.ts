interface PriceDataLike {
  price: number;
  timestamp?: number;
}

export function getWorldXForTimestamp(
  timestamp: number,
  priceData: PriceDataLike[],
  totalDataPoints: number,
  pixelsPerPoint: number,
  msPerPointEstimate: number
): number | null {
  if (!priceData.length) {
    return null;
  }
  const lastPoint = priceData[priceData.length - 1];
  if (!lastPoint?.timestamp) {
    return null;
  }
  const deltaMs = timestamp - lastPoint.timestamp;
  const currentWorldX = (totalDataPoints - 1) * pixelsPerPoint;
  const offsetPoints = deltaMs / Math.max(1, msPerPointEstimate);
  return currentWorldX + offsetPoints * pixelsPerPoint;
}

/**
 * Calculate timestamp for a given world X position
 * @param worldX - World X position
 * @param priceData - Array of price data points
 * @param totalDataPoints - Total number of data points processed
 * @param pixelsPerPoint - Pixels per data point
 * @param msPerPointEstimate - Estimated milliseconds per point
 * @returns Timestamp or null if calculation not possible
 */
export function getTimestampForWorldX(
  worldX: number,
  priceData: PriceDataLike[],
  totalDataPoints: number,
  pixelsPerPoint: number,
  msPerPointEstimate: number
): number | null {
  if (!priceData.length) {
    return null;
  }
  const lastPoint = priceData[priceData.length - 1];
  if (!lastPoint?.timestamp) {
    return null;
  }
  const currentWorldX = (totalDataPoints - 1) * pixelsPerPoint;
  const deltaPoints = (worldX - currentWorldX) / pixelsPerPoint;
  return lastPoint.timestamp + deltaPoints * msPerPointEstimate;
}

/**
 * Format timestamp as a human-readable label
 * @param timestamp - Timestamp to format
 * @param includeMillis - Whether to include milliseconds
 * @returns Formatted time string
 */
export function formatTimestampLabel(timestamp: number, includeMillis: boolean = false): string {
  const date = new Date(timestamp);
  if (includeMillis) {
    const millis = String(date.getMilliseconds()).padStart(3, '0');
    return `${date.toLocaleTimeString('en-US', { hour12: false })}.${millis}`;
  }
  return date.toLocaleTimeString('en-US', { hour12: false });
}

/**
 * Check if a box is outside the viewport (for culling)
 * @param box - Box with world coordinates and dimensions
 * @param viewport - Viewport bounds in world coordinates
 * @returns true if box is outside viewport, false if visible
 */
export function isBoxOutsideViewport(
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
 * Liang-Barsky line-rectangle intersection algorithm
 * Checks if a line segment intersects with a rectangle
 * @param p1 - First point of line segment
 * @param p2 - Second point of line segment
 * @param r - Rectangle bounds
 * @returns true if line intersects rectangle
 */
export function segmentIntersectsRect(
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
 * Calculate appropriate price step size for axis markings
 * @param priceRange - Visible price range
 * @param isSketchOrCobra - Whether game type is SKETCH or COBRA
 * @returns Calculated price step
 */
export function calculatePriceStep(priceRange: number, isSketchOrCobra: boolean): number {
  // For sketch game, show more markings since boxes are smaller
  const targetMarkings = isSketchOrCobra ? 24 : 8;
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

/**
 * Zoom level constants and utilities
 */
export const ZOOM_MIN = 0.75; // Minimum zoom level (20% zoom out)
export const ZOOM_MAX = 1.35; // Maximum zoom level (20% zoom in)
export const ZOOM_REFERENCE_WIDTH = 1920; // Reference width where zoom = 1.0

/**
 * Clamp zoom level to valid range
 * @param zoomLevel - Zoom level to clamp
 * @returns Clamped zoom level between ZOOM_MIN and ZOOM_MAX
 */
export function clampZoomLevel(zoomLevel: number): number {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomLevel));
}

/**
 * Calculate zoom level based on screen/canvas width
 * Smaller screens = lower zoom (more boxes visible)
 * Larger screens = higher zoom (larger boxes)
 * @param width - Canvas or screen width in pixels
 * @param referenceWidth - Reference width where zoom = 1.0 (default: 1920)
 * @returns Zoom level clamped between ZOOM_MIN and ZOOM_MAX
 */
export function calculateZoomFromWidth(width: number, referenceWidth: number = ZOOM_REFERENCE_WIDTH): number {
  const zoomRatio = width / referenceWidth;
  return clampZoomLevel(zoomRatio);
}

