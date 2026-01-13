import nodemailer from 'nodemailer';
import logger from './logger.js';
import { addEmailToQueue } from './emailQueue.js';
import { targetedRequestNotificationTemplate } from './emailTemplates.js';

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email service
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD
  }
});

// Send email function with retry mechanism
export const sendEmail = async (to, subject, html, maxRetries = 3) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const mailOptions = {
        from: process.env.SMTP_EMAIL,
        to,
        subject,
        html
      };

      const result = await transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully on attempt ${attempt}:`, result.messageId);
      return result;
    } catch (error) {
      logger.warn(`Email send attempt ${attempt} failed:`, error.message);
      lastError = error;

      // If this is not the last attempt, wait before retrying
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Exponential backoff, max 30 seconds
        logger.info(`Retrying email send in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  logger.error('All email send attempts failed after', maxRetries, 'retries');
  throw lastError;
};

// Queue email for processing
export const queueEmail = async (to, subject, html, options = {}) => {
  try {
    return await addEmailToQueue(to, subject, html, options);
  } catch (error) {
    logger.error('Failed to queue email:', error);
    throw error;
  }
};

// Send targeted service request notification
export const sendTargetedRequestNotification = async (providerEmail, providerName, requesterName, serviceType, requestId, requestDetails = '') => {
  const subject = `New Targeted Service Request - ${serviceType}`;
  const html = targetedRequestNotificationTemplate(providerName, requesterName, serviceType, requestId, requestDetails);

  return await queueEmail(providerEmail, subject, html);
};
