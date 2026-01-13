import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useMainContext } from '../contexts/MainContext';
import Loader from '../components/Loader';

const AvailableRequestsScreen = () => {
  const { user, api } = useMainContext();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // Track loading state for accept/decline actions

  const fetchCurrentRequests = useCallback(async () => {
    try {
      setError(null);
      const { data } = await api.get("/user/available-service-requests?useRecommendations=true", { withCredentials: true });
      if (data.success) {
        setRequests(data.requests || []);
      } else {
        throw new Error('Failed to fetch requests');
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load requests');
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api]);

  useEffect(() => {
    fetchCurrentRequests();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCurrentRequests();
  };

  const filteredAndSortedRequests = useMemo(() => {
    const filtered = requests.filter((request) => {
      if (!request) return false;

      // Ensure request is available
      const isAvailableRequest = request.status === "Waiting" || request.status === "Open";
      if (!isAvailableRequest) return false;

      // Exclude current user's own requests
      const isNotOwnRequest = request.requester?._id !== user._id && request.requesterId !== user._id;
      if (!isNotOwnRequest) return false;

      // Exclude requests assigned to someone else
      const isNotAssigned = !request.serviceProvider || request.serviceProvider._id === user._id;
      if (!isNotAssigned) return false;

      // Match against user's services
      const matchesUserServices = user.services && user.services.length > 0
        ? user.services.some(service =>
            request.typeOfWork?.toLowerCase().includes(service.name?.toLowerCase()) ||
            service.name?.toLowerCase().includes(request.typeOfWork?.toLowerCase())
          )
        : true;

      if (!matchesUserServices) return false;

      // Ensure required fields exist
      return request.typeOfWork && request.budget;
    });

    // Sort by recommendation score (highest first), then by date
    return filtered.sort((a, b) => {
      if (a.recommendationScore && b.recommendationScore) {
        return b.recommendationScore - a.recommendationScore;
      }
      if (a.recommendationScore) return -1;
      if (b.recommendationScore) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [requests, user._id, user.services]);

  const handleAcceptRequest = useCallback(async (request) => {
    Alert.alert(
      'Accept Request',
      `Are you sure you want to accept this request for ${request.typeOfWork}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              setActionLoading(request._id);
              const response = await api.post(`/user/service-request/${request._id}/accept`);
              if (response.data.success) {
                Alert.alert('Success', 'Request accepted successfully!');
                fetchCurrentRequests(); // Refresh the list
              } else {
                Alert.alert('Error', 'Failed to accept request');
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to accept request');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  }, [api, fetchCurrentRequests]);

  const handleDeclineRequest = useCallback((request) => {
    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => {
            // Remove from local state immediately for better UX
            setRequests(prev => prev.filter(req => req._id !== request._id));
            Alert.alert('Success', 'Request declined');
          }
        }
      ]
    );
  }, []);

  const getStatusClass = (status) => {
    switch (status) {
      case 'Waiting':
      case 'Open':
        return styles.statusAvailable;
      case 'Completed':
        return styles.statusCompleted;
      default:
        return styles.statusDefault;
    }
  };

  const renderRequestItem = ({ item: request }) => {
    const isLoading = actionLoading === request._id;
    const clientName = request.requester ?
      `${request.requester.firstName || ""} ${request.requester.lastName || ""}`.trim() ||
      request.requester.username ||
      "Unknown Client" :
      "N/A";

    return (
      <View style={styles.requestCard}>
        {/* Header with status and match score */}
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, getStatusClass(request.status)]}>
            <Text style={styles.statusText}>
              {request.status === "Waiting" ? "Available" : request.status === "Completed" ? "Complete" : request.status === "Open" ? "Available" : request.status}
            </Text>
          </View>
          {request.recommendationScore !== undefined && (
            <View style={styles.matchScoreContainer}>
              <Icon name="line-chart" size={14} color="#007bff" />
              <Text style={styles.matchScoreText}>
                {Math.round(request.recommendationScore * 100)}% match
              </Text>
            </View>
          )}
        </View>

        {/* Service details */}
        <View style={styles.cardContent}>
          <Text style={styles.serviceTitle}>{request.typeOfWork}</Text>
          <Text style={styles.clientInfo}>
            <Icon name="user" size={12} color="#666" /> {clientName}
          </Text>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Icon name="calendar" size={12} color="#666" />
              <Text style={styles.detailText}>
                {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : "N/A"}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Icon name="clock-o" size={12} color="#666" />
              <Text style={styles.detailText}>{request.time || "Not specified"}</Text>
            </View>
          </View>

          <View style={styles.budgetContainer}>
            <Text style={styles.budgetLabel}>Budget:</Text>
            <Text style={styles.budgetAmount}>₱{request.budget || "0"}</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.declineButton, isLoading && styles.buttonDisabled]}
            onPress={() => handleDeclineRequest(request)}
            disabled={isLoading}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.acceptButton, isLoading && styles.buttonDisabled]}
            onPress={() => handleAcceptRequest(request)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.acceptButtonText}>Accept</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="exclamation-triangle" size={64} color="#dc3545" />
        <Text style={styles.errorTitle}>Error Loading Requests</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchCurrentRequests}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Service Requests</Text>
        <Text style={styles.headerSubtitle}>
          Matching requests based on your skills and location
        </Text>
      </View>

      {/* Requests List */}
      {filteredAndSortedRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="clipboard" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Available Requests</Text>
          <Text style={styles.emptyText}>
            There are currently no service requests that match your skills and location.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedRequests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.requestsList}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  requestsList: {
    padding: 16,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardContent: {
    marginBottom: 16,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  clientInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  budgetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  budgetLabel: {
    fontSize: 14,
    color: '#666',
  },
  budgetAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusAvailable: {
    backgroundColor: '#e3f2fd',
  },
  statusCompleted: {
    backgroundColor: '#e8f5e8',
  },
  statusDefault: {
    backgroundColor: '#f5f5f5',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  matchScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchScoreText: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  noMatchScore: {
    fontSize: 12,
    color: '#999',
  },
  acceptButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  declineButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  declineButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default AvailableRequestsScreen;
