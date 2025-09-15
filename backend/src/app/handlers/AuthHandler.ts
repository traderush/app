/**
 * Authentication message handler
 */

import {
  ClientMessage,
  ServerMessage,
  ServerMessageType,
  createMessage
} from '../types';
import { HandlerContext } from '../core/MessageRouter';
import { validateAuthPayload } from '../utils/validators';
import { createLogger } from '../utils/logger';

const logger = createLogger('AuthHandler');

export async function handleAuth(
  message: ClientMessage,
  context: HandlerContext
): Promise<ServerMessage | null> {
  const { connectionId, connectionManager, services } = context;

  try {
    // Validate payload
    const payload = validateAuthPayload(message.payload);

    // For no-auth mode, token is just the username
    const username = payload.token;

    // Authenticate user (creates user if doesn't exist)
    const result = await services.userService.authenticateUser(username);
    if (!result.success) {
      throw result.error;
    }

    const user = result.data;

    // Associate connection with user
    await connectionManager.authenticateConnection(connectionId, user.userId);

    // Get user balance from clearing house
    const balance = await services.userService.getUserBalance(user.userId);

    logger.info('User authenticated', {
      connectionId,
      userId: user.userId,
      username: user.username
    });

    // Return connected message
    return createMessage(ServerMessageType.CONNECTED, {
      userId: user.userId,
      username: user.username,
      balance,
      serverTime: Date.now()
    });
  } catch (error) {
    logger.error('Authentication failed', error, { connectionId });
    throw error;
  }
}