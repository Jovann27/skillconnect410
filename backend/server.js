import dotenv from "dotenv";
process.env.DOTENV_CONFIG_SILENT = 'true';
dotenv.config();

import app from "./app.js";
import { dbConnection } from "./database/dbConnection.js";
// import "./config/cloudinaryConfig.js";
import { checkAndUpdateExpiredRequests } from "./utils/expirationHandler.js";
import { initializeSentry } from "./utils/sentry.js";
import { initializeEmailQueue } from "./utils/emailQueue.js";
import logger from "./utils/logger.js";
import { Server } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import User from "./models/userSchema.js";
import Chat from "./models/chat.js";
import Booking from "./models/booking.js";
import { initializeSocketNotify } from "./utils/socketNotify.js";
// Session management using in-memory storage
// import {
//   setUserOnline,
//   setUserOffline,
//   getUserSockets,
//   updateUserActivity
// } from "./utils/sessionManager.js";

// In-memory session management functions
const setUserOnline = async (userId, socketId) => true;
const setUserOffline = async (userId, socketId) => true;
const getUserSockets = async (userId) => [];
const updateUserActivity = async (userId) => true;

// Declare io for export
let io = null;

const startServer = async () => {
  try {
    // Initialize Sentry for error tracking
    initializeSentry();

    // Initialize database connection and then check expired requests
    await dbConnection();

    // Initialize email queue
    await initializeEmailQueue();

    // Check and update expired service requests on server start
    const count = await checkAndUpdateExpiredRequests();
    if (count > 0) {
      logger.info(`Server startup: Updated ${count} expired service requests`);
    }

    const PORT = process.env.PORT || 4000;
    const server = http.createServer(app);

    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || FRONTEND_URL).split(",").map(s => s.trim());

    io = new Server(server, {
      cors: {
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
          return callback(new Error("CORS policy: origin not allowed"));
        },
        methods: ["GET", "POST"],
        credentials: true,
      }
    });

    // Initialize socketNotify with io (onlineUsers will be managed by sessionManager)
    initializeSocketNotify(io, null);

    // Socket.IO authentication middleware
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.query.token;
        if (!token) {
          logger.debug("Socket authentication: No token provided");
          return next(new Error("No token provided"));
        }

        // Verify and decode token
        let decoded;
        try {
          decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        } catch (jwtError) {
          logger.error("JWT verification error:", jwtError.message);
          if (jwtError.name === 'TokenExpiredError') {
            logger.debug("Socket authentication: Token expired");
            return next(new Error("Token expired"));
          } else if (jwtError.name === 'JsonWebTokenError') {
            logger.debug("Socket authentication: Invalid token signature");
            return next(new Error("Invalid token"));
          } else {
            logger.debug("Socket authentication: Token verification failed:", jwtError.message);
            return next(new Error(jwtError.message || "Token verification failed"));
          }
        }

        // Check token type
        if (!decoded || decoded.type !== "user") {
          logger.debug("Socket authentication: Not a user token, token type:", decoded?.type);
          return next(new Error("Not a user token"));
        }

        // Check if user exists
        const user = await User.findById(decoded.id);
        if (!user) {
          logger.debug("Socket authentication: User not found for ID:", decoded.id);
          return next(new Error("User not found"));
        }

        // Check if user is banned
        if (user.banned) {
          logger.debug("Socket authentication: User is banned:", user._id);
          return next(new Error("Account is banned"));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        logger.debug("Socket authentication: Success for user:", user._id);
        next();
      } catch (err) {
        logger.error("Socket authentication error:", err.message);
        next(new Error("Authentication failed"));
      }
    });

    io.on("connection", async (socket) => {
      logger.info(`Client Connected: ${socket.id}, User: ${socket.userId}`);

      // Register user as online
      const onlineResult = await setUserOnline(socket.userId, socket.id);
      if (onlineResult) {
        // Update user online status in database
        User.findByIdAndUpdate(socket.userId, { isOnline: true })
          .then(() => logger.debug(`User ${socket.userId} set as online in database`))
          .catch(err => logger.error("Error updating online status in database:", err));

        const userSockets = await getUserSockets(socket.userId);
        logger.debug(`User ${socket.userId} now has ${userSockets.length} active sockets`);
      }

      // Handle joining chat rooms (appointment/booking based)
      socket.on("join-chat", async (appointmentId) => {
        try {
          // Verify user has access to this appointment
          const booking = await Booking.findOne({
            _id: appointmentId,
            $or: [
              { requester: socket.userId },
              { provider: socket.userId }
            ]
          });

          if (booking) {
            socket.join(`chat-${appointmentId}`);
            logger.debug(`User ${socket.userId} joined chat room for appointment ${appointmentId}`);

            // Send chat history
            const chatHistory = await Chat.find({ appointment: appointmentId })
              .populate('sender', 'firstName lastName profilePic')
              .sort({ createdAt: 1 });

            socket.emit("chat-history", chatHistory);
          } else {
            socket.emit("error", "Access denied to this chat");
          }
        } catch (error) {
          logger.error("Error joining chat:", error);
          socket.emit("error", "Failed to join chat");
        }
      });

      // Handle joining service request rooms
      socket.on("join-service-request", async (requestId) => {
        try {
          const ServiceRequest = (await import("./models/serviceRequest.js")).default;
          // Verify user has access to this service request
          const request = await ServiceRequest.findOne({
            _id: requestId,
            $or: [
              { requester: socket.userId },
              { serviceProvider: socket.userId },
              { targetProvider: socket.userId }
            ]
          });

          if (request || socket.user.role === "admin") {
            socket.join(`service-request-${requestId}`);
            logger.debug(`User ${socket.userId} joined service request room for ${requestId}`);
          } else {
            socket.emit("error", "Access denied to this service request");
          }
        } catch (error) {
          logger.error("Error joining service request:", error);
          socket.emit("error", "Failed to join service request");
        }
      });

      // Handle sending messages
      socket.on("send-message", async (data) => {
        try {
          const { appointmentId, message } = data;

          // Verify user has access to this appointment
          const booking = await Booking.findOne({
            _id: appointmentId,
            $or: [
              { requester: socket.userId },
              { provider: socket.userId }
            ]
          });

          if (!booking) {
            socket.emit("error", "Access denied to this chat");
            return;
          }

          // Save message to database
          const chatMessage = await Chat.create({
            appointment: appointmentId,
            sender: socket.userId,
            message: message.trim(),
            status: 'sent'
          });

          // Populate sender info
          await chatMessage.populate('sender', 'firstName lastName profilePic');

          // Send to all users in the chat room
          io.to(`chat-${appointmentId}`).emit("new-message", chatMessage);

          // Send notification to other user if they're online
          const otherUserId = booking.requester.toString() === socket.userId
            ? booking.provider.toString()
            : booking.requester.toString();

          const otherUserSockets = await getUserSockets(otherUserId);
          if (otherUserSockets && otherUserSockets.length > 0) {
            // Emit to all sockets of the other user
            for (const socketId of otherUserSockets) {
              io.to(socketId).emit("message-notification", {
                appointmentId,
                message: chatMessage,
                from: socket.user.firstName + " " + socket.user.lastName
              });
            }
          }

          // Update user activity
          await updateUserActivity(socket.userId);

          logger.debug(`Message sent in chat ${appointmentId} by user ${socket.userId}`);
        } catch (error) {
          logger.error("Error sending message:", error);
          socket.emit("error", "Failed to send message");
        }
      });

      // Handle typing indicators
      socket.on("typing", (appointmentId) => {
        socket.to(`chat-${appointmentId}`).emit("user-typing", {
          userId: socket.userId,
          userName: socket.user.firstName + " " + socket.user.lastName
        });
      });

      socket.on("stop-typing", (appointmentId) => {
        socket.to(`chat-${appointmentId}`).emit("user-stopped-typing", {
          userId: socket.userId
        });
      });

      // Handle message seen status
      socket.on("message-seen", async (data) => {
        try {
          const { messageId, appointmentId } = data;

          // Update message status and seenBy array
          await Chat.findByIdAndUpdate(messageId, {
            status: 'seen',
            $addToSet: {
              seenBy: {
                user: socket.userId,
                seenAt: new Date()
              }
            }
          });

          // Notify sender that message was seen
          const message = await Chat.findById(messageId).populate('sender');
          if (message && message.sender._id.toString() !== socket.userId) {
            const senderSockets = await getUserSockets(message.sender._id.toString());
            if (senderSockets && senderSockets.length > 0) {
              // Emit to all sockets of the sender
              for (const socketId of senderSockets) {
                io.to(socketId).emit("message-seen-update", {
                  messageId,
                  seenBy: socket.user.firstName + " " + socket.user.lastName,
                  appointmentId
                });
              }
            }
          }

          // Update user activity
          await updateUserActivity(socket.userId);
        } catch (error) {
          logger.error("Error updating message seen status:", error);
        }
      });

      // Handle disconnect
      socket.on("disconnect", async () => {
        logger.debug(`Client disconnected: ${socket.id}, User: ${socket.userId}`);

        // Remove user socket
        const offlineResult = await setUserOffline(socket.userId, socket.id);
        if (offlineResult) {
          // Check if user has any remaining sockets
          const remainingSockets = await getUserSockets(socket.userId);
          if (remainingSockets.length === 0) {
            // Update user offline status in database
            User.findByIdAndUpdate(socket.userId, { isOnline: false })
              .then(() => logger.debug(`User ${socket.userId} set as offline in database`))
              .catch(err => logger.error("Error updating offline status in database:", err));
          }
        }
      });
    });

    server.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });

  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer();

// For Vercel deployment, export the app
export default app;

// Export io for use in other modules
export { io };
