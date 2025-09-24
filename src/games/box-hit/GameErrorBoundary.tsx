'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class GameErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('GameErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-zinc-900/50 rounded-lg border border-zinc-800">
          <div className="text-center p-6 max-w-sm">
            <div className="mb-4">
              <svg
                className="mx-auto h-8 w-8 text-orange-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            
            <h3 className="text-lg font-medium text-zinc-200 mb-2">
              Game Error
            </h3>
            
            <p className="text-sm text-zinc-400 mb-4">
              There was an issue with the game. Please try refreshing or contact support.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left bg-zinc-800 p-3 rounded border border-zinc-700 mb-4">
                <summary className="cursor-pointer text-xs font-medium text-zinc-300 mb-1">
                  Error Details
                </summary>
                <pre className="text-xs text-red-400 whitespace-pre-wrap">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition-colors"
            >
              Retry Game
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GameErrorBoundary;
