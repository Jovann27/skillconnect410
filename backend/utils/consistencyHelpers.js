// utils/consistencyHelpers.js - Quick Reference: Common Operations

import {
  validateUserSkillConsistency,
  recalculateUserAverageRating,
  canTransitionBookingStatus,
  getValidBookingTransitions,
  getActiveRequests
} from "./dataConsistency.js";
import User from "../models/userSchema.js";
import Skill from "../models/skillSchema.js";
import Service from "../models/service.js";

/**
 * Quick helper: Adding a skill to provider
 * @param {string} userId - User ID
 * @param {string} skillId - Skill ID
 * @param {number} yearsOfExperience - Years of experience
 * @param {string} proficiency - Proficiency level
 * @returns {Object} Updated user
 */
export const addSkill = async (userId, skillId, yearsOfExperience, proficiency) => {
  const user = await User.findById(userId);
  const skill = await Skill.findById(skillId).populate("serviceType");

  if (!user) throw new Error("User not found");
  if (!skill) throw new Error("Skill not found");
  if (!skill.isActive) throw new Error("Skill inactive");
  if (user.skillsWithService.length >= 3) throw new Error("Max 3 skills");

  // Check already assigned
  const alreadyAssigned = user.skillsWithService.some(s => s.skill.toString() === skillId);
  if (alreadyAssigned) throw new Error("Skill already assigned");

  // Add to structured array
  user.skillsWithService.push({
    skill: skill._id,
    yearsOfExperience: yearsOfExperience || 0,
    proficiency: proficiency || "Intermediate",
    addedAt: new Date()
  });

  // Sync to legacy array
  if (!user.skills.includes(skill.name)) {
    user.skills.push(skill.name);
  }

  // Add service type if not present
  if (!user.serviceTypes.includes(skill.serviceType._id)) {
    user.serviceTypes.push(skill.serviceType._id);
  }

  // Validate consistency
  if (!validateUserSkillConsistency(user)) {
    throw new Error("Consistency validation failed");
  }

  return await user.save();
};

/**
 * Quick helper: Creating a review & updating rating
 * @param {string} bookingId - Booking ID
 * @param {string} reviewerId - Reviewer user ID
 * @param {string} revieweeId - Reviewee user ID
 * @param {number} rating - Rating (1-5)
 * @returns {Object} Created review and new average rating
 */
export const createReviewAndUpdateRating = async (bookingId, reviewerId, revieweeId, rating) => {
  // Import here to avoid circular dependencies
  const Review = (await import("../models/review.js")).default;

  // Create review
  const review = await Review.create({
    booking: bookingId,
    reviewer: reviewerId,
    reviewee: revieweeId,
    rating
  });

  // Recalculate rating
  const updatedUser = await recalculateUserAverageRating(revieweeId);

  return {
    review,
    newAverageRating: updatedUser.averageRating
  };
};

/**
 * Quick helper: Checking booking status transition
 * @param {string} bookingId - Booking ID
 * @param {string} newStatus - New status to transition to
 * @returns {boolean} Whether transition is valid
 */
export const updateBookingStatus = async (bookingId, newStatus) => {
  const Booking = (await import("../models/booking.js")).default;

  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error("Booking not found");

  if (!canTransitionBookingStatus(booking.status, newStatus)) {
    const validTransitions = getValidBookingTransitions(booking.status);
    throw new Error(`Invalid transition: ${booking.status} → ${newStatus}. Valid: ${validTransitions.join(", ")}`);
  }

  booking.status = newStatus;
  booking.updatedAt = new Date();

  return await booking.save();
};

/**
 * Quick helper: Get active service requests
 * @param {Object} filters - Additional filters
 * @returns {Array} Active service requests
 */
export const getActiveServiceRequests = async (filters = {}) => {
  const ServiceRequest = (await import("../models/serviceRequest.js")).default;

  const query = getActiveRequests(filters);
  return await ServiceRequest.find(query).populate('requester', 'firstName lastName');
};

/**
 * Quick helper: Validate user consistency
 * @param {string} userId - User ID to validate
 * @returns {boolean} Whether user data is consistent
 */
export const checkUserConsistency = async (userId) => {
  const user = await User.findById(userId).populate("skillsWithService.skill");
  if (!user) return false;

  return validateUserSkillConsistency(user);
};

/**
 * Quick helper: Bulk consistency check for users
 * @param {Array} userIds - Array of user IDs to check
 * @returns {Object} Consistency report
 */
export const bulkConsistencyCheck = async (userIds) => {
  const results = {
    total: userIds.length,
    consistent: 0,
    inconsistent: 0,
    errors: []
  };

  for (const userId of userIds) {
    try {
      const isConsistent = await checkUserConsistency(userId);
      if (isConsistent) {
        results.consistent++;
      } else {
        results.inconsistent++;
        results.errors.push({ userId, type: "inconsistent" });
      }
    } catch (error) {
      results.errors.push({ userId, type: "error", message: error.message });
    }
  }

  return results;
};

/**
 * Quick helper: Safe skill removal with consistency check
 * @param {string} userId - User ID
 * @param {string} skillId - Skill ID to remove
 * @returns {Object} Updated user
 */
export const removeSkillSafely = async (userId, skillId) => {
  const user = await User.findById(userId);
  const skill = await Skill.findById(skillId);

  if (!user) throw new Error("User not found");
  if (!skill) throw new Error("Skill not found");

  // Remove from structured array
  user.skillsWithService = user.skillsWithService.filter(
    s => s.skill.toString() !== skillId
  );

  // Remove from legacy array
  user.skills = user.skills.filter(name => name !== skill.name);

  // Check if service type should be removed
  const skillsInService = user.skillsWithService.filter(
    s => s.skill.serviceType.toString() === skill.serviceType.toString()
  );

  if (skillsInService.length === 0) {
    user.serviceTypes = user.serviceTypes.filter(
      st => st.toString() !== skill.serviceType.toString()
    );
  }

  // Validate consistency
  if (!validateUserSkillConsistency(user)) {
    throw new Error("Consistency validation failed after removal");
  }

  return await user.save();
};

export default {
  addSkill,
  createReviewAndUpdateRating,
  updateBookingStatus,
  getActiveServiceRequests,
  checkUserConsistency,
  bulkConsistencyCheck,
  removeSkillSafely
};
