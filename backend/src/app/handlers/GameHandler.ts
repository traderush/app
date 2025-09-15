/**
 * Game action message handlers
 */

import { CLEARING_HOUSE_CONFIG, clearingHouseAPI } from '../../clearingHouse';
import { TimeFrame } from '../../clearingHouse/types';
import { getTimeframeConfig } from '../../config/timeframeConfig';
import { HandlerContext } from '../core/MessageRouter';
import {
  ClientMessage,
  GameMode,
  ServerMessage,
  ServerMessageType,
  createMessage,
  isOk,
} from '../types';
import { InsufficientBalanceError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import {
  validateJoinGamePayload,
  validatePlaceTradePayload,
} from '../utils/validators';

const logger = createLogger('GameHandler');

export async function handleJoinGame(
  message: ClientMessage,
  context: HandlerContext
): Promise<ServerMessage | null> {
  const { userId, services } = context;

  if (!userId) {
    throw new Error('User not authenticated');
  }

  try {
    // Validate payload
    const payload = validateJoinGamePayload(message.payload);

    // Create session
    const result = await services.sessionManager.createSession(
      userId,
      payload.mode,
      payload.timeframe
    );

    if (!result.success) {
      throw result.error;
    }

    const session = result.data;

    // Get initial contracts
    const contracts = await services.gameEngineManager.getActiveContracts(
      payload.mode,
      payload.timeframe
    );

    // Get current price from clearingHouse directly
    const currentPrice = clearingHouseAPI.clearingHouse.getCurrentPrice();

    // Get user balance
    const userBalance = await services.userService.getUserBalance(userId);

    logger.info('User joined game', {
      userId,
      sessionId: session.sessionId,
      gameMode: payload.mode,
      timeframe: payload.timeframe,
    });

    return createMessage(ServerMessageType.GAME_JOINED, {
      sessionId: session.sessionId,
      mode: payload.mode,
      timeframe: payload.timeframe,
      contracts,
      currentPrice,
      balance: userBalance,
      // Include current column index so frontend can sync
      currentColumnIndex: 0, // Frontend should always start at 0 since backend only sends future contracts
    });
  } catch (error) {
    logger.error('Failed to join game', error, { userId });
    throw error;
  }
}

export async function handleLeaveGame(
  _message: ClientMessage,
  context: HandlerContext
): Promise<ServerMessage | null> {
  const { userId, services } = context;

  if (!userId) {
    throw new Error('User not authenticated');
  }

  try {
    const result = await services.sessionManager.leaveSession(userId);

    if (!result.success) {
      throw result.error;
    }

    logger.info('User left game', { userId });

    return createMessage(ServerMessageType.GAME_LEFT, {
      sessionId: '',
    });
  } catch (error) {
    logger.error('Failed to leave game', error, { userId });
    throw error;
  }
}

export async function handlePlaceTrade(
  message: ClientMessage,
  context: HandlerContext
): Promise<ServerMessage | null> {
  const { userId, services } = context;

  if (!userId) {
    throw new Error('User not authenticated');
  }

  try {
    // Validate payload
    const payload = validatePlaceTradePayload(message.payload);

    // Get user session
    const session = services.sessionManager.getUserSession(userId);
    if (!session) {
      throw new Error('No active game session');
    }

    // Check balance
    const balance = await services.userService.getUserBalance(userId);
    if (balance < payload.amount) {
      throw new InsufficientBalanceError(payload.amount, balance);
    }

    // Place bet through game engine
    const result = await services.gameEngineManager.placeBet(
      session.gameMode,
      session.timeframe,
      userId,
      payload.contractId,
      payload.amount
    );

    if (!isOk(result)) {
      throw result.error;
    }

    // Update session stats
    services.sessionManager.recordTrade(
      session.sessionId,
      payload.amount,
      false, // Not yet won
      0 // No profit yet
    );

    // Get new balance
    const newBalance = await services.userService.getUserBalance(userId);

    // Generate trade ID
    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    return createMessage(ServerMessageType.TRADE_CONFIRMED, {
      tradeId,
      contractId: payload.contractId,
      amount: payload.amount,
      balance: newBalance,
      position: {
        userId,
        contractId: payload.contractId,
        amount: payload.amount,
        timestamp: Date.now(),
        gameMode: session.gameMode,
      },
    });
  } catch (error) {
    logger.error('Failed to place trade', error, { userId });
    throw error;
  }
}

export async function handleGetGameConfig(
  message: ClientMessage,
  context: HandlerContext
): Promise<ServerMessage | null> {
  const { userId } = context;

  if (!userId) {
    throw new Error('User not authenticated');
  }

  try {
    // Get game mode and timeframe from payload
    const gameMode = (message.payload as any)?.gameMode || GameMode.BOX_HIT;
    const timeframe = (message.payload as any)?.timeframe || 2000;

    // Get configuration based on game mode and timeframe
    const config = {
      priceStep: getTimeframeConfig(timeframe).boxHeight,
      timeStep: timeframe, // Use the actual timeframe
      numRows:
        gameMode === GameMode.BOX_HIT
          ? CLEARING_HOUSE_CONFIG.ironCondor.timeframes[timeframe as TimeFrame]
              .rowsAbove +
            CLEARING_HOUSE_CONFIG.ironCondor.timeframes[timeframe as TimeFrame]
              .rowsBelow +
            1
          : 20, // Default for towers
      numColumns:
        gameMode === GameMode.BOX_HIT
          ? CLEARING_HOUSE_CONFIG.ironCondor.timeframes[timeframe as TimeFrame]
              .numColumns
          : CLEARING_HOUSE_CONFIG.spreads.timeframes[timeframe as TimeFrame]
              .numColumns,
      basePrice: CLEARING_HOUSE_CONFIG.constants.initialPrice,
    };

    logger.info('Game config requested', { userId, gameMode, timeframe });

    return createMessage(ServerMessageType.GAME_CONFIG, {
      gameMode,
      config,
    });
  } catch (error) {
    logger.error('Failed to get game config', error, { userId });
    throw error;
  }
}
