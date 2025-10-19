"use strict";
/**
 * Main WebSocket server using Bun
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketServer = void 0;
const logger_1 = require("../utils/logger");
const validators_1 = require("../utils/validators");
const errors_1 = require("../utils/errors");
const types_1 = require("../types");
const logger = (0, logger_1.createLogger)('WebSocketServer');
class WebSocketServer {
    constructor(config, connectionManager, messageRouter) {
        this.server = null;
        this.heartbeatInterval = null;
        this.config = {
            host: 'localhost',
            maxConnections: 10000,
            heartbeatInterval: 30000, // 30 seconds
            connectionTimeout: 300000, // 5 minutes (was too aggressive at 60 seconds)
            ...config
        };
        this.connectionManager = connectionManager;
        this.messageRouter = messageRouter;
    }
    async start() {
        try {
            this.server = Bun.serve({
                port: this.config.port,
                hostname: this.config.host,
                fetch: this.handleHttpRequest.bind(this),
                websocket: {
                    message: this.handleMessage.bind(this),
                    open: this.handleOpen.bind(this),
                    close: this.handleClose.bind(this),
                    drain: this.handleDrain.bind(this),
                    ping: this.handlePing.bind(this),
                    pong: this.handlePong.bind(this),
                    maxPayloadLength: 16 * 1024 * 1024, // 16MB
                    idleTimeout: 120, // 2 minutes
                    backpressureLimit: 1024 * 1024, // 1MB
                    perMessageDeflate: true // Enable compression
                }
            });
            // Start heartbeat interval
            this.startHeartbeat();
            logger.info('WebSocket server started', {
                port: this.config.port,
                host: this.config.host
            });
        }
        catch (error) {
            logger.error('Failed to start WebSocket server', error);
            throw error;
        }
    }
    async stop() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this.server) {
            // Close all connections gracefully
            await this.connectionManager.closeAll();
            // Stop the server
            this.server.stop();
            this.server = null;
            logger.info('WebSocket server stopped');
        }
    }
    handleHttpRequest(request, server) {
        const url = new URL(request.url);
        // Health check endpoint
        if (url.pathname === '/health') {
            return new Response(JSON.stringify({
                status: 'healthy',
                connections: this.connectionManager.getConnectionCount(),
                uptime: process.uptime()
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // WebSocket upgrade
        if (url.pathname === '/ws') {
            const success = server.upgrade(request, {
                data: {
                    createdAt: Date.now(),
                },
            });
            if (success) {
                return new Response(null, { status: 101 }); // WebSocket upgrade response
            }
            return new Response('Failed to upgrade', { status: 400 });
        }
        return new Response('Not found', { status: 404 });
    }
    async handleOpen(ws) {
        const connectionId = this.generateConnectionId();
        ws.data = { connectionId };
        // Add connection to ConnectionManager
        this.connectionManager.addConnection(connectionId, ws);
        logger.info('WebSocket connection opened', {
            connectionId,
            totalConnections: this.connectionManager.getConnectionCount()
        });
        // Don't send initial heartbeat immediately - wait for auth
    }
    async handleMessage(ws, message) {
        const { connectionId } = ws.data;
        try {
            // Parse message
            const data = typeof message === 'string'
                ? JSON.parse(message)
                : JSON.parse(message.toString());
            // Log raw message for debugging validation errors
            if (!data || typeof data !== 'object') {
                logger.error('Invalid message format', { connectionId, rawMessage: message });
            }
            // Validate message format
            const validatedMessage = (0, validators_1.validateClientMessage)(data);
            // Update last activity for all messages (not just authenticated ones)
            if (connectionId && this.connectionManager.hasConnection(connectionId)) {
                this.connectionManager.updateActivity(connectionId);
            }
            // Route message
            const response = await this.messageRouter.route(validatedMessage, ws);
            // Send response if any
            if (response) {
                this.sendMessage(ws, response);
            }
        }
        catch (error) {
            (0, errors_1.handleWebSocketError)(ws, error, connectionId);
        }
    }
    async handleClose(ws, code, reason) {
        const { connectionId, userId } = ws.data;
        logger.info('WebSocket connection closed', {
            connectionId,
            userId,
            code,
            reason
        });
        // Clean up connection
        if (connectionId) {
            await this.connectionManager.removeConnection(connectionId);
        }
        // Notify router of disconnection
        if (userId) {
            await this.messageRouter.handleDisconnect(userId);
        }
    }
    handleDrain(ws) {
        // Called when backpressure is reduced
        logger.debug('WebSocket backpressure drained', {
            connectionId: ws.data.connectionId
        });
    }
    handlePing(ws, _data) {
        // Bun automatically responds with pong
        logger.debug('WebSocket ping received', {
            connectionId: ws.data.connectionId
        });
    }
    handlePong(ws, _data) {
        // Update last activity on pong
        const { connectionId } = ws.data;
        if (connectionId && this.connectionManager.hasConnection(connectionId)) {
            this.connectionManager.updateActivity(connectionId);
        }
    }
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            const connections = this.connectionManager.getAllConnections();
            const now = Date.now();
            for (const conn of connections) {
                const ws = this.connectionManager.getWebSocket(conn.connectionId);
                if (!ws)
                    continue;
                // Check if connection is stale (only for authenticated connections)
                if (conn.userId && now - conn.lastHeartbeat > this.config.connectionTimeout) {
                    logger.warn('Closing stale connection', {
                        connectionId: conn.connectionId,
                        userId: conn.userId,
                        lastHeartbeat: new Date(conn.lastHeartbeat).toISOString(),
                        timeoutMs: this.config.connectionTimeout
                    });
                    ws.close(1000, 'Connection timeout');
                    continue;
                }
                // Send heartbeat (only to authenticated connections)
                if (conn.userId) {
                    this.sendHeartbeat(ws);
                }
            }
        }, this.config.heartbeatInterval);
    }
    sendHeartbeat(ws) {
        const message = (0, types_1.createMessage)(types_1.ServerMessageType.HEARTBEAT, {
            serverTime: Date.now()
        });
        this.sendMessage(ws, message);
    }
    sendMessage(ws, message) {
        try {
            if (ws.readyState === 1) { // OPEN
                const data = JSON.stringify(message);
                ws.send(data);
                return true;
            }
            return false;
        }
        catch (error) {
            logger.error('Failed to send message', error, {
                connectionId: ws.data?.connectionId
            });
            return false;
        }
    }
    broadcast(message, filter) {
        const connections = filter
            ? this.connectionManager.getAllConnections().filter(filter)
            : this.connectionManager.getAllConnections();
        for (const conn of connections) {
            const ws = this.connectionManager.getWebSocket(conn.connectionId);
            if (ws) {
                this.sendMessage(ws, message);
            }
        }
    }
    generateConnectionId() {
        return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
}
exports.WebSocketServer = WebSocketServer;
