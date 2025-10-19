import {
  TimeFrame,
  IronCondorTimeframes,
  SpreadTimeframes,
} from '../config/timeframeConfig';

export { TimeFrame, IronCondorTimeframes, SpreadTimeframes };

export type IronCondorTimeframe = (typeof IronCondorTimeframes)[number];
export type SpreadTimeframe = (typeof SpreadTimeframes)[number];

export enum MarketType {
  IRON_CONDOR = 'iron_condor',
  SPREAD = 'spread',
}

export interface LegacyPosition {
  userId: string;
  amount: number;
  timestamp: number;
  contractId: string;
}

export interface IronCondorContractSnapshot {
  id: string;
  returnMultiplier: number;
  timeframe: TimeFrame;
  totalVolume: number;
  positions: Map<string, LegacyPosition[]>;
  status: 'active' | 'exercised' | 'expired' | 'abandoned';
  strikeRange: {
    lower: number;
    upper: number;
  };
  exerciseWindow: {
    start: number;
    end: number;
  };
  columnIndex: number;
  anchorPrice: number;
}
