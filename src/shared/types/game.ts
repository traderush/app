// Import contract types
import type { IronCondorId, TimeFrame } from './contracts';
import type { GameType } from './gameType';

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
