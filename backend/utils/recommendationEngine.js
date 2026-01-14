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
 * Normalize string input to handle various data formats
 * Handles: strings, arrays, undefined, null
 * @param {*} input - Input value of any type
 * @returns {string} Normalized lowercase string
 */
const normalizeString = (input) => {
  if (!input) return '';
  if (typeof input === 'string') return input.toLowerCase().trim();
  if (Array.isArray(input)) return input.join(' ').toLowerCase().trim();
  if (typeof input === 'object') return JSON.stringify(input).toLowerCase();
  return String(input).toLowerCase().trim();
};

/**
 * Extract skill names from both legacy and new skill structure
 * Handles backwards compatibility with both formats
 * @param {Object} worker - Worker user object
 * @returns {Array} Array of skill names
 */
const extractSkillNames = (worker) => {
  let skillNames = [];
  
  // First, try to extract from new structured skills
  if (worker.skillsWithService && Array.isArray(worker.skillsWithService)) {
    worker.skillsWithService.forEach(userSkill => {
      if (userSkill.skill) {
        // Check if it's a populated object or just an ID
        const skillName = userSkill.skill.name || userSkill.skill;
        if (skillName) skillNames.push(skillName);
      }
    });
  }
  
  // Fall back to legacy skills array if no skills found
  if (skillNames.length === 0 && worker.skills && Array.isArray(worker.skills)) {
    skillNames = worker.skills;
  }
  
  return skillNames;
};

/**
 * Calculate content-based similarity score between a worker and service request
 * Implements improved matching with bidirectional skill matching, occupation alignment,
 * and proper handling of various data formats
 * 
 * @param {Object} worker - Worker user object
 * @param {Object} serviceRequest - Service request object
 * @returns {number} Content-based similarity score (0-1)
 */
const calculateContentBasedScore = (worker, serviceRequest) => {
  let score = 0;
  let weights = 0;

  // Normalize and prepare data with proper format handling
  const requestTypeOfWork = normalizeString(serviceRequest.typeOfWork || serviceRequest.serviceCategory || '');
  const requestNotes = normalizeString(serviceRequest.notes || serviceRequest.description || '');
  // Use new helper function to extract skills from both formats
  const workerSkills = extractSkillNames(worker);
  const workerOccupation = normalizeString(worker.occupation || '');
  const workerServiceTypes = Array.isArray(worker.serviceTypes) ? worker.serviceTypes : 
                             typeof worker.serviceTypes === 'string' ? [worker.serviceTypes] : [];

  // ========================================================================
  // Factor 1: SKILL/SERVICE TYPE MATCH (45% weight) - PRIMARY MATCHING FACTOR
  // ========================================================================
  const skillMatchScore = calculateSkillMatchScore(
    requestTypeOfWork,
    requestNotes,
    workerSkills,
    workerOccupation,
    workerServiceTypes
  );
  
  if (skillMatchScore > 0) {
    score += skillMatchScore * 0.45;
    weights += 0.45;
  }

  // ========================================================================
  // Factor 2: PROVIDER OCCUPATION & SERVICE TYPE ALIGNMENT (20% weight)
  // ========================================================================
  const occupationScore = calculateOccupationMatch(
    requestTypeOfWork,
    workerOccupation,
    workerSkills,
    workerServiceTypes
  );
  
  if (occupationScore > 0) {
    score += occupationScore * 0.2;
    weights += 0.2;
  }

  // ========================================================================
  // Factor 3: PROVIDER REPUTATION/HISTORICAL PERFORMANCE (20% weight)
  // ========================================================================
  let reputationScore = 0;

  // Rating component (40% of reputation)
  if (typeof worker.averageRating === 'number' && worker.averageRating >= 0) {
    const normalizedRating = Math.min(worker.averageRating / 5.0, 1);
    reputationScore += normalizedRating * 0.4;
  }

  // Review count component (35% of reputation) - validates consistency
  if (typeof worker.totalReviews === 'number' && worker.totalReviews > 0) {
    // Logarithmic scale: 1 review = 0.1, 10 reviews = 0.7, 100 reviews = 1.0
    const reviewScore = Math.min(Math.log10(worker.totalReviews + 1) / 3, 1);
    reputationScore += reviewScore * 0.35;
  }

  // Job completion rate component (25% of reputation)
  if (typeof worker.totalJobsCompleted === 'number' && worker.totalJobsCompleted > 0) {
    // Normalized: 20+ completed = 1.0, fewer = proportional
    const completionScore = Math.min(worker.totalJobsCompleted / 20, 1);
    reputationScore += completionScore * 0.25;
  }

  if (reputationScore > 0) {
    score += Math.min(reputationScore, 1) * 0.2;
    weights += 0.2;
  }

  // ========================================================================
  // Factor 4: EXPERIENCE LEVEL (10% weight)
  // ========================================================================
  if (typeof worker.yearsExperience === 'number' && worker.yearsExperience >= 0) {
    // Normalized: 5+ years = 1.0, fewer = proportional
    const experienceScore = Math.min(worker.yearsExperience / 5, 1);
    score += experienceScore * 0.1;
    weights += 0.1;
  }

  // ========================================================================
  // Factor 5: PROVIDER AVAILABILITY (5% weight)
  // ========================================================================
  if (worker.isOnline || worker.isActive) {
    score += 1.0 * 0.05;
    weights += 0.05;
  }

  // Normalize final score
  if (weights === 0) {
    return 0.25; // Minimum score for workers with no profile data
  }

  const finalScore = Math.max(0, Math.min(1, score));
  logger.debug(`Content score for worker ${worker._id} on request: ${finalScore.toFixed(3)}`);
  
  return finalScore;
};

/**
 * Calculate skill match score with bidirectional matching
 * Checks if worker skills match request type and vice versa
 * 
 * @param {string} requestTypeOfWork - Normalized request type
 * @param {string} requestNotes - Normalized request notes/description
 * @param {Array} workerSkills - Array of worker skills
 * @param {string} workerOccupation - Worker's occupation
 * @param {Array} workerServiceTypes - Worker's service types
 * @returns {number} Skill match score (0-1)
 */
const calculateSkillMatchScore = (
  requestTypeOfWork,
  requestNotes,
  workerSkills,
  workerOccupation,
  workerServiceTypes
) => {
  if (!requestTypeOfWork && !requestNotes) return 0;

  const normalizedWorkerSkills = workerSkills.map(s => normalizeString(s));
  const normalizedServiceTypes = workerServiceTypes.map(s => normalizeString(s));
  const searchText = `${requestTypeOfWork} ${requestNotes}`;

  let matchCount = 0;
  let totalItems = 0;

  // Check direct skill matches (case-insensitive)
  if (normalizedWorkerSkills.length > 0) {
    totalItems += normalizedWorkerSkills.length;
    
    matchCount += normalizedWorkerSkills.filter(skill => {
      // Exact word match
      if (searchText.includes(skill)) return true;
      
      // Partial match (first significant word)
      const skillWords = skill.split(' ');
      if (skillWords.length > 0) {
        return searchText.includes(skillWords[0]);
      }
      
      return false;
    }).length;
  }

  // Check service type matches
  if (normalizedServiceTypes.length > 0) {
    totalItems += normalizedServiceTypes.length;
    
    matchCount += normalizedServiceTypes.filter(service => {
      if (searchText.includes(service)) return true;
      const serviceWords = service.split(' ');
      return serviceWords.length > 0 && searchText.includes(serviceWords[0]);
    }).length;
  }

  // Occupation fallback matching
  if (!matchCount && workerOccupation) {
    const occupationWords = workerOccupation.split(' ');
    if (occupationWords.some(word => searchText.includes(word))) {
      return 0.7; // Good match based on occupation
    }
  }

  // Calculate final skill match ratio
  if (totalItems === 0) return 0;
  
  const matchRatio = matchCount / totalItems;
  
  // Apply bonus for multiple matching skills
  const bonusMultiplier = matchCount > 1 ? 1.1 : 1.0;
  
  return Math.min(1.0, matchRatio * bonusMultiplier);
};

/**
 * Calculate occupation and service type alignment
 * Ensures provider's primary occupation aligns with request type
 * 
 * @param {string} requestTypeOfWork - Normalized request type
 * @param {string} workerOccupation - Worker's occupation
 * @param {Array} workerSkills - Worker's skills
 * @param {Array} workerServiceTypes - Worker's service types
 * @returns {number} Occupation match score (0-1)
 */
const calculateOccupationMatch = (
  requestTypeOfWork,
  workerOccupation,
  workerSkills,
  workerServiceTypes
) => {
  if (!requestTypeOfWork) return 0;

  let score = 0;

  // Primary occupation match
  if (workerOccupation) {
    const occWords = workerOccupation.split(' ');
    const reqWords = requestTypeOfWork.split(' ');
    
    // Check if any word overlaps
    const overlap = occWords.some(occ => 
      reqWords.some(req => occ === req)
    );
    
    if (overlap) {
      score += 0.8;
    } else if (occWords.some(occ => requestTypeOfWork.includes(occ))) {
      score += 0.6;
    } else if (requestTypeOfWork.includes(occWords[0])) {
      score += 0.5;
    }
  }

  // Service type reinforcement
  const normalizedServiceTypes = workerServiceTypes.map(s => normalizeString(s));
  if (normalizedServiceTypes.some(service => service === requestTypeOfWork)) {
    score += 0.2;
  }

  // Skill coverage validation
  if (workerSkills.length > 2) {
    score += 0.1; // Bonus for diverse skill set
  }

  return Math.min(1.0, score);
};

/**
 * Calculate collaborative filtering score with enhanced historical performance analysis
 * Evaluates provider's past performance on similar work types
 * 
 * @param {Object} worker - Worker user object
 * @param {Object} serviceRequest - Service request object
 * @param {Array} similarRequests - Array of similar service requests
 * @param {Array} historicalBookings - Array of historical bookings
 * @returns {number} Collaborative filtering score (0-1)
 */
const calculateCollaborativeScoreSync = (worker, serviceRequest, similarRequests, historicalBookings) => {
  let score = 0;
  let factors = 0;

  const requestTypeOfWork = normalizeString(serviceRequest.typeOfWork || serviceRequest.serviceCategory || '');

  // ========================================================================
  // Factor 1: HISTORICAL SUCCESS RATE ON SIMILAR WORK (50% weight)
  // ========================================================================
  const workerBookings = historicalBookings.filter(
    booking => String(booking.provider) === String(worker._id)
  );

  if (workerBookings.length > 0) {
    // Analyze performance on similar service types
    const similarCompletedBookings = workerBookings.filter(booking => {
      if (!booking.serviceRequest) return false;
      
      const bookingService = normalizeString(booking.serviceRequest.typeOfWork || booking.serviceRequest.serviceCategory || '');
      
      // Check for similar service match
      if (!bookingService || !requestTypeOfWork) return false;
      
      // Exact match or word overlap
      return bookingService === requestTypeOfWork ||
             bookingService.includes(requestTypeOfWork.split(' ')[0]) ||
             requestTypeOfWork.includes(bookingService.split(' ')[0]);
    });

    const completedCount = workerBookings.filter(b => b.status === 'Completed').length;
    
    if (completedCount > 0) {
      const successRate = similarCompletedBookings.length / workerBookings.length;
      score += successRate * 0.5;
      factors += 0.5;
    } else if (workerBookings.length > 0) {
      // No completed work on similar type, penalize slightly
      score += 0.3 * 0.5;
      factors += 0.5;
    }
  }

  // ========================================================================
  // Factor 2: EXPERIENCE WITH SIMILAR WORK TYPE (30% weight)
  // ========================================================================
  if (worker.totalJobsCompleted && worker.totalJobsCompleted > 0) {
    // Check if provider has completed similar type of work
    const hasSimilarExperience = workerBookings.some(booking => {
      if (!booking.serviceRequest) return false;
      const bookingService = normalizeString(booking.serviceRequest.typeOfWork || booking.serviceRequest.serviceCategory || '');
      return bookingService && bookingService.includes(requestTypeOfWork.split(' ')[0]);
    });

    let experienceScore = 0;
    if (hasSimilarExperience) {
      // Provider has done this type of work before
      experienceScore = Math.min(worker.totalJobsCompleted / 20, 1);
    } else {
      // No prior experience with this type, but has general experience
      experienceScore = Math.min(worker.totalJobsCompleted / 40, 0.6);
    }
    
    score += experienceScore * 0.3;
    factors += 0.3;
  }

  // ========================================================================
  // Factor 3: RATING CONSISTENCY & RELIABILITY (20% weight)
  // ========================================================================
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
 * Uses reverse recommendation: finds ALL service requests that match worker's profile based on offered services
 * @param {Object} worker - Worker user object (must be populated with skills and serviceTypes)
 * @param {Object} options - Options for recommendation
 */
export const getRecommendedServiceRequests = async (worker, options = {}) => {
  const {
    limit = 10,
    minScore = 0.0, // Set to 0 to include all matching requests
    page = 1
  } = options;

  try {
    // Ensure worker has necessary fields with proper type handling
    const workerSkills = extractSkillNames(worker);
    const workerOccupation = normalizeString(worker.occupation || '');
    const workerServiceTypes = Array.isArray(worker.serviceTypes) ? worker.serviceTypes :
                              typeof worker.serviceTypes === 'string' ? [worker.serviceTypes] : [];

    // Get service names from serviceTypes if they exist
    let serviceNames = [];
    if (workerServiceTypes.length > 0) {
      try {
        const Service = (await import('../models/service.js')).default;
        const services = await Service.find({
          _id: { $in: workerServiceTypes }
        }).select('name').lean();
        serviceNames = services.map(service => normalizeString(service.name));
      } catch (err) {
        logger.warn('Could not load service types, continuing with skills only');
      }
    }

    // Build comprehensive search criteria based on provider's offered services
    const searchPatterns = [];
    const skillSet = new Set();

    // Add skill patterns (case-insensitive) with 45% weight
    if (workerSkills.length > 0) {
      workerSkills.forEach(skill => {
        const normalized = normalizeString(skill);
        if (normalized) {
          searchPatterns.push(new RegExp(skill, 'i'));
          skillSet.add(normalized);
        }
      });
    }

    // Add service name patterns from serviceTypes
    if (serviceNames.length > 0) {
      serviceNames.forEach(serviceName => {
        if (serviceName && !skillSet.has(serviceName)) {
          searchPatterns.push(new RegExp(serviceName, 'i'));
          skillSet.add(serviceName);
        }
      });
    }

    // Add occupation as fallback pattern
    if (workerOccupation) {
      searchPatterns.push(new RegExp(workerOccupation, 'i'));
    }

    // Build the query to find ALL available service requests
    let queryConditions = {
      status: "Open", // Match "Open" status used by the system
      expiresAt: { $gt: new Date() } // Only non-expired requests
    };

    // If we have search patterns, add them to OR conditions
    if (searchPatterns.length > 0) {
      const regexConditions = [];
      searchPatterns.forEach(pattern => {
        regexConditions.push(
          { typeOfWork: pattern },
          { serviceCategory: pattern },
          { notes: pattern },
          { description: pattern }
        );
      });
      queryConditions.$or = regexConditions;
    } else {
      // If no patterns, return empty array (no matches possible)
      logger.warn(`No search patterns for provider ${worker._id}`);
      return [];
    }

    logger.info(`Querying service requests for provider ${worker._id} with ${searchPatterns.length} patterns`);

    // Get ALL available service requests matching the provider's offered services
    const serviceRequests = await ServiceRequest.find(queryConditions)
      .populate('requester', 'firstName lastName profilePic averageRating')
      .lean(); // Use lean() for better performance

    if (serviceRequests.length === 0) {
      logger.info(`No service requests found for provider ${worker._id}`);
      return [];
    }

    logger.info(`Found ${serviceRequests.length} total service requests for provider`);

    // Get worker's historical data for better collaborative scoring
    const historicalBookings = await Booking.find({
      provider: worker._id,
      status: { $in: ['Completed', 'In Progress'] }
    })
      .populate('serviceRequest', 'typeOfWork serviceCategory')
      .lean();

    // Score each service request using improved hybrid scoring algorithm
    const scoredRequests = serviceRequests.map(request => {
      // Content-based score: skill/service match + occupation alignment (45% + 20%)
      // This incorporates improved matching logic for service type and skills
      const contentScore = calculateContentBasedScore(worker, request);

      // Collaborative score: historical performance on similar work
      const requestType = normalizeString(request.typeOfWork || request.serviceCategory || '');
      const similarCompleted = historicalBookings.filter(booking => {
        const bookingService = normalizeString(booking.serviceRequest?.typeOfWork || booking.serviceRequest?.serviceCategory || '');
        return bookingService && requestType &&
               (bookingService === requestType ||
                bookingService.includes(requestType.split(' ')[0]) ||
                requestType.includes(bookingService.split(' ')[0]));
      });

      // Enhanced collaborative score: reflects provider's historical performance
      // 0.85+ if done similar work, 0.55 if new type, 0.3 if no history
      let collaborativeScore = 0.3;
      if (historicalBookings.length > 0) {
        if (similarCompleted.length > 0) {
          // Bonus for multiple similar completions
          collaborativeScore = Math.min(0.95, 0.8 + (Math.min(similarCompleted.length / 5, 0.15)));
        } else {
          collaborativeScore = 0.55; // General experience but no similar work
        }
      }

      // Hybrid scoring: 70% content-based (skill/occupation), 30% collaborative (performance)
      const hybridScore = Math.min(1.0, (contentScore * 0.7) + (collaborativeScore * 0.3));

      return {
        request,
        score: hybridScore,
        contentScore,
        collaborativeScore,
        similarWorkDone: similarCompleted.length,
        matchStrength: contentScore > 0.75 ? 'high' : contentScore > 0.5 ? 'medium' : 'low'
      };
    });

    // Sort by score (highest first), apply pagination with minimum score filter
    const filtered = scoredRequests.filter(item => item.score >= minScore);
    
    const recommended = filtered
      .sort((a, b) => b.score - a.score)
      .slice((page - 1) * limit, page * limit)
      .map(item => ({
        ...item.request,
        recommendationScore: parseFloat(item.score.toFixed(3)),
        matchReason: generateDetailedMatchReason(item, worker),
        contentScore: parseFloat(item.contentScore.toFixed(3)),
        collaborativeScore: parseFloat(item.collaborativeScore.toFixed(3)),
        matchStrength: item.matchStrength,
        similarWorkCount: item.similarWorkDone
      }));

    logger.info(`Recommended ${recommended.length} of ${filtered.length} matching requests to provider ${worker._id}`);
    return recommended;
  } catch (error) {
    logger.error('Error in getRecommendedServiceRequests:', error);
    throw error;
  }
};

/**
 * Generate detailed match reason explaining why request was recommended
 */
const generateDetailedMatchReason = (item, worker) => {
  const reasons = [];

  if (item.contentScore > 0.8) {
    reasons.push("Excellent skill match");
  } else if (item.contentScore > 0.6) {
    reasons.push("Good skill match");
  } else if (item.contentScore > 0.4) {
    reasons.push("Matches your profile");
  }

  if (item.collaborativeScore > 0.75) {
    reasons.push("Proven experience on similar work");
  } else if (item.similarWorkDone > 0) {
    reasons.push("Experience with similar services");
  }

  if (worker.averageRating >= 4.5) {
    reasons.push("Highly rated provider");
  } else if (worker.averageRating >= 4.0) {
    reasons.push("Well-rated provider");
  }

  if (worker.totalJobsCompleted >= 20) {
    reasons.push("Experienced professional");
  } else if (worker.totalJobsCompleted >= 5) {
    reasons.push("Established track record");
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
