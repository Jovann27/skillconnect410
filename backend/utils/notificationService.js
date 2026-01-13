/**
 * Advanced Notification Service
 * Handles real-time notifications, email notifications, and push notifications
 *
 * Features:
 * - Email notifications for important events
 * - Push notifications for mobile apps
 * - In-app notification center
 * - Notification preferences management
 * - Scheduled notifications
 */

import Notification from "../models/notification.js";
import User from "../models/userSchema.js";
import { sendEmail } from "./emailService.js";
import { sendPushNotification } from "./pushNotificationService.js";
import { sendNotification as sendSocketNotification } from "./socketNotify.js";

// Notification templates
const NOTIFICATION_TEMPLATES = {
  booking_request: {
    email: {
      subject: "New Service Request",
      template: "bookingRequest"
    },
    push: {
      title: "New Booking Request",
      body: "You have a new service request from {requesterName}"
    }
  },
  booking_accepted: {
    email: {
      subject: "Booking Confirmed",
      template: "bookingAccepted"
    },
    push: {
      title: "Booking Accepted",
      body: "{providerName} has accepted your booking"
    }
  },
  booking_completed: {
    email: {
      subject: "Service Completed",
      template: "bookingCompleted"
    },
    push: {
      title: "Service Completed",
      body: "Your service with {providerName} has been completed"
    }
  },
  payment_received: {
    email: {
      subject: "Payment Received",
      template: "paymentReceived"
    },
    push: {
      title: "Payment Received",
      body: "Payment of ₱{amount} has been received"
    }
  },
  account_verified: {
    email: {
      subject: "Account Verified",
      template: "accountVerified"
    },
    push: {
      title: "Account Verified",
      body: "Your account has been verified successfully"
    }
  },
  account_banned: {
    email: {
      subject: "Account Suspended",
      template: "accountBanned"
    },
    push: {
      title: "Account Suspended",
      body: "Your account has been suspended"
    }
  }
};

/**
 * Send comprehensive notification (in-app, email, push)
 * @param {String} userId - User to notify
 * @param {String} title - Notification title
 * @param {String} message - Notification message
 * @param {Object} options - Additional options
 */
export const sendComprehensiveNotification = async (userId, title, message, options = {}) => {
  const {
    type = 'system_update',
    priority = 'normal',
    meta = {},
    sendEmail: shouldSendEmail = true,
    sendPush: shouldSendPush = true,
    expiresAt = null
  } = options;

  try {
    // Create in-app notification
    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type,
      priority,
      meta,
      expiresAt
    });

    // Get user preferences and device info
    const user = await User.findById(userId).select('email notificationPreferences deviceTokens');

    if (!user) {
      console.error('User not found for notification:', userId);
      return;
    }

    // Send email notification if enabled
    if (shouldSendEmail && user.notificationPreferences?.email !== false) {
      await sendEmailNotification(user, type, title, message, meta);
    }

    // Send push notification if enabled and device tokens exist
    if (shouldSendPush && user.deviceTokens?.length > 0 &&
        user.notificationPreferences?.push !== false) {
      await sendPushNotificationToUser(user, type, title, message, meta);
    }

    // Send real-time notification via socket
    await sendSocketNotification(userId, title, message, { type, ...meta });

    // Update notification tracking
    if (shouldSendEmail) {
      notification.emailSent = true;
    }
    if (shouldSendPush && user.deviceTokens?.length > 0) {
      notification.pushSent = true;
    }
    await notification.save();

    return notification;
  } catch (error) {
    console.error('Error sending comprehensive notification:', error);
    throw error;
  }
};

/**
 * Send email notification
 * @param {Object} user - User object
 * @param {String} type - Notification type
 * @param {String} title - Notification title
 * @param {String} message - Notification message
 * @param {Object} meta - Additional metadata
 */
const sendEmailNotification = async (user, type, title, message, meta) => {
  try {
    const template = NOTIFICATION_TEMPLATES[type]?.email;
    if (!template) return;

    const emailData = {
      to: user.email,
      subject: template.subject,
      template: template.template,
      context: {
        user: user,
        title,
        message,
        ...meta,
        year: new Date().getFullYear()
      }
    };

    await sendEmail(emailData);
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
};

/**
 * Send push notification to user
 * @param {Object} user - User object
 * @param {String} type - Notification type
 * @param {String} title - Notification title
 * @param {String} message - Notification message
 * @param {Object} meta - Additional metadata
 */
const sendPushNotificationToUser = async (user, type, title, message, meta) => {
  try {
    const template = NOTIFICATION_TEMPLATES[type]?.push;
    if (!template) return;

    let pushTitle = template.title;
    let pushBody = template.body;

    // Replace placeholders
    Object.keys(meta).forEach(key => {
      pushTitle = pushTitle.replace(`{${key}}`, meta[key]);
      pushBody = pushBody.replace(`{${key}}`, meta[key]);
    });

    await sendPushNotification(user.deviceTokens, {
      title: pushTitle,
      body: pushBody,
      data: {
        type,
        ...meta
      }
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

/**
 * Send bulk notifications
 * @param {Array} notifications - Array of notification objects
 */
export const sendBulkNotifications = async (notifications) => {
  const results = [];

  for (const notification of notifications) {
    try {
      const result = await sendComprehensiveNotification(
        notification.userId,
        notification.title,
        notification.message,
        notification.options
      );
      results.push({ success: true, notification: result });
    } catch (error) {
      results.push({ success: false, error: error.message, notification });
    }
  }

  return results;
};

/**
 * Schedule notification for future delivery
 * @param {String} userId - User to notify
 * @param {Date} scheduledTime - When to send the notification
 * @param {String} title - Notification title
 * @param {String} message - Notification message
 * @param {Object} options - Additional options
 */
export const scheduleNotification = async (userId, scheduledTime, title, message, options = {}) => {
  try {
    // Store in database with scheduled time
    const notification = await Notification.create({
      user: userId,
      title,
      message,
      ...options,
      scheduledFor: scheduledTime,
      status: 'scheduled'
    });

    // In a production system, you'd use a job queue like Bull or Agenda
    // For now, we'll use a simple timeout (not recommended for production)
    const delay = scheduledTime.getTime() - Date.now();
    if (delay > 0) {
      setTimeout(async () => {
        await sendComprehensiveNotification(userId, title, message, options);
        notification.status = 'sent';
        await notification.save();
      }, delay);
    }

    return notification;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    throw error;
  }
};

/**
 * Update user notification preferences
 * @param {String} userId - User ID
 * @param {Object} preferences - Notification preferences
 */
export const updateNotificationPreferences = async (userId, preferences) => {
  try {
    await User.findByIdAndUpdate(userId, {
      notificationPreferences: preferences
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
};

/**
 * Get user's notification preferences
 * @param {String} userId - User ID
 */
export const getNotificationPreferences = async (userId) => {
  try {
    const user = await User.findById(userId).select('notificationPreferences');
    return user?.notificationPreferences || {
      email: true,
      push: true,
      inApp: true
    };
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return { email: true, push: true, inApp: true };
  }
};

/**
 * Register device token for push notifications
 * @param {String} userId - User ID
 * @param {String} deviceToken - Device token
 * @param {String} platform - Platform (ios/android)
 */
export const registerDeviceToken = async (userId, deviceToken, platform = 'android') => {
  try {
    await User.findByIdAndUpdate(userId, {
      $addToSet: {
        deviceTokens: { token: deviceToken, platform }
      }
    });
  } catch (error) {
    console.error('Error registering device token:', error);
    throw error;
  }
};

/**
 * Unregister device token
 * @param {String} userId - User ID
 * @param {String} deviceToken - Device token to remove
 */
export const unregisterDeviceToken = async (userId, deviceToken) => {
  try {
    await User.findByIdAndUpdate(userId, {
      $pull: {
        deviceTokens: { token: deviceToken }
      }
    });
  } catch (error) {
    console.error('Error unregistering device token:', error);
    throw error;
  }
};

/**
 * Get notification statistics
 * @param {Object} filters - Filters for statistics
 */
export const getNotificationStats = async (filters = {}) => {
  try {
    const matchConditions = {};
    if (filters.userId) matchConditions.user = filters.userId;
    if (filters.type) matchConditions.type = filters.type;
    if (filters.startDate || filters.endDate) {
      matchConditions.createdAt = {};
      if (filters.startDate) matchConditions.createdAt.$gte = filters.startDate;
      if (filters.endDate) matchConditions.createdAt.$lte = filters.endDate;
    }

    const stats = await Notification.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          read: { $sum: { $cond: ['$read', 1, 0] } },
          emailSent: { $sum: { $cond: ['$emailSent', 1, 0] } },
          pushSent: { $sum: { $cond: ['$pushSent', 1, 0] } },
          byType: {
            $push: {
              type: '$type',
              read: '$read',
              priority: '$priority'
            }
          }
        }
      }
    ]);

    return stats[0] || {
      total: 0,
      read: 0,
      emailSent: 0,
      pushSent: 0,
      byType: []
    };
  } catch (error) {
    console.error('Error getting notification stats:', error);
    throw error;
  }
};

export default {
  sendComprehensiveNotification,
  sendBulkNotifications,
  scheduleNotification,
  updateNotificationPreferences,
  getNotificationPreferences,
  registerDeviceToken,
  unregisterDeviceToken,
  getNotificationStats
};
