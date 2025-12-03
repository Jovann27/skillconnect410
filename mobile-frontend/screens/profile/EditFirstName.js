import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../api';

// Placeholder screen for editing the user's first name
export default function EditFirstName({ navigation, route }) {
  const { currentValue } = route.params || {};
  const [firstName, setFirstName] = useState(currentValue || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentValue) {
      setFirstName(currentValue);
    }
  }, [currentValue]);

  const handleSave = async () => {
    if (firstName.trim() === '') {
      Alert.alert('Error', 'First name cannot be empty.');
      return;
    }

    setIsSaving(true);

    try {
      const response = await apiClient.put('/update-profile', { firstName: firstName.trim() });

      if (response.data.success) {
        Alert.alert('Success', 'Your first name has been updated!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to update first name');
      }
    } catch (error) {
      console.error('Error updating first name:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update first name. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
  <KeyboardAvoidingView 
    style={styles.overlayContainer} 
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <TouchableOpacity 
      style={styles.overlayBackground} 
      activeOpacity={1}
      onPress={() => navigation.goBack()} // tap outside to close
    />

    <View style={styles.popup}>
      <Text style={styles.label}>Enter your new first name</Text>
      <TextInput
        style={styles.input}
        onChangeText={setFirstName}
        value={firstName}
        placeholder="First Name"
        autoFocus={true}
        returnKeyType="done"
        onSubmitEditing={handleSave}
      />


      <TouchableOpacity 
        style={[styles.saveButton, (isSaving || firstName.trim() === '') && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={isSaving || firstName.trim() === ''}
      >
        <Text style={styles.saveButtonText}>
          {isSaving ? 'Saving...' : 'Save'}
        </Text>
      </TouchableOpacity>
    </View>
  </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  content: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  input: {
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#a1a5a8ff',
    borderRadius: 5,
    paddingVertical: 13,
    paddingHorizontal: 10,
    marginBottom: 10,
    color: '#333',
  },
  hint: {
    marginTop: 15,
    fontSize: 12,
    color: '#aaa',
  },
  saveButton: {
    backgroundColor: '#ce4da3ff',
    padding: 15,
    marginTop: 15,
    marginHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#a8c6e2',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  overlayContainer: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)', // gray transparent overlay
  justifyContent: 'center',
  alignItems: 'center',
},
overlayBackground: {
  ...StyleSheet.absoluteFillObject,
},

popup: {
  width: '85%',
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 20,
  elevation: 8,
  shadowColor: '#000',
  shadowOpacity: 0.25,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
},
});
