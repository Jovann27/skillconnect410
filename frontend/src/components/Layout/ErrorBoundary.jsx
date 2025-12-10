import React from 'react';
import { FaExclamationTriangle, FaRedo, FaHome } from 'react-icons/fa';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/home';
  };

  render() {
    if (this.state.hasError) {
      // Custom error UI
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-10 text-center bg-pink-50 border-2 border-dashed border-pink-500 rounded-2xl">
          <div className="text-6xl text-pink-500 mb-5 opacity-80">
            <FaExclamationTriangle />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Oops! Something went wrong
          </h2>
          <p className="text-gray-600 text-lg mb-6 max-w-md">
            We're sorry, but something unexpected happened. Don't worry, our team has been notified.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <button
              className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 transform hover:-translate-y-1"
              onClick={this.handleRetry}
              aria-label="Try loading the page again"
            >
              <FaRedo />
              Try Again
            </button>
            <button
              className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 transform hover:-translate-y-1"
              onClick={this.handleGoHome}
              aria-label="Go back to home page"
            >
              <FaHome />
              Go Home
            </button>
          </div>

          {import.meta.env.DEV && this.state.error && (
            <details className="mb-8 text-left bg-gray-100 p-4 rounded-lg">
              <summary className="cursor-pointer font-semibold text-gray-800 mb-2">
                Error Details (Development Only)
              </summary>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-auto max-h-48 border border-gray-300 rounded p-2">
                {this.state.error.toString()}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}

          <div className="text-left bg-pink-100 p-4 rounded-lg max-w-md">
            <p className="font-semibold text-gray-800 mb-2">If the problem persists, please try:</p>
            <ul className="text-gray-600 space-y-1">
              <li>• Refreshing the page</li>
              <li>• Clearing your browser cache</li>
              <li>• Contacting support if the issue continues</li>
            </ul>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
