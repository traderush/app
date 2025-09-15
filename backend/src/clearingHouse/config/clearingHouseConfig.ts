// Clearing House Configuration
// Based on BACKEND.md specifications

import { TimeFrame, TIMEFRAME_CONFIGS } from '../../config/timeframeConfig';

export interface IronCondorConfig {
  rowsAbove: number;
  rowsBelow: number;
  numColumns: number;
}

export interface SpreadConfig {
  numColumns: number;
}

export type IronCondorTimeframes = {
  [K in TimeFrame]: IronCondorConfig;
};

export type SpreadTimeframes = {
  [K in TimeFrame]: SpreadConfig;
};

export interface ClearingHouseConstants {
  initialPrice: number;
  volatility: number;
  multiplierRange: {
    min: number;
    max: number;
  };
  priceUpdateInterval: number; // milliseconds
}

export const CLEARING_HOUSE_CONFIG = {
  userStartingBalance: 1000,
  clearingHouseStartingBalance: 1_000_000,
  ironCondor: {
    timeframes: Object.entries(TIMEFRAME_CONFIGS).reduce(
      (acc, [tf, config]) => {
        acc[Number(tf) as TimeFrame] = {
          rowsAbove: config.ironCondor.rowsAbove,
          rowsBelow: config.ironCondor.rowsBelow,
          numColumns: config.ironCondor.numColumns,
        };
        return acc;
      },
      {} as IronCondorTimeframes
    ),
  },

  spreads: {
    timeframes: Object.entries(TIMEFRAME_CONFIGS).reduce(
      (acc, [tf, config]) => {
        acc[Number(tf) as TimeFrame] = {
          numColumns: config.spread.numColumns,
        };
        return acc;
      },
      {} as SpreadTimeframes
    ),
  },

  constants: {
    initialPrice: 100,
    volatility: 0.0005,
    multiplierRange: {
      min: 1,
      max: 3,
    },
    priceUpdateInterval: 100,
  },
} as const;

// Type alias for all timeframes
export type AllTimeframes = TimeFrame;

// Helper functions
export function getIronCondorConfig(timeframe: TimeFrame): IronCondorConfig {
  return CLEARING_HOUSE_CONFIG.ironCondor.timeframes[timeframe];
}

export function getSpreadConfig(timeframe: TimeFrame): SpreadConfig {
  return CLEARING_HOUSE_CONFIG.spreads.timeframes[timeframe];
}

// Re-export validation helpers
export {
  isValidIronCondorTimeframe,
  isValidSpreadTimeframe,
} from '../../config/timeframeConfig';
