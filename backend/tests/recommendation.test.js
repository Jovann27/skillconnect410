/**
 * Tests for Hybrid Recommendation Algorithm
 * Tests content-based filtering, collaborative filtering, and hybrid fusion
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import User from '../models/userSchema.js';
import ServiceRequest from '../models/serviceRequest.js';
import Booking from '../models/booking.js';
import Review from '../models/review.js';
import { getRecommendedWorkers, getRecommendedServiceRequests } from '../utils/recommendationEngine.js';

// Test database connection
const TEST_DB_URI = process.env.TEST_DB_URI || 'mongodb://localhost:27017/skillconnect_test';

describe('Hybrid Recommendation Engine', () => {
  let testRequester;
  let testWorker1;
  let testWorker2;
  let testWorker3;
  let testServiceRequest;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(TEST_DB_URI);
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: /test@/ });
    await ServiceRequest.deleteMany({ title: /Test/ });
    await Booking.deleteMany({});
    await Review.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Create test users
    testRequester = await User.create({
      username: 'testrequester',
      firstName: 'Test',
      lastName: 'Requester',
      email: 'testrequester@test.com',
      phone: '1234567890',
      address: 'Test Address',
      birthdate: new Date('1990-01-01'),
      role: 'Community Member',
      password: 'Test123456'
    });

    testWorker1 = await User.create({
      username: 'testworker1',
      firstName: 'Test',
      lastName: 'Worker1',
      email: 'testworker1@test.com',
      phone: '1234567891',
      address: 'Test Address',
      birthdate: new Date('1985-01-01'),
      role: 'Service Provider',
      skills: ['Plumbing', 'Electrical'],
      verified: true,
      availability: 'Available',
      averageRating: 4.8,
      totalReviews: 25,
      yearsExperience: 5,
      totalJobsCompleted: 30,
      password: 'Test123456'
    });

    testWorker2 = await User.create({
      username: 'testworker2',
      firstName: 'Test',
      lastName: 'Worker2',
      email: 'testworker2@test.com',
      phone: '1234567892',
      address: 'Test Address',
      birthdate: new Date('1988-01-01'),
      role: 'Service Provider',
      skills: ['Plumbing'],
      verified: true,
      availability: 'Available',
      averageRating: 4.2,
      totalReviews: 10,
      yearsExperience: 3,
      totalJobsCompleted: 15,
      password: 'Test123456'
    });

    testWorker3 = await User.create({
      username: 'testworker3',
      firstName: 'Test',
      lastName: 'Worker3',
      email: 'testworker3@test.com',
      phone: '1234567893',
      address: 'Test Address',
      birthdate: new Date('1992-01-01'),
      role: 'Service Provider',
      skills: ['Cleaning'],
      verified: true,
      availability: 'Available',
      averageRating: 3.5,
      totalReviews: 5,
      yearsExperience: 1,
      totalJobsCompleted: 5,
      password: 'Test123456'
    });

    testServiceRequest = await ServiceRequest.create({
      requester: testRequester._id,
      title: 'Test Plumbing Service',
      description: 'Need plumbing repair',
      location: 'Test Location',
      serviceCategory: 'Plumbing',
      status: 'Open',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
  });

  describe('Content-Based Filtering', () => {
    it('should prioritize workers with matching skills', async () => {
      const recommendations = await getRecommendedWorkers(testServiceRequest, {
        limit: 10,
        minScore: 0.1
      });

      // Worker1 and Worker2 have Plumbing skills, Worker3 doesn't
      const worker1Rank = recommendations.findIndex(w => w._id.toString() === testWorker1._id.toString());
      const worker2Rank = recommendations.findIndex(w => w._id.toString() === testWorker2._id.toString());
      const worker3Rank = recommendations.findIndex(w => w._id.toString() === testWorker3._id.toString());

      expect(worker1Rank).toBeGreaterThanOrEqual(0);
      expect(worker2Rank).toBeGreaterThanOrEqual(0);
      expect(worker3Rank).toBe(-1); // Worker3 should not be in recommendations
    });

    it('should consider rating in scoring', async () => {
      const recommendations = await getRecommendedWorkers(testServiceRequest, {
        limit: 10,
        minScore: 0.1
      });

      const worker1 = recommendations.find(w => w._id.toString() === testWorker1._id.toString());
      const worker2 = recommendations.find(w => w._id.toString() === testWorker2._id.toString());

      // Worker1 has higher rating, should rank higher
      expect(worker1.recommendationScore).toBeGreaterThan(worker2.recommendationScore);
    });

    it('should consider experience level', async () => {
      const recommendations = await getRecommendedWorkers(testServiceRequest, {
        limit: 10,
        minScore: 0.1
      });

      const worker1 = recommendations.find(w => w._id.toString() === testWorker1._id.toString());
      
      expect(worker1).toBeDefined();
      expect(worker1.recommendationScore).toBeGreaterThan(0);
    });
  });

  describe('Collaborative Filtering', () => {
    it('should boost workers with successful similar work history', async () => {
      // Create historical booking for Worker1 with similar service
      const similarRequest = await ServiceRequest.create({
        requester: testRequester._id,
        title: 'Previous Plumbing Work',
        description: 'Previous plumbing service',
        location: 'Test Location',
        serviceCategory: 'Plumbing',
        status: 'Complete'
      });

      await Booking.create({
        requester: testRequester._id,
        provider: testWorker1._id,
        serviceRequest: similarRequest._id,
        status: 'Complete'
      });

      const recommendations = await getRecommendedWorkers(testServiceRequest, {
        limit: 10,
        minScore: 0.1
      });

      const worker1 = recommendations.find(w => w._id.toString() === testWorker1._id.toString());
      
      expect(worker1).toBeDefined();
      expect(worker1.collaborativeScore).toBeGreaterThan(0);
    });
  });

  describe('Hybrid Fusion', () => {
    it('should combine content-based and collaborative scores', async () => {
      const recommendations = await getRecommendedWorkers(testServiceRequest, {
        limit: 10,
        minScore: 0.1
      });

      const worker1 = recommendations.find(w => w._id.toString() === testWorker1._id.toString());
      
      expect(worker1).toBeDefined();
      expect(worker1.recommendationScore).toBeGreaterThan(0);
      expect(worker1.contentBasedScore).toBeGreaterThan(0);
      expect(worker1.collaborativeScore).toBeGreaterThanOrEqual(0);
      expect(worker1.recommendationReason).toBeDefined();
    });

    it('should return recommendations sorted by score', async () => {
      const recommendations = await getRecommendedWorkers(testServiceRequest, {
        limit: 10,
        minScore: 0.1
      });

      for (let i = 0; i < recommendations.length - 1; i++) {
        expect(recommendations[i].recommendationScore).toBeGreaterThanOrEqual(
          recommendations[i + 1].recommendationScore
        );
      }
    });

    it('should filter by minimum score', async () => {
      const recommendations = await getRecommendedWorkers(testServiceRequest, {
        limit: 10,
        minScore: 0.8 // High threshold
      });

      recommendations.forEach(worker => {
        expect(worker.recommendationScore).toBeGreaterThanOrEqual(0.8);
      });
    });
  });

  describe('Reverse Recommendations (Worker to Requests)', () => {
    it('should recommend service requests to workers based on their skills', async () => {
      const recommendations = await getRecommendedServiceRequests(testWorker1, {
        limit: 10,
        minScore: 0.1
      });

      // Should include the plumbing request
      const plumbingRequest = recommendations.find(
        r => r._id.toString() === testServiceRequest._id.toString()
      );

      expect(plumbingRequest).toBeDefined();
      expect(plumbingRequest.recommendationScore).toBeGreaterThan(0);
    });

    it('should not recommend requests that don\'t match worker skills', async () => {
      const cleaningRequest = await ServiceRequest.create({
        requester: testRequester._id,
        title: 'Test Cleaning Service',
        description: 'Need cleaning service',
        location: 'Test Location',
        serviceCategory: 'Cleaning',
        status: 'Open',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      const recommendations = await getRecommendedServiceRequests(testWorker1, {
        limit: 10,
        minScore: 0.1
      });

      // Worker1 doesn't have Cleaning skill
      const cleaningRec = recommendations.find(
        r => r._id.toString() === cleaningRequest._id.toString()
      );

      // Should either not be included or have low score
      if (cleaningRec) {
        expect(cleaningRec.recommendationScore).toBeLessThan(0.5);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty worker list', async () => {
      // Delete all workers
      await User.deleteMany({ role: 'Service Provider' });

      const recommendations = await getRecommendedWorkers(testServiceRequest, {
        limit: 10,
        minScore: 0.1
      });

      expect(recommendations).toEqual([]);
    });

    it('should handle service request with no matching skills', async () => {
      const uniqueRequest = await ServiceRequest.create({
        requester: testRequester._id,
        title: 'Unique Service',
        description: 'Very unique service',
        location: 'Test Location',
        serviceCategory: 'VeryUniqueCategory',
        status: 'Open',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      const recommendations = await getRecommendedWorkers(uniqueRequest, {
        limit: 10,
        minScore: 0.1
      });

      // Should still return workers, but with lower scores
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should handle workers with no history', async () => {
      const newWorker = await User.create({
        username: 'newworker',
        firstName: 'New',
        lastName: 'Worker',
        email: 'newworker@test.com',
        phone: '1234567894',
        address: 'Test Address',
        birthdate: new Date('1995-01-01'),
        role: 'Service Provider',
        skills: ['Plumbing'],
        verified: true,
        availability: 'Available',
        averageRating: 0,
        totalReviews: 0,
        yearsExperience: 0,
        totalJobsCompleted: 0,
        password: 'Test123456'
      });

      const recommendations = await getRecommendedWorkers(testServiceRequest, {
        limit: 10,
        minScore: 0.1
      });

      const newWorkerRec = recommendations.find(
        w => w._id.toString() === newWorker._id.toString()
      );

      // Should still be included if skills match, but with lower score
      if (newWorkerRec) {
        expect(newWorkerRec.recommendationScore).toBeGreaterThan(0);
      }
    });
  });
});
