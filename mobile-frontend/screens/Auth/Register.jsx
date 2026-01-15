import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMainContext } from '../../contexts/MainContext';
import apiClient from '../../api';

const Register = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    role: '',
    skills: [],
    serviceTypes: [],
    profilePic: null,
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    occupation: '',
    birthdate: '',
    employed: '',
    isApplyingProvider: false,
    certificates: [],
    workProofs: [],
    validId: null,
  });

  const [predefinedServices, setPredefinedServices] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setIsAuthorized, setUser, setTokenType } = useMainContext();
  const navigation = useNavigation();

  const totalSteps = formData.role === 'Service Provider' ? 4 : 3;

  // Fetch predefined services on component mount
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data } = await apiClient.get('/user/predefined-services');
        setPredefinedServices(data.services || []);
      } catch (error) {
        console.error('Error fetching services:', error);
        // Don't show error to user, just use empty list
      }
    };

    fetchServices();
  }, []);

  const validateForm = () => {
    const errors = {};

    if (!formData.username || formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters long';
    }

    if (!formData.password || formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    const phoneRegex = /^(\+63|0)[0-9]{10}$/;
    if (!formData.phone || !phoneRegex.test(formData.phone)) {
      errors.phone = 'Invalid phone number format. Use +63XXXXXXXXXX or 0XXXXXXXXXX';
    }

    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.address.trim()) errors.address = 'Address is required';
    if (!formData.birthdate) errors.birthdate = 'Birthdate is required';
    if (!formData.employed || !['employed', 'unemployed'].includes(formData.employed)) {
      errors.employed = 'Employment status must be Employed or Unemployed';
    }
    if (!formData.role || !['Community Member', 'Service Provider'].includes(formData.role)) {
      errors.role = 'Please select a valid role';
    }

    if (!formData.validId) {
      errors.validId = 'Valid ID is required';
    } else if (formData.validId && !formData.validId.type?.startsWith('image/')) {
      errors.validId = 'Valid ID must be an image file (JPG, PNG, etc.)';
    }

    if (formData.role === 'Service Provider') {
      if (!formData.skills || formData.skills.length === 0) {
        errors.skills = 'At least one skill is required for Service Providers';
      } else if (formData.skills.length > 3) {
        errors.skills = 'You can select a maximum of 3 skills';
      }
      if (!formData.serviceTypes || formData.serviceTypes.length === 0) {
        errors.serviceTypes = 'At least one service type is required for Service Providers';
      }
      if (formData.certificates.length === 0 && formData.workProofs.length === 0) {
        errors.certificates = 'At least one certificate or work proof is required for Service Providers';
      }
      if (formData.certificates.length > 3) {
        errors.certificates = 'Maximum 3 certificate images allowed';
      }
      if (formData.workProofs.length > 3) {
        errors.workProofs = 'Maximum 3 work proof images allowed';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep = (step) => {
    const errors = {};

    switch(step) {
      case 1: {
        if (!formData.username || formData.username.length < 3) {
          errors.username = 'Username must be at least 3 characters long';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email || !emailRegex.test(formData.email)) {
          errors.email = 'Please enter a valid email address';
        }
        if (!formData.password || formData.password.length < 8) {
          errors.password = 'Password must be at least 8 characters long';
        }
        if (formData.password !== formData.confirmPassword) {
          errors.confirmPassword = 'Passwords do not match';
        }
        break;
      }
      case 2: {
        if (!formData.firstName.trim()) errors.firstName = 'First name is required';
        if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
        const phoneRegex = /^(\+63|0)[0-9]{10}$/;
        if (!formData.phone || !phoneRegex.test(formData.phone)) {
          errors.phone = 'Invalid phone number format';
        }
        if (!formData.address.trim()) errors.address = 'Address is required';
        if (!formData.birthdate) errors.birthdate = 'Birthdate is required';
        if (!formData.employed || !['employed', 'unemployed'].includes(formData.employed)) {
          errors.employed = 'Employment status is required';
        }
        if (!formData.role || !['Community Member', 'Service Provider'].includes(formData.role)) {
          errors.role = 'Please select a valid role';
        }
        break;
      }
      case 3:
        if (!formData.validId) {
          errors.validId = 'Valid ID is required';
        }
        if (formData.role === 'Service Provider' && (!formData.skills || formData.skills.length === 0)) {
          errors.skills = 'At least one skill is required';
        }
        break;
      case 4:
        if (formData.role === 'Service Provider') {
          if (formData.certificates.length === 0 && formData.workProofs.length === 0) {
            errors.certificates = 'At least one certificate or work proof is required for Service Providers';
          }
          if (formData.certificates.length > 3) {
            errors.certificates = 'Maximum 3 certificate images allowed';
          }
          if (formData.workProofs.length > 3) {
            errors.workProofs = 'Maximum 3 work proof images allowed';
          }
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (name, value) => {
    const updatedData = { ...formData, [name]: value };
    if (name === 'role') {
      updatedData.isApplyingProvider = value === 'Service Provider';
    }
    setFormData(updatedData);
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    } else {
      Alert.alert('Error', 'Please fix the errors before continuing');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Please fix the errors in the form before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = new FormData();

      submitData.append('username', formData.username);
      submitData.append('password', formData.password);
      submitData.append('confirmPassword', formData.confirmPassword);
      submitData.append('firstName', formData.firstName);
      submitData.append('lastName', formData.lastName);
      submitData.append('email', formData.email);
      submitData.append('phone', formData.phone);
      submitData.append('address', formData.address);
      submitData.append('birthdate', formData.birthdate);
      submitData.append('employed', formData.employed);
      submitData.append('role', formData.role);

      if (formData.occupation) {
        submitData.append('occupation', formData.occupation);
      }

      if (formData.profilePic) {
        submitData.append('profilePic', formData.profilePic);
      }

      if (formData.validId) {
        submitData.append('validId', formData.validId);
      }

      if (formData.role === 'Service Provider') {
        if (formData.skills && formData.skills.length > 0) {
          formData.skills.forEach((skill) => submitData.append('skills', skill));
        }
        if (formData.serviceTypes && formData.serviceTypes.length > 0) {
          formData.serviceTypes.forEach((serviceType) => submitData.append('serviceTypes', serviceType));
        }
        if (formData.certificates && formData.certificates.length > 0) {
          formData.certificates.forEach((file) => submitData.append('certificates', file));
        }
        if (formData.workProofs && formData.workProofs.length > 0) {
          formData.workProofs.forEach((file) => submitData.append('workProofs', file));
        }
      }

      const { data } = await apiClient.post('/user/register', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      Alert.alert('Success', data.message);
      setShowPopup(true);
      setUser(data.user);
      setIsAuthorized(true);
      setTokenType('user');

      navigation.replace(formData.role === 'Service Provider' ? 'ProviderDashboard' : 'ClientDashboard');

      setTimeout(() => setShowPopup(false), 5000);
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch(currentStep) {
      case 1:
        return (
          <>
            <Text style={styles.stepTitle}>Account Information</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={[styles.input, validationErrors.username && styles.inputError]}
                value={formData.username}
                onChangeText={(value) => handleChange('username', value)}
                placeholder="Enter your username"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {validationErrors.username && (
                <Text style={styles.errorText}>{validationErrors.username}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[styles.input, validationErrors.email && styles.inputError]}
                value={formData.email}
                onChangeText={(value) => handleChange('email', value)}
                placeholder="your.email@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {validationErrors.email && (
                <Text style={styles.errorText}>{validationErrors.email}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrapper, validationErrors.password && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  value={formData.password}
                  onChangeText={(value) => handleChange('password', value)}
                  placeholder="Create a strong password"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {validationErrors.password && (
                <Text style={styles.errorText}>{validationErrors.password}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={[styles.inputWrapper, validationErrors.confirmPassword && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  value={formData.confirmPassword}
                  onChangeText={(value) => handleChange('confirmPassword', value)}
                  placeholder="Confirm your password"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Text style={styles.eyeText}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {validationErrors.confirmPassword && (
                <Text style={styles.errorText}>{validationErrors.confirmPassword}</Text>
              )}
            </View>
          </>
        );

      case 2:
        return (
          <>
            <Text style={styles.stepTitle}>Personal Information</Text>

            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={[styles.input, validationErrors.firstName && styles.inputError]}
                  value={formData.firstName}
                  onChangeText={(value) => handleChange('firstName', value)}
                  placeholder="Enter your first name"
                />
                {validationErrors.firstName && (
                  <Text style={styles.errorText}>{validationErrors.firstName}</Text>
                )}
              </View>

              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={[styles.input, validationErrors.lastName && styles.inputError]}
                  value={formData.lastName}
                  onChangeText={(value) => handleChange('lastName', value)}
                  placeholder="Enter your last name"
                />
                {validationErrors.lastName && (
                  <Text style={styles.errorText}>{validationErrors.lastName}</Text>
                )}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={[styles.input, validationErrors.phone && styles.inputError]}
                value={formData.phone}
                onChangeText={(value) => handleChange('phone', value)}
                placeholder="+63XXXXXXXXXX or 0XXXXXXXXXX"
                keyboardType="phone-pad"
              />
              {validationErrors.phone && (
                <Text style={styles.errorText}>{validationErrors.phone}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={[styles.input, validationErrors.address && styles.inputError]}
                value={formData.address}
                onChangeText={(value) => handleChange('address', value)}
                placeholder="Enter your complete address"
                multiline
                numberOfLines={2}
              />
              {validationErrors.address && (
                <Text style={styles.errorText}>{validationErrors.address}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Date of Birth</Text>
              <TextInput
                style={[styles.input, validationErrors.birthdate && styles.inputError]}
                value={formData.birthdate}
                onChangeText={(value) => handleChange('birthdate', value)}
                placeholder="YYYY-MM-DD"
              />
              {validationErrors.birthdate && (
                <Text style={styles.errorText}>{validationErrors.birthdate}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Employment Status</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[styles.radioButton, formData.employed === 'employed' && styles.radioButtonSelected]}
                  onPress={() => handleChange('employed', 'employed')}
                >
                  <Text style={[styles.radioText, formData.employed === 'employed' && styles.radioTextSelected]}>
                    Employed
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radioButton, formData.employed === 'unemployed' && styles.radioButtonSelected]}
                  onPress={() => handleChange('employed', 'unemployed')}
                >
                  <Text style={[styles.radioText, formData.employed === 'unemployed' && styles.radioTextSelected]}>
                    Unemployed
                  </Text>
                </TouchableOpacity>
              </View>
              {validationErrors.employed && (
                <Text style={styles.errorText}>{validationErrors.employed}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Account Type</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[styles.radioButton, formData.role === 'Community Member' && styles.radioButtonSelected]}
                  onPress={() => handleChange('role', 'Community Member')}
                >
                  <Text style={[styles.radioText, formData.role === 'Community Member' && styles.radioTextSelected]}>
                    Community Member
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radioButton, formData.role === 'Service Provider' && styles.radioButtonSelected]}
                  onPress={() => handleChange('role', 'Service Provider')}
                >
                  <Text style={[styles.radioText, formData.role === 'Service Provider' && styles.radioTextSelected]}>
                    Service Provider
                  </Text>
                </TouchableOpacity>
              </View>
              {validationErrors.role && (
                <Text style={styles.errorText}>{validationErrors.role}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Occupation <Text style={styles.optional}>(Optional)</Text></Text>
              <TextInput
                style={styles.input}
                value={formData.occupation}
                onChangeText={(value) => handleChange('occupation', value)}
                placeholder="Enter your current occupation"
              />
            </View>
          </>
        );

      case 3:
        return (
          <>
            <Text style={styles.stepTitle}>Documents & Skills</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Profile Picture <Text style={styles.optional}>(Optional)</Text></Text>
              <TouchableOpacity style={styles.uploadButton}>
                <Text style={styles.uploadText}>📷 Upload Profile Picture</Text>
                <Text style={styles.uploadSubtext}>PNG, JPG up to 10MB</Text>
              </TouchableOpacity>
              {formData.profilePic && (
                <Text style={styles.fileName}>{formData.profilePic.name}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Valid ID <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity
                style={[styles.uploadButton, validationErrors.validId && styles.uploadButtonError]}
              >
                <Text style={styles.uploadText}>🆔 Upload Valid ID</Text>
                <Text style={styles.uploadSubtext}>PNG, JPG up to 10MB</Text>
              </TouchableOpacity>
              {validationErrors.validId && (
                <Text style={styles.errorText}>{validationErrors.validId}</Text>
              )}
              {formData.validId && (
                <Text style={styles.fileName}>{formData.validId.name}</Text>
              )}
            </View>

            {formData.role === 'Service Provider' && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Select Your Skills <Text style={styles.required}>*</Text></Text>
                  <Text style={styles.skillHelp}>Select 1-3 skills</Text>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.skillScroll}>
                    {[
                      'Pipe Installation', 'Leak Repair', 'Wiring Installation', 'Cleaning Services',
                      'Carpentry Work', 'Painting Services', 'Appliance Repair', 'Tutoring', 'Massage Therapy'
                    ].map((skill) => (
                      <TouchableOpacity
                        key={skill}
                        style={[
                          styles.skillChip,
                          formData.skills.includes(skill) && styles.skillChipSelected,
                          !formData.skills.includes(skill) && formData.skills.length >= 3 && styles.skillChipDisabled
                        ]}
                        onPress={() => {
                          const currentSkills = [...formData.skills];
                          if (currentSkills.includes(skill)) {
                            const index = currentSkills.indexOf(skill);
                            currentSkills.splice(index, 1);
                          } else if (currentSkills.length < 3) {
                            currentSkills.push(skill);
                          }
                          handleChange('skills', currentSkills);
                        }}
                        disabled={!formData.skills.includes(skill) && formData.skills.length >= 3}
                      >
                        <Text style={[
                          styles.skillChipText,
                          formData.skills.includes(skill) && styles.skillChipTextSelected
                        ]}>
                          {skill}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={styles.skillCount}>Selected: {formData.skills.length}/3 skills</Text>
                  {validationErrors.skills && (
                    <Text style={styles.errorText}>{validationErrors.skills}</Text>
                  )}
                </View>
              </>
            )}
          </>
        );

      case 4:
        return (
          <>
            <Text style={styles.stepTitle}>Documentation</Text>
            <Text style={styles.stepSubtitle}>
              Upload certificates, licenses, or work proof images to verify your expertise (at least one required)
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Certificates & Licenses <Text style={styles.optional}>(Optional - Max 3)</Text></Text>
              <TouchableOpacity style={styles.uploadButton}>
                <Text style={styles.uploadText}>📄 Upload Certificates</Text>
                <Text style={styles.uploadSubtext}>PNG, JPG, PDF up to 10MB each</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Work Proof & Portfolio <Text style={styles.optional}>(Optional - Max 3)</Text></Text>
              <TouchableOpacity style={styles.uploadButton}>
                <Text style={styles.uploadText}>💼 Upload Work Proofs</Text>
                <Text style={styles.uploadSubtext}>PNG, JPG up to 10MB each</Text>
              </TouchableOpacity>
            </View>

            {(formData.certificates.length === 0 && formData.workProofs.length === 0) && validationErrors.certificates && (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>Documentation Required</Text>
                <Text style={styles.warningText}>
                  Please upload at least one certificate/license or work proof image to verify your expertise.
                </Text>
              </View>
            )}

            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Documentation Summary:</Text>
              <Text style={styles.summaryText}>
                • Certificates: {formData.certificates.length}/3 uploaded{"\n"}
                • Work Proofs: {formData.workProofs.length}/3 uploaded{"\n"}
                • Total documentation: {formData.certificates.length + formData.workProofs.length} files
              </Text>
            </View>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Text style={styles.appName}>SkillConnect 4b410</Text>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Your Account</Text>
            {currentStep > 1 && (
              <Text style={styles.stepIndicator}>Step {currentStep} of {totalSteps}</Text>
            )}
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBar}>
            {[...Array(totalSteps)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressStep,
                  i < currentStep ? styles.progressStepCompleted : styles.progressStepPending
                ]}
              />
            ))}
          </View>

          {/* Form */}
          <View style={styles.form}>
            {renderStep()}
          </View>

          {/* Navigation */}
          <View style={styles.navigation}>
            {currentStep > 1 && (
              <TouchableOpacity style={styles.navButton} onPress={prevStep}>
                <Text style={styles.navButtonText}>← Previous</Text>
              </TouchableOpacity>
            )}

            {currentStep < totalSteps ? (
              <TouchableOpacity style={[styles.navButton, styles.navButtonPrimary]} onPress={nextStep}>
                <Text style={styles.navButtonTextPrimary}>Next →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonPrimary, isSubmitting && styles.navButtonDisabled]}
                onPress={handleRegister}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.navButtonTextPrimary}>Register</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Back to Login */}
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.backLinkText}>Already have an account? Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Success Popup */}
      {showPopup && (
        <View style={styles.popup}>
          <View style={styles.popupContent}>
            <Text style={styles.popupIcon}>✓</Text>
            <Text style={styles.popupTitle}>Registration Successful!</Text>
            <Text style={styles.popupMessage}>Welcome to SkillConnect!</Text>
          </View>
        </View>
      )}
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
    padding: 20,
    marginTop: 30,
  },
  content: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 50,
    height: 50,
    marginBottom: 10,
  },
  appName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  stepIndicator: {
    fontSize: 16,
    color: '#666',
  },
  progressBar: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  progressStep: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 2,
  },
  progressStepCompleted: {
    backgroundColor: '#ce4da3ff',
  },
  progressStepPending: {
    backgroundColor: '#e9ecef',
  },
  form: {
    marginBottom: 30,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  optional: {
    color: '#666',
    fontWeight: 'normal',
  },
  required: {
    color: '#dc3545',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#dc3545',
    backgroundColor: '#fdf2f2',
  },
  eyeButton: {
    padding: 12,
  },
  eyeText: {
    fontSize: 16,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 4,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  radioButtonSelected: {
    borderColor: '#ce4da3ff',
    backgroundColor: '#fce4ec',
  },
  radioText: {
    fontSize: 14,
    color: '#666',
  },
  radioTextSelected: {
    color: '#ce4da3ff',
    fontWeight: '600',
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  uploadButtonError: {
    borderColor: '#dc3545',
  },
  uploadText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#666',
  },
  fileName: {
    fontSize: 14,
    color: '#007bff',
    marginTop: 8,
  },
  skillHelp: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  skillScroll: {
    marginBottom: 8,
  },
  skillChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  skillChipSelected: {
    borderColor: '#ce4da3ff',
    backgroundColor: '#fce4ec',
  },
  skillChipDisabled: {
    opacity: 0.5,
  },
  skillChipText: {
    fontSize: 14,
    color: '#666',
  },
  skillChipTextSelected: {
    color: '#ce4da3ff',
    fontWeight: '600',
  },
  skillCount: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  summaryBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  navButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    minWidth: 100,
    alignItems: 'center',
  },
  navButtonPrimary: {
    backgroundColor: '#ce4da3ff',
    borderColor: '#ce4da3ff',
  },
  navButtonDisabled: {
    backgroundColor: '#ccc',
    borderColor: '#ccc',
  },
  navButtonText: {
    fontSize: 16,
    color: '#666',
  },
  navButtonTextPrimary: {
    color: '#fff',
    fontWeight: '600',
  },
  backLink: {
    alignItems: 'center',
  },
  backLinkText: {
    color: '#ce4da3ff',
    fontSize: 16,
  },
  popup: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 300,
    width: '80%',
  },
  popupIcon: {
    fontSize: 48,
    color: '#28a745',
    marginBottom: 16,
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  popupMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default Register;
