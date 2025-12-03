import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMainContext } from '../contexts/MainContext';

const WorkerRow = ({ item, onPress }) => (
  <TouchableOpacity onPress={() => onPress(item)} activeOpacity={0.7}>
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, styles.nameCell]}>{`${item.firstName} ${item.lastName}`}</Text>
      <Text style={[styles.tableCell, styles.serviceCell]}>{item.service || 'Service Provider'}</Text>
      <View style={[styles.tableCell, styles.ratingCell]}>
        <Ionicons name="star" size={16} color="#FFD700" />
        <Text style={styles.ratingText}>N/A</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const Favourites = ({ navigation }) => {
  const { api } = useMainContext();
  const [favourites, setFavourites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFavourites();
  }, []);

  const fetchFavourites = async () => {
    try {
      setIsLoading(true);
      const response = await api.getFavourites();
      if (response.data.success) {
        setFavourites(response.data.favourites);
      }
    } catch (error) {
      console.error('Error fetching favourites:', error);
      Alert.alert('Error', 'Failed to load favourites');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePress = (worker) => {
    // Navigate to ProfileReviews screen with fromFavorites flag
    navigation.navigate('ProfileReviews', {
      userId: worker._id,
      fromFavorites: true,
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#c20884" />
        <Text style={styles.loaderText}>Loading favourites...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.nameCell]}>Name</Text>
        <Text style={[styles.headerCell, styles.serviceCell]}>Service Type</Text>
        <Text style={[styles.headerCell, styles.ratingCell]}>Ratings</Text>
      </View>

      {favourites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No favourite workers yet.</Text>
        </View>
      ) : (
        <FlatList
          data={favourites}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <WorkerRow item={item} onPress={handlePress} />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loaderText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
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

export default Favourites;
