import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  TextInput,
  Modal,
  Switch,
  Image,
  Dimensions,
} from 'react-native';
import { useMainContext } from '../contexts/MainContext';
import Loader from '../components/Loader';
import CreateServiceRequest from '../components/CreateServiceRequest';

const ClientDashboardScreen = () => {
  const { user, api } = useMainContext();

  // Core state
  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Applications state for reviewing applications
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [selectedProviders, setSelectedProviders] = useState([]);
  const [favorites, setFavorites] = useState([]);

  // Advanced filters state
  const [filters, setFilters] = useState({
    search: '',
    service: '',
    minRating: 0,
    maxRate: 10000,
    location: '',
    verified: false,
    topRated: false,
    availableNow: false,
    sortBy: 'rating',
  });

  // Service requests state
  const [myRequests, setMyRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState('browse');
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  useEffect(() => {
    fetchProviders();
    loadUserPreferences();
  }, []);

  useEffect(() => {
    if (activeTab === 'applications') {
      fetchApplications();
    } else if (activeTab === 'requests') {
      fetchMyRequests();
      setTimeout(() => fetchApplications(), 100);
    }
  }, [activeTab]);

  useEffect(() => {
    applyFilters();
  }, [providers, filters]);

  const loadUserPreferences = () => {
    // Load favorites from AsyncStorage if available
    // For now, initialize as empty
    setFavorites([]);
  };

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/user/service-providers?limit=10000');
      if (response.data.success) {
        setProviders(response.data.workers);
      }
    } catch (error) {
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
      setApplications([]);
    } finally {
      setApplicationsLoading(false);
    }
  };

  const fetchMyRequests = async () => {
    try {
      setRequestsLoading(true);
      const response = await api.get('/user/user-service-requests');
      if (response.data.success) {
        setMyRequests(response.data.requests);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load service requests');
    } finally {
      setRequestsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...providers];

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(provider => {
        const searchableText = [
          provider.firstName,
          provider.lastName,
          provider.skills?.join(' '),
          provider.serviceDescription,
          provider.occupation,
        ].join(' ').toLowerCase();
        return searchableText.includes(searchTerm);
      });
    }

    // Advanced filtering
    if (filters.service) {
      filtered = filtered.filter(provider =>
        provider.skills?.some(skill =>
          skill.toLowerCase().includes(filters.service.toLowerCase())
        )
      );
    }

    if (filters.minRating > 0) {
      filtered = filtered.filter(provider => (provider.averageRating || 0) >= filters.minRating);
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

    // Sorting
    switch (filters.sortBy) {
      case 'rating':
        filtered.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
        break;
      case 'reviews':
        filtered.sort((a, b) => (b.totalReviews || 0) - (a.totalReviews || 0));
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

  const handleSendMessage = (providerId) => {
    Alert.alert('Message', 'Chat functionality will be implemented soon');
  };

  const handleSendOffer = (providerId) => {
    Alert.alert('Send Offer', 'Offer functionality will be implemented soon');
  };

  const handleViewProfile = (providerId) => {
    Alert.alert('Profile', 'Profile view will be implemented soon');
  };

  const handleAcceptApplication = async (bookingId) => {
    try {
      await api.post(`/user/respond-to-application/${bookingId}`, { action: 'accept' });
      Alert.alert('Success', 'Application accepted successfully!');
      fetchApplications();
    } catch (error) {
      Alert.alert('Error', 'Failed to accept application');
    }
  };

  const handleDeclineApplication = async (bookingId) => {
    try {
      await api.post(`/user/respond-to-application/${bookingId}`, { action: 'decline' });
      Alert.alert('Success', 'Application declined');
      fetchApplications();
    } catch (error) {
      Alert.alert('Error', 'Failed to decline application');
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

  const renderStatCard = (title, value, color = '#007bff') => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const renderProviderCard = ({ item }) => (
    <View style={styles.providerCard}>
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
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(item._id)}
        >
          <Text style={styles.favoriteText}>
            {favorites.includes(item._id) ? '❤️' : '🤍'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.providerInfo}>
        <Text style={styles.providerName}>
          {item.firstName} {item.lastName}
        </Text>
        <Text style={styles.providerRating}>
          {renderStars(item.averageRating || 0)} ({item.totalReviews || 0})
        </Text>

        <View style={styles.skillsContainer}>
          {item.skills?.slice(0, 3).map((skill, index) => (
            <Text key={index} style={styles.skillTag}>{skill}</Text>
          ))}
        </View>

        <View style={styles.providerActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => handleViewProfile(item._id)}
          >
            <Text style={styles.secondaryButtonText}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => handleSendOffer(item._id)}
          >
            <Text style={styles.primaryButtonText}>Contact</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderApplicationCard = ({ item }) => (
    <View style={styles.applicationCard}>
      <View style={styles.applicationHeader}>
        <Image
          source={{ uri: item.provider?.profilePic || 'https://via.placeholder.com/50' }}
          style={styles.applicationImage}
        />
        <View style={styles.applicationInfo}>
          <Text style={styles.applicationName}>
            {item.provider?.firstName} {item.provider?.lastName}
          </Text>
          <Text style={styles.applicationRating}>
            {renderStars(item.provider?.averageRating || 0)}
          </Text>
        </View>
        <Text style={styles.commissionFee}>
          ₱{item.commissionFee?.toLocaleString() || 'N/A'}
        </Text>
      </View>

      <View style={styles.applicationActions}>
        <TouchableOpacity
          style={[styles.appActionButton, styles.declineButton]}
          onPress={() => handleDeclineApplication(item._id)}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.appActionButton, styles.acceptButton]}
          onPress={() => handleAcceptApplication(item._id)}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const totalPages = Math.ceil(filteredProviders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProviders = filteredProviders.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return <Loader />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome back,</Text>
        <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'browse' && styles.activeTab]}
          onPress={() => setActiveTab('browse')}
        >
          <Text style={[styles.tabText, activeTab === 'browse' && styles.activeTabText]}>
            Browse
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests ({myRequests.length})
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

      {/* Create Service Request Button - Only show on browse tab */}
      {activeTab === 'browse' && (
        <View style={styles.createRequestContainer}>
          <TouchableOpacity
            style={styles.createRequestButton}
            onPress={() => setShowCreateRequest(true)}
          >
            <Text style={styles.createRequestButtonText}>+ Create Service Request</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'browse' && (
        <>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, skills, or service..."
              value={filters.search}
              onChangeText={handleSearch}
            />
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Text style={styles.filterButtonText}>Filters</Text>
            </TouchableOpacity>
          </View>

          {/* Filters Modal */}
          <Modal visible={showFilters} animationType="slide">
            <View style={styles.filtersModal}>
              <View style={styles.filtersHeader}>
                <Text style={styles.filtersTitle}>Filters</Text>
                <TouchableOpacity onPress={() => setShowFilters(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.filtersContent}>
                <View style={styles.filterGroup}>
                  <Text style={styles.filterLabel}>Service Type</Text>
                  <TextInput
                    style={styles.filterInput}
                    placeholder="e.g., Plumbing, Electrical"
                    value={filters.service}
                    onChangeText={(value) => setFilters(prev => ({ ...prev, service: value }))}
                  />
                </View>

                <View style={styles.filterGroup}>
                  <Text style={styles.filterLabel}>Minimum Rating</Text>
                  <TextInput
                    style={styles.filterInput}
                    placeholder="0-5"
                    keyboardType="numeric"
                    value={filters.minRating.toString()}
                    onChangeText={(value) => setFilters(prev => ({ ...prev, minRating: parseFloat(value) || 0 }))}
                  />
                </View>

                <View style={styles.filterRow}>
                  <Text style={styles.filterLabel}>Verified Only</Text>
                  <Switch
                    value={filters.verified}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, verified: value }))}
                  />
                </View>

                <View style={styles.filterRow}>
                  <Text style={styles.filterLabel}>Top Rated (4.5+)</Text>
                  <Switch
                    value={filters.topRated}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, topRated: value }))}
                  />
                </View>

                <TouchableOpacity
                  style={styles.clearFiltersButton}
                  onPress={() => setFilters({
                    search: '',
                    service: '',
                    minRating: 0,
                    maxRate: 10000,
                    location: '',
                    verified: false,
                    topRated: false,
                    availableNow: false,
                    sortBy: 'rating',
                  })}
                >
                  <Text style={styles.clearFiltersText}>Clear All Filters</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </Modal>

          {/* Stats */}
          <View style={styles.statsContainer}>
            {renderStatCard('Total Providers', filteredProviders.length)}
            {renderStatCard('Favorites', favorites.length, '#e91e63')}
          </View>

          {/* View Mode Toggle */}
          <View style={styles.viewModeContainer}>
            <TouchableOpacity
              style={[styles.viewModeButton, viewMode === 'grid' && styles.activeViewMode]}
              onPress={() => setViewMode('grid')}
            >
              <Text style={[styles.viewModeText, viewMode === 'grid' && styles.activeViewModeText]}>
                Grid
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewModeButton, viewMode === 'list' && styles.activeViewMode]}
              onPress={() => setViewMode('list')}
            >
              <Text style={[styles.viewModeText, viewMode === 'list' && styles.activeViewModeText]}>
                List
              </Text>
            </TouchableOpacity>
          </View>

          {/* Providers List */}
          {currentProviders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>No Providers Found</Text>
              <Text style={styles.emptyText}>Try adjusting your filters or search terms.</Text>
            </View>
          ) : (
            <FlatList
              data={currentProviders}
              renderItem={renderProviderCard}
              keyExtractor={(item) => item._id}
              numColumns={viewMode === 'grid' ? 2 : 1}
              scrollEnabled={false}
              contentContainerStyle={styles.providersList}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageButton, currentPage === 1 && styles.disabledButton]}
                onPress={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <Text style={styles.pageButtonText}>Previous</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>
                Page {currentPage} of {totalPages}
              </Text>
              <TouchableOpacity
                style={[styles.pageButton, currentPage === totalPages && styles.disabledButton]}
                onPress={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <Text style={styles.pageButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {activeTab === 'requests' && (
        <View style={styles.requestsContainer}>
          {requestsLoading ? (
            <Loader />
          ) : myRequests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>No Service Requests</Text>
              <Text style={styles.emptyText}>You haven't posted any service requests yet.</Text>
            </View>
          ) : (
            myRequests.map((request) => (
              <View key={request._id} style={styles.requestCard}>
                <Text style={styles.requestTitle}>{request.name}</Text>
                <Text style={styles.requestDetails}>
                  Type: {request.typeOfWork} • Budget: ₱{request.minBudget} - ₱{request.maxBudget}
                </Text>
                <Text style={styles.requestStatus}>
                  Status: <Text style={styles.statusText}>{request.status}</Text>
                </Text>
              </View>
            ))
          )}
        </View>
      )}

      {activeTab === 'applications' && (
        <View style={styles.applicationsContainer}>
          {applicationsLoading ? (
            <Loader />
          ) : applications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>No Applications</Text>
              <Text style={styles.emptyText}>
                When service providers apply to your requests, they will appear here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={applications}
              renderItem={renderApplicationCard}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
            />
          )}
        </View>
      )}

      {/* Create Service Request Modal */}
      {showCreateRequest && (
        <CreateServiceRequest
          onClose={() => setShowCreateRequest(false)}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#007bff',
    padding: 20,
    paddingTop: 60,
  },
  welcome: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#007bff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  createRequestContainer: {
    padding: 20,
    paddingTop: 0,
  },
  createRequestButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  createRequestButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginRight: 10,
  },
  filterButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  filtersModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  filtersTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  filtersContent: {
    padding: 20,
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clearFiltersButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  clearFiltersText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 4,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeViewMode: {
    backgroundColor: '#007bff',
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeViewModeText: {
    color: '#fff',
  },
  providersList: {
    padding: 20,
    paddingTop: 0,
  },
  providerCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  verifiedBadge: {
    position: 'absolute',
    top: -5,
    left: 35,
    backgroundColor: '#007bff',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  favoriteButton: {
    marginLeft: 'auto',
  },
  favoriteText: {
    fontSize: 20,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  providerRating: {
    fontSize: 12,
    color: '#ffc107',
    fontWeight: 'bold',
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
  providerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  primaryButton: {
    backgroundColor: '#007bff',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 0,
  },
  pageButton: {
    backgroundColor: '#007bff',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  pageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  pageInfo: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  requestsContainer: {
    padding: 20,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  requestDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  requestStatus: {
    fontSize: 14,
    color: '#666',
  },
  statusText: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  applicationsContainer: {
    padding: 20,
  },
  applicationCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  applicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  applicationImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  applicationInfo: {
    flex: 1,
  },
  applicationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  applicationRating: {
    fontSize: 12,
    color: '#ffc107',
    fontWeight: 'bold',
  },
  commissionFee: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  applicationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  appActionButton: {
    flex: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  declineButton: {
    backgroundColor: '#dc3545',
  },
  acceptButton: {
    backgroundColor: '#28a745',
  },
  declineButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default ClientDashboardScreen;
