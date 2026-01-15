import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VerifyEmail = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [validationErrors, setValidationErrors] = useState({});
  const [verified, setVerified] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    const getStoredEmail = async () => {
      const storedEmail = await AsyncStorage.getItem('resetEmail');
      if (storedEmail) {
        setEmail(storedEmail);
      } else {
        navigation.navigate('ForgotPassword');
      }
    };
    getStoredEmail();
  }, [navigation]);

  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleOtpChange = (value, index) => {
    if (!/^\d*$/.test(value)) return;
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setValidationErrors({});

    if (value && index < otp.length - 1) {
      const nextInput = `otp-${index + 1}`;
      // Focus next input (would need refs in real implementation)
    }
  };

  const handleKeyDown = (e, index) => {
    // Handle backspace navigation (would need keyboard event handling in real implementation)
  };

  const handleSubmit = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setValidationErrors({ otp: 'Please enter the complete 6-digit code' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call - in real implementation, this would verify the OTP
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Store token for reset password step
      await AsyncStorage.setItem('resetToken', `mock-token-${otpValue}`);

      setVerified(true);

      setTimeout(() => {
        navigation.navigate('ResetPassword', { email, token: `mock-token-${otpValue}` });
      }, 2000);
    } catch (error) {
      console.error('Error:', error);
      setValidationErrors({
        otp: 'Failed to verify code. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;

    setIsResending(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setResendTimer(60);
      setOtp(['', '', '', '', '', '']);
      Alert.alert('Success', 'A new verification code has been sent to your email.');
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  if (verified) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Text style={styles.checkIcon}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Email Verified</Text>
        <Text style={styles.successMessage}>
          Your email has been verified successfully
        </Text>
        <Text style={styles.successSubtext}>
          Redirecting you to reset your password...
        </Text>

        <View style={styles.loadingBar}>
          <View style={styles.loadingProgress}></View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Text style={styles.mailIcon}>✉️</Text>
            </View>
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code we sent to your email
            </Text>
          </View>

          {/* Email Display */}
          <View style={styles.emailContainer}>
            <Text style={styles.emailIcon}>✉️</Text>
            <Text style={styles.emailText}>{email}</Text>
          </View>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            <View style={styles.otpInputs}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  style={[styles.otpInput, validationErrors.otp && styles.otpInputError]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  selectTextOnFocus
                  editable={!isSubmitting}
                  autoComplete="one-time-code"
                />
              ))}
            </View>

            {validationErrors.otp && (
              <Text style={styles.errorText}>{validationErrors.otp}</Text>
            )}

            <Text style={styles.helpText}>
              Check your email (including spam folder) for the 6-digit code
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting || otp.join('').length !== 6}
          >
            {isSubmitting ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.buttonText}>Verifying...</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.mailButtonIcon}>✉️</Text>
                <Text style={styles.buttonText}>Verify Email</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Resend Code */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code?</Text>
            <TouchableOpacity
              style={[styles.resendButton, (resendTimer > 0 || isResending) && styles.resendButtonDisabled]}
              onPress={handleResend}
              disabled={resendTimer > 0 || isResending}
            >
              <Text style={[styles.resendButtonText, (resendTimer > 0 || isResending) && styles.resendButtonTextDisabled]}>
                {isResending ? 'Sending...' : resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Back Link */}
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.navigate('ForgotPassword')}
            disabled={isSubmitting}
          >
            <Text style={styles.backIcon}>←</Text>
            <Text style={styles.backText}>Back to Forgot Password</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    marginTop: 30,
  },
  content: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkIcon: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  successSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#eee',
    borderRadius: 2,
    marginTop: 20,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: '#28a745',
    borderRadius: 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    marginBottom: 20,
  },
  mailIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 30,
  },
  emailIcon: {
    fontSize: 18,
    marginRight: 12,
    color: '#666',
  },
  emailText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  otpContainer: {
    marginBottom: 30,
  },
  otpInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  otpInput: {
    width: 45,
    height: 50,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    backgroundColor: '#fff',
  },
  otpInputError: {
    borderColor: '#dc3545',
    backgroundColor: '#fdf2f2',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  helpText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#ce4da3ff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mailButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  resendButton: {
    padding: 8,
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    fontSize: 16,
    color: '#ce4da3ff',
    fontWeight: '600',
  },
  resendButtonTextDisabled: {
    color: '#999',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    padding: 12,
  },
  backIcon: {
    fontSize: 18,
    color: '#ce4da3ff',
    marginRight: 8,
  },
  backText: {
    color: '#ce4da3ff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VerifyEmail;
