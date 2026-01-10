import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMainContext } from '../contexts/MainContext';
import Loader from './Loader';

const CreateServiceRequest = ({ visible, onClose, onSuccess }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const { api } = useMainContext();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    budgetRange: { min: '', max: '' },
    preferredDate: null,
    preferredTime: '',
    serviceCategory: ''
  });
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);

  const serviceCategories = [
    'Plumbing',
    'Electrical',
    'Cleaning',
    'Carpentry',
    'Painting',
    'Appliance Repair',
    'Home Renovation',
    'Pest Control',
    'Gardening & Landscaping',
    'Air Conditioning & Ventilation',
    'Laundry / Labandera'
  ];

  React.useEffect(() => {
    if (route.params?.request && route.params?.isEditing) {
      setIsEditing(true);
      setEditingRequest(route.params.request);
      setFormData({
        title: route.params.request.title || '',
        description: route.params.request.description || '',
        location: route.params.request.location || '',
        budgetRange: {
          min: route.params.request.budgetRange?.min?.toString() || '',
          max: route.params.request.budgetRange?.max?.toString() || ''
        },
        preferredDate: route.params.request.preferredDate ? new Date(route.params.request.preferredDate) : null,
        preferredTime: route.params.request.preferredTime || '',
        serviceCategory: route.params.request.serviceCategory || ''
      });
    } else {
      // Reset form for new request
      setIsEditing(false);
      setEditingRequest(null);
      setFormData({
        title: '',
        description: '',
        location: '',
        budgetRange: { min: '', max: '' },
        preferredDate: null,
        preferredTime: '',
        serviceCategory: ''
      });
    }
  }, [route.params]);

  const handleInputChange = (field, value) => {
    if (field === 'budgetMin') {
      setFormData(prev => ({
        ...prev,
        budgetRange: { ...prev.budgetRange, min: value }
      }));
    } else if (field === 'budgetMax') {
      setFormData(prev => ({
        ...prev,
        budgetRange: { ...prev.budgetRange, max: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, preferredDate: selectedDate }));
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const timeString = selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setFormData(prev => ({ ...prev, preferredTime: timeString }));
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a request title');
      return false;
    }
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return false;
    }
    if (!formData.location.trim()) {
      Alert.alert('Error', 'Please enter a location');
      return false;
    }
    if (!formData.serviceCategory) {
      Alert.alert('Error', 'Please select a service category');
      return false;
    }
    if (formData.budgetRange.min && formData.budgetRange.max &&
        parseFloat(formData.budgetRange.min) > parseFloat(formData.budgetRange.max)) {
      Alert.alert('Error', 'Minimum budget cannot be greater than maximum budget');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        budgetRange: {
          min: parseFloat(formData.budgetRange.min) || 0,
          max: parseFloat(formData.budgetRange.max) || 0
        },
        preferredDate: formData.preferredDate ? formData.preferredDate.toISOString().split('T')[0] : null
      };

      let response;
      if (isEditing && editingRequest) {
        response = await api.put(`/user/service-request/${editingRequest._id}`, submitData);
      } else {
        response = await api.post('/user/create-service-request', submitData);
      }

      if (response.data.success) {
        Alert.alert(
          'Success',
          isEditing ? 'Service request updated successfully!' : 'Service request created successfully!',
          [{
            text: 'OK',
            onPress: () => {
              if (onSuccess) onSuccess();
              handleClose();
            }
          }]
        );
      }
    } catch (error) {
      console.error('Error saving service request:', error);
      Alert.alert('Error', 'Failed to save service request');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigation.goBack();
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Modal visible={visible !== false} animationType="slide">
        <Loader />
      </Modal>
    );
  }

  const renderContent = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {isEditing ? 'Edit Service Request' : 'Create Service Request'}
        </Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Icon name="times" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Form */}
      <View style={styles.form}>
        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Icon name="clipboard" size={16} color="#666" /> Request Title *
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Fix leaking kitchen sink"
            value={formData.title}
            onChangeText={(value) => handleInputChange('title', value)}
            maxLength={100}
          />
        </View>

        {/* Service Category */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Icon name="wrench" size={16} color="#666" /> Service Category *
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.serviceCategory}
              onValueChange={(value) => handleInputChange('serviceCategory', value)}
              style={styles.picker}
            >
              <Picker.Item label="Select a category" value="" />
              {serviceCategories.map(category => (
                <Picker.Item key={category} label={category} value={category} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Icon name="file-text" size={16} color="#666" /> Description *
          </Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Please describe the service you need in detail..."
            value={formData.description}
            onChangeText={(value) => handleInputChange('description', value)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
        </View>

        {/* Location */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Icon name="map-marker" size={16} color="#666" /> Location *
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your address or area"
            value={formData.location}
            onChangeText={(value) => handleInputChange('location', value)}
            maxLength={200}
          />
        </View>

        {/* Budget Range */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Icon name="dollar" size={16} color="#666" /> Budget Range (₱)
          </Text>
          <View style={styles.budgetContainer}>
            <TextInput
              style={[styles.textInput, styles.budgetInput]}
              placeholder="Min"
              value={formData.budgetRange.min}
              onChangeText={(value) => handleInputChange('budgetMin', value)}
              keyboardType="numeric"
              maxLength={10}
            />
            <Text style={styles.budgetSeparator}>-</Text>
            <TextInput
              style={[styles.textInput, styles.budgetInput]}
              placeholder="Max"
              value={formData.budgetRange.max}
              onChangeText={(value) => handleInputChange('budgetMax', value)}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>
        </View>

        {/* Preferred Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Icon name="calendar" size={16} color="#666" /> Preferred Date
          </Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {formatDate(formData.preferredDate)}
            </Text>
            <Icon name="calendar-o" size={16} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Preferred Time */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Icon name="clock-o" size={16} color="#666" /> Preferred Time
          </Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {formData.preferredTime || 'Select time'}
            </Text>
            <Icon name="clock-o" size={16} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={handleClose}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.submitButton]}
          onPress={handleSubmit}
        >
          <Icon name={isEditing ? "save" : "plus"} size={16} color="#fff" />
          <Text style={styles.submitButtonText}>
            {isEditing ? 'Update Request' : 'Create Request'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.preferredDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Time Picker Modal */}
      {showTimePicker && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
    </ScrollView>
  );

  // If used as a modal
  if (visible !== undefined) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={handleClose}
      >
        {renderContent()}
      </Modal>
    );
  }

  // If used as a screen
  return renderContent();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#007bff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 50,
  },
  budgetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetInput: {
    flex: 1,
  },
  budgetSeparator: {
    marginHorizontal: 10,
    fontSize: 18,
    color: '#666',
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  submitButton: {
    backgroundColor: '#007bff',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default CreateServiceRequest;