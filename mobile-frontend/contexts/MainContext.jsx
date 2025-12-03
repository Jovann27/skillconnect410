import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api';
import { socket, connectSocket, disconnectSocket } from '../utils/socket';
import { notifyUserDataChange } from '../utils/storageEvents';

const MainContext = createContext();

export { MainContext };

export const useMainContext = () => {
  const context = useContext(MainContext);
  if (!context) {
    throw new Error('useMainContext must be used within a MainProvider');
  }
  return context;
};

export const MainProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [navigationLoading, setNavigationLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isUserVerified, setIsUserVerified] = useState(false);

  // Role-based access helpers
  const userRole = user?.role;
  const isCommunityMember = userRole === "Community Member";
  const isServiceProvider = userRole === "Service Provider";

  // Initialize user from AsyncStorage
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        const token = await AsyncStorage.getItem('token');

        if (userData && token) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setIsUserVerified(parsedUser.verified || false);
          setIsLoggedIn(true);

          // Set token in apiClient
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          // Connect socket
          connectSocket(token);
        }
      } catch (error) {
        console.error('Error initializing user:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeUser();
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (socket && isLoggedIn) {
      const handleNotification = (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      };

      const handleOrderUpdate = (data) => {
        // Handle order updates
        console.log('Order update:', data);
      };

      socket.on('new-notification', handleNotification);
      socket.on('orderUpdate', handleOrderUpdate);

      return () => {
        socket.off('new-notification', handleNotification);
        socket.off('orderUpdate', handleOrderUpdate);
      };
    }
  }, [socket, isLoggedIn]);

  // Login function
  const login = async (credentials) => {
    try {
      const response = await apiClient.post('/user/login', credentials);
      const { user, token } = response.data;

      if (!token) {
        throw new Error('No token received from server');
      }

      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('token', token);

      setUser(user);
      setIsUserVerified(user.verified || false);
      setIsLoggedIn(true);

      notifyUserDataChange();

      // Set token in apiClient
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Connect socket
      connectSocket(token);

      return { success: true, user, token };
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');

      setUser(null);
      setIsUserVerified(false);
      setIsLoggedIn(false);

      // Clear token from apiClient
      delete apiClient.defaults.headers.common['Authorization'];

      // Disconnect socket
      disconnectSocket();
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  };

  // Update user function
  const updateUser = async (updatedUserData) => {
    try {
      const newUserData = { ...user, ...updatedUserData };
      await AsyncStorage.setItem('user', JSON.stringify(newUserData));
      setUser(newUserData);
      setIsUserVerified(newUserData.verified || false);
      notifyUserDataChange();
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  // Mark notifications as read
  const markNotificationsAsRead = () => {
    setUnreadCount(0);
  };

  // API functions
  const api = {
    // User related
    // Backend exposes the authenticated user's profile at /api/v1/user/me
    // and update at /api/v1/user/update-profile
    getUserProfile: async () => {
      try {
        const response = await apiClient.get('/user/me');
        return response;
      } catch (error) {
        // Handle verification error
        if (error.response?.data?.code === "ACCOUNT_NOT_VERIFIED") {
          setIsUserVerified(false);
          throw error;
        }
        throw error;
      }
    },
    updateUserProfile: (data) => apiClient.put('/user/update-profile', data),

    // Orders
    getOrders: () => apiClient.get('/orders'),
    createOrder: (data) => apiClient.post('/orders', data),
    updateOrder: (id, data) => apiClient.put(`/orders/${id}`, data),

    // Services
    getServices: () => apiClient.get('/services'),
    createService: (data) => apiClient.post('/services', data),

    // Workers
    getWorkers: () => apiClient.get('/workers'),
    getWorkerById: (id) => apiClient.get(`/workers/${id}`),

    // Clients
    getClients: () => apiClient.get('/clients'),

    // Notifications
    getNotifications: () => apiClient.get('/notifications'),
    markNotificationRead: (id) => apiClient.put(`/notifications/${id}/read`),

    // Reviews
    getReviews: (userId) => apiClient.get(`/review/user/${userId}`),
    createReview: (data) => apiClient.post('/review', data),

    // Chat
    getChatList: () => apiClient.get('/user/chat-list'),
    sendMessage: (data) => apiClient.post('/user/send-message', data),
    getChatHistory: () => apiClient.get('/user/chat-history'),
    markMessagesAsSeen: (appointmentId) => apiClient.put(`/user/chat/${appointmentId}/mark-seen`),

    // Service Requests
    getServiceRequests: () => apiClient.get('/settings/service-requests'),
    acceptServiceRequest: (id) => apiClient.put(`/settings/service-requests/${id}/accept`),
    ignoreServiceRequest: (id) => apiClient.put(`/settings/service-requests/${id}/ignore`),
    getMyAcceptedRequests: () => apiClient.get('/settings/my-accepted-requests'),
    completeServiceRequest: (id) => apiClient.put(`/settings/complete-service-request/${id}`),

    // Blocked Users
    getBlockedUsers: () => apiClient.get('/user/blocked-users'),
    blockUser: (targetUserId) => apiClient.post('/user/block-user', { targetUserId }),
    unblockUser: (targetUserId) => apiClient.delete(`/user/unblock-user/${targetUserId}`),

    // Favourites
    getFavourites: () => apiClient.get('/user/favourites'),
    addToFavourites: (workerId) => apiClient.post('/user/add-to-favourites', { workerId }),
    removeFromFavourites: (workerId) => apiClient.delete(`/user/remove-from-favourites/${workerId}`),
  };

  const value = {
    user,
    isLoggedIn,
    loading,
    navigationLoading,
    setNavigationLoading,
    notifications,
    unreadCount,
    isUserVerified,
    login,
    logout,
    updateUser,
    markNotificationsAsRead,
    api,
    socket,
  };

  return (
    <MainContext.Provider value={value}>
      {children}
    </MainContext.Provider>
  );
};
