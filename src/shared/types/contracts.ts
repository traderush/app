// Contract Types matching the new backend architecture
// These types are shared between frontend and backend

import type { TimeFrame } from './timeframe';

export type IronCondorTimeframe = TimeFrame;

export { TimeFrame } from './timeframe';

export type IronCondorId = `IC_${number}_${number}`;
export type ContractId = IronCondorId;

// Contract status
export enum ContractStatus {
  ACTIVE = 'active',
  EXERCISED = 'exercised',
  EXPIRED = 'expired',
  ABANDONED = 'abandoned',
  TRIGGERED = 'triggered'
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

export type Contract = IronCondorContract;

// Helper type guards
export function isIronCondorContract(contract: Contract): contract is IronCondorContract {
  return contract.id.startsWith('IC_');
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
