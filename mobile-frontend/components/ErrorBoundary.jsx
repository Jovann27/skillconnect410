import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

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
    // This would need to be passed as a prop or use navigation
    if (this.props.onGoHome) {
      this.props.onGoHome();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.errorContent}>
              <MaterialIcons name="error-outline" size={80} color="#dc3545" style={styles.errorIcon} />

              <Text style={styles.title}>Oops! Something went wrong</Text>

              <Text style={styles.message}>
                We're sorry, but something unexpected happened. Don't worry, our team has been notified.
              </Text>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={this.handleRetry}
                >
                  <MaterialIcons name="refresh" size={20} color="#fff" />
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.homeButton}
                  onPress={this.handleGoHome}
                >
                  <MaterialIcons name="home" size={20} color="#fff" />
                  <Text style={styles.homeButtonText}>Go Home</Text>
                </TouchableOpacity>
              </View>

              {__DEV__ && this.state.error && (
                <View style={styles.errorDetails}>
                  <Text style={styles.detailsTitle}>Error Details (Development Only)</Text>
                  <ScrollView style={styles.errorTextContainer}>
                    <Text style={styles.errorText}>
                      {this.state.error.toString()}
                      {this.state.errorInfo.componentStack}
                    </Text>
                  </ScrollView>
                </View>
              )}

              <View style={styles.helpContainer}>
                <Text style={styles.helpTitle}>If the problem persists, please try:</Text>
                <Text style={styles.helpText}>• Restarting the app</Text>
                <Text style={styles.helpText}>• Clearing app cache</Text>
                <Text style={styles.helpText}>• Contacting support if the issue continues</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  errorIcon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
  },
  retryButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  homeButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  errorDetails: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  errorTextContainer: {
    maxHeight: 150,
  },
  errorText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  helpContainer: {
    width: '100%',
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
});

export default ErrorBoundary;
