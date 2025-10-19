import {
  TimeFrame,
  TIMEFRAME_CONFIGS,
  IronCondorTimeframes,
  SpreadTimeframes,
} from '../config/timeframeConfig';

type TimeframeEntry = {
  displayName: string;
  shortName: string;
  priceStep: number;
  contractGenerationOffset: number;
  contractExpiryBuffer: number;
  numColumns?: number;
  rowsAbove?: number;
  rowsBelow?: number;
};

function buildTimeframeEntries(
  timeframes: readonly TimeFrame[],
  kind: 'ironCondor' | 'spread'
): Record<number, TimeframeEntry> {
  return timeframes.reduce<Record<number, TimeframeEntry>>((acc, timeframe) => {
    const config = TIMEFRAME_CONFIGS[timeframe];
    const entry: TimeframeEntry = {
      displayName: config.displayName,
      shortName: config.shortName,
      priceStep: config.boxHeight,
      contractGenerationOffset: config.contractGenerationOffset,
      contractExpiryBuffer: config.contractExpiryBuffer,
    };
    if (kind === 'ironCondor') {
      entry.numColumns = config.ironCondor.numColumns;
      entry.rowsAbove = config.ironCondor.rowsAbove;
      entry.rowsBelow = config.ironCondor.rowsBelow;
    } else {
      entry.numColumns = config.spread.numColumns;
    }
    acc[timeframe] = entry;
    return acc;
  }, {});
}

export const CLEARING_HOUSE_CONFIG = {
  constants: {
    initialPrice: 100,
    volatility: 0.02,
    priceUpdateInterval: 500,
    multiplierRange: { min: 0.5, max: 2.5 },
  },
  ironCondor: {
    timeframes: buildTimeframeEntries(IronCondorTimeframes, 'ironCondor'),
  },
  spreads: {
    timeframes: buildTimeframeEntries(SpreadTimeframes, 'spread'),
  },
  userStartingBalance: 10_000,
  clearingHouseStartingBalance: 0,
};

export type ClearingHouseConfig = typeof CLEARING_HOUSE_CONFIG;
