/** Game-related type definitions */

export interface Contract {
  contractId: string;
  returnMultiplier: number;
  lowerStrike: number;
  upperStrike: number;
  startTime: number;
  endTime: number;
  isActive: boolean;
  totalVolume: number;
  type?: string; // Optional type field for filtering
}

export interface Position {
  id: string;
  contractId: string;
  amount: number;
  placedAt: Date;
  result?: 'win' | 'loss';
  payout?: number;
  settledAt?: Date;
}

export interface MultiplierBox {
  value: number;
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  width: number;
  height: number;
  totalBets: number;
  userBet?: number;
  timestampRange?: {
    start: number;
    end: number;
  };
  priceRange?: {
    min: number;
    max: number;
  };
  status?: 'hit' | 'missed' | 'passed' | 'expired';
  isClickable?: boolean;
  isEmpty?: boolean;
}

export interface WebSocketMessage {
  messageId: string;
  type: string;
  payload?: unknown;
  timestamp: number;
  data?: unknown;
  [key: string]: unknown; // Allow additional properties
}

export interface WebSocketService {
  send: (message: { type: string; payload?: unknown }) => void;
  on: (event: string, handler: (data: unknown) => void) => void;
  off: (event: string, handler: (data: unknown) => void) => void;
}

export interface TradePlacement {
  contractId: string;
  amount: number;
}

export interface GameSessionState {
  isJoined: boolean;
  contracts: Contract[];
  userBalance: number;
  positions: Map<string, Position>;
}

export interface GameConfig {
  theme?: {
    colors?: {
      primary?: string;
    };
  };
  fps?: number;
  dpr?: number;
}

export interface GameState {
  isRunning: boolean;
  isPaused: boolean;
  score: number;
  time: number;
}