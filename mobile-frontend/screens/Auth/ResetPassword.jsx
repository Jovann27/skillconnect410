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
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ResetPassword = () => {
  const [formData, setFormData] = useState({
    email: '',
    token: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    // Get parameters from navigation props or AsyncStorage
    const getParams = async () => {
      const params = route.params || {};
      const email = params.email || await AsyncStorage.getItem('resetEmail') || 'user@example.com';
      const token = params.token || await AsyncStorage.getItem('resetToken') || 'valid-token';

      if (email && token) {
        setFormData(prev => ({
          ...prev,
          email,
          token
        }));
      } else {
        navigation.navigate('ForgotPassword');
      }
    };
    getParams();
  }, [route.params, navigation]);

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return strength;
  };

  const getPasswordStrengthLabel = (strength) => {
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    return labels[strength];
  };

  const getPasswordStrengthColor = (strength) => {
    const colors = ['', '#dc3545', '#fd7e14', '#ffc107', '#007bff', '#28a745'];
    return colors[strength];
  };

  const validatePassword = (password) => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    return '';
  };

  const validateConfirmPassword = (confirmPassword, password) => {
    if (!confirmPassword) {
      return 'Please confirm your password';
    }
    if (confirmPassword !== password) {
      return 'Passwords do not match';
    }
    return '';
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (field === 'newPassword') {
      setPasswordStrength(calculatePasswordStrength(value));
      setValidationErrors(prev => ({
        ...prev,
        newPassword: validatePassword(value),
        confirmPassword: formData.confirmPassword ? validateConfirmPassword(formData.confirmPassword, value) : prev.confirmPassword
      }));
    } else if (field === 'confirmPassword') {
      setValidationErrors(prev => ({
        ...prev,
        confirmPassword: validateConfirmPassword(value, formData.newPassword)
      }));
    }
  };

  const handleSubmit = async () => {
    const passwordError = validatePassword(formData.newPassword);
    const confirmPasswordError = validateConfirmPassword(formData.confirmPassword, formData.newPassword);

    if (passwordError || confirmPasswordError) {
      setValidationErrors({
        newPassword: passwordError,
        confirmPassword: confirmPasswordError
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call - in real implementation, this would call the backend
      await new Promise(resolve => setTimeout(resolve, 2000));

      setSubmitted(true);
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2500);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Text style={styles.checkIcon}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Password Reset Successfully</Text>
        <Text style={styles.successMessage}>
          Your password has been updated successfully
        </Text>
        <Text style={styles.successSubtext}>
          Redirecting to login page... You can now log in with your new password.
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
              <Text style={styles.lockIcon}>🔒</Text>
            </View>
            <Text style={styles.title}>Reset Your Password</Text>
            <Text style={styles.subtitle}>
              Create a new, secure password for your account
            </Text>
          </View>

          {/* New Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={[styles.inputWrapper, validationErrors.newPassword && styles.inputError]}>
              <TextInput
                style={styles.input}
                value={formData.newPassword}
                onChangeText={(value) => handleInputChange('newPassword', value)}
                placeholder="Enter your new password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                autoComplete="new-password"
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
              >
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
              {formData.newPassword && !validationErrors.newPassword && (
                <View style={styles.inputSuccessIcon}>
                  <Text style={styles.checkIconSmall}>✓</Text>
                </View>
              )}
            </View>

            {/* Password Strength Indicator */}
            {formData.newPassword && (
              <View style={styles.passwordStrength}>
                <View style={styles.strengthBars}>
                  {[...Array(5)].map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.strengthBar,
                        i < passwordStrength && { backgroundColor: getPasswordStrengthColor(passwordStrength) }
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: getPasswordStrengthColor(passwordStrength) }]}>
                  {getPasswordStrengthLabel(passwordStrength)}
                </Text>
              </View>
            )}

            {validationErrors.newPassword ? (
              <Text style={styles.errorText}>{validationErrors.newPassword}</Text>
            ) : (
              <Text style={styles.helpText}>
                At least 8 characters with a mix of uppercase, lowercase, numbers, and symbols
              </Text>
            )}
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={[styles.inputWrapper, validationErrors.confirmPassword && styles.inputError]}>
              <TextInput
                style={styles.input}
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                placeholder="Confirm your new password"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                autoComplete="new-password"
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isSubmitting}
              >
                <Text style={styles.eyeText}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
              {formData.confirmPassword && !validationErrors.confirmPassword && (
                <View style={styles.inputSuccessIcon}>
                  <Text style={styles.checkIconSmall}>✓</Text>
                </View>
              )}
            </View>

            {validationErrors.confirmPassword ? (
              <Text style={styles.errorText}>{validationErrors.confirmPassword}</Text>
            ) : (
              <Text style={styles.helpText}>
                Passwords must match exactly
              </Text>
            )}
          </View>

          {/* Password Requirements */}
          <View style={styles.requirementsBox}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            <View style={styles.requirementsList}>
              <View style={styles.requirementItem}>
                <Text style={[styles.checkIconSmall, { color: formData.newPassword?.length >= 8 ? '#28a745' : '#ddd' }]}>✓</Text>
                <Text style={styles.requirementText}>At least 8 characters</Text>
              </View>
              <View style={styles.requirementItem}>
                <Text style={[styles.checkIconSmall, { color: /[a-z]/.test(formData.newPassword) ? '#28a745' : '#ddd' }]}>✓</Text>
                <Text style={styles.requirementText}>One lowercase letter</Text>
              </View>
              <View style={styles.requirementItem}>
                <Text style={[styles.checkIconSmall, { color: /[A-Z]/.test(formData.newPassword) ? '#28a745' : '#ddd' }]}>✓</Text>
                <Text style={styles.requirementText}>One uppercase letter</Text>
              </View>
              <View style={styles.requirementItem}>
                <Text style={[styles.checkIconSmall, { color: /[0-9]/.test(formData.newPassword) ? '#28a745' : '#ddd' }]}>✓</Text>
                <Text style={styles.requirementText}>One number</Text>
              </View>
              <View style={styles.requirementItem}>
                <Text style={[styles.checkIconSmall, { color: /[^a-zA-Z0-9]/.test(formData.newPassword) ? '#28a745' : '#ddd' }]}>✓</Text>
                <Text style={styles.requirementText}>One special character (!@#$%^&*)</Text>
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting || !!validationErrors.newPassword || !!validationErrors.confirmPassword || !formData.newPassword || !formData.confirmPassword}
          >
            {isSubmitting ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.buttonText}>Resetting Password...</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.lockButtonIcon}>🔒</Text>
                <Text style={styles.buttonText}>Reset Password</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Back to Login Link */}
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.navigate('Login')}
            disabled={isSubmitting}
          >
            <Text style={styles.backIcon}>←</Text>
            <Text style={styles.backText}>Back to Login</Text>
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
  checkIconSmall: {
    fontSize: 16,
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
  lockIcon: {
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
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#dc3545',
    backgroundColor: '#fdf2f2',
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  passwordToggle: {
    padding: 16,
  },
  eyeText: {
    fontSize: 16,
  },
  inputSuccessIcon: {
    padding: 16,
  },
  passwordStrength: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  strengthBars: {
    flexDirection: 'row',
    marginRight: 12,
  },
  strengthBar: {
    width: 20,
    height: 4,
    backgroundColor: '#ddd',
    marginRight: 2,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 4,
  },
  helpText: {
    color: '#666',
    fontSize: 14,
    marginTop: 4,
  },
  requirementsBox: {
    backgroundColor: '#f8f9fa',
    borderColor: '#dee2e6',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  requirementsList: {
    gap: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requirementText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  submitButton: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    padding: 12,
  },
  backIcon: {
    fontSize: 18,
    color: '#007bff',
    marginRight: 8,
  },
  backText: {
    color: '#007bff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ResetPassword;
