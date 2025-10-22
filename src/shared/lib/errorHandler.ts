import { logger } from '@/shared/utils/logger';

interface CanvasErrorContext {
  component: string;
  action: string;
  metadata?: Record<string, unknown>;
}

export function handleCanvasError(error: Error, context: CanvasErrorContext): void {
  const { component, action, metadata } = context;
  const contextLabel = `${component}:${action}`;

  logger.error(`Canvas error - ${contextLabel}`, { message: error.message, stack: error.stack, metadata });

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[CanvasError][${contextLabel}]`, error);
    if (metadata) {
      console.debug('[CanvasError][metadata]', metadata);
    }
  }
}

export type { CanvasErrorContext };
