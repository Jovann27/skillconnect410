/**
 * Advanced Hybrid Recommendation Engine for Worker-Service Matching
 * Combines Content-Based Filtering, Enhanced Collaborative Filtering, and User Behavior Analysis
 *
 * This module implements an advanced hybrid recommendation algorithm that:
 * 1. Content-Based Filtering: Matches workers based on their skills, experience, ratings
 * 2. Enhanced Collaborative Filtering: Uses historical booking patterns, user preferences, and behavior
 * 3. User Behavior Analysis: Tracks user interactions and preferences for personalized recommendations
 * 4. A/B Testing Framework: Tests different recommendation algorithms for effectiveness
 * 5. Hybrid Fusion: Combines multiple approaches with adaptive weighted scoring
 */

import User from "../models/userSchema.js";
import ServiceRequest from "../models/serviceRequest.js";
import Booking from "../models/booking.js";
import Review from "../models/review.js";
import mongoose from "mongoose";
import logger from './logger.js';

// User Behavior Tracking Schema (for future use)
const userBehaviorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true }, // 'view', 'book', 'contact', 'rate'
  targetType: { type: String, required: true }, // 'worker', 'service_request'
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  metadata: { type: Object, default: {} },
  timestamp: { type: Date, default: Date.now }
});

userBehaviorSchema.index({ userId: 1, timestamp: -1 });
userBehaviorSchema.index({ action: 1, targetType: 1 });

// Create model if it doesn't exist
const UserBehavior = mongoose.models.UserBehavior || mongoose.model("UserBehavior", userBehaviorSchema);

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
 * Calculate collaborative filtering score (synchronous version for performance)
 * @param {Object} worker - Worker user object
 * @param {Object} serviceRequest - Service request object
 * @param {Array} similarRequests - Array of similar service requests
 * @param {Array} historicalBookings - Array of historical bookings
 * @returns {number} Collaborative filtering score (0-1)
 */
const calculateCollaborativeScoreSync = (worker, serviceRequest, similarRequests, historicalBookings) => {
  let score = 0;
  let factors = 0;

  // Factor 1: Historical Success Rate (50% weight)
  const workerBookings = historicalBookings.filter(
    booking => String(booking.provider) === String(worker._id) &&
               booking.status === 'Completed'
  );

  if (workerBookings.length > 0) {
    const similarCompletedBookings = workerBookings.filter(booking => {
      if (!booking.serviceRequest) return false;
      const bookingService = booking.serviceRequest.typeOfWork;
      const requestService = serviceRequest.typeOfWork || serviceRequest.serviceCategory || '';
      return bookingService &&
             bookingService.toLowerCase().includes(requestService.toLowerCase().split(' ')[0]);
    });

    const successRate = similarCompletedBookings.length / workerBookings.length;
    score += successRate * 0.5;
    factors += 0.5;
  }

  // Factor 2: Experience with similar work (30% weight)
  if (worker.totalJobsCompleted && worker.totalJobsCompleted > 0) {
    const experienceScore = Math.min(worker.totalJobsCompleted / 20.0, 1);
    score += experienceScore * 0.3;
    factors += 0.3;
  }

  // Factor 3: Rating consistency (20% weight)
  if (worker.averageRating && worker.totalReviews && worker.totalReviews > 0) {
    const ratingScore = Math.min(worker.averageRating / 5.0, 1);
    score += ratingScore * 0.2;
    factors += 0.2;
  }

  // Normalize by actual factors present
  return factors > 0 ? score : 0.3; // Default to 0.3 if no data
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
        const collaborativeScore = calculateCollaborativeScoreSync(
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
    logger.error('Error in getRecommendedWorkers:', error);
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
    minScore = 0.3,
    page = 1
  } = options;

  try {
    // Get available service requests with skill-based filtering
    const workerSkills = worker.skills || [];
    const skillRegex = workerSkills.length > 0
      ? new RegExp(workerSkills.join('|'), 'i')
      : new RegExp(worker.occupation || '', 'i');

    const serviceRequests = await ServiceRequest.find({
      status: "Open",
      expiresAt: { $gt: new Date() },
      $or: [
        { typeOfWork: { $regex: skillRegex } },
        { notes: { $regex: skillRegex } }
      ]
    })
      .populate('requester', 'firstName lastName profilePic')
      .limit(50); // Limit for performance

    if (serviceRequests.length === 0) {
      return [];
    }

    // Get worker's historical data
    const historicalBookings = await Booking.find({
      provider: worker._id,
      status: { $in: ['Completed', 'In Progress'] }
    })
      .populate('serviceRequest', 'typeOfWork')
      .limit(20);

    // Score each service request
    const scoredRequests = serviceRequests.map(request => {
      const contentScore = calculateContentBasedScore(worker, request);

      // Check if worker has completed similar requests
      const similarCompleted = historicalBookings.filter(booking => {
        const bookingService = booking.serviceRequest?.typeOfWork;
        return bookingService &&
               bookingService.toLowerCase().includes(request.typeOfWork.toLowerCase().split(' ')[0]);
      });

      const collaborativeScore = similarCompleted.length > 0 ? 0.8 : 0.4;
      const hybridScore = (contentScore * 0.7) + (collaborativeScore * 0.3);

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
    logger.error('Error in getRecommendedServiceRequests:', error);
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

/**
 * Enhanced Collaborative Filtering with User Behavior Analysis
 * @param {Object} worker - Worker user object
 * @param {Object} serviceRequest - Service request object
 * @param {String} requesterId - ID of the user making the request
 * @returns {number} Enhanced collaborative score (0-1)
 */
const calculateEnhancedCollaborativeScore = async (worker, serviceRequest, requesterId) => {
  let score = 0;
  let factors = 0;

  try {
    // Factor 1: Historical Success Rate with Similar Services (40% weight)
    const workerBookings = await Booking.find({
      provider: worker._id,
      status: 'Completed'
    }).populate('serviceRequest', 'typeOfWork serviceCategory');

    if (workerBookings.length > 0) {
      const similarBookings = workerBookings.filter(booking => {
        if (!booking.serviceRequest) return false;
        const bookingService = booking.serviceRequest.typeOfWork || booking.serviceRequest.serviceCategory || '';
        const requestService = serviceRequest.typeOfWork || serviceRequest.serviceCategory || '';
        return bookingService.toLowerCase().includes(requestService.toLowerCase().split(' ')[0]);
      });

      const successRate = similarBookings.length / workerBookings.length;
      score += successRate * 0.4;
      factors += 0.4;
    }

    // Factor 2: User Behavior-Based Preferences (30% weight)
    if (requesterId) {
      const userBehaviors = await UserBehavior.find({
        userId: requesterId,
        action: { $in: ['book', 'contact', 'rate'] },
        targetType: 'worker'
      }).sort({ timestamp: -1 }).limit(20);

      if (userBehaviors.length > 0) {
        // Find patterns in user's previous choices
        const preferredWorkerIds = userBehaviors.map(b => b.targetId.toString());
        const similarWorkers = await User.find({
          _id: { $in: preferredWorkerIds },
          skills: { $exists: true, $ne: [] }
        });

        // Calculate similarity with preferred workers
        let behaviorScore = 0;
        if (similarWorkers.length > 0) {
          const skillSimilarities = similarWorkers.map(preferredWorker => {
            const commonSkills = worker.skills.filter(skill =>
              preferredWorker.skills.some(prefSkill =>
                skill.toLowerCase().includes(prefSkill.toLowerCase()) ||
                prefSkill.toLowerCase().includes(skill.toLowerCase())
              )
            );
            return commonSkills.length / Math.max(worker.skills.length, 1);
          });

          behaviorScore = skillSimilarities.reduce((sum, sim) => sum + sim, 0) / skillSimilarities.length;
        }

        score += behaviorScore * 0.3;
        factors += 0.3;
      }
    }

    // Factor 3: Category Expertise (20% weight)
    const categoryBookings = await Booking.find({
      provider: worker._id,
      status: 'Completed'
    }).populate('serviceRequest', 'serviceCategory');

    if (categoryBookings.length > 0) {
      const categoryMatches = categoryBookings.filter(booking =>
        booking.serviceRequest &&
        booking.serviceRequest.serviceCategory === serviceRequest.serviceCategory
      );

      const categoryExpertise = categoryMatches.length / categoryBookings.length;
      score += categoryExpertise * 0.2;
      factors += 0.2;
    }

    // Factor 4: Recent Performance (10% weight)
    const recentBookings = await Booking.find({
      provider: worker._id,
      status: 'Completed',
      updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });

    if (recentBookings.length > 0) {
      const recentCompletionRate = recentBookings.length / Math.max(recentBookings.length + 1, 5); // At least 5 recent jobs for full score
      score += recentCompletionRate * 0.1;
      factors += 0.1;
    }

  } catch (error) {
    logger.error('Error in enhanced collaborative scoring:', error);
    // Fallback to basic collaborative score
    return calculateCollaborativeScoreSync(worker, serviceRequest, [], []);
  }

  return factors > 0 ? score / factors : 0.3;
};

/**
 * Track user behavior for recommendation improvement
 * @param {String} userId - User ID
 * @param {String} action - Action performed ('view', 'book', 'contact', 'rate')
 * @param {String} targetType - Type of target ('worker', 'service_request')
 * @param {String} targetId - Target ID
 * @param {Object} metadata - Additional metadata
 */
export const trackUserBehavior = async (userId, action, targetType, targetId, metadata = {}) => {
  try {
    await UserBehavior.create({
      userId,
      action,
      targetType,
      targetId,
      metadata,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error tracking user behavior:', error);
  }
};

/**
 * A/B Testing Framework for Recommendation Algorithms
 */
const RECOMMENDATION_VARIANTS = {
  A: 'traditional_hybrid', // 60% content + 40% collaborative
  B: 'enhanced_collaborative', // Enhanced collaborative with user behavior
  C: 'content_focused', // 80% content + 20% collaborative
  D: 'behavior_driven' // User behavior weighted heavily
};

/**
 * Get recommendation variant for A/B testing
 * @param {String} userId - User ID for consistent variant assignment
 * @returns {String} Variant key
 */
const getRecommendationVariant = (userId) => {
  // Simple hash-based variant assignment for consistency
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variants = Object.keys(RECOMMENDATION_VARIANTS);
  return variants[hash % variants.length];
};

/**
 * Advanced recommendation function with A/B testing and enhanced algorithms
 * @param {Object} serviceRequest - The service request to find matches for
 * @param {Object} options - Options including requesterId for personalization
 * @returns {Array} Array of recommended workers with scores
 */
export const getAdvancedRecommendedWorkers = async (serviceRequest, options = {}) => {
  const {
    limit = 10,
    minScore = 0.3,
    includeUnavailable = false,
    requesterId = null,
    enableABTesting = true
  } = options;

  try {
    // Determine which algorithm variant to use
    const variant = enableABTesting && requesterId
      ? getRecommendationVariant(requesterId)
      : 'A'; // Default to traditional

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

    // Step 2: Calculate scores based on variant
    const workerScores = await Promise.all(
      workers.map(async (worker) => {
        let finalScore = 0;
        let scores = {};

        if (variant === 'A' || variant === 'C') {
          // Traditional/Content-focused algorithms
          const contentScore = calculateContentBasedScore(worker, serviceRequest);
          const collaborativeScore = calculateCollaborativeScoreSync(worker, serviceRequest, [], []);

          const contentWeight = variant === 'C' ? 0.8 : 0.6;
          const collaborativeWeight = variant === 'C' ? 0.2 : 0.4;

          finalScore = (contentScore * contentWeight) + (collaborativeScore * collaborativeWeight);
          scores = {
            contentBased: contentScore,
            collaborative: collaborativeScore,
            hybrid: finalScore
          };
        } else if (variant === 'B') {
          // Enhanced collaborative
          const contentScore = calculateContentBasedScore(worker, serviceRequest);
          const enhancedCollaborativeScore = await calculateEnhancedCollaborativeScore(worker, serviceRequest, requesterId);

          finalScore = (contentScore * 0.4) + (enhancedCollaborativeScore * 0.6);
          scores = {
            contentBased: contentScore,
            enhancedCollaborative: enhancedCollaborativeScore,
            hybrid: finalScore
          };
        } else if (variant === 'D') {
          // Behavior-driven
          const contentScore = calculateContentBasedScore(worker, serviceRequest);
          const enhancedCollaborativeScore = await calculateEnhancedCollaborativeScore(worker, serviceRequest, requesterId);

          // Heavily weight user behavior if available
          const behaviorWeight = requesterId ? 0.7 : 0.3;
          const contentWeight = 1 - behaviorWeight;

          finalScore = (contentScore * contentWeight) + (enhancedCollaborativeScore * behaviorWeight);
          scores = {
            contentBased: contentScore,
            behaviorDriven: enhancedCollaborativeScore,
            hybrid: finalScore
          };
        }

        return {
          worker: worker.toObject(),
          scores,
          finalScore,
          variant,
          algorithm: RECOMMENDATION_VARIANTS[variant]
        };
      })
    );

    // Step 3: Sort by final score and filter by minimum score
    const recommendedWorkers = workerScores
      .filter(item => item.finalScore >= minScore)
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, limit)
      .map(item => ({
        ...item.worker,
        recommendationScore: item.finalScore,
        ...item.scores,
        recommendationReason: generateRecommendationReason(item),
        algorithmUsed: item.algorithm,
        variant: item.variant
      }));

    return recommendedWorkers;
  } catch (error) {
    logger.error('Error in getAdvancedRecommendedWorkers:', error);
    // Fallback to basic recommendation
    return getRecommendedWorkers(serviceRequest, options);
  }
};

/**
 * Get A/B testing analytics for recommendation effectiveness
 * @returns {Object} Analytics data for different variants
 */
export const getRecommendationAnalytics = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get booking data with recommendation variants
    const bookings = await Booking.find({
      createdAt: { $gte: thirtyDaysAgo },
      status: 'Completed'
    }).populate('serviceRequest');

    const variantStats = {};

    // Initialize stats for each variant
    Object.keys(RECOMMENDATION_VARIANTS).forEach(variant => {
      variantStats[variant] = {
        variant: RECOMMENDATION_VARIANTS[variant],
        totalBookings: 0,
        completedBookings: 0,
        averageRating: 0,
        totalRatings: 0
      };
    });

    // Analyze booking patterns (this would need actual variant tracking in bookings)
    // For now, return basic structure
    return {
      period: '30 days',
      variants: variantStats,
      recommendations: {
        bestPerforming: null,
        improvement: null
      }
    };
  } catch (error) {
    logger.error('Error getting recommendation analytics:', error);
    return null;
  }
};

export default {
  getRecommendedWorkers,
  getRecommendedServiceRequests,
  getAdvancedRecommendedWorkers,
  trackUserBehavior,
  getRecommendationAnalytics,
  calculateContentBasedScore,
  calculateCollaborativeScoreSync,
  calculateEnhancedCollaborativeScore
};
