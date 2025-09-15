/**
 * Runtime validation using Zod
 */

import { z } from 'zod';
import { 
  ClientMessageType, 
  GameMode
} from '../types';
import { TimeFrame } from '../../clearingHouse/types';
import { ValidationError } from '../types/common';

// Message ID validation
const MessageIdSchema = z.string().min(1);

// Base message schema
const BaseMessageSchema = z.object({
  messageId: MessageIdSchema,
  timestamp: z.number().positive()
});

// Client message payload schemas
export const AuthPayloadSchema = z.object({
  token: z.string().min(1)
});

export const JoinGamePayloadSchema = z.object({
  mode: z.nativeEnum(GameMode),
  timeframe: z.nativeEnum(TimeFrame)
});

export const PlaceTradePayloadSchema = z.object({
  contractId: z.string().min(1),
  amount: z.number().positive().min(1).max(10000) // Max bet limit
});

export const GetLeaderboardPayloadSchema = z.object({
  gameMode: z.nativeEnum(GameMode).optional(),
  limit: z.number().positive().max(100).optional()
});

export const GetGameConfigPayloadSchema = z.object({
  gameMode: z.nativeEnum(GameMode).optional(),
  timeframe: z.nativeEnum(TimeFrame).optional()
});

// Client message schemas
export const AuthMessageSchema = BaseMessageSchema.extend({
  type: z.literal(ClientMessageType.AUTH),
  payload: AuthPayloadSchema
});

export const JoinGameMessageSchema = BaseMessageSchema.extend({
  type: z.literal(ClientMessageType.JOIN_GAME),
  payload: JoinGamePayloadSchema
});

export const LeaveGameMessageSchema = BaseMessageSchema.extend({
  type: z.literal(ClientMessageType.LEAVE_GAME),
  payload: z.object({}).optional()
});

export const PlaceTradeMessageSchema = BaseMessageSchema.extend({
  type: z.literal(ClientMessageType.PLACE_TRADE),
  payload: PlaceTradePayloadSchema
});

export const GetStateMessageSchema = BaseMessageSchema.extend({
  type: z.literal(ClientMessageType.GET_STATE),
  payload: z.object({}).optional()
});

export const GetLeaderboardMessageSchema = BaseMessageSchema.extend({
  type: z.literal(ClientMessageType.GET_LEADERBOARD),
  payload: GetLeaderboardPayloadSchema
});

export const GetGameConfigMessageSchema = BaseMessageSchema.extend({
  type: z.literal(ClientMessageType.GET_GAME_CONFIG),
  payload: GetGameConfigPayloadSchema
});

// Union of all client message schemas
export const ClientMessageSchema = z.discriminatedUnion('type', [
  AuthMessageSchema,
  JoinGameMessageSchema,
  LeaveGameMessageSchema,
  PlaceTradeMessageSchema,
  GetStateMessageSchema,
  GetLeaderboardMessageSchema,
  GetGameConfigMessageSchema
]);

// Export for use in handlers
export const validateGetLeaderboardPayload = (payload: unknown): z.infer<typeof GetLeaderboardPayloadSchema> => {
  try {
    return GetLeaderboardPayloadSchema.parse(payload);
  } catch (error) {
    throw new ValidationError('Invalid leaderboard request');
  }
};

// Type inference
export type ValidatedAuthMessage = z.infer<typeof AuthMessageSchema>;
export type ValidatedJoinGameMessage = z.infer<typeof JoinGameMessageSchema>;
export type ValidatedPlaceTradeMessage = z.infer<typeof PlaceTradeMessageSchema>;

// Validation functions
export function validateClientMessage(data: unknown): z.infer<typeof ClientMessageSchema> {
  try {
    return ClientMessageSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      console.error('Validation error details:', {
        message: firstError.message,
        path: firstError.path,
        code: firstError.code,
        received: firstError.code === 'invalid_type' ? typeof data : data,
        rawData: JSON.stringify(data).substring(0, 200)
      });
      throw new ValidationError(
        `Invalid message: ${firstError.message}`,
        firstError.path.join('.')
      );
    }
    throw new ValidationError('Invalid message format');
  }
}

// Specific validators with better error messages
export function validateAuthPayload(payload: unknown): z.infer<typeof AuthPayloadSchema> {
  try {
    return AuthPayloadSchema.parse(payload);
  } catch (error) {
    throw new ValidationError('Invalid authentication token');
  }
}

export function validateJoinGamePayload(payload: unknown): z.infer<typeof JoinGamePayloadSchema> {
  try {
    return JoinGamePayloadSchema.parse(payload);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      if (issue.path[0] === 'mode') {
        throw new ValidationError('Invalid game mode');
      }
      if (issue.path[0] === 'timeframe') {
        throw new ValidationError('Invalid timeframe');
      }
    }
    throw new ValidationError('Invalid game join request');
  }
}

export function validatePlaceTradePayload(payload: unknown): z.infer<typeof PlaceTradePayloadSchema> {
  try {
    return PlaceTradePayloadSchema.parse(payload);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      if (issue.path[0] === 'amount') {
        if (issue.code === 'too_small') {
          throw new ValidationError('Amount must be at least $1');
        }
        if (issue.code === 'too_big') {
          throw new ValidationError('Amount exceeds maximum bet limit of $10,000');
        }
        throw new ValidationError('Invalid trade amount');
      }
      if (issue.path[0] === 'contractId') {
        throw new ValidationError('Invalid contract ID');
      }
    }
    throw new ValidationError('Invalid trade request');
  }
}

// Additional validation helpers
export function isValidAmount(amount: number): boolean {
  return amount > 0 && amount <= 10000 && Number.isFinite(amount);
}

export function isValidTimeframe(timeframe: any): timeframe is TimeFrame {
  return Object.values(TimeFrame).includes(timeframe);
}

export function isValidGameMode(mode: any): mode is GameMode {
  return Object.values(GameMode).includes(mode);
}

// Sanitization helpers
export function sanitizeUsername(username: string): string {
  return username
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .substring(0, 20);
}

export function sanitizeToken(token: string): string {
  return token.trim().substring(0, 1000); // Reasonable JWT length limit
}