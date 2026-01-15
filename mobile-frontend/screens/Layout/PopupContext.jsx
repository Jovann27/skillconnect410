import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  Alert,
  ToastAndroid,
  Platform
} from 'react-native';

const PopupContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const usePopup = () => {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error('usePopup must be used within a PopupProvider');
  }
  return context;
};

const PopupProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = useCallback((message, type = 'info', duration = 3000, title = '') => {
    const id = Date.now() + Math.random();
    const notification = {
      id,
      message,
      type,
      title,
      duration
    };

    setNotifications(prev => [...prev, notification]);

    // Show toast notification
    if (Platform.OS === 'android') {
      ToastAndroid.showWithGravity(
        message,
        ToastAndroid.SHORT,
        ToastAndroid.TOP
      );
    } else {
      // For iOS, we could use a custom toast component
      // For now, we'll just log it
      console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    }

    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const showInput = useCallback((title, placeholder = '', onSubmit, onCancel) => {
    // Simple input popup implementation using Alert.prompt
    if (Platform.OS === 'ios') {
      Alert.prompt(
        title,
        placeholder,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: onCancel
          },
          {
            text: 'OK',
            onPress: (text) => onSubmit?.(text)
          }
        ],
        'plain-text',
        '',
        'default'
      );
    } else {
      // For Android, use regular Alert and return empty string
      Alert.alert(
        title,
        placeholder,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: onCancel
          },
          {
            text: 'OK',
            onPress: () => onSubmit?.('')
          }
        ]
      );
    }
  }, []);

  const showAlert = useCallback((title, message, buttons = []) => {
    Alert.alert(title, message, buttons);
  }, []);

  const showConfirm = useCallback((title, message, onConfirm, onCancel) => {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: onCancel
        },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: onConfirm
        }
      ]
    );
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <PopupContext.Provider value={{
      showNotification,
      showInput,
      showAlert,
      showConfirm,
      removeNotification,
      clearAllNotifications,
      notifications
    }}>
      {children}
    </PopupContext.Provider>
  );
};

export default PopupProvider;
