import { useRef, useCallback, useEffect } from 'react';

export interface AnimationLoopConfig {
  fps?: number;
  autoStart?: boolean;
}

export interface AnimationFrame {
  timestamp: number;
  deltaTime: number;
  frameCount: number;
}

export const useAnimationLoop = (
  callback: (frame: AnimationFrame) => void,
  config: AnimationLoopConfig = {}
) => {
  const { fps = 60, autoStart = false } = config;
  
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);

  const targetFrameTime = 1000 / fps; // Target time between frames in ms

  const animate = useCallback((timestamp: number) => {
    if (!isRunningRef.current) return;

    const deltaTime = timestamp - lastTimeRef.current;
    
    // Only execute callback if enough time has passed (respecting FPS limit)
    if (deltaTime >= targetFrameTime) {
      const frame: AnimationFrame = {
        timestamp,
        deltaTime,
        frameCount: frameCountRef.current++
      };
      
      callback(frame);
      lastTimeRef.current = timestamp;
    }

    // Continue animation loop
    animationRef.current = requestAnimationFrame(animate);
  }, [callback, targetFrameTime]);

  const start = useCallback(() => {
    if (isRunningRef.current) return;
    
    isRunningRef.current = true;
    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);
  }, [animate]);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
  }, []);

  const reset = useCallback(() => {
    frameCountRef.current = 0;
    lastTimeRef.current = 0;
  }, []);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else if (autoStart) {
        start();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoStart, start, stop]);

  // Auto-start if configured
  useEffect(() => {
    if (autoStart && !document.hidden) {
      start();
    }

    return () => {
      stop();
    };
  }, [autoStart, start, stop]);

  return {
    start,
    stop,
    reset,
    isRunning: isRunningRef.current,
    frameCount: frameCountRef.current
  };
};
