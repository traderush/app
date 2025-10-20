// Unified timeframe definitions and configuration used by the canvas and engine

export enum TimeFrame {
  HALF_SECOND = 500,
  SECOND = 1000,
  TWO_SECONDS = 2000,
  FOUR_SECONDS = 4000,
  TEN_SECONDS = 10000,
}

export type TimeframeConfig = {
  ms: number;
  shortName: string;
  // Height of a single price bucket (maps to contract strike height)
  boxHeight: number;
  // Per-game configs (currently iron_condor)
  ironCondor: {
    // Forward horizon columns to show
    numColumns: number;
    // How many past columns we keep rendering behind NOW
    columnsBehind: number;
    // Rows above and below the anchor price
    rowsAbove: number;
    rowsBelow: number;
  };
};

const TF_CONFIG: Record<TimeFrame, TimeframeConfig> = {
  [TimeFrame.HALF_SECOND]: {
    ms: TimeFrame.HALF_SECOND,
    shortName: '0.5s',
    boxHeight: 1,
    ironCondor: {
      numColumns: 80,
      columnsBehind: 20,
      rowsAbove: 20,
      rowsBelow: 20,
    },
  },
  [TimeFrame.SECOND]: {
    ms: TimeFrame.SECOND,
    shortName: '1s',
    boxHeight: 1,
    ironCondor: {
      numColumns: 60,
      columnsBehind: 20,
      rowsAbove: 20,
      rowsBelow: 20,
    },
  },
  [TimeFrame.TWO_SECONDS]: {
    ms: TimeFrame.TWO_SECONDS,
    shortName: '2s',
    boxHeight: 1,
    ironCondor: {
      numColumns: 40,
      columnsBehind: 20,
      rowsAbove: 15,
      rowsBelow: 15,
    },
  },
  [TimeFrame.FOUR_SECONDS]: {
    ms: TimeFrame.FOUR_SECONDS,
    shortName: '4s',
    boxHeight: 1,
    ironCondor: {
      numColumns: 20,
      columnsBehind: 10,
      rowsAbove: 12,
      rowsBelow: 12,
    },
  },
  [TimeFrame.TEN_SECONDS]: {
    ms: TimeFrame.TEN_SECONDS,
    shortName: '10s',
    boxHeight: 1,
    ironCondor: {
      numColumns: 10,
      columnsBehind: 5,
      rowsAbove: 10,
      rowsBelow: 10,
    },
  },
};

export function getTimeframeConfig(tf: TimeFrame): TimeframeConfig {
  return TF_CONFIG[tf];
}

export function getAllTimeframes(): TimeFrame[] {
  return [
    TimeFrame.HALF_SECOND,
    TimeFrame.SECOND,
    TimeFrame.TWO_SECONDS,
    TimeFrame.FOUR_SECONDS,
    TimeFrame.TEN_SECONDS,
  ];
}

