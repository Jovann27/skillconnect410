import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const PopupContext = createContext();

export const usePopup = () => {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error('usePopup must be used within a PopupProvider');
  }
  return context;
};

const Notification = ({ notification, onRemove }) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto remove after duration
    if (notification.duration > 0) {
      const timer = setTimeout(() => {
        handleRemove();
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleRemove = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onRemove(notification.id);
    });
  };

  const getNotificationStyle = () => {
    switch (notification.type) {
      case 'success':
        return { backgroundColor: '#d4edda', borderColor: '#c3e6cb', textColor: '#155724' };
      case 'error':
        return { backgroundColor: '#f8d7da', borderColor: '#f5c6cb', textColor: '#721c24' };
      case 'warning':
        return { backgroundColor: '#fff3cd', borderColor: '#ffeaa7', textColor: '#856404' };
      default:
        return { backgroundColor: '#d1ecf1', borderColor: '#bee5eb', textColor: '#0c5460' };
    }
  };

  const getIconName = () => {
    switch (notification.type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  const { backgroundColor, borderColor, textColor } = getNotificationStyle();

  return (
    <Animated.View
      style={[
        styles.notification,
        {
          backgroundColor,
          borderColor,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.notificationContent}>
        <MaterialIcons
          name={getIconName()}
          size={24}
          color={textColor}
          style={styles.notificationIcon}
        />
        <View style={styles.notificationText}>
          {notification.title && (
            <Text style={[styles.notificationTitle, { color: textColor }]}>
              {notification.title}
            </Text>
          )}
          <Text style={[styles.notificationMessage, { color: textColor }]}>
            {notification.message}
          </Text>
        </View>
        <TouchableOpacity onPress={handleRemove} style={styles.closeButton}>
          <MaterialIcons name="close" size={20} color={textColor} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const PopupProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = (message, type = 'info', duration = 3000, title = '') => {
    const id = Date.now() + Math.random();
    const notification = {
      id,
      message,
      type,
      title,
      duration
    };

    setNotifications(prev => [...prev, notification]);

    return id;
  };

  const showAlert = (title, message, buttons = []) => {
    Alert.alert(title, message, buttons);
  };

  const showConfirm = (title, message, onConfirm, onCancel) => {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: 'OK',
          onPress: onConfirm,
        },
      ]
    );
  };

  const showInput = (title, placeholder = '', onSubmit, onCancel, options = {}) => {
    // For React Native, we can use a simple Alert with input
    // In a real app, you might want to use a modal with TextInput
    Alert.prompt(
      title,
      placeholder,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: 'OK',
          onPress: (value) => onSubmit?.(value),
        },
      ],
      'plain-text',
      '',
      options.keyboardType || 'default'
    );
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <PopupContext.Provider value={{
      showNotification,
      showAlert,
      showConfirm,
      showInput,
      removeNotification,
      notifications
    }}>
      {children}
      <View style={styles.notificationsContainer}>
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            notification={notification}
            onRemove={removeNotification}
          />
        ))}
      </View>
    </PopupContext.Provider>
  );
};

const styles = StyleSheet.create({
  notificationsContainer: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    zIndex: 1000,
  },
  notification: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  notificationIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default PopupProvider;
