import { createClient } from 'redis';
import logger from './logger.js';

// Redis client instance
let redisClient = null;

/**
 * Initialize Redis connection
 */
export const initializeRedis = async () => {
  try {
    if (!process.env.REDIS_URL) {
      logger.warn('REDIS_URL not provided, Redis caching will be disabled');
      return null;
    }

    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 60000,
        lazyConnect: true,
      },
    });

    // Handle connection events
    redisClient.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('disconnect', () => {
      logger.warn('Redis disconnected');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    return null;
  }
};

/**
 * Get Redis client instance
 */
export const getRedisClient = () => {
  return redisClient;
};

/**
 * Set a key-value pair in Redis with optional TTL
 */
export const setCache = async (key, value, ttl = null) => {
  try {
    if (!redisClient) return false;

    const serializedValue = JSON.stringify(value);
    if (ttl) {
      await redisClient.setEx(key, ttl, serializedValue);
    } else {
      await redisClient.set(key, serializedValue);
    }
    return true;
  } catch (error) {
    logger.error('Redis set error:', error);
    return false;
  }
};

/**
 * Get a value from Redis cache
 */
export const getCache = async (key) => {
  try {
    if (!redisClient) return null;

    const value = await redisClient.get(key);
    if (value) {
      return JSON.parse(value);
    }
    return null;
  } catch (error) {
    logger.error('Redis get error:', error);
    return null;
  }
};

/**
 * Delete a key from Redis cache
 */
export const deleteCache = async (key) => {
  try {
    if (!redisClient) return false;

    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error('Redis delete error:', error);
    return false;
  }
};

/**
 * Set multiple key-value pairs in Redis
 */
export const setMultipleCache = async (keyValuePairs, ttl = null) => {
  try {
    if (!redisClient) return false;

    const pipeline = redisClient.multi();
    keyValuePairs.forEach(({ key, value }) => {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        pipeline.setEx(key, ttl, serializedValue);
      } else {
        pipeline.set(key, serializedValue);
      }
    });
    await pipeline.exec();
    return true;
  } catch (error) {
    logger.error('Redis setMultiple error:', error);
    return false;
  }
};

/**
 * Get multiple values from Redis cache
 */
export const getMultipleCache = async (keys) => {
  try {
    if (!redisClient) return [];

    const values = await redisClient.mGet(keys);
    return values.map(value => value ? JSON.parse(value) : null);
  } catch (error) {
    logger.error('Redis getMultiple error:', error);
    return [];
  }
};

/**
 * Clear all cache keys matching a pattern
 */
export const clearCacheByPattern = async (pattern) => {
  try {
    if (!redisClient) return false;

    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return true;
  } catch (error) {
    logger.error('Redis clearCacheByPattern error:', error);
    return false;
  }
};

/**
 * Check if Redis is connected and ready
 */
export const isRedisReady = () => {
  return redisClient && redisClient.isReady;
};

/**
 * Close Redis connection
 */
export const closeRedis = async () => {
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis connection closed');
    }
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
};

export default {
  initializeRedis,
  getRedisClient,
  setCache,
  getCache,
  deleteCache,
  setMultipleCache,
  getMultipleCache,
  clearCacheByPattern,
  isRedisReady,
  closeRedis,
};
