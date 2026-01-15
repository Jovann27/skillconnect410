import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useMainContext } from '../contexts/MainContext';

/**
 * AccountStatusGuard Component - Matches web App.jsx AccountStatusGuard pattern
 *
 * Checks banned status first, then verification status
 * Shows appropriate screens for banned or unverified users
 *
 * @param {ReactNode} children - Component to render if account is in good standing
 */
const AccountStatusGuard = ({ children }) => {
  const { user, loading } = useMainContext();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#dd306a" />
      </View>
    );
  }

  // Check if user is banned first
  if (user?.banned) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Account Suspended</Text>
        <Text style={styles.copy}>
          Your account has been suspended. Please contact support for assistance.
        </Text>
      </View>
    );
  }

  // Check if user is verified
  if (!user?.verified) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Account Verification Required</Text>
        <Text style={styles.copy}>
          Please verify your email address to access your account.
        </Text>
      </View>
    );
  }

  return children;
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: '#1f1f1f',
    textAlign: 'center',
  },
  copy: {
    fontSize: 14,
    textAlign: 'center',
    color: '#5f5f5f',
    marginBottom: 16,
  },
});

export default AccountStatusGuard;
