import type { WorldCoordinateSystem } from '../core/WorldCoordinateSystem';

export interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface BoxLike {
  worldX: number;
  worldY: number;
  width: number;
  height: number;
}

/**
 * Calculates the current visible world bounds (with optional buffer) using the provided world instance.
 * This mirrors the inlined logic that previously lived inside `GridGame`.
 */
export function getViewportBoundsForCulling(
  world: WorldCoordinateSystem,
  buffer: number = 100
): ViewportBounds {
  const viewportBounds = world.getVisibleWorldBounds(0);
  return {
    minX: viewportBounds.left - buffer,
    maxX: viewportBounds.right + buffer,
    minY: viewportBounds.bottom - buffer,
    maxY: viewportBounds.top + buffer,
  };
}

/**
 * Checks whether a box lies outside a viewport represented by min/max world coordinates.
 * This version replaces the Liang-Barsky style inline checks from `GridGame` with a shared helper.
 */
export function isBoxOutsideViewport(box: BoxLike, viewport: ViewportBounds): boolean {
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
 * Calculate viewport bounds based on camera position and visible range
 * Uses dynamic buffers based on viewport size and visible price range
 * 
 * @param world - World coordinate system
 * @param visiblePriceRange - Visible price range in world coordinates
 * @returns Viewport bounds or null if calculation not possible
 */
export function getViewportBounds(
  world: WorldCoordinateSystem,
  visiblePriceRange: number
): ViewportBounds | null {
  if (!visiblePriceRange || visiblePriceRange === 0) {
    return null;
  }

  // Calculate visible world X range
  // Use WorldCoordinateSystem to get actual visible bounds
  const worldBounds = world.getVisibleWorldBounds(0);

  // Add buffer for better coverage
  const bufferX = (worldBounds.right - worldBounds.left) * 0.5; // 50% buffer
  const bufferY = visiblePriceRange * 0.5; // 50% buffer

  // Calculate X bounds with buffer
  const minX = worldBounds.left - bufferX;
  const maxX = worldBounds.right + bufferX;

  // Calculate Y bounds with buffer
  const minY = worldBounds.bottom - bufferY;
  const maxY = worldBounds.top + bufferY;

  return { minX, maxX, minY, maxY };
}

