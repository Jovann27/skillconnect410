import Queue from 'bull';
import logger from './logger.js';
import { sendEmail } from './emailService.js';

// Email queue instance
let emailQueue = null;

/**
 * Initialize email queue
 */
export const initializeEmailQueue = async () => {
  try {
    if (!process.env.REDIS_URL) {
      logger.warn('REDIS_URL not provided, email queue will be disabled');
      return null;
    }

    emailQueue = new Queue('email-queue', {
      redis: process.env.REDIS_URL,
      defaultJobOptions: {
        removeOnComplete: 50, // Keep only last 50 completed jobs
        removeOnFail: 100, // Keep only last 100 failed jobs
        attempts: 3, // Retry failed jobs 3 times
        backoff: {
          type: 'exponential',
          delay: 2000, // Initial delay 2 seconds
        },
      },
    });

    // Process email jobs
    emailQueue.process('send-email', async (job) => {
      const { to, subject, html, options = {} } = job.data;

      logger.info(`Processing email job ${job.id} to ${to}`);

      try {
        const result = await sendEmail(to, subject, html, options.maxRetries || 3);
        logger.info(`Email job ${job.id} completed successfully`);
        return result;
      } catch (error) {
        logger.error(`Email job ${job.id} failed:`, error.message);
        throw error;
      }
    });

    // Handle job completion
    emailQueue.on('completed', (job, result) => {
      logger.info(`Email job ${job.id} completed successfully`);
    });

    // Handle job failure
    emailQueue.on('failed', (job, err) => {
      logger.error(`Email job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
    });

    // Handle queue ready
    emailQueue.on('ready', () => {
      logger.info('Email queue is ready');
    });

    // Handle queue error
    emailQueue.on('error', (error) => {
      logger.error('Email queue error:', error);
    });

    logger.info('Email queue initialized successfully');
    return emailQueue;
  } catch (error) {
    logger.error('Failed to initialize email queue:', error);
    return null;
  }
};

/**
 * Add email job to queue
 */
export const addEmailToQueue = async (to, subject, html, options = {}) => {
  try {
    if (!emailQueue) {
      logger.warn('Email queue not initialized, sending email directly');
      return await sendEmail(to, subject, html, options.maxRetries || 3);
    }

    const job = await emailQueue.add('send-email', {
      to,
      subject,
      html,
      options,
    });

    logger.info(`Email job added to queue with ID: ${job.id}`);
    return job;
  } catch (error) {
    logger.error('Failed to add email to queue:', error);
    throw error;
  }
};

/**
 * Get queue statistics
 */
export const getQueueStats = async () => {
  try {
    if (!emailQueue) return null;

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      emailQueue.getWaiting(),
      emailQueue.getActive(),
      emailQueue.getCompleted(),
      emailQueue.getFailed(),
      emailQueue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  } catch (error) {
    logger.error('Failed to get queue stats:', error);
    return null;
  }
};

/**
 * Get email queue instance
 */
export const getEmailQueue = () => {
  return emailQueue;
};

/**
 * Close email queue
 */
export const closeEmailQueue = async () => {
  try {
    if (emailQueue) {
      await emailQueue.close();
      logger.info('Email queue closed');
    }
  } catch (error) {
    logger.error('Error closing email queue:', error);
  }
};

export default {
  initializeEmailQueue,
  addEmailToQueue,
  getQueueStats,
  getEmailQueue,
  closeEmailQueue,
};
