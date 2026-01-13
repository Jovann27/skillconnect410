import Notification from "../models/notification.js";
import { getUserSockets } from "./sessionManager.js";
import logger from "./logger.js";

let io = null;

// Initialize io when available
export const initializeSocketNotify = (socketIo, onlineUsersMap = null) => {
    io = socketIo;
};

export const sendNotification = async (userId, title, message, meta = {}) => {
    try {
        // Always save notification to database
        const notification = await Notification.create({
            user: userId,
            title,
            message,
            meta,
        });

        // Send real-time notification if socket.io is available
        if (io) {
            const userSockets = await getUserSockets(userId.toString());
            if (userSockets && userSockets.length > 0) {
                // Emit to all sockets for this user
                for (const socketId of userSockets) {
                    io.to(socketId).emit("new-notification", {
                        title,
                        message,
                        meta,
                        createdAt: notification.createdAt,
                    });
                }
                logger.debug(`Real-time notification sent to user ${userId} (${userSockets.length} sockets)`);
            } else {
                logger.debug(`User ${userId} has no active sockets for real-time notification`);
            }
        } else {
            logger.debug(`Socket.io not available for real-time notification to user ${userId} (notification saved to DB)`);
        }

        return notification;
    } catch (err) {
        logger.error("Send Notification error:", err.message);
        return null;
    }
};
