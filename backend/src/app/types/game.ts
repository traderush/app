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

// Towers specific types
export interface TowersContract extends GameContract {
  strikePrice: number;
  type: 'call' | 'put';
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

// Towers game state
export interface TowersGameState {
  gameMode: GameMode.TOWERS;
  timeframe: TimeFrame;
  contracts: TowersContract[];
  currentPrice: number;
}

// Individual tower state
export interface Tower {
  contractId: string;
  direction: 'UP' | 'DOWN';
  currentHeight: number;
  maxHeight: number;
  isBuilding: boolean;
  lastBuildTime?: number;
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
  getGameState(): BoxHitGameState | TowersGameState;
  
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
  
  // Towers events
  TOWER_CREATED = 'tower_created',
  TOWER_BUILD = 'tower_build',
  TOWER_COMPLETE = 'tower_complete',
  TOWER_COLLAPSE = 'tower_collapse',
  
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
  towerBuild?: {
    contractId: string;
    startTime: number;
    fromHeight: number;
    toHeight: number;
    duration: number;
  };
  priceMovement?: {
    fromPrice: number;
    toPrice: number;
    startTime: number;
    duration: number;
  };
}