export type BoxHitContractType = 'IRON_CONDOR' | string;

export interface BoxHitContract {
  contractId: string;
  startTime: number;
  endTime: number;
  lowerStrike: number;
  upperStrike: number;
  returnMultiplier: number;
  totalVolume: number;
  isActive: boolean;
  type?: BoxHitContractType;
}

export interface BoxHitPosition {
  contractId: string;
  amount: number;
  timestamp: number;
  tradeId: string;
  result?: 'win' | 'loss';
  payout?: number;
  settledAt?: Date;
}

export type BoxHitPositionMap = Map<string, BoxHitPosition>;

export interface TradeResultPayload {
  contractId: string;
  won: boolean;
  payout: number;
  profit: number;
  balance?: number;
  tradeId?: string;
}

export type TradeNotificationType = 'success' | 'error' | 'info';

export interface TradeNotification {
  id: string;
  message: string;
  type: TradeNotificationType;
  isVisible: boolean;
}
