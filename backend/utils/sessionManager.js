import logger from './logger.js';

/**
 * Session management - Redis disabled
 * All functions return empty/dummy values since Redis is not available
 */

// In-memory storage for socket connections (temporary, will be lost on restart)
const userSockets = new Map(); // userId -> Set of socketIds

/**
 * Set user online status (dummy implementation - Redis disabled)
 */
export const setUserOnline = async (userId, socketId = null) => {
  // Redis disabled - return true
  return true;
};

/**
 * Set user offline status (dummy implementation - Redis disabled)
 */
export const setUserOffline = async (userId, socketId = null) => {
  // Redis disabled - return true
  return true;
};

/**
 * Update user activity timestamp (dummy implementation - Redis disabled)
 */
export const updateUserActivity = async (userId) => {
  // Redis disabled - return true
  return true;
};

/**
 * Check if user is online (dummy implementation - Redis disabled)
 */
export const isUserOnline = async (userId) => {
  // Redis disabled - return false
  return false;
};

/**
 * Get user's socket connections (in-memory implementation)
 */
export const getUserSockets = async (userId) => {
  const userIdStr = userId.toString();
  const sockets = userSockets.get(userIdStr);
  return sockets ? Array.from(sockets) : [];
};

/**
 * Add socket to user's socket set (in-memory implementation)
 */
export const addUserSocket = async (userId, socketId) => {
  const userIdStr = userId.toString();
  if (!userSockets.has(userIdStr)) {
    userSockets.set(userIdStr, new Set());
  }
  userSockets.get(userIdStr).add(socketId);
  return true;
};

/**
 * Remove socket from user's socket set (in-memory implementation)
 */
export const removeUserSocket = async (userId, socketId) => {
  const userIdStr = userId.toString();
  const sockets = userSockets.get(userIdStr);
  if (sockets) {
    sockets.delete(socketId);
    // Clean up empty sets
    if (sockets.size === 0) {
      userSockets.delete(userIdStr);
    }
  }
  return true;
};

/**
 * Get user ID from socket ID (dummy implementation - Redis disabled)
 */
export const getUserFromSocket = async (socketId) => {
  // Redis disabled - return null
  return null;
};

/**
 * Get all online users (dummy implementation - Redis disabled)
 */
export const getOnlineUsers = async () => {
  // Redis disabled - return empty array
  return [];
};

/**
 * Clean up expired sessions (dummy implementation - Redis disabled)
 */
export const cleanupExpiredSessions = async () => {
  // Redis disabled - do nothing
};

/**
 * Get session statistics (dummy implementation - Redis disabled)
 */
export const getSessionStats = async () => {
  return {
    onlineUsers: 0,
    totalSockets: userSockets.size > 0 ? Array.from(userSockets.values()).reduce((acc, set) => acc + set.size, 0) : 0,
    timestamp: new Date().toISOString()
  };
};

export default {
  setUserOnline,
  setUserOffline,
  updateUserActivity,
  isUserOnline,
  getUserSockets,
  addUserSocket,
  removeUserSocket,
  getUserFromSocket,
  getOnlineUsers,
  cleanupExpiredSessions,
  getSessionStats,
};
