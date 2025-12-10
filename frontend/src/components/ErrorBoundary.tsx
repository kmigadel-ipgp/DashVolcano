import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component - Catches React errors and displays user-friendly fallback
 * Prevents entire app from crashing due to component errors
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-red-50 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Something went wrong
                </h2>
                <p className="text-gray-700 mb-4">
                  We encountered an unexpected error. This has been logged and we'll look into it.
                </p>
              </div>
            </div>

            {/* Error details (collapsed by default) */}
            <details className="mb-6">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-volcano-500 rounded px-2 py-1">
                Show error details
              </summary>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg overflow-auto">
                <p className="text-sm font-mono text-red-700 mb-2">
                  {this.state.error?.toString()}
                </p>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            </details>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="px-6 py-2 bg-volcano-600 text-white rounded-lg hover:bg-volcano-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-volcano-500 focus:ring-offset-2"
                aria-label="Try again"
              >
                Try Again
              </button>
              <button
                onClick={() => { globalThis.location.href = '/'; }}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                aria-label="Go to home page"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
