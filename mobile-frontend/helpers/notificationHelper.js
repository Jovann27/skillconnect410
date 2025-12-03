// /helpers/notificationHelper.js
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { isRunningInExpoGo } from 'expo';

// Check if notifications are available (not in Expo Go and notifications module is available)
const notificationsAvailable = !isRunningInExpoGo() && !!Notifications && typeof Notifications.scheduleNotificationAsync === 'function';

// Configure foreground notification handler (show alert & sound)
if (notificationsAvailable) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Request notification permissions
export const requestNotificationPermissions = async () => {
  if (!notificationsAvailable) {
    console.log("Notifications not available");
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return false;
  }

  return true;
};

// Get push token for FCM
export const getPushToken = async () => {
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync();
    console.log('Expo Push Token:', token.data);
    return token.data;
  } catch (error) {
    console.log('Error getting push token:', error);
    return null;
  }
};

// Schedule a local notification
export const sendLocalNotification = async ({ title, body }) => {
  if (!notificationsAvailable) {
    console.log("Notifications not available");
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Immediate
    });
  } catch (error) {
    console.log("Notification Error:", error);
  }
};

// Send push notification via FCM (server-side implementation needed)
export const sendPushNotification = async (expoPushToken, { title, body, data = {} }) => {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data,
  };

  try {
    // This would typically be sent from your backend server
    // For now, we'll use Expo's push service
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Push notification sent:', result);
    return result;
  } catch (error) {
    console.log('Error sending push notification:', error);
    return null;
  }
};

// Alias for backward compatibility
export const sendNotification = sendLocalNotification;
