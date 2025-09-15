/**
 * User and session related types
 */

import { GameMode } from './common';
import { TimeFrame } from '../../clearingHouse';

// User account information
export interface User {
  userId: string;
  username: string;
  email?: string;
  createdAt: number;
  lastActiveAt: number;
  stats: UserStats;
}

// User statistics
export interface UserStats {
  totalProfit: number;
  totalVolume: number;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  bestStreak: number;
  currentStreak: number;
}

// Authentication token payload
export interface TokenPayload {
  userId: string;
  username: string;
  iat: number;
  exp: number;
}

// Active game session
export interface GameSession {
  sessionId: string;
  userId: string;
  gameMode: GameMode;
  timeframe: TimeFrame;
  startedAt: number;
  lastActivityAt: number;
  stats: SessionStats;
}

// Session statistics
export interface SessionStats {
  tradesPlaced: number;
  volume: number;
  profit: number;
  winCount: number;
  lossCount: number;
}

// WebSocket connection info
export interface Connection {
  connectionId: string;
  userId: string;
  connectedAt: number;
  lastHeartbeat: number;
  ipAddress?: string;
  userAgent?: string;
}

// Rate limit tracking
export interface RateLimit {
  userId: string;
  action: string;
  count: number;
  windowStart: number;
  windowEnd: number;
}

// User preferences
export interface UserPreferences {
  soundEnabled: boolean;
  animationsEnabled: boolean;
  theme: 'dark' | 'light';
  defaultGameMode?: GameMode;
  defaultTimeframe?: TimeFrame;
}