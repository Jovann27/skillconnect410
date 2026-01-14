// utils/dataConsistency.js - Central consistency validation and recovery utilities

import User from "../models/userSchema.js";
import Skill from "../models/skillSchema.js";
import Review from "../models/review.js";
import Service from "../models/service.js";
import logger from "./logger.js";

/**
 * Validates user skill consistency
 * @param {Object} user - User document
 * @returns {boolean} - True if consistent, false otherwise
 */
export function validateUserSkillConsistency(user) {
  try {
    // Check 1: Array lengths match
    if (user.skills.length !== user.skillsWithService.length) {
      logger.error("CONSISTENCY ERROR: Skill array length mismatch", {
        userId: user._id,
        legacySkills: user.skills.length,
        structuredSkills: user.skillsWithService.length
      });
      return false;
    }

    // Check 2: Every skillsWithService has name in skills
    for (let skillRef of user.skillsWithService) {
      const skillName = skillRef.skill.name; // Assume populated
      if (!user.skills.includes(skillName)) {
        logger.error(`CONSISTENCY ERROR: Skill ${skillName} missing in legacy array`, {
          userId: user._id,
          skillId: skillRef.skill._id
        });
        return false;
      }
    }

    // Check 3: No duplicates in structured array
    const skillIds = user.skillsWithService.map(s => s.skill.toString());
    if (new Set(skillIds).size !== skillIds.length) {
      logger.error("CONSISTENCY ERROR: Duplicate skills in structured array", {
        userId: user._id,
        skillIds
      });
      return false;
    }

    // Check 4: Role-based constraints
    if (user.role === "Service Provider") {
      if (user.skills.length === 0 || user.skills.length > 3) {
        logger.error("CONSISTENCY ERROR: Provider skill count out of range", {
          userId: user._id,
          skillCount: user.skills.length
        });
        return false;
      }
    } else if (user.role === "Community Member") {
      if (user.skills.length !== 0) {
        logger.error("CONSISTENCY ERROR: Community member has skills", {
          userId: user._id,
          skillCount: user.skills.length
        });
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error("Error validating user skill consistency:", error);
    return false;
  }
}

/**
 * Repairs user skill sync by rebuilding from structured array
 * @param {string} userId - User ID to repair
 * @returns {Object} - Repaired user document
 */
export async function repairUserSkillSync(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  logger.info(`Repairing skills for user ${userId}`);
  const originalSkillCount = user.skills.length;

  // Rebuild from structured array
  user.skills = [];
  for (let skillRef of user.skillsWithService) {
    const skill = await Skill.findById(skillRef.skill);
    if (skill && !user.skills.includes(skill.name)) {
      user.skills.push(skill.name);
    }
  }

  // Rebuild service types
  user.serviceTypes = [];
  for (let skillRef of user.skillsWithService) {
    const skill = await Skill.findById(skillRef.skill);
    if (skill && !user.serviceTypes.includes(skill.serviceType)) {
      user.serviceTypes.push(skill.serviceType);
    }
  }

  // Validate
  if (!validateUserSkillConsistency(user)) {
    throw new Error("Repair validation failed");
  }

  await user.save();

  logger.info(`✓ Repaired user ${userId}: ${originalSkillCount} → ${user.skills.length} skills`);
  return user;
}

/**
 * Recalculates user average rating from all reviews
 * @param {string} userId - User ID to recalculate rating for
 * @returns {Object} - Updated user document
 */
export async function recalculateUserAverageRating(userId) {
  // Get all non-deleted reviews for this user
  const reviews = await Review.find({
    reviewee: userId
  });

  // Calculate average
  const averageRating = reviews.length === 0
    ? 0
    : (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length);

  // Update user
  await User.findByIdAndUpdate(userId, {
    averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
    totalReviews: reviews.length
  });

  // Verify
  const updatedUser = await User.findById(userId);
  if (Math.abs(updatedUser.averageRating - averageRating) > 0.01) {
    logger.error("CONSISTENCY ERROR: Rating recalculation mismatch", {
      userId,
      expected: averageRating,
      actual: updatedUser.averageRating
    });
  }

  return updatedUser;
}

/**
 * Rebuilds all user ratings in the system
 * @returns {number} - Number of users fixed
 */
export async function rebuildAllUserRatings() {
  const users = await User.find();
  let fixed = 0;

  for (let user of users) {
    const reviews = await Review.find({ reviewee: user._id });
    const avgRating = reviews.length === 0
      ? 0
      : (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length);

    if (Math.abs(user.averageRating - avgRating) > 0.01 || user.totalReviews !== reviews.length) {
      user.averageRating = avgRating;
      user.totalReviews = reviews.length;
      await user.save();
      fixed++;
    }
  }

  logger.info(`✓ Fixed ratings for ${fixed} users`);
  return fixed;
}

/**
 * Reconnects orphaned skills in a service type
 * @param {string} serviceTypeId - Service type ID to reconnect
 * @returns {number} - Number of skills processed
 */
export async function reconnectOrphanedSkills(serviceTypeId) {
  const skills = await Skill.find({
    serviceType: serviceTypeId,
    isActive: true
  });

  for (let skill of skills) {
    // Set related skills to all others
    skill.relatedSkills = skills
      .filter(s => s._id.toString() !== skill._id.toString())
      .map(s => s._id);
    await skill.save();
  }

  logger.info(`✓ Reconnected ${skills.length} skills in service type ${serviceTypeId}`);
  return skills.length;
}

/**
 * Validates booking status transitions
 * @param {string} currentStatus - Current booking status
 * @param {string} newStatus - Proposed new status
 * @returns {boolean} - True if transition is valid
 */
export function canTransitionBookingStatus(currentStatus, newStatus) {
  const VALID_TRANSITIONS = {
    "Accepted": ["In Progress", "Cancelled", "Declined"],
    "In Progress": ["Completed", "Cancelled"],
    "Completed": [],
    "Cancelled": [],
    "Declined": []
  };

  if (!VALID_TRANSITIONS[currentStatus]) {
    return false;
  }
  return VALID_TRANSITIONS[currentStatus].includes(newStatus);
}

/**
 * Gets valid transitions for a booking status
 * @param {string} currentStatus - Current booking status
 * @returns {Array} - Array of valid next statuses
 */
export function getValidBookingTransitions(currentStatus) {
  const VALID_TRANSITIONS = {
    "Accepted": ["In Progress", "Cancelled", "Declined"],
    "In Progress": ["Completed", "Cancelled"],
    "Completed": [],
    "Cancelled": [],
    "Declined": []
  };

  return VALID_TRANSITIONS[currentStatus] || [];
}

/**
 * Validates service request status transitions
 * @param {string} currentStatus - Current request status
 * @param {string} newStatus - Proposed new status
 * @returns {boolean} - True if transition is valid
 */
export function canTransitionRequestStatus(currentStatus, newStatus) {
  const VALID_TRANSITIONS = {
    "Open": ["Offered", "In Progress", "Cancelled"],
    "Offered": ["In Progress", "Cancelled"],
    "In Progress": ["Completed", "Cancelled"],
    "Completed": [],
    "Cancelled": []
  };

  if (!VALID_TRANSITIONS[currentStatus]) {
    return false;
  }
  return VALID_TRANSITIONS[currentStatus].includes(newStatus);
}

/**
 * Gets valid transitions for a service request status
 * @param {string} currentStatus - Current request status
 * @returns {Array} - Array of valid next statuses
 */
export function getValidRequestTransitions(currentStatus) {
  const VALID_TRANSITIONS = {
    "Open": ["Offered", "In Progress", "Cancelled"],
    "Offered": ["In Progress", "Cancelled"],
    "In Progress": ["Completed", "Cancelled"],
    "Completed": [],
    "Cancelled": []
  };

  return VALID_TRANSITIONS[currentStatus] || [];
}

/**
 * Query helper for non-expired service requests
 * @param {Object} query - Additional query parameters
 * @returns {Object} - MongoDB query object
 */
export function getActiveRequests(query = {}) {
  const now = new Date();
  return {
    ...query,
    expiresAt: { $gt: now },
    status: { $in: ["Open", "Offered"] }
  };
}
