import logger from './logger.js';
import { sendEmail } from './emailService.js';

// Email queue instance (using direct email sending)
let emailQueue = null;

/**
 * Initialize email queue (no queue initialization needed)
 */
export const initializeEmailQueue = async () => {
  try {
    logger.info('Email queue initialized - emails will be sent directly');
    return null;
  } catch (error) {
    logger.error('Failed to initialize email queue:', error);
    return null;
  }
};

/**
 * Add email job to queue (send directly)
 */
export const addEmailToQueue = async (to, subject, html, options = {}) => {
  try {
    return await sendEmail(to, subject, html, options.maxRetries || 3);
  } catch (error) {
    logger.error('Failed to send email:', error);
    throw error;
  }
};

/**
 * Get queue statistics (always return null)
 */
export const getQueueStats = async () => {
  return null;
};

/**
 * Get email queue instance (always return null)
 */
export const getEmailQueue = () => {
  return null;
};

/**
 * Close email queue (no-op)
 */
export const closeEmailQueue = async () => {
  logger.info('Email queue closed');
};

export default {
  initializeEmailQueue,
  addEmailToQueue,
  getQueueStats,
  getEmailQueue,
  closeEmailQueue,
};
