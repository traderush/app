// Contract Types matching the new backend architecture
// These types are shared between frontend and backend

import { TimeFrame, IronCondorTimeframes, SpreadTimeframes } from './timeframe';

// Type aliases for backward compatibility
type IronCondorTimeframe = typeof IronCondorTimeframes[number];
type SpreadTimeframe = typeof SpreadTimeframes[number];

// Re-export TimeFrame enum and types for convenience
export { TimeFrame } from './timeframe';
export type { IronCondorTimeframe, SpreadTimeframe };

// Contract ID patterns
export type IronCondorId = `IC_${number}_${number}`;
export type SpreadCallId = `SC_${number}_${number}`;
export type SpreadPutId = `SP_${number}_${number}`;
export type ContractId = IronCondorId | SpreadCallId | SpreadPutId;

// Contract status
export enum ContractStatus {
  ACTIVE = 'active',
  EXERCISED = 'exercised',
  EXPIRED = 'expired',
  ABANDONED = 'abandoned',
  TRIGGERED = 'triggered'
}

// Spread type
export enum SpreadType {
  CALL = 'call',
  PUT = 'put'
}

// Price point
export interface PricePoint {
  price: number;
  timestamp: number;
  volume?: number;
}

// Position in a contract
export interface Position {
  userId: string;
  amount: number;
  timestamp: number;
  contractId: ContractId;
}

// Iron Condor contract (for Grid/Boxes games)
export interface IronCondorContract {
  id: IronCondorId;
  returnMultiplier: number;
  timeframe: IronCondorTimeframe;
  totalVolume: number;
  positions: Map<string, Position[]>;
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

// Spread contract (for Towers game)
export interface SpreadContract {
  id: SpreadCallId | SpreadPutId;
  spreadType: SpreadType;
  strikePrice: number;
  returnMultiplier: number;
  timeframe: SpreadTimeframe;
  totalVolume: number;
  positions: Map<string, Position[]>;
  status: ContractStatus;
  exerciseWindow: {
    start: number;
    end: number;
  };
}

// Contract type union
export type Contract = IronCondorContract | SpreadContract;

// Helper type guards
export function isIronCondorContract(contract: Contract): contract is IronCondorContract {
  return contract.id.startsWith('IC_');
}

export function isSpreadContract(contract: Contract): contract is SpreadContract {
  return contract.id.startsWith('SC_') || contract.id.startsWith('SP_');
}

// Transaction types
export interface Transaction {
  userId: string;
  type: 'position' | 'settlement' | 'deposit' | 'withdrawal';
  amount: number;
  contractId?: ContractId;
  returnMultiplier?: number;
  timestamp: number;
}

// Balance update message
export interface BalanceUpdate {
  userId: string;
  balance: number;
  source: string;
  timestamp: number;
}