import React from 'react';
import { FaExclamationTriangle, FaRedo, FaHome } from 'react-icons/fa';
import "./layout-styles.css";

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
        <div className="error-boundary">
          <FaExclamationTriangle className="error-boundary-icon" />
          <h2>Oops! Something went wrong</h2>
          <p>
            We're sorry, but something unexpected happened. Don't worry, our team has been notified.
          </p>

          <div className="error-boundary-buttons">
            <button
              className="error-boundary-button"
              onClick={this.handleRetry}
              aria-label="Try loading the page again"
            >
              <FaRedo />
              Try Again
            </button>
            <button
              className="error-boundary-button error-boundary-button-secondary"
              onClick={this.handleGoHome}
              aria-label="Go back to home page"
            >
              <FaHome />
              Go Home
            </button>
          </div>

          {import.meta.env.DEV && this.state.error && (
            <details className="error-boundary-details">
              <summary>Error Details (Development Only)</summary>
              <pre className="error-boundary-stack">
                {this.state.error.toString()}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}

          <div className="error-boundary-help">
            <p>If the problem persists, please try:</p>
            <ul>
              <li>Refreshing the page</li>
              <li>Clearing your browser cache</li>
              <li>Contacting support if the issue continues</li>
            </ul>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
