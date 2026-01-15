import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
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

    // In production, you might want to send this to an error reporting service
    // like Sentry, Bugsnag, etc.
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    // For React Navigation, we'll need to use a navigation method
    // This assumes the ErrorBoundary is wrapped with navigation context
    if (this.props.navigation) {
      this.props.navigation.navigate('Dashboard');
    } else {
      Alert.alert(
        'Navigation Error',
        'Unable to navigate. Please restart the app.',
        [{ text: 'OK' }]
      );
    }
  };

  handleReportError = () => {
    Alert.alert(
      'Report Error',
      'Would you like to report this error to our development team?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          onPress: () => {
            // Here you would send the error to your error reporting service
            Alert.alert('Thank you', 'Your error report has been sent. We apologize for the inconvenience.');
          }
        }
      ]
    );
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.errorContent}>
              <View style={styles.iconContainer}>
                <Icon name="warning-outline" size={80} color="#dc3545" />
              </View>

              <Text style={styles.title}>Oops! Something went wrong</Text>
              <Text style={styles.message}>
                We're sorry, but something unexpected happened. Don't worry, our team has been notified.
              </Text>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.retryButton]}
                  onPress={this.handleRetry}
                  activeOpacity={0.8}
                >
                  <Icon name="refresh-outline" size={20} color="#fff" />
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.homeButton]}
                  onPress={this.handleGoHome}
                  activeOpacity={0.8}
                >
                  <Icon name="home-outline" size={20} color="#666" />
                  <Text style={styles.homeButtonText}>Go Home</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.reportButton}
                onPress={this.handleReportError}
                activeOpacity={0.8}
              >
                <Text style={styles.reportButtonText}>Report This Error</Text>
              </TouchableOpacity>

              {/* Development error details */}
              {__DEV__ && this.state.error && (
                <View style={styles.errorDetails}>
                  <Text style={styles.errorDetailsTitle}>Error Details (Development Only)</Text>
                  <ScrollView style={styles.errorTextContainer} showsVerticalScrollIndicator={false}>
                    <Text style={styles.errorText}>
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </Text>
                  </ScrollView>
                </View>
              )}

              <View style={styles.helpContainer}>
                <Text style={styles.helpTitle}>If the problem persists, please try:</Text>
                <View style={styles.helpList}>
                  <Text style={styles.helpItem}>• Restarting the application</Text>
                  <Text style={styles.helpItem}>• Clearing app cache and data</Text>
                  <Text style={styles.helpItem}>• Contacting support if the issue continues</Text>
                </View>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 400,
    alignSelf: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
    minWidth: 120,
  },
  retryButton: {
    backgroundColor: '#dc143c',
    flex: 1,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  homeButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flex: 1,
  },
  homeButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  reportButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  reportButtonText: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: '500',
  },
  errorDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  errorDetailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  errorTextContainer: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  helpContainer: {
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#fed7d7',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  helpList: {
    gap: 4,
  },
  helpItem: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default ErrorBoundary;
