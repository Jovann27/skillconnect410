import { useState } from 'react';
import { View,Text,TextInput,TouchableOpacity,StyleSheet,Alert,KeyboardAvoidingView,Platform } from 'react-native';

export default function PhoneVerification({ route, navigation }) {
  const { currentPhone, onSave } = route.params || {};

  const [phone, setPhone] = useState(currentPhone || '');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const sendOtp = () => {
    if (phone.trim() === '') {
      Alert.alert('Error', 'Please enter a phone number.');
      return;
    }
    setOtpSent(true);
    Alert.alert('OTP Sent', `A verification code was sent to ${phone}`);
  };

  const verifyOtp = () => {
    if (otp.trim().length !== 6) {
      Alert.alert('Error', 'Enter the 6-digit OTP.');
      return;
    }

    if (onSave) onSave(phone);

    Alert.alert('Success', 'Phone number updated!');
    navigation.goBack(); // ✅ instantly go back after verifying
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
      

        <Text style={styles.label}>New phone number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+63 9123456789"
          placeholderTextColor="#999"
        />

        {!otpSent ? (
          <TouchableOpacity style={styles.sendButton} onPress={sendOtp}>
            <Text style={styles.sendButtonText}>Send OTP</Text>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={styles.label}>Enter OTP</Text>
            <TextInput
              style={styles.input}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="123456"
              placeholderTextColor="#999"
            />
            <TouchableOpacity style={styles.verifyButton} onPress={verifyOtp}>
              <Text style={styles.verifyButtonText}>Verify & Save</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 0,
    backgroundColor: '#fff', // ✅ Full screen white
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    marginTop: 10,
    fontSize: 16,
    color: '#444',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 15,
    color: '#333',
  },
  sendButton: {
    backgroundColor: '#ce4da3ff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  verifyButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  verifyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
