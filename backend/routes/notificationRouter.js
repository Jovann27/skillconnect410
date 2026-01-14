import express from "express";
import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import { isUserAuthenticated } from "../middlewares/auth.js";
import { sendComprehensiveNotification } from "../utils/notificationService.js";
import { getNotificationPreferences, updateNotificationPreferences } from "../utils/notificationService.js";
import { registerDeviceToken, unregisterDeviceToken } from "../utils/notificationService.js";
import { getNotificationStats } from "../utils/notificationService.js";
import { isAdminAuthenticated } from "../middlewares/auth.js";
import { validateSchema, handleValidationErrors } from "../middlewares/validation.js";
import { notificationPreferencesSchema, deviceTokenSchema } from "../validators/schemas.js";
import Notification from "../models/notification.js";

const router = express.Router();

// Get user's notifications
router.get("/", isUserAuthenticated, catchAsyncError(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly = false } = req.query;
  const userId = req.user._id;

  const query = { user: userId };
  if (unreadOnly === 'true') {
    query.read = false;
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Notification.countDocuments(query);

  res.status(200).json({
    success: true,
    notifications,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalNotifications: total
    }
  });
}));

// Mark notification as read
router.put("/:id/read", isUserAuthenticated, catchAsyncError(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const notification = await Notification.findOneAndUpdate(
    { _id: id, user: userId },
    { read: true, readAt: new Date() },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: "Notification not found"
    });
  }

  res.status(200).json({
    success: true,
    notification
  });
}));

// Mark all notifications as read
router.put("/read-all", isUserAuthenticated, catchAsyncError(async (req, res) => {
  const userId = req.user._id;

  await Notification.updateMany(
    { user: userId, read: false },
    { read: true, readAt: new Date() }
  );

  res.status(200).json({
    success: true,
    message: "All notifications marked as read"
  });
}));

// Get notification preferences
router.get("/preferences", isUserAuthenticated, catchAsyncError(async (req, res) => {
  const preferences = await getNotificationPreferences(req.user._id);

  res.status(200).json({
    success: true,
    preferences
  });
}));

// Update notification preferences
router.put("/preferences", isUserAuthenticated, validateSchema(notificationPreferencesSchema), handleValidationErrors, catchAsyncError(async (req, res) => {
  const { preferences } = req.body;

  await updateNotificationPreferences(req.user._id, preferences);

  res.status(200).json({
    success: true,
    message: "Notification preferences updated successfully"
  });
}));

// Register device token for push notifications
router.post("/device-token", isUserAuthenticated, validateSchema(deviceTokenSchema), handleValidationErrors, catchAsyncError(async (req, res) => {
  const { deviceToken, platform = 'android', deviceId } = req.body;

  if (!deviceToken) {
    return res.status(400).json({
      success: false,
      message: "Device token is required"
    });
  }

  await registerDeviceToken(req.user._id, deviceToken, platform, deviceId);

  res.status(200).json({
    success: true,
    message: "Device token registered successfully"
  });
}));

// Unregister device token
router.delete("/device-token/:token", isUserAuthenticated, catchAsyncError(async (req, res) => {
  const { token } = req.params;

  await unregisterDeviceToken(req.user._id, token);

  res.status(200).json({
    success: true,
    message: "Device token unregistered successfully"
  });
}));

// Send test notification (for development/testing)
router.post("/test", isUserAuthenticated, catchAsyncError(async (req, res) => {
  const { title = "Test Notification", message = "This is a test notification" } = req.body;

  await sendComprehensiveNotification(req.user._id, title, message, {
    type: 'system_update',
    sendEmail: false,
    sendPush: true
  });

  res.status(200).json({
    success: true,
    message: "Test notification sent"
  });
}));

// Get notification statistics (admin only)
router.get("/admin/stats", isAdminAuthenticated, catchAsyncError(async (req, res) => {
  const stats = await getNotificationStats(req.query);

  res.status(200).json({
    success: true,
    stats
  });
}));

// Delete old notifications (cleanup)
router.delete("/cleanup", isUserAuthenticated, catchAsyncError(async (req, res) => {
  const userId = req.user._id;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const result = await Notification.deleteMany({
    user: userId,
    read: true,
    createdAt: { $lt: thirtyDaysAgo }
  });

  res.status(200).json({
    success: true,
    message: `${result.deletedCount} old notifications deleted`
  });
}));

// Get unread notification count
router.get("/unread-count", isUserAuthenticated, catchAsyncError(async (req, res) => {
  const userId = req.user._id;
  
  const count = await Notification.countDocuments({
    user: userId,
    read: false
  });

  res.status(200).json({
    success: true,
    unreadCount: count
  });
}));

export default router;
