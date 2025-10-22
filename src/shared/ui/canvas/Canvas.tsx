'use client';

import { memo, useEffect, useRef } from 'react';

import { CanvasController, type CanvasProps } from './CanvasController';

function Canvas(props: CanvasProps = {}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<CanvasController | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    if (controllerRef.current) {
      controllerRef.current.destroy();
    }
    const controller = new CanvasController(root, props);
    controllerRef.current = controller;
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
    // We intentionally run only once for initial mount; updates handled separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    controllerRef.current?.update(props);
  }, [props]);

  return <div ref={rootRef} className="h-full w-full" />;
}

export default memo(Canvas);
