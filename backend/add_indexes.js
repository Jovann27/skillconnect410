import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function addIndexes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Add compound index for getServiceProviders optimization
    await mongoose.connection.db.collection('users').createIndex({
      role: 1,
      skills: 1,
      averageRating: -1,
      totalReviews: -1
    });
    console.log('Added compound index for users: role, skills, averageRating, totalReviews');

    // Add compound index for getAvailableServiceRequests optimization
    await mongoose.connection.db.collection('servicerequests').createIndex({
      status: 1,
      expiresAt: 1,
      typeOfWork: 1
    });
    console.log('Added compound index for servicerequests: status, expiresAt, typeOfWork');

    // Add index for review queries
    await mongoose.connection.db.collection('reviews').createIndex({
      reviewee: 1,
      createdAt: -1
    });
    console.log('Added compound index for reviews: reviewee, createdAt');

    console.log('All indexes added successfully');
  } catch (error) {
    console.error('Error adding indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

addIndexes();
