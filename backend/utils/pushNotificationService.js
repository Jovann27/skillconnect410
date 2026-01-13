/**
 * Push Notification Service
 * Handles push notifications for mobile apps using Firebase Cloud Messaging (FCM)
 *
 * Features:
 * - Send push notifications to individual devices
 * - Send bulk push notifications
 * - Handle device token management
 * - Support for iOS and Android platforms
 */

import admin from 'firebase-admin';
import User from '../models/userSchema.js';
import logger from './logger.js';

// Initialize Firebase Admin SDK
let firebaseApp = null;

const initializeFirebase = () => {
  if (!firebaseApp && process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
    } catch (error) {
      logger.error('Error initializing Firebase:', error);
      // Fallback: log that push notifications are disabled
      logger.warn('Push notifications disabled - Firebase not configured');
    }
  }
  return firebaseApp;
};

/**
 * Send push notification to multiple device tokens
 * @param {Array} deviceTokens - Array of device token objects
 * @param {Object} notification - Notification payload
 * @param {Object} data - Additional data payload
 */
export const sendPushNotification = async (deviceTokens, notification, data = {}) => {
  const app = initializeFirebase();
  if (!app) {
    logger.debug('Firebase not initialized, skipping push notification');
    return { success: false, reason: 'Firebase not initialized' };
  }

  try {
    const tokens = deviceTokens.map(token => typeof token === 'string' ? token : token.token).filter(Boolean);

    if (tokens.length === 0) {
      return { success: false, reason: 'No valid device tokens' };
    }

    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        icon: notification.icon || 'default',
        clickAction: notification.clickAction || 'FLUTTER_NOTIFICATION_CLICK'
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      },
      tokens: tokens
    };

    const response = await admin.messaging().sendMulticast(message);

    // Handle failed tokens (remove invalid ones)
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });

      // Remove failed tokens from database
      if (failedTokens.length > 0) {
        await cleanupInvalidTokens(failedTokens);
      }
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      messageId: response.responses.filter(r => r.success).map(r => r.messageId)
    };
  } catch (error) {
    logger.error('Error sending push notification:', error);
    throw error;
  }
};

/**
 * Send push notification to a specific user
 * @param {String} userId - User ID
 * @param {Object} notification - Notification payload
 * @param {Object} data - Additional data payload
 */
export const sendPushNotificationToUser = async (userId, notification, data = {}) => {
  try {
    const user = await User.findById(userId).select('deviceTokens');

    if (!user || !user.deviceTokens || user.deviceTokens.length === 0) {
      return { success: false, reason: 'No device tokens found for user' };
    }

    return await sendPushNotification(user.deviceTokens, notification, data);
  } catch (error) {
    logger.error('Error sending push notification to user:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send targeted push notification based on user segment
 * @param {Object} segmentCriteria - Criteria to find users
 * @param {Object} notification - Notification payload
 * @param {Object} data - Additional data payload
 */
export const sendSegmentedPushNotification = async (segmentCriteria, notification, data = {}) => {
  try {
    const users = await User.find(segmentCriteria).select('deviceTokens').limit(1000); // Limit for performance

    const allTokens = [];
    users.forEach(user => {
      if (user.deviceTokens && user.deviceTokens.length > 0) {
        allTokens.push(...user.deviceTokens);
      }
    });

    if (allTokens.length === 0) {
      return { success: false, reason: 'No device tokens found for segment' };
    }

    return await sendPushNotification(allTokens, notification, data);
  } catch (error) {
    logger.error('Error sending segmented push notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send scheduled push notification
 * @param {String} userId - User ID
 * @param {Date} scheduledTime - When to send the notification
 * @param {Object} notification - Notification payload
 * @param {Object} data - Additional data payload
 */
export const schedulePushNotification = async (userId, scheduledTime, notification, data = {}) => {
  try {
    // In production, use a job queue system like Bull or Agenda
    // For now, using setTimeout (not recommended for production)
    const delay = scheduledTime.getTime() - Date.now();

    if (delay <= 0) {
      // Send immediately if time has passed
      return await sendPushNotificationToUser(userId, notification, data);
    }

    setTimeout(async () => {
      await sendPushNotificationToUser(userId, notification, data);
    }, delay);

    return { success: true, scheduled: true, delay };
  } catch (error) {
    logger.error('Error scheduling push notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Clean up invalid device tokens
 * @param {Array} invalidTokens - Array of invalid tokens to remove
 */
const cleanupInvalidTokens = async (invalidTokens) => {
  try {
    // Remove invalid tokens from all users
    await User.updateMany(
      { 'deviceTokens.token': { $in: invalidTokens } },
      { $pull: { deviceTokens: { token: { $in: invalidTokens } } } }
    );

    logger.info(`Cleaned up ${invalidTokens.length} invalid device tokens`);
  } catch (error) {
    logger.error('Error cleaning up invalid tokens:', error);
  }
};

/**
 * Test push notification functionality
 * @param {String} deviceToken - Device token to test
 * @returns {Object} Test result
 */
export const testPushNotification = async (deviceToken) => {
  const testNotification = {
    title: 'Test Notification',
    body: 'This is a test push notification from SkillConnect',
    icon: 'default'
  };

  const testData = {
    type: 'test',
    timestamp: new Date().toISOString()
  };

  return await sendPushNotification([deviceToken], testNotification, testData);
};

/**
 * Get push notification statistics
 * @param {Object} filters - Filters for statistics
 */
export const getPushNotificationStats = async (filters = {}) => {
  try {
    // This would typically aggregate from a notifications log
    // For now, return basic structure
    return {
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      platformStats: {
        android: { sent: 0, delivered: 0, failed: 0 },
        ios: { sent: 0, delivered: 0, failed: 0 }
      },
      period: filters.period || '30d'
    };
  } catch (error) {
    logger.error('Error getting push notification stats:', error);
    throw error;
  }
};

export default {
  sendPushNotification,
  sendPushNotificationToUser,
  sendSegmentedPushNotification,
  schedulePushNotification,
  testPushNotification,
  getPushNotificationStats
};
