import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from './utils/logger.js';

dotenv.config();

async function addIndexes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('Connected to MongoDB');

    // Add compound index for getServiceProviders optimization
    await mongoose.connection.db.collection('users').createIndex({
      role: 1,
      skills: 1,
      averageRating: -1,
      totalReviews: -1
    });
    logger.info('Added compound index for users: role, skills, averageRating, totalReviews');

    // Add compound index for getAvailableServiceRequests optimization
    await mongoose.connection.db.collection('servicerequests').createIndex({
      status: 1,
      expiresAt: 1,
      typeOfWork: 1
    });
    logger.info('Added compound index for servicerequests: status, expiresAt, typeOfWork');

    // Add index for review queries
    await mongoose.connection.db.collection('reviews').createIndex({
      reviewee: 1,
      createdAt: -1
    });
    logger.info('Added compound index for reviews: reviewee, createdAt');

    logger.info('All indexes added successfully');
  } catch (error) {
    logger.error('Error adding indexes:', error);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
}

addIndexes();
