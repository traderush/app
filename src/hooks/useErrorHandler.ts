/**
 * useErrorHandler Hook
 * 
 * Provides convenient access to the centralized error handling system
 * for use in React components.
 */

import { useCallback } from 'react';
import { errorHandler, ErrorHandlerOptions, ErrorContext } from '@/lib/errorHandler';

export const useErrorHandler = () => {
  const handleError = useCallback(
    (error: Error | string, options?: ErrorHandlerOptions) => {
      errorHandler.handleError(error, options);
    },
    []
  );

  const handleSuccess = useCallback(
    (message: string, options?: Omit<ErrorHandlerOptions, 'type'>) => {
      errorHandler.handleSuccess(message, options);
    },
    []
  );

  const handleWarning = useCallback(
    (message: string, options?: Omit<ErrorHandlerOptions, 'type'>) => {
      errorHandler.handleWarning(message, options);
    },
    []
  );

  const handleInfo = useCallback(
    (message: string, options?: Omit<ErrorHandlerOptions, 'type'>) => {
      errorHandler.handleInfo(message, options);
    },
    []
  );

  const handleCanvasError = useCallback(
    (error: Error | string, context?: ErrorContext) => {
      errorHandler.handleCanvasError(error, context);
    },
    []
  );

  const handleWebSocketError = useCallback(
    (error: Error | string, context?: ErrorContext) => {
      errorHandler.handleWebSocketError(error, context);
    },
    []
  );

  const handleGameSessionError = useCallback(
    (error: Error | string, context?: ErrorContext) => {
      errorHandler.handleGameSessionError(error, context);
    },
    []
  );

  return {
    handleError,
    handleSuccess,
    handleWarning,
    handleInfo,
    handleCanvasError,
    handleWebSocketError,
    handleGameSessionError
  };
};
