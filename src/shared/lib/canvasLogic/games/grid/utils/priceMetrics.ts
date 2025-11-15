import { GameType } from '@/shared/types';

interface BackendBoxLike {
  height: number;
}

interface PricePointLike {
  price: number;
  timestamp?: number;
}

interface VisibleRangeOptions {
  backendMultipliers: Record<string, BackendBoxLike>;
  priceData: PricePointLike[];
  gameType: GameType;
  currentVisibleRange: number;
  basePriceRange?: number;
  smoothingFactor?: number;
  sketchVisibleBoxes?: number;
  defaultVisibleBoxes?: number;
  minVisibleRange?: number;
  maxVisibleRange?: number;
}

export function computeVisiblePriceRange({
  backendMultipliers,
  priceData,
  gameType,
  currentVisibleRange,
  basePriceRange = 12,
  smoothingFactor = 0.85,
  sketchVisibleBoxes = 30,
  defaultVisibleBoxes = 10,
  minVisibleRange = 0.5,
  maxVisibleRange = 500,
}: VisibleRangeOptions): number {
  let targetPriceRange = basePriceRange;

  const boxValues = Object.values(backendMultipliers);
  if (boxValues.length > 0 && boxValues[0]) {
    const boxHeight = Math.max(0.1, boxValues[0].height);
    const boxesVisible =
      gameType === GameType.SKETCH || gameType === GameType.COBRA
        ? sketchVisibleBoxes
        : defaultVisibleBoxes;
    targetPriceRange = Math.max(targetPriceRange, boxHeight * boxesVisible);
  }

  if (priceData.length >= 2) {
    const sampleCount = Math.min(priceData.length, 240);
    let minPrice = Number.POSITIVE_INFINITY;
    let maxPrice = Number.NEGATIVE_INFINITY;

    for (let i = priceData.length - sampleCount; i < priceData.length; i++) {
      const price = Math.max(0, priceData[i].price);
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

  const nextRange =
    currentVisibleRange === 0
      ? targetPriceRange
      : currentVisibleRange * smoothingFactor + targetPriceRange * (1 - smoothingFactor);

  return Math.max(minVisibleRange, Math.min(nextRange, maxVisibleRange));
}

interface MsPerPointOptions {
  currentEstimate: number;
  lastTimestamp?: number;
  nextTimestamp?: number;
  smoothingFactor?: number;
  maxDeltaMs?: number;
  minEstimate?: number;
}

export function updateMsPerPointEstimate({
  currentEstimate,
  lastTimestamp,
  nextTimestamp,
  smoothingFactor = 0.9,
  maxDeltaMs = 60_000,
  minEstimate = 1,
}: MsPerPointOptions): number {
  if (typeof lastTimestamp === 'number' && typeof nextTimestamp === 'number') {
    const delta = nextTimestamp - lastTimestamp;
    if (delta > 0 && delta < maxDeltaMs) {
      const updated = currentEstimate * smoothingFactor + delta * (1 - smoothingFactor);
      return Math.max(minEstimate, updated);
    }
    return Math.max(minEstimate, currentEstimate);
  }

  if (typeof nextTimestamp === 'number') {
    return Math.max(minEstimate, currentEstimate);
  }

  return Math.max(minEstimate, currentEstimate);
}

