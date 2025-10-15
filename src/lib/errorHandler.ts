/**
 * Centralized Error Handling System
 * 
 * Provides a unified way to handle errors across the application
 * using the existing UI store toast notification system.
 */

import { useUIStore } from '@/stores/uiStore';

export type ErrorType = 'error' | 'warning' | 'info' | 'success';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorHandlerOptions {
  type?: ErrorType;
  title?: string;
  duration?: number;
  showInConsole?: boolean;
  context?: ErrorContext;
}

class ErrorHandler {
  private static instance: ErrorHandler;

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle an error with centralized logging and user notification
   */
  public handleError(
    error: Error | string,
    options: ErrorHandlerOptions = {}
  ): void {
    const {
      type = 'error',
      title,
      duration = 5000,
      showInConsole = true,
      context = {}
    } = options;

    // Convert string errors to Error objects
    const errorObj = typeof error === 'string' ? new Error(error) : error;

    // Log to console in development
    if (showInConsole && process.env.NODE_ENV === 'development') {
      console.error('🚨 Error Handler:', {
        message: errorObj.message,
        stack: errorObj.stack,
        context,
        timestamp: new Date().toISOString()
      });
    }

    // Show toast notification
    const toastTitle = title || this.getDefaultTitle(type);
    const toastMessage = this.formatErrorMessage(errorObj.message, context);

    // Use the UI store's notification system
    const addNotification = useUIStore.getState().addNotification;
    addNotification({
      type,
      title: toastTitle,
      message: toastMessage,
      duration
    });
  }

  /**
   * Handle success messages
   */
  public handleSuccess(
    message: string,
    options: Omit<ErrorHandlerOptions, 'type'> = {}
  ): void {
    this.handleError(message, { ...options, type: 'success' });
  }

  /**
   * Handle warning messages
   */
  public handleWarning(
    message: string,
    options: Omit<ErrorHandlerOptions, 'type'> = {}
  ): void {
    this.handleError(message, { ...options, type: 'warning' });
  }

  /**
   * Handle info messages
   */
  public handleInfo(
    message: string,
    options: Omit<ErrorHandlerOptions, 'type'> = {}
  ): void {
    this.handleError(message, { ...options, type: 'info' });
  }

  /**
   * Handle canvas-specific errors
   */
  public handleCanvasError(
    error: Error | string,
    context: ErrorContext = {}
  ): void {
    this.handleError(error, {
      type: 'error',
      title: 'Canvas Error',
      context: { component: 'Canvas', ...context }
    });
  }

  /**
   * Handle WebSocket errors
   */
  public handleWebSocketError(
    error: Error | string,
    context: ErrorContext = {}
  ): void {
    this.handleError(error, {
      type: 'error',
      title: 'Connection Error',
      context: { component: 'WebSocket', ...context }
    });
  }

  /**
   * Handle game session errors
   */
  public handleGameSessionError(
    error: Error | string,
    context: ErrorContext = {}
  ): void {
    this.handleError(error, {
      type: 'error',
      title: 'Game Error',
      context: { component: 'GameSession', ...context }
    });
  }

  private getDefaultTitle(type: ErrorType): string {
    switch (type) {
      case 'error':
        return 'Error';
      case 'warning':
        return 'Warning';
      case 'info':
        return 'Information';
      case 'success':
        return 'Success';
      default:
        return 'Notification';
    }
  }

  private formatErrorMessage(message: string, context: ErrorContext): string {
    let formattedMessage = message;

    if (context.component) {
      formattedMessage = `[${context.component}] ${formattedMessage}`;
    }

    if (context.action) {
      formattedMessage += ` (Action: ${context.action})`;
    }

    return formattedMessage;
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Export convenience functions for common use cases
export const handleError = (error: Error | string, options?: ErrorHandlerOptions) =>
  errorHandler.handleError(error, options);

export const handleSuccess = (message: string, options?: Omit<ErrorHandlerOptions, 'type'>) =>
  errorHandler.handleSuccess(message, options);

export const handleWarning = (message: string, options?: Omit<ErrorHandlerOptions, 'type'>) =>
  errorHandler.handleWarning(message, options);

export const handleInfo = (message: string, options?: Omit<ErrorHandlerOptions, 'type'>) =>
  errorHandler.handleInfo(message, options);

export const handleCanvasError = (error: Error | string, context?: ErrorContext) =>
  errorHandler.handleCanvasError(error, context);

export const handleWebSocketError = (error: Error | string, context?: ErrorContext) =>
  errorHandler.handleWebSocketError(error, context);

export const handleGameSessionError = (error: Error | string, context?: ErrorContext) =>
  errorHandler.handleGameSessionError(error, context);
