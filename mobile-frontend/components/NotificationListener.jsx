import React, { useEffect } from 'react';
import { useMainContext } from '../contexts/MainContext';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

const NotificationListener = () => {
  const { user, socket } = useMainContext();

  useEffect(() => {
    // Only set up push notifications if not in Expo Go
    const isExpoGo = Constants.appOwnership === 'expo';

    if (!isExpoGo) {
      // Configure notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    }

    if (socket && user) {
      const handleNotification = (notification) => {
        // Handle incoming notifications
        console.log('New notification:', notification);

        // Show local notification if not in Expo Go
        if (!isExpoGo) {
          Notifications.scheduleNotificationAsync({
            content: {
              title: notification.title || 'New Notification',
              body: notification.message || notification.body || 'You have a new notification',
              data: notification,
            },
            trigger: null, // Show immediately
          });
        }
      };

      const handleOrderUpdate = (data) => {
        console.log('Order update:', data);
      };

      socket.on('new-notification', handleNotification);
      socket.on('orderUpdate', handleOrderUpdate);

      return () => {
        socket.off('new-notification', handleNotification);
        socket.off('orderUpdate', handleOrderUpdate);
      };
    }
  }, [socket, user]);

  return null; // This component doesn't render anything
};

export default NotificationListener;
