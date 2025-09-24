import { useRef, useCallback, useEffect } from 'react';

export interface CanvasConfig {
  width: number;
  height: number;
  devicePixelRatio?: number;
}

export interface CanvasContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
}

export const useCanvas = (config: CanvasConfig) => {
  const { width, height, devicePixelRatio } = config;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const dpr = devicePixelRatio || window.devicePixelRatio || 1;

  // Initialize canvas
  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
      willReadFrequently: false,
    });

    if (!ctx) {
      console.error('Failed to get 2D context');
      return null;
    }

    // Set canvas size with device pixel ratio
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Scale context to match device pixel ratio
    ctx.scale(dpr, dpr);

    // Enable anti-aliasing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    contextRef.current = ctx;

    return {
      canvas,
      ctx,
      width,
      height,
      dpr
    };
  }, [width, height, dpr]);

  // Clear canvas
  const clearCanvas = useCallback((color: string = '#000000') => {
    const ctx = contextRef.current;
    if (!ctx) return;

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  // Save context state
  const save = useCallback(() => {
    contextRef.current?.save();
  }, []);

  // Restore context state
  const restore = useCallback(() => {
    contextRef.current?.restore();
  }, []);

  // Get canvas context
  const getContext = useCallback((): CanvasContext | null => {
    if (!contextRef.current || !canvasRef.current) {
      return initializeCanvas();
    }

    return {
      canvas: canvasRef.current,
      ctx: contextRef.current,
      width,
      height,
      dpr
    };
  }, [initializeCanvas, width, height, dpr]);

  // Initialize on mount and when dimensions change
  useEffect(() => {
    initializeCanvas();
  }, [initializeCanvas]);

  // Cleanup
  useEffect(() => {
    return () => {
      contextRef.current = null;
    };
  }, []);

  return {
    canvasRef,
    contextRef,
    getContext,
    clearCanvas,
    save,
    restore,
    dpr
  };
};
