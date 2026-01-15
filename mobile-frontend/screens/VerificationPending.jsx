import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useMainContext } from '../contexts/MainContext';

const VerificationPending = () => {
  const { logout } = useMainContext();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Account Verification Pending</Text>
        <Text style={styles.message}>
          Your account is pending verification. Please check your email for verification instructions or contact support.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleLogout}>
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', backgroundColor: '#fff', padding: 20 },
  content: { alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#333' },
  message: { fontSize: 16, textAlign: 'center', marginBottom: 30, color: '#666', lineHeight: 24 },
  button: { backgroundColor: '#007bff', padding: 15, borderRadius: 8, alignItems: 'center', minWidth: 200 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default VerificationPending;
