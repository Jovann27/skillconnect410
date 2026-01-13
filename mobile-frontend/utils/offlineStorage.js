import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Storage keys
const STORAGE_KEYS = {
  CACHED_REQUESTS: 'cached_service_requests',
  CACHED_PROVIDERS: 'cached_service_providers',
  OFFLINE_ACTIONS: 'offline_actions',
  USER_PROFILE: 'user_profile',
  SEARCH_HISTORY: 'search_history',
  LAST_SYNC: 'last_sync_timestamp',
};

// Cache service requests locally
export const cacheServiceRequests = async (requests) => {
  try {
    const cachedData = {
      data: requests,
      timestamp: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    };
    await AsyncStorage.setItem(STORAGE_KEYS.CACHED_REQUESTS, JSON.stringify(cachedData));
  } catch (error) {
    console.error('Error caching service requests:', error);
  }
};

// Get cached service requests
export const getCachedServiceRequests = async () => {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_REQUESTS);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.expiresAt > Date.now()) {
        return parsed.data;
      } else {
        // Cache expired, remove it
        await AsyncStorage.removeItem(STORAGE_KEYS.CACHED_REQUESTS);
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting cached service requests:', error);
    return null;
  }
};

// Cache service providers locally
export const cacheServiceProviders = async (providers) => {
  try {
    const cachedData = {
      data: providers,
      timestamp: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    };
    await AsyncStorage.setItem(STORAGE_KEYS.CACHED_PROVIDERS, JSON.stringify(cachedData));
  } catch (error) {
    console.error('Error caching service providers:', error);
  }
};

// Get cached service providers
export const getCachedServiceProviders = async () => {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_PROVIDERS);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.expiresAt > Date.now()) {
        return parsed.data;
      } else {
        // Cache expired, remove it
        await AsyncStorage.removeItem(STORAGE_KEYS.CACHED_PROVIDERS);
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting cached service providers:', error);
    return null;
  }
};

// Store offline actions to be synced later
export const storeOfflineAction = async (action) => {
  try {
    const existingActions = await getOfflineActions();
    const updatedActions = [...existingActions, {
      ...action,
      id: Date.now().toString(),
      timestamp: Date.now(),
    }];
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_ACTIONS, JSON.stringify(updatedActions));
  } catch (error) {
    console.error('Error storing offline action:', error);
  }
};

// Get offline actions
export const getOfflineActions = async () => {
  try {
    const actions = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_ACTIONS);
    return actions ? JSON.parse(actions) : [];
  } catch (error) {
    console.error('Error getting offline actions:', error);
    return [];
  }
};

// Remove offline action after successful sync
export const removeOfflineAction = async (actionId) => {
  try {
    const actions = await getOfflineActions();
    const filteredActions = actions.filter(action => action.id !== actionId);
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_ACTIONS, JSON.stringify(filteredActions));
  } catch (error) {
    console.error('Error removing offline action:', error);
  }
};

// Clear all offline actions
export const clearOfflineActions = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_ACTIONS);
  } catch (error) {
    console.error('Error clearing offline actions:', error);
  }
};

// Store user profile locally
export const cacheUserProfile = async (profile) => {
  try {
    const cachedData = {
      data: profile,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(cachedData));
  } catch (error) {
    console.error('Error caching user profile:', error);
  }
};

// Get cached user profile
export const getCachedUserProfile = async () => {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    return cached ? JSON.parse(cached).data : null;
  } catch (error) {
    console.error('Error getting cached user profile:', error);
    return null;
  }
};

// Store search history
export const addToSearchHistory = async (searchTerm) => {
  try {
    const history = await getSearchHistory();
    const updatedHistory = [
      searchTerm,
      ...history.filter(term => term !== searchTerm)
    ].slice(0, 20); // Keep only last 20 searches
    await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error adding to search history:', error);
  }
};

// Get search history
export const getSearchHistory = async () => {
  try {
    const history = await AsyncStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error getting search history:', error);
    return [];
  }
};

// Clear search history
export const clearSearchHistory = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
  } catch (error) {
    console.error('Error clearing search history:', error);
  }
};

// Update last sync timestamp
export const updateLastSync = async () => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
  } catch (error) {
    console.error('Error updating last sync timestamp:', error);
  }
};

// Get last sync timestamp
export const getLastSync = async () => {
  try {
    const timestamp = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    return timestamp ? parseInt(timestamp) : null;
  } catch (error) {
    console.error('Error getting last sync timestamp:', error);
    return null;
  }
};

// Check if device is online
export const isOnline = async () => {
  try {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected;
  } catch (error) {
    console.error('Error checking network status:', error);
    return false;
  }
};

// Clear all cached data
export const clearAllCache = async () => {
  try {
    const keys = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

// Get cache size (approximate)
export const getCacheSize = async () => {
  try {
    const keys = Object.values(STORAGE_KEYS);
    let totalSize = 0;
    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        totalSize += value.length;
      }
    }
    return totalSize;
  } catch (error) {
    console.error('Error getting cache size:', error);
    return 0;
  }
};
