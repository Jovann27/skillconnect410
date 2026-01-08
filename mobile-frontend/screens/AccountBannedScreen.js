import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useMainContext } from '../contexts/MainContext';

const AccountBannedScreen = () => {
  const { user, logout } = useMainContext();

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'You can contact support at support@skillconnect.com to appeal this ban.',
      [
        { text: 'Copy Email', onPress: () => Alert.alert('Email copied', 'support@skillconnect.com') },
        { text: 'OK' }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🚫</Text>
        </View>

        <Text style={styles.title}>Account Suspended</Text>

        <Text style={styles.message}>
          Your account has been suspended due to a violation of our community guidelines.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>What this means:</Text>
          <Text style={styles.infoText}>
            • You cannot access your account or use our services{'\n'}
            • Your profile and listings are hidden from other users{'\n'}
            • You cannot create new orders or respond to requests
          </Text>
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Appeal the suspension</Text>
          <Text style={styles.warningText}>
            If you believe this suspension was made in error, you can contact our support team to appeal the decision.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleContactSupport}>
            <Text style={styles.primaryButtonText}>Contact Support</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.outlineButton} onPress={handleLogout}>
            <Text style={styles.outlineButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          For urgent matters, contact support@skillconnect.com
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#dc3545',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 24,
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: '#f8d7da',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#721c24',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#721c24',
    lineHeight: 20,
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 24,
  },
  primaryButton: {
    backgroundColor: '#dc3545',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#6c757d',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  outlineButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginTop: 24,
  },
});

export default AccountBannedScreen;