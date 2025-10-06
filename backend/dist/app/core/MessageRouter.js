"use strict";
/**
 * Routes WebSocket messages to appropriate handlers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.middlewareStop = exports.middlewareContinue = exports.MessageRouter = void 0;
const types_1 = require("../types");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('MessageRouter');
class MessageRouter {
    constructor(connectionManager, services) {
        this.handlers = new Map();
        this.middleware = [];
        this.connectionManager = connectionManager;
        this.services = services;
    }
    /**
     * Register a message handler
     */
    registerHandler(type, handler) {
        this.handlers.set(type, handler);
        logger.info('Handler registered', { type });
    }
    /**
     * Register middleware
     */
    use(middleware) {
        this.middleware.push(middleware);
    }
    /**
     * Route a message to the appropriate handler
     */
    async route(message, ws) {
        const { connectionId } = ws.data;
        try {
            // Get connection info
            const connection = this.connectionManager.getConnection(connectionId);
            if (!connection) {
                throw new Error('Connection not found');
            }
            // Create handler context
            const context = {
                ws,
                connectionId,
                userId: connection.userId,
                connectionManager: this.connectionManager,
                services: this.services,
            };
            // Apply middleware
            for (const mw of this.middleware) {
                const result = await mw(message, context);
                if (!result.continue) {
                    return result.response || null;
                }
            }
            // Check authentication for non-auth messages
            if (message.type !== types_1.ClientMessageType.AUTH && !context.userId) {
                throw new errors_1.UnauthorizedError('Authentication required');
            }
            // Apply rate limiting
            // TODO: Implement rate limiting when needed
            // if (context.userId) {
            //   this.connectionManager.checkRateLimit(context.userId, message.type);
            // }
            // Get handler
            const handler = this.handlers.get(message.type);
            if (!handler) {
                logger.warn('No handler for message type', {
                    type: message.type,
                    connectionId,
                });
                throw new Error(`Unknown message type: ${message.type}`);
            }
            // Execute handler
            const response = await handler(message, context);
            return response;
        }
        catch (error) {
            logger.error('Error routing message', error, {
                type: message.type,
                connectionId,
            });
            throw error;
        }
    }
    /**
     * Handle user disconnect
     */
    async handleDisconnect(userId) {
        try {
            // Leave any active game sessions
            if (this.services.sessionManager) {
                await this.services.sessionManager.handleUserDisconnect(userId);
            }
            // Update user status
            if (this.services.userService) {
                await this.services.userService.updateLastActive(userId);
            }
            logger.info('User disconnected', { userId });
        }
        catch (error) {
            logger.error('Error handling disconnect', error, { userId });
        }
    }
    /**
     * Broadcast a message to specific users
     */
    broadcast(message, userIds) {
        for (const userId of userIds) {
            const webSockets = this.connectionManager.getUserWebSockets(userId);
            for (const ws of webSockets) {
                try {
                    ws.send(JSON.stringify(message));
                }
                catch (error) {
                    logger.error('Error broadcasting to user', error, { userId });
                }
            }
        }
    }
    /**
     * Broadcast to all connected users
     */
    broadcastAll(message) {
        const connections = this.connectionManager.getAllConnections();
        for (const conn of connections) {
            const ws = this.connectionManager.getWebSocket(conn.connectionId);
            if (ws) {
                try {
                    ws.send(JSON.stringify(message));
                }
                catch (error) {
                    logger.error('Error broadcasting', error, {
                        connectionId: conn.connectionId,
                    });
                }
            }
        }
    }
    /**
     * Send message to a specific user
     */
    sendToUser(userId, message) {
        const webSockets = this.connectionManager.getUserWebSockets(userId);
        if (webSockets.length === 0) {
            return false;
        }
        let sent = false;
        for (const ws of webSockets) {
            try {
                ws.send(JSON.stringify(message));
                sent = true;
            }
            catch (error) {
                logger.error('Error sending to user', error, { userId });
            }
        }
        return sent;
    }
    /**
     * Get router statistics
     */
    getStats() {
        return {
            registeredHandlers: this.handlers.size,
            middlewareCount: this.middleware.length,
            handlers: Array.from(this.handlers.keys()),
        };
    }
}
exports.MessageRouter = MessageRouter;
// Helper to create middleware results
const middlewareContinue = () => ({
    continue: true,
});
exports.middlewareContinue = middlewareContinue;
const middlewareStop = (response) => ({
    continue: false,
    response,
});
exports.middlewareStop = middlewareStop;
