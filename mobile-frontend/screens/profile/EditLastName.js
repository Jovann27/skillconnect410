import React, { useState, useEffect } from 'react';
import {View,Text,TextInput,TouchableOpacity,StyleSheet,KeyboardAvoidingView,Platform,Alert} from 'react-native';

import apiClient from '../../api';

export default function EditLastName({ navigation, route }) {
  const { currentValue } = route.params || {};
  const [lastName, setLastName] = useState(currentValue || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentValue) {
      setLastName(currentValue);
    }
  }, [currentValue]);

  const handleSave = async () => {
    if (lastName.trim() === '') {
      Alert.alert('Error', 'Last name cannot be empty.');
      return;
    }

    setIsSaving(true);

    try {
      const response = await apiClient.put('/update-profile', { lastName: lastName.trim() });

      if (response.data.success) {
        Alert.alert('Success', 'Your last name has been updated!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to update last name');
      }
    } catch (error) {
      console.error('Error updating last name:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update last name. Please try again.';
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
      {/* Gray background that closes on tap */}
      <TouchableOpacity
        style={styles.overlayBackground}
        activeOpacity={1}
        onPress={() => navigation.goBack()}
      />

      {/* Popup content */}
      <View style={styles.popup}>
        <Text style={styles.label}>Enter your new last name</Text>
        <TextInput
          style={styles.input}
          onChangeText={setLastName}
          value={lastName}
          placeholder="Last Name"
          autoFocus={true}
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />

        <TouchableOpacity
          style={[
            styles.saveButton,
            (isSaving || lastName.trim() === '') && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={isSaving || lastName.trim() === ''}
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
});
