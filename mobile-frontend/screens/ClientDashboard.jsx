import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  FlatList, Image, Alert, Modal, RefreshControl, ActivityIndicator,
  PanGestureHandler, State, Platform, StatusBar, useWindowDimensions, Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMainContext } from '../contexts/MainContext';
import MobileHeader from '../components/MobileHeader';
import ProviderProfileModal from '../components/ProviderProfileModal';
import CreateServiceRequestModal from '../components/CreateServiceRequestModal';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, Title, Paragraph, Button, FAB, Chip, Badge, Surface, TextInput as PaperTextInput, Portal, Dialog } from 'react-native-paper';

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

const ClientDashboard = () => {
  const { user, api } = useMainContext();
  const navigation = useNavigation();

  // Get device dimensions for responsive design
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isSmallDevice = screenWidth < 375;
  const isLargeDevice = screenWidth > 414;

  // Core state with offline capabilities
  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);

  // Applications state for reviewing applications
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);

  // Advanced filters state
  const [filters, setFilters] = useState({
    search: '',
    service: '',
    minRating: 0,
    maxRate: 10000,
    location: '',
    sortBy: 'rating',
    verified: false,
    topRated: false,
    availableNow: false
  });

  // UI state with touch interactions
  const [activeTab, setActiveTab] = useState('browse');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = isSmallDevice ? 8 : 12;

  // All user requests
  const [allRequests, setAllRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Modals with bottom-sheet presentation
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewProvider, setReviewProvider] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [offerProvider, setOfferProvider] = useState(null);
  const [reviewedServiceRequests, setReviewedServiceRequests] = useState([]);

  // Performance optimizations
  const [searchTimeout, setSearchTimeout] = useState(null);

  useEffect(() => {
    // Enhanced status bar styling with theme awareness
    StatusBar.setBarStyle('dark-content', true);
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#f5f5f5');
      StatusBar.setTranslucent(true);
    }

    fetchProviders();
    loadUserPreferences();
    fetchUserReviews();
  }, []);

  useEffect(() => {
    // Fetch data based on active tab
    if (activeTab === 'applications') {
      fetchApplications();
    } else if (activeTab === 'requests') {
      fetchAllUserRequests();
    }
  }, [activeTab]);

  useEffect(() => {
    // Debounced filtering for better performance
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    const timeout = setTimeout(() => {
      applyFilters();
    }, 300); // 300ms debounce

    setSearchTimeout(timeout);

    return () => clearTimeout(timeout);
  }, [providers, filters]);

  const loadUserPreferences = () => {
    // Load favorites from AsyncStorage
    // For now, we'll use a simple array
    setFavorites([]);
  };

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/user/service-providers?limit=100');
      if (response.data.success) {
        setProviders(response.data.workers);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
      Alert.alert('Error', 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      setApplicationsLoading(true);
      const response = await api.get('/user/client-applications');
      if (response.data.success) {
        setApplications(response.data.applications || []);
      } else {
        setApplications([]);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setApplications([]);
    } finally {
      setApplicationsLoading(false);
    }
  };

  const fetchAllUserRequests = async () => {
    try {
      setRequestsLoading(true);
      const response = await api.get('/user/all-user-requests');
      if (response.data.success) {
        const uniqueRequests = response.data.requests.filter((request, index, self) =>
          index === self.findIndex(r => r._id === request._id)
        );
        setAllRequests(uniqueRequests);
      }
    } catch (error) {
      console.error('Error fetching user requests:', error);
    } finally {
      setRequestsLoading(false);
    }
  };

  const fetchUserReviews = async () => {
    try {
      const response = await api.get('/review/my-reviews');
      if (response.data.success) {
        const serviceRequestIds = response.data.reviews.map(review => review.booking?.serviceRequest?.toString()).filter(Boolean);
        setReviewedServiceRequests(serviceRequestIds);
      }
    } catch (error) {
      console.error('Error fetching user reviews:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...providers];

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const searchWords = searchTerm.split(' ').filter(word => word.length > 2);

      filtered = filtered.filter(provider => {
        const servicesText = provider.services?.map(service => `${service.name} ${service.description || ''}`).join(' ') || '';
        const searchableText = [
          provider.firstName,
          provider.lastName,
          provider.skills?.join(' '),
          provider.serviceDescription,
          provider.occupation,
          servicesText
        ].join(' ').toLowerCase();

        return searchWords.some(word => searchableText.includes(word));
      });
    }

    // Advanced filtering
    if (filters.service) {
      filtered = filtered.filter(provider =>
        provider.skills?.some(skill =>
          skill.toLowerCase().includes(filters.service.toLowerCase())
        ) ||
        provider.serviceDescription?.toLowerCase().includes(filters.service.toLowerCase())
      );
    }

    if (filters.minRating > 0) {
      filtered = filtered.filter(provider => (provider.averageRating || 0) >= filters.minRating);
    }

    if (filters.maxRate < 10000) {
      filtered = filtered.filter(provider => (provider.serviceRate || 0) <= filters.maxRate);
    }

    if (filters.location) {
      filtered = filtered.filter(provider =>
        provider.address?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    if (filters.verified) {
      filtered = filtered.filter(provider => provider.verified);
    }

    if (filters.topRated) {
      filtered = filtered.filter(provider => (provider.averageRating || 0) >= 4.5);
    }

    if (filters.availableNow) {
      filtered = filtered.filter(provider => provider.isOnline);
    }

    // Smart sorting
    switch (filters.sortBy) {
      case 'rating':
        filtered.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
        break;
      case 'rate-low':
        filtered.sort((a, b) => (a.serviceRate || 0) - (b.serviceRate || 0));
        break;
      case 'rate-high':
        filtered.sort((a, b) => (b.serviceRate || 0) - (a.serviceRate || 0));
        break;
      case 'reviews':
        filtered.sort((a, b) => (b.totalReviews || 0) - (a.totalReviews || 0));
        break;
      case 'experience':
        filtered.sort((a, b) => (b.yearsExperience || 0) - (a.yearsExperience || 0));
        break;
      case 'recent':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      default:
        break;
    }

    setFilteredProviders(filtered);
    setCurrentPage(1);
  };

  const handleSearch = (searchTerm) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
  };

  const toggleFavorite = (providerId) => {
    const updated = favorites.includes(providerId)
      ? favorites.filter(id => id !== providerId)
      : [...favorites, providerId];
    setFavorites(updated);
  };

  const handleSendMessage = async (providerId) => {
    // Navigate to chat screen (would need chat navigation)
    Alert.alert('Chat', 'Navigate to chat screen with provider');
  };

  const handleSendOffer = (providerId) => {
    const provider = providers.find(p => p._id === providerId);
    if (provider) {
      setOfferProvider(provider);
      setShowCreateRequestModal(true);
    }
  };

  const handleViewProfile = (providerId) => {
    setSelectedProvider(providerId);
    setShowProfileModal(true);
  };

  const handleCreateRequestSuccess = (request) => {
    // Refresh data after creating request
    fetchAllUserRequests();
    Alert.alert('Success', 'Service request created successfully!');
  };

  const handleOpenChat = (providerId) => {
    // This would navigate to chat screen
    Alert.alert('Chat', `Open chat with provider ${providerId}`);
  };

  const handleAcceptApplication = async (bookingId) => {
    try {
      await api.post(`/user/respond-to-application/${bookingId}`, { action: 'accept' });
      Alert.alert('Success', 'Application accepted successfully!');
      fetchApplications();
    } catch (error) {
      console.error('Error accepting application:', error);
      Alert.alert('Error', 'Failed to accept application');
    }
  };

  const handleDeclineApplication = async (bookingId) => {
    try {
      await api.post(`/user/respond-to-application/${bookingId}`, { action: 'decline' });
      Alert.alert('Success', 'Application declined');
      fetchApplications();
    } catch (error) {
      console.error('Error declining application:', error);
      Alert.alert('Error', 'Failed to decline application');
    }
  };

  const handleLeaveReview = (bookingId, provider) => {
    setReviewBooking(bookingId);
    setReviewProvider(provider);
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (bookingId, rating, comments) => {
    try {
      const response = await api.post('/review', {
        bookingId: bookingId._id || bookingId,
        rating,
        comments: comments.trim()
      });

      if (response.data.success) {
        Alert.alert('Success', 'Review submitted successfully!');
        if (bookingId?.serviceRequest?._id) {
          setReviewedServiceRequests(prev => [...prev, bookingId.serviceRequest._id]);
        }
        fetchAllUserRequests();
        fetchApplications();
        setShowReviewModal(false);
      } else {
        throw new Error(response.data.message || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit review');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProviders().then(() => setRefreshing(false));
  };

  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProviders = filteredProviders.slice(startIndex, startIndex + itemsPerPage);

  const renderProviderCard = ({ item: provider }) => (
    <Card style={styles.providerCard} mode="elevated">
      <Card.Content>
        <View style={styles.providerHeader}>
          <TouchableOpacity style={styles.favoriteButton} onPress={() => toggleFavorite(provider._id)}>
            <Icon name={favorites.includes(provider._id) ? "favorite" : "favorite-border"} size={24} color="#FF6B6B" />
          </TouchableOpacity>
        </View>

        <View style={styles.providerContent}>
          <View style={styles.providerInfo}>
            <Image
              source={{ uri: `http://10.0.2.2:5000${provider.profilePic}` }}
              style={styles.providerImage}
            />
            <View style={styles.providerDetails}>
              <Title style={styles.providerName}>
                {provider.firstName} {provider.lastName}
                {provider.verified && <Icon name="verified" size={16} color="#4CAF50" />}
              </Title>
              <View style={styles.ratingContainer}>
                {renderStars(provider.averageRating || 0)}
                <Text style={styles.ratingText}>({provider.totalReviews || 0})</Text>
              </View>
            </View>
          </View>

          <Paragraph style={styles.providerLocation}>
            <Icon name="location-on" size={14} color="#666" /> {provider.address || "Location not specified"}
          </Paragraph>

          <View style={styles.skillsContainer}>
            {provider.skills?.slice(0, 3).map((skill, index) => (
              <Chip key={index} mode="outlined">{skill}</Chip>
            ))}
            {provider.skills?.length > 3 && (
              <Chip mode="outlined">+{provider.skills.length - 3} more</Chip>
            )}
          </View>

          <Card.Actions>
            <Button mode="outlined" icon="person" onPress={() => handleViewProfile(provider._id)}>
              Profile
            </Button>
            <Button mode="outlined" icon="message" onPress={() => handleSendMessage(provider._id)}>
              Message
            </Button>
            <Button mode="contained" icon="work" onPress={() => handleSendOffer(provider._id)}>
              Hire
            </Button>
          </Card.Actions>
        </View>
      </Card.Content>
    </Card>
  );

  const renderApplicationCard = ({ item: application }) => {
    const provider = application?.provider;
    if (!provider) return null;

    return (
      <View style={styles.applicationCard}>
        <View style={styles.applicationHeader}>
          <Image
            source={{ uri: `http://10.0.2.2:5000${provider.profilePic}` }}
            style={styles.applicationImage}
          />
          <View style={styles.applicationInfo}>
            <Text style={styles.applicationName}>
              {provider.firstName} {provider.lastName}
              {provider.verified && <Icon name="verified" size={16} color="#4CAF50" />}
            </Text>
            <Text style={styles.applicationFee}>₱{application.commissionFee?.toLocaleString() || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.applicationActions}>
          <TouchableOpacity style={styles.declineButton} onPress={() => handleDeclineApplication(application._id)}>
            <Icon name="close" size={16} color="#FFF" />
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptButton} onPress={() => handleAcceptApplication(application._id)}>
            <Icon name="check" size={16} color="#FFF" />
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderRequestCard = ({ item: request }) => {
    if (request.type === 'booking' && request.status === 'Completed' && !reviewedServiceRequests.includes(request.data?.serviceRequest?._id || request.data?.serviceRequest)) {
      return (
        <View style={styles.requestCard}>
          <View style={styles.requestHeader}>
            <Icon name="check-circle" size={24} color="#4CAF50" />
            <Text style={styles.requestTitle}>{request.title}</Text>
          </View>
          <Text style={styles.requestProvider}>
            {request.otherParty?.firstName} {request.otherParty?.lastName}
          </Text>
          <TouchableOpacity
            style={styles.reviewButton}
            onPress={() => handleLeaveReview(request._id, request.otherParty)}
          >
            <Icon name="star" size={16} color="#FFF" />
            <Text style={styles.reviewButtonText}>Leave Review</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <Icon name="work" size={24} color="#e91e63" />
          <Text style={styles.requestTitle}>{request.title}</Text>
        </View>
        <Text style={styles.requestStatus}>{request.status}</Text>
        <Text style={styles.requestDate}>
          {new Date(request.createdAt).toLocaleDateString()}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e91e63" />
        <Text style={styles.loadingText}>Finding the best providers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MobileHeader title="Client Dashboard" />

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'browse' && styles.activeTab]}
          onPress={() => setActiveTab('browse')}
        >
          <Text style={[styles.tabText, activeTab === 'browse' && styles.activeTabText]}>Browse</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests ({allRequests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'applications' && styles.activeTab]}
          onPress={() => setActiveTab('applications')}
        >
          <Text style={[styles.tabText, activeTab === 'applications' && styles.activeTabText]}>
            Applications ({applications.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'browse' && (
        <View style={styles.tabContent}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, skills, or service type..."
              value={filters.search}
              onChangeText={handleSearch}
            />
            <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(!showFilters)}>
              <Icon name="filter-list" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Filters */}
          {showFilters && (
            <View style={styles.filtersContainer}>
              <Text style={styles.filtersTitle}>Advanced Filters</Text>

              <View style={styles.filterRow}>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Service Type"
                  value={filters.service}
                  onChangeText={(text) => setFilters(prev => ({ ...prev, service: text }))}
                />
                <TextInput
                  style={styles.filterInput}
                  placeholder="Location"
                  value={filters.location}
                  onChangeText={(text) => setFilters(prev => ({ ...prev, location: text }))}
                />
              </View>

              <View style={styles.filterRow}>
                <Picker
                  selectedValue={filters.minRating}
                  style={styles.picker}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, minRating: parseFloat(value) }))}>
                  <Picker.Item label="Any Rating" value={0} />
                  <Picker.Item label="3+ Stars" value={3} />
                  <Picker.Item label="4+ Stars" value={4} />
                  <Picker.Item label="4.5+ Stars" value={4.5} />
                </Picker>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Max Rate (₱)"
                  value={filters.maxRate < 10000 ? filters.maxRate.toString() : ''}
                  onChangeText={(text) => setFilters(prev => ({ ...prev, maxRate: parseFloat(text) || 10000 }))}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.checkboxRow}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setFilters(prev => ({ ...prev, verified: !prev.verified }))}>
                  <Icon name={filters.verified ? "check-box" : "check-box-outline-blank"} size={20} color="#e91e63" />
                  <Text style={styles.checkboxText}>Verified Only</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setFilters(prev => ({ ...prev, topRated: !prev.topRated }))}>
                  <Icon name={filters.topRated ? "check-box" : "check-box-outline-blank"} size={20} color="#e91e63" />
                  <Text style={styles.checkboxText}>Top Rated</Text>
                </TouchableOpacity>
              </View>

              <Picker
                selectedValue={filters.sortBy}
                style={styles.pickerFull}
                onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}>
                <Picker.Item label="Highest Rated" value="rating" />
                <Picker.Item label="Rate: Low to High" value="rate-low" />
                <Picker.Item label="Rate: High to Low" value="rate-high" />
                <Picker.Item label="Most Reviews" value="reviews" />
                <Picker.Item label="Most Experience" value="experience" />
                <Picker.Item label="Recently Joined" value="recent" />
              </Picker>
            </View>
          )}

          {/* Results */}
          <Text style={styles.resultsText}>{filteredProviders.length} providers found</Text>

          <FlatList
            data={currentProviders}
            renderItem={renderProviderCard}
            keyExtractor={(item) => item._id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.providersList}
          />

          {/* Pagination */}
          {filteredProviders.length > itemsPerPage && (
            <View style={styles.paginationContainer}>
              <TouchableOpacity
                style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                onPress={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
              <Icon name="chevron-left" size={20} color={currentPage === 1 ? "#CCC" : "#e91e63"} />
                <Text style={[styles.paginationText, currentPage === 1 && styles.paginationTextDisabled]}>Previous</Text>
              </TouchableOpacity>

              <Text style={styles.paginationInfo}>
                Page {currentPage} of {Math.ceil(filteredProviders.length / itemsPerPage)}
              </Text>

              <TouchableOpacity
                style={[styles.paginationButton, currentPage === Math.ceil(filteredProviders.length / itemsPerPage) && styles.paginationButtonDisabled]}
                onPress={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredProviders.length / itemsPerPage)))}
                disabled={currentPage === Math.ceil(filteredProviders.length / itemsPerPage)}
              >
                <Text style={[styles.paginationText, currentPage === Math.ceil(filteredProviders.length / itemsPerPage) && styles.paginationTextDisabled]}>Next</Text>
                <Icon name="chevron-right" size={20} color={currentPage === Math.ceil(filteredProviders.length / itemsPerPage) ? "#CCC" : "#e91e63"} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {activeTab === 'applications' && (
        <View style={styles.tabContent}>
          {applicationsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>Loading applications...</Text>
            </View>
          ) : applications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="work" size={48} color="#CCC" />
              <Text style={styles.emptyTitle}>No Applications Yet</Text>
              <Text style={styles.emptyText}>
                When service providers apply to your requests, they will appear here for review.
              </Text>
            </View>
          ) : (
            <FlatList
              data={applications.filter(app => app.status === 'Applied')}
              renderItem={renderApplicationCard}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.applicationsList}
            />
          )}
        </View>
      )}

      {activeTab === 'requests' && (
        <View style={styles.tabContent}>
          {requestsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>Loading requests...</Text>
            </View>
          ) : allRequests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="list" size={48} color="#CCC" />
              <Text style={styles.emptyTitle}>No Service Requests</Text>
              <Text style={styles.emptyText}>
                You haven't posted any service requests yet.
              </Text>
            </View>
          ) : (
            <FlatList
              data={allRequests}
              renderItem={renderRequestCard}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.requestsList}
            />
          )}
        </View>
      )}

      {/* Review Modal */}
      <Modal visible={showReviewModal} animationType="slide" transparent>
        <ReviewModal
          booking={reviewBooking}
          provider={reviewProvider}
          onClose={() => setShowReviewModal(false)}
          onSubmit={handleSubmitReview}
        />
      </Modal>

      {/* Provider Profile Modal */}
      <ProviderProfileModal
        visible={showProfileModal}
        providerId={selectedProvider}
        onClose={() => {
          setShowProfileModal(false);
          setSelectedProvider(null);
        }}
        onOpenChat={handleOpenChat}
      />

      {/* Create Service Request Modal */}
      <CreateServiceRequestModal
        visible={showCreateRequestModal}
        provider={offerProvider}
        onClose={() => {
          setShowCreateRequestModal(false);
          setOfferProvider(null);
        }}
        onSuccess={handleCreateRequestSuccess}
      />
    </View>
  );
};

// Review Modal Component
const ReviewModal = ({ booking, provider, onClose, onSubmit }) => {
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!comments.trim()) {
      Alert.alert('Error', 'Please provide review comments');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(booking, rating, comments.trim());
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Leave a Review</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {provider && (
          <View style={styles.providerInfo}>
            <Image
              source={{ uri: `http://10.0.2.2:5000${provider.profilePic}` }}
              style={styles.modalProviderImage}
            />
            <View>
              <Text style={styles.modalProviderName}>
                {provider.firstName} {provider.lastName}
              </Text>
              <View style={styles.ratingContainer}>
                {renderStars(provider.averageRating || 0)}
                <Text style={styles.ratingText}>({provider.totalReviews || 0} reviews)</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>Rating</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Icon
                  name={star <= rating ? "star" : "star-outline"}
                  size={32}
                  color={star <= rating ? "#FFD700" : "#DDD"}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingValue}>{rating} star{rating !== 1 ? 's' : ''}</Text>
        </View>

        <View style={styles.commentsSection}>
          <Text style={styles.commentsLabel}>Comments</Text>
          <TextInput
            style={styles.commentsInput}
            placeholder="Share your experience with this service provider..."
            value={comments}
            onChangeText={setComments}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.charCount}>{comments.length}/500 characters</Text>
        </View>

        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={submitting}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, (!comments.trim() || submitting) && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={!comments.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Icon name="star" size={16} color="#FFF" />
                <Text style={styles.submitButtonText}>Submit Review</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Request Details Modal Component
const RequestDetailsModal = ({ request, onClose }) => {
  if (!request) return null;

  const renderRequestDetails = () => {
    switch (request.type) {
      case 'service-request':
        return (
          <View style={styles.detailsContainer}>
            <View style={styles.detailHeader}>
              <Icon name="work" size={24} color="#2196F3" />
              <Text style={styles.detailTitle}>{request.title}</Text>
            </View>
            <Text style={styles.detailSubtitle}>Service Request Details</Text>

            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                Status: {request.status === 'Waiting' ? '⏳ Waiting' :
                        request.status === 'Offered' ? '💼 Offered' :
                        request.status === 'Working' ? '🔄 Working' :
                        request.status === 'Complete' ? '✅ Complete' : request.status}
              </Text>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Service Type:</Text>
                <Text style={styles.detailValue}>{request.data?.typeOfWork || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Location:</Text>
                <Text style={styles.detailValue}>{request.location || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Budget:</Text>
                <Text style={styles.detailValue}>
                  ₱{request.minBudget?.toLocaleString()} - ₱{request.maxBudget?.toLocaleString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Preferred Date:</Text>
                <Text style={styles.detailValue}>
                  {request.data?.preferredDate ? new Date(request.data.preferredDate).toLocaleDateString() : 'Flexible'}
                </Text>
              </View>
            </View>

            {request.data?.notes && (
              <View style={styles.notesSection}>
                <Text style={styles.notesLabel}>Additional Notes:</Text>
                <Text style={styles.notesText}>{request.data.notes}</Text>
              </View>
            )}

            <Text style={styles.dateText}>
              Posted on {new Date(request.createdAt).toLocaleDateString()}
            </Text>
          </View>
        );

      case 'offer':
        return (
          <View style={styles.detailsContainer}>
            <View style={styles.detailHeader}>
              <Icon name="local-offer" size={24} color="#FF9800" />
              <Text style={styles.detailTitle}>{request.title}</Text>
            </View>
            <Text style={styles.detailSubtitle}>Service Offer Details</Text>

            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                Status: {request.status === 'Open' ? '📬 Open' :
                        request.status === 'Accepted' ? '✅ Accepted' :
                        request.status === 'Declined' ? '❌ Declined' : request.status}
              </Text>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Budget:</Text>
                <Text style={styles.detailValue}>
                  ₱{request.minBudget?.toLocaleString()} - ₱{request.maxBudget?.toLocaleString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Location:</Text>
                <Text style={styles.detailValue}>{request.location || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Preferred Date:</Text>
                <Text style={styles.detailValue}>
                  {request.preferredDate ? new Date(request.preferredDate).toLocaleDateString() : 'Flexible'}
                </Text>
              </View>
            </View>

            {request.data?.description && (
              <View style={styles.notesSection}>
                <Text style={styles.notesLabel}>Description:</Text>
                <Text style={styles.notesText}>{request.data.description}</Text>
              </View>
            )}

            <Text style={styles.dateText}>
              Sent on {new Date(request.createdAt).toLocaleDateString()}
            </Text>
          </View>
        );

      case 'booking':
        return (
          <View style={styles.detailsContainer}>
            <View style={styles.detailHeader}>
              <Icon name="assignment" size={24} color="#4CAF50" />
              <Text style={styles.detailTitle}>{request.title}</Text>
            </View>
            <Text style={styles.detailSubtitle}>Booking Details</Text>

            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                Status: {request.status === 'In Progress' ? '🔄 In Progress' :
                        request.status === 'Completed' ? '✅ Completed' : request.status}
              </Text>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date Created:</Text>
                <Text style={styles.detailValue}>
                  {new Date(request.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Booking ID:</Text>
                <Text style={styles.detailValue}>{request._id}</Text>
              </View>
              {request.status === 'Completed' && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Completion Date:</Text>
                    <Text style={styles.detailValue}>
                      {request.completedAt ? new Date(request.completedAt).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Total Amount:</Text>
                    <Text style={styles.detailValue}>
                      ₱{request.finalAmount?.toLocaleString() || request.data?.finalAmount?.toLocaleString() || 'N/A'}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {request.description && (
              <View style={styles.notesSection}>
                <Text style={styles.notesLabel}>Description:</Text>
                <Text style={styles.notesText}>{request.description}</Text>
              </View>
            )}

            {request.status === 'Completed' && request.data?.proofOfWork && request.data.proofOfWork.length > 0 && (
              <View style={styles.proofSection}>
                <Text style={styles.proofTitle}>Proof of Work Submitted</Text>
                <View style={styles.proofGrid}>
                  {request.data.proofOfWork.slice(0, 4).map((proofUrl, index) => (
                    <View key={index} style={styles.proofItem}>
                      {proofUrl.toLowerCase().endsWith('.pdf') ? (
                        <View style={styles.pdfIcon}>
                          <Icon name="picture-as-pdf" size={24} color="#F44336" />
                        </View>
                      ) : (
                        <Image source={{ uri: proofUrl }} style={styles.proofImage} />
                      )}
                      <Text style={styles.proofLabel}>
                        {proofUrl.toLowerCase().endsWith('.pdf') ? 'Document' : 'Image'} {index + 1}
                      </Text>
                    </View>
                  ))}
                </View>
                {request.data?.completionNotes && (
                  <View style={styles.completionNotes}>
                    <Text style={styles.notesLabel}>Completion Notes:</Text>
                    <Text style={styles.notesText}>{request.data.completionNotes}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        );

      default:
        return (
          <View style={styles.detailsContainer}>
            <Text style={styles.emptyText}>Request details not available</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.detailsModalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Request Details</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContent}>
          {renderRequestDetails()}
        </ScrollView>

        <View style={styles.detailsActions}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Main container with responsive padding
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 10,
  },

  // Enhanced loading states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },

  // Responsive tab navigation with larger touch targets
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    // Add safe area for Android
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 14, // Increased for better touch targets (44px minimum)
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 4,
    minHeight: 44, // Ensure minimum touch target
  },
  activeTab: {
    backgroundColor: '#e91e63',
    shadowColor: '#e91e63',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  tabContent: { flex: 1 },

  // Responsive search with better touch targets
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 16, // More rounded for modern look
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    minHeight: 50, // Better touch target
  },
  searchIcon: {
    marginRight: 12,
    color: '#666',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14, // Increased padding
    fontSize: 16,
    color: '#333',
    minHeight: 44,
  },
  filterButton: {
    padding: 12, // Larger touch target
    borderRadius: 8,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Responsive filters container
  filtersContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20, // Increased padding for better spacing
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8, // Use gap for better spacing
  },
  filterInput: {
    flex: 1,
    borderWidth: 1.5, // Slightly thicker border
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16, // Larger font for better readability
    marginHorizontal: 0,
    backgroundColor: '#fafafa',
    minHeight: 48,
    color: '#333',
  },
  picker: { flex: 1, marginHorizontal: 0 },
  pickerFull: { width: '100%', marginBottom: 16 },
  checkboxRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 16 },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44, // Ensure touch target
    paddingVertical: 8,
  },
  checkboxText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
    flex: 1,
  },

  resultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 20,
    marginBottom: 12,
    textAlign: 'center',
  },

  // Optimized provider cards with better responsive design
  providersList: {
    padding: 16,
    paddingBottom: 32, // Extra bottom padding for better scrolling
  },
  providerCard: {
    backgroundColor: '#fff',
    borderRadius: 16, // More rounded corners
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    // Add subtle border
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  providerHeader: {
    alignItems: 'flex-end',
    padding: 16,
    paddingBottom: 8,
  },
  favoriteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    minHeight: 40,
    minWidth: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerContent: {
    padding: 20,
    paddingTop: 8,
  },
  providerInfo: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  providerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  providerDetails: { flex: 1 },
  providerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
    lineHeight: 24,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  providerLocation: {
    fontSize: 15,
    color: '#666',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 6,
  },
  skillTag: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 13,
    fontWeight: '500',
    marginRight: 0,
    marginBottom: 0,
  },
  moreSkills: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    alignSelf: 'center',
  },
  providerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginHorizontal: 0,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    minHeight: 48, // Ensure good touch target
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  primaryAction: {
    backgroundColor: '#e91e63',
    shadowColor: '#e91e63',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    fontWeight: '600',
  },
  primaryActionText: { color: '#fff' },

  // Enhanced application cards
  applicationsList: { padding: 16 },
  applicationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  applicationHeader: { flexDirection: 'row', marginBottom: 16, alignItems: 'center' },
  applicationImage: { width: 50, height: 50, borderRadius: 25, marginRight: 16, borderWidth: 2, borderColor: '#e0e0e0' },
  applicationInfo: { flex: 1 },
  applicationName: { fontSize: 17, fontWeight: '700', color: '#333', marginBottom: 6 },
  applicationFee: { fontSize: 20, fontWeight: '800', color: '#4CAF50' },
  applicationActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 16 },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f44336',
    paddingVertical: 16,
    borderRadius: 12,
    minHeight: 52,
    shadowColor: '#f44336',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    minHeight: 52,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  declineButtonText: { color: '#fff', fontWeight: '700', marginLeft: 8, fontSize: 16 },
  acceptButtonText: { color: '#fff', fontWeight: '700', marginLeft: 8, fontSize: 16 },

  // Enhanced request cards
  requestsList: { padding: 16 },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  requestHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  requestTitle: { fontSize: 17, fontWeight: '700', color: '#333', marginLeft: 12, flex: 1 },
  requestProvider: { fontSize: 15, color: '#666', marginBottom: 8 },
  requestStatus: { fontSize: 15, color: '#666', marginBottom: 6 },
  requestDate: { fontSize: 13, color: '#999', fontWeight: '500' },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
    minHeight: 48,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  reviewButtonText: { color: '#fff', fontWeight: '700', marginLeft: 8, fontSize: 16 },

  // Enhanced pagination with better touch targets
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    minHeight: 44,
    minWidth: 100,
    justifyContent: 'center',
  },
  paginationButtonDisabled: {
    backgroundColor: '#f0f0f0',
    opacity: 0.6,
  },
  paginationText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e91e63',
    marginLeft: 6,
  },
  paginationTextDisabled: {
    color: '#CCC',
  },
  paginationInfo: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },

  // Enhanced empty states
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 17,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },

  // Enhanced bottom-sheet modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: Dimensions.get('window').height * 0.85,
    minHeight: Dimensions.get('window').height * 0.4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  modalProviderImage: { width: 56, height: 56, borderRadius: 28, marginRight: 16, borderWidth: 2, borderColor: '#e0e0e0' },
  modalProviderName: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 4 },
  ratingSection: { marginBottom: 24 },
  ratingLabel: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 16 },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 12 },
  ratingValue: { textAlign: 'center', fontSize: 16, color: '#666', fontWeight: '500' },
  commentsSection: { marginBottom: 24 },
  commentsLabel: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 12 },
  commentsInput: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#fafafa',
    color: '#333',
  },
  charCount: { textAlign: 'right', fontSize: 14, color: '#666', marginTop: 8 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    borderRadius: 12,
    minHeight: 52,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  cancelButtonText: { fontSize: 17, fontWeight: '600', color: '#666' },
  submitButtonText: { fontSize: 17, fontWeight: '600', color: '#fff', marginLeft: 8 },
});

export default ClientDashboard;
