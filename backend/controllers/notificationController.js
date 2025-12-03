import Notification from "../models/notification.js";
import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";

// Get user's notifications
export const getUserNotifications = catchAsyncError(async (req, res) => {
  const userId = req.user._id;

  const notifications = await Notification.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(50);

  res.status(200).json({
    success: true,
    notifications,
  });
});

// Mark notification as read
export const markNotificationAsRead = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  const notification = await Notification.findOneAndUpdate(
    { _id: id, user: userId },
    { read: true },
    { new: true }
  );

  if (!notification) {
    return next(new ErrorHandler("Notification not found", 404));
  }

  res.status(200).json({
    success: true,
    notification,
  });
});

// Mark all notifications as read
export const markAllNotificationsAsRead = catchAsyncError(async (req, res) => {
  const userId = req.user._id;

  await Notification.updateMany(
    { user: userId, read: false },
    { read: true }
  );

  res.status(200).json({
    success: true,
    message: "All notifications marked as read",
  });
});

// Get unread count
export const getUnreadCount = catchAsyncError(async (req, res) => {
  const userId = req.user._id;

  const count = await Notification.countDocuments({ user: userId, read: false });

  res.status(200).json({
    success: true,
    unreadCount: count,
  });
});
