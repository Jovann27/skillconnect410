import express from "express";
import { register, login, logout, getMyProfile, getUserProfile, updateProfile, updateUserPassword, getPasswordLength, sendVerificationOTP, verifyOTP, resetPassword, getNotificationPreferences, updateNotificationPreferences, getBlockedUsers, blockUser, unblockUser, getFavourites, addToFavourites, removeFromFavourites } from "../controllers/userController.js";
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, getUnreadCount } from "../controllers/notificationController.js";
import { getChatHistory, sendMessage, getChatList, markMessagesAsSeen } from "../controllers/userFlowController.js";
import { reportUser } from "../controllers/reportsController.js";
import { isUserAuthenticated, isUserVerified } from "../middlewares/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/logout", logout);
router.get("/me", isUserAuthenticated, isUserVerified, getMyProfile);
router.get("/profile/:userId", getUserProfile);
router.put("/update-profile", isUserAuthenticated, isUserVerified, updateProfile);
router.get("/me/password", isUserAuthenticated, isUserVerified, getPasswordLength);
router.put("/password/update", isUserAuthenticated, isUserVerified, updateUserPassword)

// Email verification for password reset
router.post("/send-verification-otp", sendVerificationOTP);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);

// Notifications
router.get("/notifications", isUserAuthenticated, isUserVerified, getUserNotifications);
router.put("/notifications/:id/read", isUserAuthenticated, isUserVerified, markNotificationAsRead);
router.put("/notifications/mark-all-read", isUserAuthenticated, isUserVerified, markAllNotificationsAsRead);
router.get("/notifications/unread-count", isUserAuthenticated, isUserVerified, getUnreadCount);

// Notification Preferences
router.get("/notification-preferences", isUserAuthenticated, isUserVerified, getNotificationPreferences);
router.put("/notification-preferences", isUserAuthenticated, isUserVerified, updateNotificationPreferences);

// Blocked Users Management
router.get("/blocked-users", isUserAuthenticated, isUserVerified, getBlockedUsers);
router.post("/block-user", isUserAuthenticated, isUserVerified, blockUser);
router.delete("/unblock-user/:targetUserId", isUserAuthenticated, isUserVerified, unblockUser);

// Chat routes
router.get("/chat-history", isUserAuthenticated, isUserVerified, getChatHistory);
router.get("/chat-list", isUserAuthenticated, isUserVerified, getChatList);
router.post("/send-message", isUserAuthenticated, isUserVerified, sendMessage);
router.put("/chat/:appointmentId/mark-seen", isUserAuthenticated, isUserVerified, markMessagesAsSeen);

// Favourites Management
router.get("/favourites", isUserAuthenticated, isUserVerified, getFavourites);
router.post("/add-to-favourites", isUserAuthenticated, isUserVerified, addToFavourites);
router.delete("/remove-from-favourites/:workerId", isUserAuthenticated, isUserVerified, removeFromFavourites);

// User Reports
router.post("/report-user", isUserAuthenticated, isUserVerified, reportUser);

export default router;
