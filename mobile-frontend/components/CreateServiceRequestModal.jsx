import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useMainContext } from '../contexts/MainContext';

const CreateServiceRequestModal = ({ visible, provider, onClose, onSuccess }) => {
  const { api, user } = useMainContext();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    typeOfWork: '',
    address: user?.address || '',
    preferredDate: '',
    time: '',
    minBudget: '',
    maxBudget: '',
    notes: '',
    description: '',
  });

  const workTypes = [
    'Plumbing',
    'Electrical',
    'Carpentry',
    'Painting',
    'Cleaning',
    'Gardening',
    'Appliance Repair',
    'General Maintenance',
    'Other'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const { typeOfWork, address, minBudget, maxBudget } = formData;

    if (!typeOfWork.trim()) {
      Alert.alert('Error', 'Please select a type of work');
      return false;
    }

    if (!address.trim()) {
      Alert.alert('Error', 'Please enter an address');
      return false;
    }

    if (!minBudget || !maxBudget) {
      Alert.alert('Error', 'Please enter budget range');
      return false;
    }

    const min = parseFloat(minBudget);
    const max = parseFloat(maxBudget);

    if (isNaN(min) || isNaN(max) || min <= 0 || max <= 0 || min > max) {
      Alert.alert('Error', 'Please enter valid budget range');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const requestData = {
        name: `${formData.typeOfWork} Service Request`,
        typeOfWork: formData.typeOfWork,
        address: formData.address,
        preferredDate: formData.preferredDate || null,
        time: formData.time || 'Flexible',
        minBudget: parseFloat(formData.minBudget),
        maxBudget: parseFloat(formData.maxBudget),
        notes: formData.notes.trim(),
        description: formData.description.trim() || formData.notes.trim(),
      };

      console.log('Creating service request:', requestData);

      const response = await api.post('/user/service-request', requestData);

      if (response.data.success) {
        const requestId = response.data.serviceRequest._id;

        // If provider is specified, send offer to that provider
        if (provider) {
          await sendOfferToProvider(requestId, provider._id);
        } else {
          Alert.alert('Success', 'Service request created successfully!');
        }

        if (onSuccess) {
          onSuccess(response.data.serviceRequest);
        }

        // Reset form
        setFormData({
          typeOfWork: '',
          address: user?.address || '',
          preferredDate: '',
          time: '',
          minBudget: '',
          maxBudget: '',
          notes: '',
          description: '',
        });

        onClose();
      } else {
        throw new Error(response.data.message || 'Failed to create service request');
      }
    } catch (error) {
      console.error('Error creating service request:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create service request');
    } finally {
      setLoading(false);
    }
  };

  const sendOfferToProvider = async (requestId, providerId) => {
    try {
      const offerData = {
        providerId,
        serviceRequestId: requestId,
        title: `${formData.typeOfWork} Service Offer`,
        description: formData.description.trim() || formData.notes.trim(),
        minBudget: parseFloat(formData.minBudget),
        maxBudget: parseFloat(formData.maxBudget),
        preferredDate: formData.preferredDate || null,
        location: formData.address,
      };

      const response = await api.post('/user/send-offer', offerData);

      if (response.data.success) {
        Alert.alert('Success', 'Service request created and offer sent to provider!');
      } else {
        Alert.alert('Success', 'Service request created! Offer will be sent to provider.');
      }
    } catch (error) {
      console.error('Error sending offer:', error);
      Alert.alert('Success', 'Service request created! Offer sending will be retried.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {provider ? 'Send Offer to Provider' : 'Create Service Request'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Provider Info (if sending offer) */}
          {provider && (
            <View style={styles.providerInfo}>
              <Text style={styles.providerLabel}>Sending offer to:</Text>
              <View style={styles.providerCard}>
                <Text style={styles.providerName}>
                  {provider.firstName} {provider.lastName}
                </Text>
                <Text style={styles.providerOccupation}>
                  {provider.occupation || 'Service Provider'}
                </Text>
              </View>
            </View>
          )}

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Form Fields */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Type of Work *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.typeOfWork}
                  onValueChange={(value) => handleInputChange('typeOfWork', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select work type" value="" />
                  {workTypes.map((type) => (
                    <Picker.Item key={type} label={type} value={type} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Address *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.address}
                onChangeText={(value) => handleInputChange('address', value)}
                placeholder="Enter service address"
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Preferred Date</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.preferredDate}
                  onChangeText={(value) => handleInputChange('preferredDate', value)}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Time</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.time}
                  onChangeText={(value) => handleInputChange('time', value)}
                  placeholder="e.g., 9:00 AM"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Min Budget (₱) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.minBudget}
                  onChangeText={(value) => handleInputChange('minBudget', value)}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Max Budget (₱) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.maxBudget}
                  onChangeText={(value) => handleInputChange('maxBudget', value)}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.description}
                onChangeText={(value) => handleInputChange('description', value)}
                placeholder="Describe the work needed in detail..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Additional Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.notes}
                onChangeText={(value) => handleInputChange('notes', value)}
                placeholder="Any special instructions or requirements..."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name={provider ? "send" : "add"} size={16} color="#fff" />
                  <Text style={styles.submitButtonText}>
                    {provider ? 'Send Offer' : 'Create Request'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  providerInfo: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f0f8ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  providerLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  providerCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  providerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  providerOccupation: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});

export default CreateServiceRequestModal;
