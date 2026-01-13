import { getRedisClient, setCache, getCache, deleteCache } from './redis.js';
import logger from './logger.js';

/**
 * Session management using Redis for scalability
 * Handles online user status and socket connections
 */

const SESSION_PREFIX = 'session:';
const ONLINE_USERS_PREFIX = 'online_users:';
const USER_SOCKETS_PREFIX = 'user_sockets:';
const SOCKET_USER_PREFIX = 'socket_user:';

// Session TTL (24 hours)
const SESSION_TTL = 24 * 60 * 60;
// Online status TTL (5 minutes - refreshed on activity)
const ONLINE_TTL = 5 * 60;

/**
 * Set user online status in Redis
 */
export const setUserOnline = async (userId, socketId = null) => {
  try {
    const redis = getRedisClient();
    if (!redis) {
      logger.warn('Redis not available for session management');
      return false;
    }

    const userIdStr = userId.toString();

    // Set user as online
    await setCache(`${ONLINE_USERS_PREFIX}${userIdStr}`, {
      userId: userIdStr,
      onlineSince: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    }, ONLINE_TTL);

    // If socket ID provided, map socket to user
    if (socketId) {
      await setCache(`${SOCKET_USER_PREFIX}${socketId}`, {
        userId: userIdStr,
        connectedAt: new Date().toISOString()
      }, SESSION_TTL);

      // Add socket to user's socket set
      await addUserSocket(userIdStr, socketId);
    }

    logger.debug(`User ${userIdStr} set as online`);
    return true;
  } catch (error) {
    logger.error('Error setting user online:', error);
    return false;
  }
};

/**
 * Set user offline status
 */
export const setUserOffline = async (userId, socketId = null) => {
  try {
    const redis = getRedisClient();
    if (!redis) {
      logger.warn('Redis not available for session management');
      return false;
    }

    const userIdStr = userId.toString();

    // If specific socket provided, remove it from user's sockets
    if (socketId) {
      await removeUserSocket(userIdStr, socketId);
      await deleteCache(`${SOCKET_USER_PREFIX}${socketId}`);

      // Check if user has any remaining sockets
      const remainingSockets = await getUserSockets(userIdStr);
      if (remainingSockets.length === 0) {
        // No more sockets, set user offline
        await deleteCache(`${ONLINE_USERS_PREFIX}${userIdStr}`);
        logger.debug(`User ${userIdStr} set as offline (no remaining sockets)`);
      } else {
        // Still has sockets, just update activity
        await updateUserActivity(userIdStr);
        logger.debug(`User ${userIdStr} socket ${socketId} removed, still online`);
      }
    } else {
      // Force offline (remove all sockets and online status)
      const userSockets = await getUserSockets(userIdStr);
      for (const socketId of userSockets) {
        await deleteCache(`${SOCKET_USER_PREFIX}${socketId}`);
      }
      await deleteCache(`${USER_SOCKETS_PREFIX}${userIdStr}`);
      await deleteCache(`${ONLINE_USERS_PREFIX}${userIdStr}`);
      logger.debug(`User ${userIdStr} forcefully set as offline`);
    }

    return true;
  } catch (error) {
    logger.error('Error setting user offline:', error);
    return false;
  }
};

/**
 * Update user activity timestamp
 */
export const updateUserActivity = async (userId) => {
  try {
    const redis = getRedisClient();
    if (!redis) return false;

    const userIdStr = userId.toString();
    const onlineData = await getCache(`${ONLINE_USERS_PREFIX}${userIdStr}`);

    if (onlineData) {
      onlineData.lastActivity = new Date().toISOString();
      await setCache(`${ONLINE_USERS_PREFIX}${userIdStr}`, onlineData, ONLINE_TTL);
    }

    return true;
  } catch (error) {
    logger.error('Error updating user activity:', error);
    return false;
  }
};

/**
 * Check if user is online
 */
export const isUserOnline = async (userId) => {
  try {
    const redis = getRedisClient();
    if (!redis) return false;

    const onlineData = await getCache(`${ONLINE_USERS_PREFIX}${userId.toString()}`);
    return !!onlineData;
  } catch (error) {
    logger.error('Error checking user online status:', error);
    return false;
  }
};

/**
 * Get user's socket connections
 */
export const getUserSockets = async (userId) => {
  try {
    const redis = getRedisClient();
    if (!redis) return [];

    const userIdStr = userId.toString();
    const socketsKey = `${USER_SOCKETS_PREFIX}${userIdStr}`;

    // Get all socket IDs for this user
    const sockets = await redis.sMembers(socketsKey);
    return sockets || [];
  } catch (error) {
    logger.error('Error getting user sockets:', error);
    return [];
  }
};

/**
 * Add socket to user's socket set
 */
export const addUserSocket = async (userId, socketId) => {
  try {
    const redis = getRedisClient();
    if (!redis) return false;

    const userIdStr = userId.toString();
    const socketsKey = `${USER_SOCKETS_PREFIX}${userIdStr}`;

    await redis.sAdd(socketsKey, socketId);
    // Set expiration on the set
    await redis.expire(socketsKey, SESSION_TTL);

    return true;
  } catch (error) {
    logger.error('Error adding user socket:', error);
    return false;
  }
};

/**
 * Remove socket from user's socket set
 */
export const removeUserSocket = async (userId, socketId) => {
  try {
    const redis = getRedisClient();
    if (!redis) return false;

    const userIdStr = userId.toString();
    const socketsKey = `${USER_SOCKETS_PREFIX}${userIdStr}`;

    await redis.sRem(socketsKey, socketId);
    return true;
  } catch (error) {
    logger.error('Error removing user socket:', error);
    return false;
  }
};

/**
 * Get user ID from socket ID
 */
export const getUserFromSocket = async (socketId) => {
  try {
    const redis = getRedisClient();
    if (!redis) return null;

    const socketData = await getCache(`${SOCKET_USER_PREFIX}${socketId}`);
    return socketData ? socketData.userId : null;
  } catch (error) {
    logger.error('Error getting user from socket:', error);
    return null;
  }
};

/**
 * Get all online users
 */
export const getOnlineUsers = async () => {
  try {
    const redis = getRedisClient();
    if (!redis) return [];

    const keys = await redis.keys(`${ONLINE_USERS_PREFIX}*`);
    if (keys.length === 0) return [];

    const onlineUsers = [];
    for (const key of keys) {
      const userData = await getCache(key);
      if (userData) {
        onlineUsers.push(userData);
      }
    }

    return onlineUsers;
  } catch (error) {
    logger.error('Error getting online users:', error);
    return [];
  }
};

/**
 * Clean up expired sessions (called periodically)
 */
export const cleanupExpiredSessions = async () => {
  try {
    const redis = getRedisClient();
    if (!redis) return;

    logger.info('Running session cleanup...');

    // Get all online users
    const onlineUsers = await getOnlineUsers();
    let cleanedCount = 0;

    for (const userData of onlineUsers) {
      const userSockets = await getUserSockets(userData.userId);

      // Check if any sockets are still valid
      let hasValidSockets = false;
      for (const socketId of userSockets) {
        const socketData = await getCache(`${SOCKET_USER_PREFIX}${socketId}`);
        if (socketData) {
          hasValidSockets = true;
          break;
        }
      }

      // If no valid sockets, remove online status
      if (!hasValidSockets) {
        await deleteCache(`${ONLINE_USERS_PREFIX}${userData.userId}`);
        await deleteCache(`${USER_SOCKETS_PREFIX}${userData.userId}`);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired sessions`);
    }
  } catch (error) {
    logger.error('Error during session cleanup:', error);
  }
};

/**
 * Get session statistics
 */
export const getSessionStats = async () => {
  try {
    const redis = getRedisClient();
    if (!redis) return null;

    const onlineUsers = await getOnlineUsers();
    const totalSockets = await redis.keys(`${SOCKET_USER_PREFIX}*`);

    return {
      onlineUsers: onlineUsers.length,
      totalSockets: totalSockets.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error getting session stats:', error);
    return null;
  }
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
