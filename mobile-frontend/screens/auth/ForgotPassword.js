import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import apiClient from '../../api';

export default function ForgotPassword({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter an email address.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post("/user/send-verification-otp", {
        email: email.trim(),
        purpose: "password_reset"
      });

      if (response.data.success) {
        Alert.alert("Success", "Password reset link sent to " + email, [
          { text: "OK", onPress: () => navigation.navigate("VerifyPhoneForPassword", { email: email.trim() }) }
        ]);
      } else {
        Alert.alert("Error", response.data.message || "Failed to send reset link.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>

      <Text style={styles.label}>Enter your registered email:</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />

      <TouchableOpacity style={[styles.resetButton, loading && styles.disabledButton]} onPress={handleReset} disabled={loading}>
        <Text style={styles.resetText}>
          {loading ? "Sending..." : "SEND RESET EMAIL"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  label: {
    alignSelf: 'flex-start',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#a5a2a2ff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  resetButton: {
    backgroundColor: '#ce4da3ff',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  resetText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
