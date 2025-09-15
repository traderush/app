// Clearing House Types
// These types are specific to the clearing house trading operations

import { TimeFrame } from '../../config/timeframeConfig';

// Re-export all timeframe-related exports from config
export {
  getAllTimeframes,
  getTimeframeConfig,
  IronCondorTimeframes,
  isValidIronCondorTimeframe,
  isValidSpreadTimeframe,
  isValidTimeframe,
  SpreadTimeframes,
  TimeFrame,
  TIMEFRAME_CONFIGS,
} from '../../config/timeframeConfig';

// Re-export all message types
export * from './messages';

// Contract status enum
export enum ContractStatus {
  ACTIVE = 'active',
  EXERCISED = 'exercised',
  EXPIRED = 'expired',
  ABANDONED = 'abandoned',
  TRIGGERED = 'triggered',
}

// Spread type enum
export enum SpreadType {
  CALL = 'call',
  PUT = 'put',
}

export interface PricePoint {
  price: number;
  timestamp: number;
  volume?: number;
}

// Iron Condor contract represents a price range option
export interface IronCondorContract {
  id: string;
  returnMultiplier: number; // Payout multiplier
  timeframe: TimeFrame;
  totalVolume: number; // Total trade volume
  positions: Map<string, Position[]>; // User positions
  status: ContractStatus;
  strikeRange: {
    lower: number;
    upper: number;
  };
  exerciseWindow: {
    start: number;
    end: number;
  };
}

// Spread option contract
export interface SpreadContract {
  id: string;
  spreadType: SpreadType; // Call = price must go up, Put = price must go down
  strikePrice: number; // The strike price level
  returnMultiplier: number; // Payout multiplier
  timeframe: TimeFrame;
  totalVolume: number; // Total trade volume
  positions: Map<string, SpreadPosition[]>; // User positions
  status: ContractStatus;
  exerciseWindow: {
    start: number;
    end: number;
  };
}

// Position in an Iron Condor contract
export interface Position {
  userId: string;
  amount: number;
  timestamp: number;
  contractId: string;
}

// Position in a Spread contract
export interface SpreadPosition {
  userId: string;
  amount: number;
  timestamp: number;
  contractId: string;
}

export interface Transaction {
  userId: string;
  type: 'position' | 'settlement' | 'deposit' | 'withdrawal';
  amount: number;
  contractId?: string;
  returnMultiplier?: number;
  timestamp: number;
}

export enum MESSAGES {
  BALANCE_UPDATE = 'balance_updated',
  PRICE_UPDATE = 'price_update',
}
