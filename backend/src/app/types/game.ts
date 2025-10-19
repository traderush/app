/**
 * Game-specific type definitions
 */

import { GameMode, GameContract } from './common';
import { TimeFrame } from '../../clearingHouse';

// Box Hit specific types
export interface BoxHitContract extends GameContract {
  lowerStrike: number;
  upperStrike: number;
}


// Game state for visualization
export interface GameVisualizationState {
  currentPrice: number;
  priceHistory: Array<{
    price: number;
    timestamp: number;
  }>;
  priceVelocity: number;
  chartBounds: {
    minPrice: number;
    maxPrice: number;
    timeWindow: number;
  };
}

// Box Hit game state
export interface BoxHitGameState {
  gameMode: GameMode.BOX_HIT;
  timeframe: TimeFrame;
  contracts: BoxHitContract[];
  currentPrice: number;
}

// Individual box state
export interface BoxHitBox {
  contractId: string;
  isActive: boolean;
  isHit: boolean;
  hitStartTime?: number;
  hitDuration?: number;
  playerBets: Map<string, number>;
  totalVolume: number;
}

// Game engine interface
export interface IGameEngine {
  gameMode: GameMode;
  timeframe: TimeFrame;
  
  // Lifecycle methods
  initialize(): Promise<void>;
  start(): void;
  stop(): void;
  destroy(): void;
  
  // Game operations
  placeBet(userId: string, contractId: string, amount: number): Promise<boolean>;
  getActiveContracts(): GameContract[];
  getGameState(): BoxHitGameState ;
  
  // Event handlers
  onPriceUpdate(price: number, timestamp: number): void;
  onContractSettlement(contractId: string, winners: any[]): void;
}

// Game event types
export interface GameEvent {
  type: GameEventType;
  gameMode: GameMode;
  timestamp: number;
  data: any;
}

export enum GameEventType {
  // Box Hit events
  BOX_CREATED = 'box_created',
  BOX_HIT = 'box_hit',
  BOX_MISS = 'box_miss',
  BOX_EXPIRED = 'box_expired',
  
  // Common events
  BET_PLACED = 'bet_placed',
  CONTRACT_SETTLED = 'contract_settled',
  GAME_STATE_UPDATE = 'game_state_update'
}

// Animation states for frontend
export interface AnimationState {
  boxHit?: {
    contractId: string;
    startTime: number;
    duration: number;
    intensity: number;
  };
  priceMovement?: {
    fromPrice: number;
    toPrice: number;
    startTime: number;
    duration: number;
  };
}