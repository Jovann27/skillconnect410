import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
} from 'react-native';
import { useMainContext } from '../contexts/MainContext';
import Loader from '../components/Loader';

const AdminDashboardScreen = () => {
  const { user, api } = useMainContext();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalServiceProviders: 0,
    totalServiceRequests: 0,
    pendingVerifications: 0,
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load admin analytics data
      // Note: This would typically come from admin-specific API endpoints
      // For now, we'll use mock data based on the web app structure

      // Mock data - in real app, this would come from API calls
      setStats({
        totalUsers: 1250,
        totalServiceProviders: 89,
        totalServiceRequests: 234,
        pendingVerifications: 12,
      });

      setRecentUsers([
        { id: 1, name: 'John Doe', role: 'Service Provider', joinedAt: '2024-01-15' },
        { id: 2, name: 'Jane Smith', role: 'Community Member', joinedAt: '2024-01-14' },
        { id: 3, name: 'Bob Johnson', role: 'Service Provider', joinedAt: '2024-01-13' },
      ]);

      setPendingRequests([
        { id: 1, title: 'Plumbing Service', requester: 'Alice Brown', status: 'pending' },
        { id: 2, title: 'Electrical Repair', requester: 'Charlie Wilson', status: 'pending' },
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToUsers = () => {
    Alert.alert('Users Management', 'This feature will be implemented soon!');
  };

  const handleNavigateToProviders = () => {
    Alert.alert('Service Providers', 'This feature will be implemented soon!');
  };

  const handleNavigateToRequests = () => {
    Alert.alert('Service Requests', 'This feature will be implemented soon!');
  };

  const handleNavigateToAnalytics = () => {
    Alert.alert('Analytics', 'This feature will be implemented soon!');
  };

  const renderStatCard = (title, value, color = '#007bff', onPress = null) => (
    <TouchableOpacity
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </TouchableOpacity>
  );

  const renderUserItem = ({ item }) => (
    <View style={styles.userCard}>
      <Text style={styles.userName}>{item.name}</Text>
      <Text style={styles.userRole}>{item.role}</Text>
      <Text style={styles.userJoined}>Joined: {item.joinedAt}</Text>
    </View>
  );

  const renderRequestItem = ({ item }) => (
    <View style={styles.requestCard}>
      <Text style={styles.requestTitle}>{item.title}</Text>
      <Text style={styles.requestRequester}>Requested by: {item.requester}</Text>
      <Text style={styles.requestStatus}>Status: {item.status}</Text>
    </View>
  );

  if (loading) {
    return <Loader />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Admin Dashboard</Text>
        <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleNavigateToUsers}>
          <Text style={styles.actionButtonText}>Manage Users</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleNavigateToProviders}>
          <Text style={styles.actionButtonText}>Service Providers</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleNavigateToRequests}>
          <Text style={styles.actionButtonText}>Service Requests</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleNavigateToAnalytics}>
          <Text style={styles.actionButtonText}>Analytics</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        {renderStatCard('Total Users', stats.totalUsers, '#007bff', handleNavigateToUsers)}
        {renderStatCard('Service Providers', stats.totalServiceProviders, '#28a745', handleNavigateToProviders)}
        {renderStatCard('Service Requests', stats.totalServiceRequests, '#ffc107', handleNavigateToRequests)}
        {renderStatCard('Pending Verifications', stats.pendingVerifications, '#dc3545')}
      </View>

      {/* Recent Users */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Users</Text>
        {recentUsers.length > 0 ? (
          <FlatList
            data={recentUsers}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        ) : (
          <Text style={styles.emptyText}>No recent users</Text>
        )}
      </View>

      {/* Pending Requests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending Service Requests</Text>
        {pendingRequests.length > 0 ? (
          <FlatList
            data={pendingRequests}
            renderItem={renderRequestItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        ) : (
          <Text style={styles.emptyText}>No pending requests</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#dc3545',
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
  actionsContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    paddingTop: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: '1%',
    marginBottom: 12,
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
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  userCard: {
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
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userJoined: {
    fontSize: 12,
    color: '#999',
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  requestRequester: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  requestStatus: {
    fontSize: 12,
    color: '#ffc107',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
});

export default AdminDashboardScreen;