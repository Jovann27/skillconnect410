import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useMainContext } from '../contexts/MainContext';
import Loader from './Loader';

const ProviderProfileModal = ({ providerId, onClose, onOpenChat }) => {
  const { api } = useMainContext();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (providerId) {
      fetchProviderDetails();
    }
  }, [providerId]);

  const fetchProviderDetails = async () => {
    try {
      setLoading(true);

      // Get provider basic info
      const providerResponse = await api.get('/user/service-providers');
      if (providerResponse.data.success) {
        const foundProvider = providerResponse.data.workers.find(p => p._id === providerId);
        if (foundProvider) {
          setProvider(foundProvider);
        }
      }

      // Get provider reviews (mock data for now)
      // In a real implementation, you'd have a dedicated endpoint for provider reviews

    } catch (error) {
      console.error("Error fetching provider details:", error);
      Alert.alert('Error', 'Failed to load provider details');
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <Modal visible={true} animationType="slide">
        <View style={styles.loadingContainer}>
          <Loader />
        </View>
      </Modal>
    );
  }

  if (!provider) {
    return (
      <Modal visible={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Provider Profile</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="times" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Provider not found</Text>
            <TouchableOpacity style={styles.closeErrorButton} onPress={onClose}>
              <Text style={styles.closeErrorButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Provider Profile</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="times" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Provider Header Info */}
          <View style={styles.headerCard}>
            <View style={styles.headerContent}>
              <View style={styles.profileImageContainer}>
                <View style={styles.profileImage}>
                  <Icon name="user" size={40} color="#666" />
                </View>
                {provider.verified && (
                  <View style={styles.verifiedBadge}>
                    <Icon name="check" size={12} color="#fff" />
                  </View>
                )}
                {provider.isOnline && (
                  <View style={styles.onlineBadge}>
                    <View style={styles.onlineDot} />
                  </View>
                )}
              </View>

              <View style={styles.headerInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.providerName}>
                    {provider.firstName} {provider.lastName}
                  </Text>
                  {provider.verified && (
                    <View style={styles.verifiedTag}>
                      <Icon name="check" size={10} color="#fff" />
                      <Text style={styles.verifiedTagText}>Verified</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.occupation}>{provider.occupation || "Service Provider"}</Text>

                <View style={styles.ratingRow}>
                  <Text style={styles.ratingStars}>
                    {renderStars(provider.averageRating || 0)}
                  </Text>
                  <Text style={styles.ratingText}>
                    {provider.averageRating?.toFixed(1) || "N/A"} ({provider.totalReviews || 0} reviews)
                  </Text>
                </View>

                <Text style={styles.rateText}>
                  ₱{provider.serviceRate?.toLocaleString() || "Rate not set"}
                </Text>

                <View style={styles.locationRow}>
                  {provider.address && (
                    <View style={styles.locationItem}>
                      <Icon name="map-marker" size={12} color="#666" />
                      <Text style={styles.locationText}>{provider.address}</Text>
                    </View>
                  )}
                  <View style={styles.locationItem}>
                    <Icon name={provider.isOnline ? "circle" : "circle-o"} size={12} color={provider.isOnline ? "#28a745" : "#666"} />
                    <Text style={[styles.locationText, provider.isOnline && styles.onlineText]}>
                      {provider.isOnline ? "Available now" : "Offline"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Icon name="briefcase" size={20} color="#007bff" />
              <Text style={styles.statNumber}>{provider.totalJobsCompleted || 0}</Text>
              <Text style={styles.statLabel}>Jobs Completed</Text>
            </View>

            <View style={styles.statCard}>
              <Icon name="trophy" size={20} color="#28a745" />
              <Text style={styles.statNumber}>{provider.averageRating?.toFixed(1) || "N/A"}</Text>
              <Text style={styles.statLabel}>Average Rating</Text>
            </View>
          </View>

          {/* Skills & Services */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Skills & Services</Text>

            {/* Skills */}
            {provider.skills && provider.skills.length > 0 && (
              <View style={styles.skillsSection}>
                <Text style={styles.subsectionTitle}>Skills:</Text>
                <View style={styles.skillsContainer}>
                  {provider.skills.map((skill, index) => (
                    <View key={index} style={styles.skillTag}>
                      <Text style={styles.skillTagText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Services */}
            {provider.services && provider.services.length > 0 && (
              <View style={styles.servicesSection}>
                <Text style={styles.subsectionTitle}>Services Offered:</Text>
                {provider.services.map((service, index) => (
                  <View key={index} style={styles.serviceItem}>
                    <View style={styles.serviceHeader}>
                      <Text style={styles.serviceName}>{service.name}</Text>
                      <Text style={styles.serviceRate}>₱{service.rate?.toLocaleString() || 'N/A'}</Text>
                    </View>
                    {service.description && (
                      <Text style={styles.serviceDescription}>{service.description}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {(!provider.skills || provider.skills.length === 0) &&
             (!provider.services || provider.services.length === 0) && (
              <Text style={styles.noDataText}>No skills or services information available.</Text>
            )}
          </View>

          {/* Service Description */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>About This Provider</Text>
            <Text style={styles.descriptionText}>
              {provider.serviceDescription || "No description provided."}
            </Text>
          </View>

          {/* Reviews Section */}
          {reviews.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Recent Reviews</Text>
              {reviews.slice(0, 3).map((review, index) => (
                <View key={index} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewStars}>
                      {renderStars(review.rating || 0)}
                    </Text>
                    <Text style={styles.reviewerName}>{review.reviewer}</Text>
                    <Text style={styles.reviewDate}>
                      {new Date(review.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={onClose}
            >
              <Text style={styles.secondaryButtonText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => {
                if (onOpenChat) {
                  onOpenChat(provider._id);
                } else {
                  Alert.alert('Chat', `Opening chat with ${provider.firstName}`);
                }
              }}
            >
              <Icon name="envelope" size={16} color="#fff" />
              <Text style={styles.primaryButtonText}>Message Provider</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.successButton]}
              onPress={() => {
                // Navigate to create service request or show modal
                Alert.alert('Request Service', `Create service request for ${provider.firstName}`);
              }}
            >
              <Icon name="handshake-o" size={16} color="#fff" />
              <Text style={styles.successButtonText}>Request Service</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  closeErrorButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007bff',
    borderRadius: 8,
  },
  closeErrorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007bff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  onlineBadge: {
    position: 'absolute',
    top: -5,
    left: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#28a745',
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  providerName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedTagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  occupation: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingStars: {
    color: '#ffc107',
    fontSize: 16,
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
  rateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  onlineText: {
    color: '#28a745',
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  skillsSection: {
    marginBottom: 20,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillTag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  skillTagText: {
    color: '#1976d2',
    fontSize: 12,
    fontWeight: 'bold',
  },
  servicesSection: {
    // marginTop already covered
  },
  serviceItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  serviceRate: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: 'bold',
  },
  serviceDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  noDataText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  reviewItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewStars: {
    color: '#ffc107',
    fontSize: 14,
    marginRight: 8,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  reviewDate: {
    fontSize: 12,
    color: '#666',
  },
  reviewComment: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  primaryButton: {
    backgroundColor: '#6c757d',
  },
  successButton: {
    backgroundColor: '#007bff',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  successButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ProviderProfileModal;