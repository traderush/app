'use client';
import React, { Suspense, lazy, ComponentType } from 'react';

interface LazyWrapperProps {
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
);

// Error fallback component
const ErrorFallback = ({ error, retry }: { error: Error; retry: () => void }) => (
  <div className="flex flex-col items-center justify-center min-h-[200px] text-center p-4">
    <div className="text-4xl mb-4">⚠️</div>
    <h3 className="text-lg font-semibold mb-2">Failed to load component</h3>
    <p className="text-zinc-400 mb-4 text-sm">
      There was an error loading this component. Please try again.
    </p>
    <button
      onClick={retry}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-sm"
    >
      Retry
    </button>
  </div>
);

// Error boundary for lazy components
class LazyErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <ErrorFallback 
          error={this.state.error!} 
          retry={() => this.setState({ hasError: false, error: undefined })} 
        />
      );
    }

    return this.props.children;
  }
}

// Higher-order component for lazy loading
export function withLazyLoading<P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  options: LazyWrapperProps = {}
) {
  const LazyComponent = lazy(importFunc);
  
  const WrappedComponent = (props: P) => {
    return (
      <LazyErrorBoundary fallback={options.errorFallback}>
        <Suspense fallback={options.fallback || <LoadingSpinner />}>
          <LazyComponent {...props} />
        </Suspense>
      </LazyErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withLazyLoading(${LazyComponent.displayName || 'Component'})`;
  
  return WrappedComponent;
}

// Utility function for lazy loading with default options
export function lazyLoad<P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>
) {
  return withLazyLoading(importFunc);
}

export default withLazyLoading;
