// Centralized timeframe configuration
// This file contains all timeframe-specific logic and configurations

export enum TimeFrame {
  HALF_SECOND = 500,
  SECOND = 1000,
  TWO_SECONDS = 2000,
  FOUR_SECONDS = 4000,
  TEN_SECONDS = 10000,
}

// Const arrays for type definitions
export const IronCondorTimeframes = [
  TimeFrame.HALF_SECOND,
  TimeFrame.SECOND,
  TimeFrame.TWO_SECONDS,
  TimeFrame.FOUR_SECONDS,
  TimeFrame.TEN_SECONDS,
] as const;
export const SpreadTimeframes = [
  TimeFrame.TWO_SECONDS,
  TimeFrame.TEN_SECONDS,
] as const;

// Configuration for each timeframe
export interface TimeframeConfig {
  // Display properties
  displayName: string;
  shortName: string;

  // Grid dimensions
  ironCondor: {
    numColumns: number;
    columnsBehind: number; // How many columns to keep showing after price passes them
    rowsAbove: number;
    rowsBelow: number;
  };
  spread: {
    numColumns: number;
    columnsBehind: number; // How many columns to keep showing after price passes them
  };

  // Price movement
  boxHeight: number; // How much price moves per box

  // Timing properties
  contractGenerationOffset: number; // How far ahead to generate contracts
  contractExpiryBuffer: number; // Buffer time before contract expires
}

// Complete configuration for all timeframes
export const TIMEFRAME_CONFIGS: Record<TimeFrame, TimeframeConfig> = {
  [TimeFrame.HALF_SECOND]: {
    displayName: '0.5 Second',
    shortName: '0.5s',
    ironCondor: {
      numColumns: 25,
      columnsBehind: 5,
      rowsAbove: 10,
      rowsBelow: 10,
    },
    spread: {
      numColumns: 25,
      columnsBehind: 5,
    },
    boxHeight: 0.02, // 500ms / 25 = 20 dollars → matches width in pixel scale
    contractGenerationOffset: 25000,
    contractExpiryBuffer: 50,
  },
  [TimeFrame.SECOND]: {
    displayName: '1 Second',
    shortName: '1s',
    ironCondor: {
      numColumns: 25,
      columnsBehind: 5,
      rowsAbove: 10,
      rowsBelow: 10,
    },
    spread: {
      numColumns: 25,
      columnsBehind: 5,
    },
    boxHeight: 0.04, // 1000ms / 25 = 40 dollars → matches width in pixel scale
    contractGenerationOffset: 25000,
    contractExpiryBuffer: 50,
  },
  [TimeFrame.TWO_SECONDS]: {
    displayName: '2 Seconds',
    shortName: '2s',
    ironCondor: {
      numColumns: 25,
      columnsBehind: 8,
      rowsAbove: 10,
      rowsBelow: 10,
    },
    spread: {
      numColumns: 25,
      columnsBehind: 8,
    },
    boxHeight: 0.08, // 2000ms / 25 = 80 dollars → matches width in pixel scale  
    contractGenerationOffset: 50000,
    contractExpiryBuffer: 100,
  },
  [TimeFrame.FOUR_SECONDS]: {
    displayName: '4 Seconds',
    shortName: '4s',
    ironCondor: {
      numColumns: 25,
      columnsBehind: 10,
      rowsAbove: 10,
      rowsBelow: 10,
    },
    spread: {
      numColumns: 25,
      columnsBehind: 10,
    },
    boxHeight: 0.16, // 4000ms / 25 = 160 dollars → matches width in pixel scale
    contractGenerationOffset: 100000,
    contractExpiryBuffer: 200,
  },

  [TimeFrame.TEN_SECONDS]: {
    displayName: '10 Seconds',
    shortName: '10s',
    ironCondor: {
      numColumns: 25,
      columnsBehind: 15,
      rowsAbove: 10,
      rowsBelow: 10,
    },
    spread: {
      numColumns: 25,
      columnsBehind: 15,
    },
    boxHeight: 0.4, // 10000ms / 25 = 400 dollars → matches width in pixel scale
    contractGenerationOffset: 250000,
    contractExpiryBuffer: 500,
  },
};

// Type helpers
export type ValidTimeframe = keyof typeof TIMEFRAME_CONFIGS;

// Helper functions
export function getTimeframeConfig(timeframe: TimeFrame): TimeframeConfig {
  const config = TIMEFRAME_CONFIGS[timeframe];
  if (!config) {
    throw new Error(`Invalid timeframe: ${timeframe}`);
  }
  return config;
}

export function isValidTimeframe(value: any): value is TimeFrame {
  return value === TimeFrame.TWO_SECONDS || value === TimeFrame.TEN_SECONDS;
}

export function isValidIronCondorTimeframe(value: any): value is TimeFrame {
  return isValidTimeframe(value);
}

export function isValidSpreadTimeframe(value: any): value is TimeFrame {
  return isValidTimeframe(value);
}

export function timeframeToDisplayString(timeframe: TimeFrame): string {
  return getTimeframeConfig(timeframe).shortName;
}

// Get all available timeframes
export function getAllTimeframes(): TimeFrame[] {
  return Object.keys(TIMEFRAME_CONFIGS).map(Number) as TimeFrame[];
}

// Get timeframe by index (useful for UI navigation)
export function getTimeframeByIndex(index: number): TimeFrame {
  const timeframes = getAllTimeframes();
  return timeframes[Math.max(0, Math.min(index, timeframes.length - 1))];
}
