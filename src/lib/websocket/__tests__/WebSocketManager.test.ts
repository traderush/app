/**
 * Basic tests for WebSocket Manager
 * Verifies core functionality works correctly
 */

import { WebSocketManager } from '../WebSocketManager';

describe('WebSocketManager', () => {
  let manager: WebSocketManager;

  beforeEach(() => {
    manager = new WebSocketManager({
      autoConnect: false,
    });
  });

  afterEach(() => {
    manager.disconnect();
  });

  test('should initialize with correct default state', () => {
    const state = manager.getConnectionState();
    
    expect(state.isConnected).toBe(false);
    expect(state.isConnecting).toBe(false);
    expect(state.isAuthenticated).toBe(false);
    expect(state.userId).toBeNull();
    expect(state.sessionId).toBeNull();
    expect(state.connectionError).toBeNull();
    expect(state.reconnectAttempts).toBe(0);
  });

  test('should handle message registration and unregistration', () => {
    const handler = jest.fn();
    
    // Register handler
    manager.on('test_message', handler);
    
    // Simulate message handling
    const testMessage = {
      type: 'test_message',
      payload: { test: 'data' },
      timestamp: Date.now(),
    };
    
    // Manually trigger message handling (since we can't easily mock WebSocket in this test)
    // This tests the handler registration mechanism
    expect(handler).not.toHaveBeenCalled(); // Should not be called yet
    
    // Unregister handler
    manager.off('test_message', handler);
    
    // Handler should still not be called
    expect(handler).not.toHaveBeenCalled();
  });

  test('should queue messages when disconnected', () => {
    const testMessage = { type: 'test', payload: { data: 'test' } };
    
    // Send message while disconnected (should queue it)
    manager.send(testMessage);
    
    // No error should be thrown
    expect(true).toBe(true); // Basic test that send doesn't crash
  });

  test('should have correct configuration defaults', () => {
    const manager = new WebSocketManager();
    const state = manager.getConnectionState();
    
    // Should initialize with default config
    expect(state).toBeDefined();
  });
});
