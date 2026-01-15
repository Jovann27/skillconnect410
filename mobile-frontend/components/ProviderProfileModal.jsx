import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
  Image, ActivityIndicator, Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useMainContext } from '../contexts/MainContext';

// Helper function to render stars
const renderStars = (rating) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<Icon key={i} name="star" size={16} color="#FFD700" />);
    } else if (i === fullStars && hasHalfStar) {
      stars.push(<Icon key={i} name="star-half" size={16} color="#FFD700" />);
    } else {
      stars.push(<Icon key={i} name="star-outline" size={16} color="#DDD" />);
    }
  }
  return stars;
};

const ProviderProfileModal = ({ visible, providerId, onClose, onOpenChat, hideRequestService }) => {
  const { api } = useMainContext();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('about');

  useEffect(() => {
    if (visible && providerId) {
      fetchProviderDetails();
    }
  }, [visible, providerId]);

  const fetchProviderDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/user/service-provider/${providerId}`);
      if (response.data.success) {
        setProvider(response.data.worker);
      }
    } catch (error) {
      console.error('Error fetching provider details:', error);
      Alert.alert('Error', 'Failed to load provider details');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (onOpenChat) {
      onOpenChat(providerId);
      onClose();
    }
  };

  const handleSendOffer = () => {
    // This will be handled by the parent component
    Alert.alert('Send Offer', 'Navigate to create service request');
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Provider Profile</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>Loading provider details...</Text>
            </View>
          ) : provider ? (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Profile Header */}
              <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                  <Image
                    source={{ uri: `http://10.0.2.2:5000${provider.profilePic}` }}
                    style={styles.avatar}
                  />
                  {provider.verified && (
                    <View style={styles.verifiedBadge}>
                      <Icon name="verified" size={14} color="#FFF" />
                    </View>
                  )}
                  {provider.isOnline && (
                    <View style={styles.onlineBadge}>
                      <View style={styles.onlineDot} />
                    </View>
                  )}
                </View>

                <View style={styles.profileInfo}>
                  <Text style={styles.providerName}>
                    {provider.firstName} {provider.lastName}
                  </Text>
                  <View style={styles.ratingContainer}>
                    {renderStars(provider.averageRating || 0)}
                    <Text style={styles.ratingText}>
                      ({provider.totalReviews || 0} reviews)
                    </Text>
                  </View>
                  <Text style={styles.occupation}>{provider.occupation || 'Service Provider'}</Text>
                </View>
              </View>

              {/* Action Buttons */}
              {!hideRequestService && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.messageButton} onPress={handleSendMessage}>
                    <Icon name="message" size={16} color="#2196F3" />
                    <Text style={styles.messageButtonText}>Message</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.hireButton} onPress={handleSendOffer}>
                    <Icon name="work" size={16} color="#FFF" />
                    <Text style={styles.hireButtonText}>Send Offer</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Tab Navigation */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'about' && styles.activeTab]}
                  onPress={() => setActiveTab('about')}
                >
                  <Text style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}>About</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'services' && styles.activeTab]}
                  onPress={() => setActiveTab('services')}
                >
                  <Text style={[styles.tabText, activeTab === 'services' && styles.activeTabText]}>Services</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}
                  onPress={() => setActiveTab('reviews')}
                >
                  <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>Reviews</Text>
                </TouchableOpacity>
              </View>

              {/* Tab Content */}
              {activeTab === 'about' && (
                <View style={styles.tabContent}>
                  <Text style={styles.sectionTitle}>About</Text>

                  <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                      <Icon name="location-on" size={18} color="#666" />
                      <Text style={styles.infoText}>{provider.address || 'Location not specified'}</Text>
                    </View>

                    {provider.yearsExperience && (
                      <View style={styles.infoRow}>
                        <Icon name="work" size={18} color="#666" />
                        <Text style={styles.infoText}>{provider.yearsExperience} years experience</Text>
                      </View>
                    )}

                    {provider.serviceDescription && (
                      <View style={styles.descriptionSection}>
                        <Text style={styles.descriptionTitle}>Service Description</Text>
                        <Text style={styles.descriptionText}>{provider.serviceDescription}</Text>
                      </View>
                    )}

                    <View style={styles.skillsSection}>
                      <Text style={styles.skillsTitle}>Skills</Text>
                      <View style={styles.skillsContainer}>
                        {provider.skills?.map((skill, index) => (
                          <View key={index} style={styles.skillTag}>
                            <Text style={styles.skillText}>{skill}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {activeTab === 'services' && (
                <View style={styles.tabContent}>
                  <Text style={styles.sectionTitle}>Services Offered</Text>

                  {provider.services && provider.services.length > 0 ? (
                    <View style={styles.servicesList}>
                      {provider.services.map((service, index) => (
                        <View key={index} style={styles.serviceCard}>
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
                  ) : (
                    <Text style={styles.noDataText}>No services listed</Text>
                  )}
                </View>
              )}

              {activeTab === 'reviews' && (
                <View style={styles.tabContent}>
                  <Text style={styles.sectionTitle}>Reviews</Text>
                  <Text style={styles.noDataText}>Reviews functionality to be implemented</Text>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={styles.errorContainer}>
              <Icon name="error" size={48} color="#CCC" />
              <Text style={styles.errorText}>Failed to load provider details</Text>
            </View>
          )}
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#e0e0e0',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  onlineBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  profileInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  occupation: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
    marginLeft: 8,
  },
  hireButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  hireButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#2196F3',
  },
  tabContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoSection: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  descriptionSection: {
    marginTop: 16,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  skillsSection: {
    marginTop: 16,
  },
  skillsTitle: {
    fontSize: 16,
    fontWeight: '600',
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
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  skillText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '600',
  },
  servicesList: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  serviceRate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  noDataText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    padding: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});

export default ProviderProfileModal;
