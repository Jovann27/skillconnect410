import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import { useMainContext } from '../contexts/MainContext';
import Loader from '../components/Loader';

const MyRequestsScreen = () => {
  const navigation = useNavigation();
  const { user, api } = useMainContext();
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterServiceType, setFilterServiceType] = useState('All');
  const [filterBudgetRange, setFilterBudgetRange] = useState({ min: '', max: '' });

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    try {
      const response = await api.get('/user/user-service-requests', { withCredentials: true });
      setMyRequests(response.data.requests || []);
    } catch (err) {
      console.error('Error fetching my requests:', err);
      Alert.alert('Error', 'Failed to load service requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyRequests();
  };

  const filteredRequests = myRequests.filter(request => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = [
        request.title,
        request.description,
        request.location,
        request.serviceCategory,
        request.preferredSchedule
      ].some(field => field && field.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filterStatus !== 'All' && request.status !== filterStatus) return false;

    // Service type filter
    if (filterServiceType !== 'All' && request.serviceCategory !== filterServiceType) return false;

    // Budget range filter
    if (filterBudgetRange.min && request.budgetRange?.min < parseFloat(filterBudgetRange.min)) return false;
    if (filterBudgetRange.max && request.budgetRange?.max > parseFloat(filterBudgetRange.max)) return false;

    return true;
  });

  const handleRequestClick = (request) => {
    // Navigate to request details or show modal
    navigation.navigate('AcceptedOrderPage', { request, isOpen: true });
  };

  const handleChatRequest = (request) => {
    // Navigate to chat with provider
    if (request.serviceProvider) {
      // Implementation for opening chat
      Alert.alert('Chat', `Opening chat with ${request.serviceProvider.firstName}`);
    } else {
      Alert.alert('Error', 'No service provider assigned for this request');
    }
  };

  const handleEditRequest = (request) => {
    // Navigate to edit request screen
    navigation.navigate('CreateServiceRequest', { request, isEditing: true });
  };

  const handleCancelRequest = (request) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this service request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/user/service-request/${request._id}/cancel`);
              Alert.alert('Success', 'Service request cancelled successfully');
              fetchMyRequests();
            } catch (error) {
              console.error('Error cancelling request:', error);
              Alert.alert('Error', 'Failed to cancel service request');
            }
          }
        }
      ]
    );
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Open':
        return styles.statusOpen;
      case 'In Progress':
        return styles.statusInProgress;
      case 'Completed':
        return styles.statusCompleted;
      case 'Cancelled':
        return styles.statusCancelled;
      default:
        return styles.statusDefault;
    }
  };

  const renderRequestItem = ({ item: request }) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => handleRequestClick(request)}
    >
      <View style={styles.requestHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.requestTitle}>{request.title}</Text>
          <View style={[styles.statusBadge, getStatusClass(request.status)]}>
            <Text style={styles.statusText}>{request.status}</Text>
          </View>
        </View>
        <Text style={styles.requestDescription} numberOfLines={2}>
          {request.description}
        </Text>
      </View>

      <View style={styles.requestDetails}>
        <View style={styles.detailRow}>
          <Icon name="map-marker" size={14} color="#666" />
          <Text style={styles.detailText}>{request.location}</Text>
        </View>
        <View style={styles.detailRow}>
          <Icon name="clock-o" size={14} color="#666" />
          <Text style={styles.detailText}>{request.preferredSchedule || 'Flexible'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Icon name="dollar" size={14} color="#666" />
          <Text style={styles.detailText}>
            ₱{request.budgetRange?.min || 0} - ₱{request.budgetRange?.max || 0}
          </Text>
        </View>
      </View>

      <View style={styles.requestActions}>
        {request.status === 'Open' && (
          <>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditRequest(request)}
            >
              <Icon name="edit" size={14} color="#007bff" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelRequest(request)}
            >
              <Icon name="trash" size={14} color="#dc3545" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}

        {request.serviceProvider && (
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => handleChatRequest(request)}
          >
            <Icon name="comments" size={14} color="#fff" />
            <Text style={styles.chatButtonText}>Chat</Text>
          </TouchableOpacity>
        )}
      </View>

      {request.serviceProvider && (
        <View style={styles.providerInfo}>
          <Icon name="user" size={14} color="#666" />
          <Text style={styles.providerText}>
            Assigned to: {request.serviceProvider.firstName} {request.serviceProvider.lastName}
          </Text>
          <Text style={styles.dateText}>
            Created: {new Date(request.createdAt).toLocaleDateString()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return <Loader />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Service Requests</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateServiceRequest')}
        >
          <Icon name="plus" size={16} color="#fff" />
          <Text style={styles.createButtonText}>Create Request</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        <TouchableOpacity
          style={[styles.filterButton, filterStatus === 'All' && styles.filterActive]}
          onPress={() => setFilterStatus('All')}
        >
          <Text style={[styles.filterText, filterStatus === 'All' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterStatus === 'Open' && styles.filterActive]}
          onPress={() => setFilterStatus('Open')}
        >
          <Text style={[styles.filterText, filterStatus === 'Open' && styles.filterTextActive]}>
            Open
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterStatus === 'In Progress' && styles.filterActive]}
          onPress={() => setFilterStatus('In Progress')}
        >
          <Text style={[styles.filterText, filterStatus === 'In Progress' && styles.filterTextActive]}>
            In Progress
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterStatus === 'Completed' && styles.filterActive]}
          onPress={() => setFilterStatus('Completed')}
        >
          <Text style={[styles.filterText, filterStatus === 'Completed' && styles.filterTextActive]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="clipboard" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Service Requests Found</Text>
          <Text style={styles.emptyText}>
            {searchTerm || filterStatus !== 'All' || filterServiceType !== 'All'
              ? 'Try adjusting your filters.'
              : "You haven't posted any service requests yet."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  createButton: {
    backgroundColor: '#007bff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  filters: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  filterText: {
    fontSize: 12,
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
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
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusOpen: {
    backgroundColor: '#e3f2fd',
  },
  statusInProgress: {
    backgroundColor: '#fff3e0',
  },
  statusCompleted: {
    backgroundColor: '#e8f5e8',
  },
  statusCancelled: {
    backgroundColor: '#ffebee',
  },
  statusDefault: {
    backgroundColor: '#f5f5f5',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  requestDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  requestDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editButtonText: {
    fontSize: 12,
    color: '#007bff',
    marginLeft: 4,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelButtonText: {
    fontSize: 12,
    color: '#dc3545',
    marginLeft: 4,
  },
  chatButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chatButtonText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
    fontWeight: 'bold',
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  providerText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  dateText: {
    fontSize: 10,
    color: '#999',
  },
});

export default MyRequestsScreen;
