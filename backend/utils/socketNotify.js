import Notification from "../models/notification.js";

let io = null;
let onlineUsers = null;

// Initialize io and onlineUsers when available
export const initializeSocketNotify = (socketIo, onlineUsersMap) => {
    io = socketIo;
    onlineUsers = onlineUsersMap;
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

        // Send real-time notification if socket.io is available and user is online
        if (io && onlineUsers) {
            const socketId = onlineUsers.get(userId.toString());
            if (socketId) {
                io.to(socketId).emit("new-notification", {
                    title,
                    message,
                    meta,
                    createdAt: notification.createdAt,
                });
                console.log(`Real-time notification sent to user ${userId}`);
            }
        } else {
            console.log(`Socket.io not available for real-time notification to user ${userId} (notification saved to DB)`);
        }

        return notification;
    } catch (err) {
        console.error("Send Notification error:", err.message);
        return null;
    }
};

