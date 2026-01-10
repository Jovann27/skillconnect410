import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Image,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { useMainContext } from '../contexts/MainContext';
import Loader from './Loader';

const OfferToProviderModal = ({ serviceRequestId, onClose, onSuccess }) => {
  const { user, api } = useMainContext();
  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offering, setOffering] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [serviceRequest, setServiceRequest] = useState(null);
  const [offerSent, setOfferSent] = useState(false);

  useEffect(() => {
    if (serviceRequestId) {
      fetchServiceRequest();
      fetchProviders();
    }
  }, [serviceRequestId]);

  useEffect(() => {
    // Filter providers based on search term
    if (searchTerm) {
      const filtered = providers.filter(provider =>
        provider.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.skills?.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase())) ||
        provider.serviceDescription?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProviders(filtered);
    } else {
      setFilteredProviders(providers);
    }
  }, [providers, searchTerm]);

  const fetchServiceRequest = async () => {
    try {
      const response = await api.get(`/user/service-request/${serviceRequestId}`);
      if (response.data.success) {
        setServiceRequest(response.data.request);
      }
    } catch (error) {
      console.error('Error fetching service request:', error);
      Alert.alert('Error', 'Failed to load service request details');
    }
  };

  const fetchProviders = async () => {
    try {
      setLoading(true);
      // Get recommended providers for this service request
      const response = await api.get(`/user/recommended-providers?serviceRequestId=${serviceRequestId}`);
      if (response.data.success) {
        setProviders(response.data.providers || []);
      } else {
        // Fallback: get general service providers
        const fallbackResponse = await api.get('/user/service-providers');
        if (fallbackResponse.data.success) {
          setProviders(fallbackResponse.data.workers || []);
        }
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
      Alert.alert('Error', 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  const handleOfferToProvider = async () => {
    if (!selectedProvider) {
      Alert.alert('Error', 'Please select a provider to offer the request to');
      return;
    }

    if (!serviceRequest) {
      Alert.alert('Error', 'Service request details not available');
      return;
    }

    setOffering(true);
    try {
      const response = await api.post('/user/offer-to-provider', {
        providerId: selectedProvider._id,
        requestId: serviceRequestId
      });

      if (response.data.success) {
        setOfferSent(true);
        Alert.alert('Success', `Offer sent to ${selectedProvider.firstName} ${selectedProvider.lastName}!`);

        // Auto close after 3 seconds
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 3000);
      } else {
        Alert.alert('Error', 'Failed to send offer');
      }
    } catch (error) {
      console.error('Error sending offer:', error);
      Alert.alert('Error', 'Failed to send offer. Please try again.');
    } finally {
      setOffering(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push('★');
      } else if (i === fullStars && hasHalfStar) {
        stars.push('☆');
      } else {
        stars.push('☆');
      }
    }
    return stars.join('');
  };

  const renderProviderItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.providerCard,
        selectedProvider?._id === item._id && styles.selectedProvider
      ]}
      onPress={() => setSelectedProvider(item)}
    >
      <View style={styles.providerHeader}>
        <Image
          source={{ uri: item.profilePic || 'https://via.placeholder.com/50' }}
          style={styles.providerImage}
        />
        {item.verified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓</Text>
          </View>
        )}
        <View style={styles.providerInfo}>
          <Text style={styles.providerName}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={styles.providerOccupation}>
            {item.occupation || 'Service Provider'}
          </Text>
          <Text style={styles.providerRating}>
            {renderStars(item.averageRating || 0)} ({item.totalReviews || 0})
          </Text>
        </View>
        {item.recommendationScore !== undefined && (
          <View style={styles.matchScore}>
            <Text style={styles.matchScoreText}>
              {Math.round(item.recommendationScore * 100)}% Match
            </Text>
          </View>
        )}
      </View>

      <View style={styles.providerDetails}>
        <Text style={styles.skillsTitle}>Skills:</Text>
        <View style={styles.skillsContainer}>
          {item.skills?.slice(0, 3).map((skill, index) => (
            <Text key={index} style={styles.skillTag}>{skill}</Text>
          ))}
        </View>

        <View style={styles.providerStats}>
          <Text style={styles.statText}>
            📍 {item.address || 'Location not specified'}
          </Text>
          <Text style={styles.statText}>
            💰 ₱{item.serviceRate?.toLocaleString() || 'Rate not set'}
          </Text>
        </View>
      </View>

      <View style={styles.selectionIndicator}>
        <View style={[
          styles.radioButton,
          selectedProvider?._id === item._id && styles.radioButtonSelected
        ]}>
          {selectedProvider?._id === item._id && (
            <View style={styles.radioButtonInner} />
          )}
        </View>
        <Text style={styles.selectionText}>Select Provider</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal visible={true} animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Offer Service Request to Provider</Text>
          {serviceRequest && (
            <Text style={styles.subtitle}>
              Offering: {serviceRequest.title}
            </Text>
          )}
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {offerSent ? (
          <View style={styles.successContainer}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>Offer Sent Successfully!</Text>
            <Text style={styles.successMessage}>
              Your service request has been sent to {selectedProvider?.firstName} {selectedProvider?.lastName}
            </Text>
            <Text style={styles.successNote}>
              The provider will be notified and can choose to accept or decline your offer.
              You'll receive a notification once they respond.
            </Text>
            <Text style={styles.autoCloseText}>
              This window will close automatically...
            </Text>
          </View>
        ) : (
          <>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search providers by name, skills, or services..."
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>

            {loading ? (
              <Loader />
            ) : filteredProviders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchTerm ? 'No providers found matching your search.' : 'No providers available at this time.'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredProviders}
                renderItem={renderProviderItem}
                keyExtractor={(item) => item._id}
                style={styles.providersList}
              />
            )}

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton]}
                onPress={handleOfferToProvider}
                disabled={!selectedProvider || offering}
              >
                <Text style={styles.confirmButtonText}>
                  {offering ? 'Sending Offer...' : 'Send Offer'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#007bff',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successIcon: {
    fontSize: 80,
    color: '#28a745',
    marginBottom: 20,
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
    marginBottom: 12,
  },
  successNote: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  autoCloseText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  searchContainer: {
    padding: 20,
    paddingTop: 10,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  providersList: {
    flex: 1,
    padding: 20,
  },
  providerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedProvider: {
    borderColor: '#007bff',
    backgroundColor: '#f8f9ff',
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  verifiedBadge: {
    position: 'absolute',
    top: -5,
    left: 45,
    backgroundColor: '#007bff',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  providerOccupation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  providerRating: {
    fontSize: 14,
    color: '#ffc107',
    fontWeight: 'bold',
  },
  matchScore: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchScoreText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  providerDetails: {
    marginBottom: 12,
  },
  skillsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  skillTag: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  providerStats: {
    marginTop: 8,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  selectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  radioButtonSelected: {
    borderColor: '#007bff',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007bff',
  },
  selectionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  confirmButton: {
    backgroundColor: '#007bff',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OfferToProviderModal;