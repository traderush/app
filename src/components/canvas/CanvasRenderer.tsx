import React, { useRef, useEffect, useMemo } from 'react';

interface CanvasRendererProps {
  width: number;
  height: number;
  render: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  width,
  height,
  render,
  className,
  style
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  const canvasStyle = useMemo(() => ({
    width: `${width}px`,
    height: `${height}px`,
    ...style
  }), [width, height, style]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Set device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Set canvas display size
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    let isRunning = true;

    const animate = () => {
      if (!isRunning) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Render content
      render(ctx, width, height);
      
      // Continue animation
      animationFrameRef.current = requestAnimationFrame(animate);
    };

  // Handle page visibility changes to pause/resume animation
  // Note: For trading games, we only pause visual rendering, not data updates
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // Pause only visual rendering, data continues updating
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    } else {
      // Resume visual rendering and catch up with current data state
      isRunning = true;
      // Force immediate render to catch up with any missed updates
      animate();
    }
  };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start animation only if page is visible
    if (!document.hidden) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    // Cleanup
    return () => {
      isRunning = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [width, height, render]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={canvasStyle}
    />
  );
};

export default CanvasRenderer;
