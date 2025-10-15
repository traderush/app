// Game Type enum for consistent game type handling across the application

export enum GameType {
  GRID = 'grid',
  BOXES = 'boxes',
  SKETCH = 'sketch',
  COBRA = 'cobra',
  TOWERS = 'towers'
}

// Game type groups
export type IronCondorGameType = GameType.GRID | GameType.BOXES | GameType.SKETCH | GameType.COBRA;
export type SpreadGameType = GameType.TOWERS;

// Helper function to check if a game type uses Iron Condor contracts
export function isIronCondorGame(gameType: GameType): gameType is IronCondorGameType {
  return gameType === GameType.GRID || 
         gameType === GameType.BOXES || 
         gameType === GameType.SKETCH || 
         gameType === GameType.COBRA;
}

// Helper function to check if a game type uses Spread contracts
export function isSpreadGame(gameType: GameType): gameType is SpreadGameType {
  return gameType === GameType.TOWERS;
}

// Type guard to check if a string is a valid GameType
export function isValidGameType(value: unknown): value is GameType {
  return typeof value === 'string' && Object.values(GameType).includes(value as GameType);
}

// Helper to parse string to GameType
export function parseGameType(value: string): GameType {
  if (isValidGameType(value)) {
    return value;
  }
  throw new Error(`Invalid game type: ${value}`);
}