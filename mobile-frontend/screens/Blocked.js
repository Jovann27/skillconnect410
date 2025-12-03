import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../api';

const WorkerRow = ({ item, onPress }) => (
  <TouchableOpacity onPress={() => onPress(item)} style={styles.tableRow}>
    <Text style={[styles.tableCell, styles.nameCell]}>{item.name}</Text>
    <Text style={[styles.tableCell, styles.serviceCell]}>{item.service}</Text>
    <View style={[styles.tableCell, styles.ratingCell]}>
      <Ionicons name="star" size={16} color="#FFD700" />
      <Text style={styles.ratingText}>{item.rating || '0.0'}</Text>
    </View>
  </TouchableOpacity>
);

const Blocked = ({ navigation }) => {
  const [blockedData, setBlockedData] = useState([]);

  useEffect(() => {
    const fetchBlockedUsers = async () => {
      try {
        const response = await apiClient.get('/user/blocked-users');
        setBlockedData(response.data.blockedUsers || []);
      } catch (error) {
        console.log('Error fetching blocked users:', error);
        setBlockedData([]);
      }
    };
    fetchBlockedUsers();
  }, []);

  const handlePress = (worker) => {
    navigation.navigate("BlockedWorker", { worker });
  };

  return (
    <View style={styles.container}>
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.nameCell]}>Name</Text>
        <Text style={[styles.headerCell, styles.serviceCell]}>Service Type</Text>
        <Text style={[styles.headerCell, styles.ratingCell]}>Ratings</Text>
      </View>

      <FlatList
        data={blockedData}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <WorkerRow item={item} onPress={handlePress} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tableCell: {
    fontSize: 14,
    color: '#333',
  },
  nameCell: {
    flex: 2,
  },
  serviceCell: {
    flex: 2,
    textAlign: 'left',
  },
  ratingCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  ratingText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#333',
  },
});

export default Blocked;
