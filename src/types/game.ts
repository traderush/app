// Import contract types
import { IronCondorId, SpreadCallId, SpreadPutId, TimeFrame } from './contracts';
import { GameType } from './gameType';

// Box/Grid element types
export interface GridBox {
  x: number;
  y: number;
  id: IronCondorId; // Now uses Iron Condor contract ID
  gridX: number;
  gridY: number;
  multiplier: number;
  totalTrades: number;
  userTrade?: number;
  contractId: IronCondorId;
}

// Tower element types
export interface Tower {
  id: SpreadCallId | SpreadPutId; // Now uses Spread contract ID
  columnX: number;
  type: 'top' | 'bottom'; // top = call spread, bottom = put spread
  priceThreshold: number;
  multiplier: number;
  totalTrades: number;
  userTrade?: number;
  worldX: number;
  worldY: number;
  width: number;
  height: number;
  timestampRange: {
    start: number;
    end: number;
  };
  contractId: SpreadCallId | SpreadPutId;
}

// Circle (for sketch/cobra games)
export interface Circle {
  x: number;
  y: number;
  id: string;
  marked: boolean;
  passed?: boolean;
  missed?: boolean;
  isNew?: boolean;
}

// Game state types
export interface GameState {
  marker: Marker;
  globalOffset: GlobalOffset;
  selectedCircles: Circle[];
  selectedTimeframe: TimeFrame;
  gameType: GameType;
}

export interface Marker {
  x: number;
  y: number;
  active: boolean;
  price: number;
  logs: { x: number; y: number; price: number | null }[];
}

export interface Market {
  price: number;
  range: {
    minPrice: number;
    maxPrice: number;
  };
}

export interface GlobalOffset {
  y: number;
  x: number;
}

export interface TrailPoint {
  y: number;
  x: number;
  price: number;
}
