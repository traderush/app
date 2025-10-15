'use client';

import React, { Suspense, lazy, ComponentType } from 'react';

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const DefaultFallback = () => (
  <div className="flex items-center justify-center h-full bg-zinc-900/50 rounded-lg border border-zinc-800">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
      <p className="text-sm text-zinc-400">Loading...</p>
    </div>
  </div>
);

export function LazyWrapper({ children, fallback = <DefaultFallback /> }: LazyWrapperProps) {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
}

// Simple lazy component creator with preloading
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  preload = false
) {
  const LazyComponent = lazy(importFunc);
  
  // Preload if requested
  if (preload) {
    importFunc().catch(() => {});
  }
  
  return function LazyComponentWithSuspense(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={<DefaultFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

export default LazyWrapper;