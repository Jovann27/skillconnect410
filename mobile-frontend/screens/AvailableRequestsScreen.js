import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  ScrollView,
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

  const fetchCurrentRequests = async () => {
    try {
      console.log('AvailableRequests - Fetching available requests with hybrid recommendations...');

      // Use hybrid recommendation endpoint for workers
      try {
        const { data } = await api.get("/user/available-service-requests?useRecommendations=true", { withCredentials: true });
        if (data.success && data.requests) {
          console.log('AvailableRequests - Got requests with recommendations:', data.requests.length);
          console.log('Algorithm used:', data.algorithm);
          setRequests(data.requests);
          setLoading(false);
          return;
        }
      } catch (recommendationError) {
        console.log('AvailableRequests - Recommendation endpoint not available, trying standard endpoint');
      }

      // Fallback: Try the matching requests endpoint
      try {
        const { data } = await api.get("/user/matching-requests", { withCredentials: true });
        if (data.success && data.requests && data.requests.length > 0) {
          console.log('AvailableRequests - Got requests from matching-requests:', data.requests.length);
          setRequests(data.requests);
          setLoading(false);
          return;
        }
      } catch (matchingError) {
        console.log('AvailableRequests - matching-requests endpoint not available, trying alternatives');
      }

      // Fallback: Try to get service requests (this will get filtered requests for the provider)
      try {
        const { data } = await api.get("/user/service-requests", { withCredentials: true });
        if (data.success && data.requests) {
          console.log('AvailableRequests - Got requests from service-requests endpoint:', data.requests.length);
          setRequests(data.requests);
          setLoading(false);
          return;
        }
      } catch (requestsError) {
        console.log('AvailableRequests - service-requests endpoint not available either');
      }

      // If all endpoints fail, set empty array
      console.log('AvailableRequests - No available requests found from any endpoint');
      setRequests([]);
    } catch (err) {
      console.error("Error fetching available requests:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCurrentRequests();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCurrentRequests();
  };

  const filteredRequests = requests.filter((request) => {
    if (!request) {
      console.warn("Invalid request structure:", request);
      return false;
    }

    // Ensure request is truly available (not accepted, working, or completed)
    const isAvailableRequest = request.status === "Waiting" || request.status === "Open";
    if (!isAvailableRequest) {
      console.log("Excluding non-available request:", request._id, "Status:", request.status);
      return false;
    }

    // Exclude current user's own requests
    const isNotOwnRequest = request.requester?._id !== user._id && request.requesterId !== user._id;
    if (!isNotOwnRequest) {
      console.log("Excluding own request:", request._id, "Requester:", request.requester?._id, "Current user:", user._id);
      return false;
    }

    // Exclude requests that are already assigned to someone else
    const isNotAssigned = !request.serviceProvider || request.serviceProvider._id === user._id;
    if (!isNotAssigned) {
      console.log("Excluding already assigned request:", request._id, "Provider:", request.serviceProvider?._id);
      return false;
    }

    // Match against user's services
    const matchesUserServices = user.services && user.services.length > 0
      ? user.services.some(service =>
          request.typeOfWork?.toLowerCase().includes(service.name?.toLowerCase()) ||
          service.name?.toLowerCase().includes(request.typeOfWork?.toLowerCase())
        )
      : true; // If no user services, show all requests (this shouldn't happen for providers)

    if (!matchesUserServices) {
      console.log("Excluding request not matching user's services:", request._id, "Request service:", request.typeOfWork, "User services:", user.services?.map(s => s.name));
      return false;
    }

    // Ensure request has required fields for display
    if (!request.typeOfWork || !request.budget) {
      console.log("Excluding incomplete request:", request._id, "Missing required fields");
      return false;
    }

    return true;
  });

  const handleAcceptRequest = async (request) => {
    Alert.alert(
      'Accept Request',
      `Are you sure you want to accept this request for ${request.typeOfWork}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              const response = await api.post(`/user/service-request/${request._id}/accept`);
              if (response.data.success) {
                Alert.alert('Success', 'Request accepted successfully!');
                fetchCurrentRequests(); // Refresh the list
              } else {
                Alert.alert('Error', 'Failed to accept request');
              }
            } catch (error) {
              console.error('Error accepting request:', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to accept request');
            }
          }
        }
      ]
    );
  };

  const handleDeclineRequest = (request) => {
    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => {
            setRequests(prev => prev.filter(req => req._id !== request._id));
            Alert.alert('Success', 'Request declined');
          }
        }
      ]
    );
  };

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

  const renderRequestItem = ({ item: request }) => (
    <View style={styles.requestRow}>
      <View style={styles.statusCell}>
        <View style={[styles.statusBadge, getStatusClass(request.status)]}>
          <Text style={styles.statusText}>
            {request.status === "Waiting" ? "Available" : request.status === "Completed" ? "Complete" : request.status === "Open" ? "Available" : request.status}
          </Text>
        </View>
      </View>

      <View style={styles.matchScoreCell}>
        {request.recommendationScore !== undefined ? (
          <View style={styles.matchScoreContainer}>
            <Icon name="line-chart" size={14} color="#007bff" />
            <Text style={styles.matchScoreText}>
              {Math.round(request.recommendationScore * 100)}%
            </Text>
          </View>
        ) : (
          <Text style={styles.noMatchScore}>-</Text>
        )}
      </View>

      <View style={styles.dateCell}>
        <Text style={styles.dateText}>
          {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : "-"}
        </Text>
      </View>

      <View style={styles.clientCell}>
        <Text style={styles.clientText}>
          {request.requester ?
            `${request.requester.firstName || ""} ${request.requester.lastName || ""}`.trim() ||
            request.requester.username ||
            "Unknown Client" :
            "N/A"
          }
        </Text>
      </View>

      <View style={styles.serviceCell}>
        <Text style={styles.serviceText}>{request.typeOfWork}</Text>
      </View>

      <View style={styles.budgetCell}>
        <Text style={styles.budgetText}>₱{request.budget || "0"}</Text>
      </View>

      <View style={styles.timeCell}>
        <Text style={styles.timeText}>{request.time || "Not specified"}</Text>
      </View>

      <View style={styles.actionsCell}>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAcceptRequest(request)}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.declineButton}
            onPress={() => handleDeclineRequest(request)}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

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

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.headerCell, styles.statusHeader]}>Status</Text>
            <Text style={[styles.headerCell, styles.matchScoreHeader]}>Match Score</Text>
            <Text style={[styles.headerCell, styles.dateHeader]}>Request Date</Text>
            <Text style={[styles.headerCell, styles.clientHeader]}>Client</Text>
            <Text style={[styles.headerCell, styles.serviceHeader]}>Service Needed</Text>
            <Text style={[styles.headerCell, styles.budgetHeader]}>Budget</Text>
            <Text style={[styles.headerCell, styles.timeHeader]}>Preferred Time</Text>
            <Text style={[styles.headerCell, styles.actionsHeader]}>Actions</Text>
          </View>
        </ScrollView>
      </View>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="clipboard" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Available Requests</Text>
          <Text style={styles.emptyText}>
            There are currently no service requests that match your skills and location.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRequests.sort((a, b) => {
            // Sort by recommendation score if available (highest first)
            if (a.recommendationScore && b.recommendationScore) {
              return b.recommendationScore - a.recommendationScore;
            }
            if (a.recommendationScore) return -1;
            if (b.recommendationScore) return 1;
            return 0;
          })}
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
  tableHeader: {
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginHorizontal: 4,
  },
  statusHeader: {
    width: 80,
  },
  matchScoreHeader: {
    width: 80,
  },
  dateHeader: {
    width: 100,
  },
  clientHeader: {
    width: 120,
  },
  serviceHeader: {
    width: 140,
  },
  budgetHeader: {
    width: 80,
  },
  timeHeader: {
    width: 100,
  },
  actionsHeader: {
    width: 140,
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
  requestRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  statusCell: {
    width: 80,
    alignItems: 'center',
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
  matchScoreCell: {
    width: 80,
    alignItems: 'center',
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
  dateCell: {
    width: 100,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
  },
  clientCell: {
    width: 120,
    alignItems: 'center',
  },
  clientText: {
    fontSize: 12,
    color: '#333',
    fontWeight: 'bold',
  },
  serviceCell: {
    width: 140,
    alignItems: 'center',
  },
  serviceText: {
    fontSize: 12,
    color: '#333',
  },
  budgetCell: {
    width: 80,
    alignItems: 'center',
  },
  budgetText: {
    fontSize: 12,
    color: '#333',
    fontWeight: 'bold',
  },
  timeCell: {
    width: 100,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  actionsCell: {
    width: 140,
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  acceptButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  declineButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  declineButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default AvailableRequestsScreen;