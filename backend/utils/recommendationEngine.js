/**
 * Hybrid Recommendation Engine for Worker-Service Matching
 * Combines Content-Based Filtering and Collaborative Filtering
 * 
 * This module implements a hybrid recommendation algorithm that:
 * 1. Content-Based Filtering: Matches workers based on their skills, experience, ratings
 * 2. Collaborative Filtering: Uses historical booking patterns and user preferences
 * 3. Hybrid Fusion: Combines both approaches with weighted scoring
 */

import User from "../models/userSchema.js";
import ServiceRequest from "../models/serviceRequest.js";
import Booking from "../models/booking.js";
import Review from "../models/review.js";

/**
 * Calculate content-based similarity score between a worker and service request
 * @param {Object} worker - Worker user object
 * @param {Object} serviceRequest - Service request object
 * @returns {number} Content-based similarity score (0-1)
 */
const calculateContentBasedScore = (worker, serviceRequest) => {
  let score = 0;
  let factors = 0;

  // Factor 1: Skill Match (40% weight)
  if (serviceRequest.serviceCategory && worker.skills) {
    const serviceCategoryLower = serviceRequest.serviceCategory.toLowerCase();
    const matchingSkills = worker.skills.filter(skill => 
      skill.toLowerCase().includes(serviceCategoryLower) ||
      serviceCategoryLower.includes(skill.toLowerCase())
    );
    const skillMatchRatio = matchingSkills.length / Math.max(worker.skills.length, 1);
    score += skillMatchRatio * 0.4;
    factors += 0.4;
  }

  // Factor 2: Rating Score (25% weight)
  if (worker.averageRating) {
    // Normalize rating from 0-5 scale to 0-1
    const normalizedRating = worker.averageRating / 5.0;
    score += normalizedRating * 0.25;
    factors += 0.25;
  }

  // Factor 3: Review Count (15% weight) - More reviews = more reliable
  if (worker.totalReviews) {
    // Normalize: 10+ reviews = full score, logarithmic scale
    const reviewScore = Math.min(Math.log10(worker.totalReviews + 1) / Math.log10(11), 1);
    score += reviewScore * 0.15;
    factors += 0.15;
  }

  // Factor 4: Experience Level (10% weight)
  if (worker.yearsExperience) {
    // Normalize: 5+ years = full score
    const experienceScore = Math.min(worker.yearsExperience / 5.0, 1);
    score += experienceScore * 0.1;
    factors += 0.1;
  }

  // Factor 5: Job Completion Rate (10% weight)
  if (worker.totalJobsCompleted) {
    // Normalize: 20+ completed jobs = full score
    const completionScore = Math.min(worker.totalJobsCompleted / 20.0, 1);
    score += completionScore * 0.1;
    factors += 0.1;
  }

  // Normalize by actual factors present
  return factors > 0 ? score / factors : 0;
};

/**
 * Calculate collaborative filtering score based on similar users' preferences
 * @param {Object} worker - Worker user object
 * @param {Object} serviceRequest - Service request object
 * @param {Array} similarRequests - Array of similar service requests
 * @param {Array} historicalBookings - Array of historical bookings
 * @returns {number} Collaborative filtering score (0-1)
 */
const calculateCollaborativeScore = async (worker, serviceRequest, similarRequests, historicalBookings) => {
  let score = 0;
  let factors = 0;

  // Factor 1: Historical Success Rate (40% weight)
  // Check if worker has completed similar service requests successfully
  const workerBookings = historicalBookings.filter(
    booking => String(booking.provider) === String(worker._id) && 
               booking.status === 'Complete'
  );

  if (workerBookings.length > 0) {
    // Find similar completed bookings
    const similarCompletedBookings = workerBookings.filter(booking => {
      if (!booking.serviceRequest) return false;
      const bookingService = booking.serviceRequest.serviceCategory || booking.serviceRequest.typeOfWork;
      return bookingService && 
             bookingService.toLowerCase() === serviceRequest.serviceCategory?.toLowerCase();
    });

    const successRate = similarCompletedBookings.length / Math.max(workerBookings.length, 1);
    score += successRate * 0.4;
    factors += 0.4;
  }

  // Factor 2: Popularity Among Similar Users (30% weight)
  // Check how many similar requests were fulfilled by this worker type
  if (similarRequests.length > 0) {
    const fulfilledSimilarRequests = similarRequests.filter(req => 
      req.status === 'Complete' || req.status === 'Working'
    );
    
    // Check if this worker type (based on skills) fulfilled similar requests
    const workerTypeFulfillments = fulfilledSimilarRequests.filter(req => {
      if (!req.serviceProvider) return false;
      // This would require populating serviceProvider, simplified here
      return true;
    });

    const popularityScore = workerTypeFulfillments.length / Math.max(similarRequests.length, 1);
    score += popularityScore * 0.3;
    factors += 0.3;
  }

  // Factor 3: User Preference Patterns (30% weight)
  // Check if requester has worked with similar workers before
  if (serviceRequest.requester) {
    const requesterBookings = historicalBookings.filter(
      booking => String(booking.requester) === String(serviceRequest.requester)
    );

    if (requesterBookings.length > 0) {
      // Check if requester prefers workers with similar skills
      const completedWithSimilarWorkers = requesterBookings.filter(booking => {
        // This would require populating provider details
        return booking.status === 'Complete';
      });

      const preferenceScore = completedWithSimilarWorkers.length / Math.max(requesterBookings.length, 1);
      score += preferenceScore * 0.3;
      factors += 0.3;
    }
  }

  // Normalize by actual factors present
  return factors > 0 ? score / factors : 0.5; // Default to 0.5 if no data
};

/**
 * Hybrid recommendation function that combines content-based and collaborative filtering
 * @param {Object} serviceRequest - The service request to find matches for
 * @param {Object} options - Options for recommendation (limit, minScore, etc.)
 * @returns {Array} Array of recommended workers with scores
 */
export const getRecommendedWorkers = async (serviceRequest, options = {}) => {
  const {
    limit = 10,
    minScore = 0.3,
    includeUnavailable = false
  } = options;

  try {
    // Step 1: Get all eligible workers
    let workerQuery = {
      role: "Service Provider",
      verified: true
    };

    if (!includeUnavailable) {
      workerQuery.availability = { $ne: "Not Available" };
    }

    const workers = await User.find(workerQuery)
      .select('firstName lastName email phone skills serviceDescription serviceRate profilePic isOnline averageRating totalReviews address verified occupation yearsExperience totalJobsCompleted createdAt');

    if (workers.length === 0) {
      return [];
    }

    // Step 2: Get historical data for collaborative filtering
    const historicalBookings = await Booking.find({
      status: { $in: ['Complete', 'Working'] }
    })
      .populate('serviceRequest', 'serviceCategory typeOfWork')
      .populate('provider', 'skills')
      .populate('requester');

    // Find similar service requests for collaborative filtering
    const similarRequests = await ServiceRequest.find({
      serviceCategory: serviceRequest.serviceCategory,
      _id: { $ne: serviceRequest._id }
    }).limit(50);

    // Step 3: Calculate scores for each worker
    const workerScores = await Promise.all(
      workers.map(async (worker) => {
        // Content-based score
        const contentScore = calculateContentBasedScore(worker, serviceRequest);

        // Collaborative filtering score
        const collaborativeScore = await calculateCollaborativeScore(
          worker,
          serviceRequest,
          similarRequests,
          historicalBookings
        );

        // Hybrid fusion: Weighted combination
        // Content-based: 60% weight (more reliable for new workers)
        // Collaborative: 40% weight (better for experienced workers with history)
        const hybridScore = (contentScore * 0.6) + (collaborativeScore * 0.4);

        return {
          worker: worker.toObject(),
          scores: {
            contentBased: contentScore,
            collaborative: collaborativeScore,
            hybrid: hybridScore
          },
          finalScore: hybridScore
        };
      })
    );

    // Step 4: Sort by final score and filter by minimum score
    const recommendedWorkers = workerScores
      .filter(item => item.finalScore >= minScore)
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, limit)
      .map(item => ({
        ...item.worker,
        recommendationScore: item.finalScore,
        contentBasedScore: item.scores.contentBased,
        collaborativeScore: item.scores.collaborative,
        recommendationReason: generateRecommendationReason(item)
      }));

    return recommendedWorkers;
  } catch (error) {
    console.error('Error in getRecommendedWorkers:', error);
    throw error;
  }
};

/**
 * Generate human-readable reason for recommendation
 */
const generateRecommendationReason = (item) => {
  const reasons = [];
  
  if (item.scores.contentBased > 0.7) {
    reasons.push("Strong skill match");
  }
  
  if (item.scores.collaborative > 0.7) {
    reasons.push("Highly rated by similar clients");
  }
  
  if (item.worker.averageRating >= 4.5) {
    reasons.push("Excellent ratings");
  }
  
  if (item.worker.totalJobsCompleted > 20) {
    reasons.push("Experienced provider");
  }

  return reasons.length > 0 ? reasons.join(", ") : "Good overall match";
};

/**
 * Get recommended service requests for a worker
 * Uses reverse recommendation: finds service requests that match worker's profile
 * @param {Object} worker - Worker user object
 * @param {Object} options - Options for recommendation
 * @returns {Array} Array of recommended service requests
 */
export const getRecommendedServiceRequests = async (worker, options = {}) => {
  const {
    limit = 10,
    minScore = 0.3
  } = options;

  try {
    // Get available service requests
    const serviceRequests = await ServiceRequest.find({
      status: "Waiting",
      expiresAt: { $gt: new Date() }
    })
      .populate('requester', 'firstName lastName profilePic')
      .limit(100); // Get more to filter

    if (serviceRequests.length === 0) {
      return [];
    }

    // Get historical data
    const historicalBookings = await Booking.find({
      provider: worker._id,
      status: { $in: ['Complete', 'Working'] }
    })
      .populate('serviceRequest', 'serviceCategory typeOfWork');

    // Score each service request
    const scoredRequests = serviceRequests.map(request => {
      const contentScore = calculateContentBasedScore(worker, request);
      
      // Check if worker has completed similar requests
      const similarCompleted = historicalBookings.filter(booking => {
        const bookingService = booking.serviceRequest?.serviceCategory || booking.serviceRequest?.typeOfWork;
        return bookingService && 
               bookingService.toLowerCase() === request.serviceCategory?.toLowerCase();
      });
      
      const collaborativeScore = similarCompleted.length > 0 ? 0.8 : 0.5;
      const hybridScore = (contentScore * 0.6) + (collaborativeScore * 0.4);

      return {
        request: request.toObject(),
        score: hybridScore,
        contentScore,
        collaborativeScore
      };
    });

    // Sort and filter
    const recommended = scoredRequests
      .filter(item => item.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => ({
        ...item.request,
        recommendationScore: item.score,
        matchReason: generateMatchReason(item, worker)
      }));

    return recommended;
  } catch (error) {
    console.error('Error in getRecommendedServiceRequests:', error);
    throw error;
  }
};

/**
 * Generate match reason for service request recommendation
 */
const generateMatchReason = (item, worker) => {
  const reasons = [];
  
  if (item.contentScore > 0.7) {
    reasons.push("Matches your skills");
  }
  
  if (item.collaborativeScore > 0.7) {
    reasons.push("Similar to your completed work");
  }
  
  return reasons.length > 0 ? reasons.join(", ") : "Good match for your profile";
};

export default {
  getRecommendedWorkers,
  getRecommendedServiceRequests,
  calculateContentBasedScore,
  calculateCollaborativeScore
};

