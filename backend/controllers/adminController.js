1// adminController.js - Admin endpoints for data consistency operations

import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import {
  repairUserSkillSync,
  rebuildAllUserRatings,
  reconnectOrphanedSkills,
  validateUserSkillConsistency
} from "../utils/dataConsistency.js";
import User from "../models/userSchema.js";
import Skill from "../models/skillSchema.js";
import Review from "../models/review.js";
import Booking from "../models/booking.js";
import ServiceRequest from "../models/serviceRequest.js";

// Pattern 7: Data Recovery Helpers

// Admin endpoint for repairing user skill consistency
export const adminRepairUserSkills = catchAsyncError(async (req, res, next) => {
  // Only admin
  if (req.user.role !== "Admin") {
    return next(new ErrorHandler("Admin only", 403));
  }

  const { userId } = req.params;

  if (!userId) {
    return next(new ErrorHandler("User ID is required", 400));
  }

  try {
    const result = await repairUserSkillSync(userId);
    res.status(200).json({
      success: true,
      message: `User skill sync repaired for user ${userId}`,
      result
    });
  } catch (error) {
    next(new ErrorHandler(`Repair failed: ${error.message}`, 500, { userId, error: error.message }));
  }
});

// Admin endpoint for rebuilding all user ratings
export const adminRebuildAllRatings = catchAsyncError(async (req, res, next) => {
  // Only admin
  if (req.user.role !== "Admin") {
    return next(new ErrorHandler("Admin only", 403));
  }

  try {
    const fixed = await rebuildAllUserRatings();
    res.status(200).json({
      success: true,
      message: `Rebuilt ratings for ${fixed} users`,
      usersFixed: fixed
    });
  } catch (error) {
    next(new ErrorHandler(`Rating rebuild failed: ${error.message}`, 500, { error: error.message }));
  }
});

// Admin endpoint for reconnecting orphaned skills
export const adminReconnectSkills = catchAsyncError(async (req, res, next) => {
  // Only admin
  if (req.user.role !== "Admin") {
    return next(new ErrorHandler("Admin only", 403));
  }

  const { serviceTypeId } = req.params;

  if (!serviceTypeId) {
    return next(new ErrorHandler("Service Type ID is required", 400));
  }

  try {
    const processed = await reconnectOrphanedSkills(serviceTypeId);
    res.status(200).json({
      success: true,
      message: `Reconnected ${processed} skills in service type ${serviceTypeId}`,
      skillsProcessed: processed
    });
  } catch (error) {
    next(new ErrorHandler(`Skill reconnection failed: ${error.message}`, 500, {
      serviceTypeId,
      error: error.message
    }));
  }
});

// Admin endpoint for running comprehensive consistency check
export const adminRunConsistencyCheck = catchAsyncError(async (req, res, next) => {
  // Only admin
  if (req.user.role !== "Admin") {
    return next(new ErrorHandler("Admin only", 403));
  }

  const issues = {
    skillSyncErrors: [],
    invalidRatings: [],
    orphanedSkills: [],
    invalidBookings: [],
    expiredRequests: []
  };

  try {
    // Check 1: Skill sync issues
    const users = await User.find({ role: "Service Provider" }).populate("skillsWithService.skill");
    for (let user of users) {
      if (!validateUserSkillConsistency(user)) {
        issues.skillSyncErrors.push({
          userId: user._id,
          firstName: user.firstName,
          lastName: user.lastName
        });
      }
    }

    // Check 2: Invalid ratings
    const ratingErrors = await User.find({
      $or: [
        { averageRating: { $lt: 0 } },
        { averageRating: { $gt: 5 } },
        { totalReviews: { $lt: 0 } }
      ]
    }).select("_id firstName lastName averageRating totalReviews");

    issues.invalidRatings = ratingErrors.map(user => ({
      userId: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      averageRating: user.averageRating,
      totalReviews: user.totalReviews
    }));

    // Check 3: Orphaned skills
    const orphanedSkills = await Skill.find({
      serviceType: { $exists: false }
    }).select("_id name");

    issues.orphanedSkills = orphanedSkills.map(skill => ({
      skillId: skill._id,
      name: skill.name
    }));

    // Check 4: Invalid bookings
    const invalidBookings = await Booking.find({
      $and: [
        { serviceRequest: null },
        { serviceOffer: null }
      ]
    }).select("_id requester provider status");

    issues.invalidBookings = invalidBookings.map(booking => ({
      bookingId: booking._id,
      requester: booking.requester,
      provider: booking.provider,
      status: booking.status
    }));

    // Check 5: Expired but active requests
    const now = new Date();
    const expiredRequests = await ServiceRequest.find({
      expiresAt: { $lt: now },
      status: { $in: ["Open", "Offered"] }
    }).select("_id name status expiresAt");

    issues.expiredRequests = expiredRequests.map(request => ({
      requestId: request._id,
      name: request.name,
      status: request.status,
      expiresAt: request.expiresAt
    }));

    res.status(200).json({
      success: true,
      message: "Consistency check completed",
      issues,
      summary: {
        skillSyncErrors: issues.skillSyncErrors.length,
        invalidRatings: issues.invalidRatings.length,
        orphanedSkills: issues.orphanedSkills.length,
        invalidBookings: issues.invalidBookings.length,
        expiredRequests: issues.expiredRequests.length
      }
    });

  } catch (error) {
    next(new ErrorHandler(`Consistency check failed: ${error.message}`, 500, { error: error.message }));
  }
});

// Admin endpoint for fixing expired requests
export const adminFixExpiredRequests = catchAsyncError(async (req, res, next) => {
  // Only admin
  if (req.user.role !== "Admin") {
    return next(new ErrorHandler("Admin only", 403));
  }

  try {
    const now = new Date();
    const result = await ServiceRequest.updateMany(
      {
        expiresAt: { $lt: now },
        status: { $in: ["Open", "Offered"] }
      },
      {
        status: "Cancelled",
        cancellationReason: "Expired automatically by system"
      }
    );

    res.status(200).json({
      success: true,
      message: `Fixed ${result.modifiedCount} expired requests`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    next(new ErrorHandler(`Fix expired requests failed: ${error.message}`, 500, { error: error.message }));
  }
});

// Admin endpoint for bulk repair operations
export const adminBulkRepair = catchAsyncError(async (req, res, next) => {
  // Only admin
  if (req.user.role !== "Admin") {
    return next(new ErrorHandler("Admin only", 403));
  }

  const { operations } = req.body; // Array of operation types

  if (!operations || !Array.isArray(operations)) {
    return next(new ErrorHandler("Operations array is required", 400));
  }

  const results = {};

  try {
    for (let operation of operations) {
      switch (operation) {
        case "rebuild-ratings":
          results.rebuildRatings = await rebuildAllUserRatings();
          break;

        case "fix-expired-requests":
          const expiredResult = await ServiceRequest.updateMany(
            {
              expiresAt: { $lt: new Date() },
              status: { $in: ["Open", "Offered"] }
            },
            {
              status: "Cancelled",
              cancellationReason: "Expired automatically by system"
            }
          );
          results.fixExpiredRequests = expiredResult.modifiedCount;
          break;

        default:
          return next(new ErrorHandler(`Unknown operation: ${operation}`, 400));
      }
    }

    res.status(200).json({
      success: true,
      message: "Bulk repair operations completed",
      results
    });

  } catch (error) {
    next(new ErrorHandler(`Bulk repair failed: ${error.message}`, 500, {
      operations,
      error: error.message
    }));
  }
});

// Get all users for admin dashboard
export const getAllUsers = catchAsyncError(async (req, res, next) => {
  const users = await User.find().select('_id firstName lastName email phone role verified isOnline banned suspended createdAt');
  
  res.status(200).json({
    success: true,
    count: users.length,
    users
  });
});

// Get user with full profile including skills
export const getUserWithSkills = catchAsyncError(async (req, res, next) => {
  const { userId } = req.params;
  
  const user = await User.findById(userId)
    .populate({
      path: "skillsWithService.skill",
      populate: { path: "serviceType" }
    })
    .populate("serviceTypes");
  
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }
  
  res.status(200).json({
    success: true,
    user
  });
});

// Add skill to user (Admin endpoint)
export const adminAddSkillToUser = catchAsyncError(async (req, res, next) => {
  const { userId } = req.params;
  const { skillId, yearsOfExperience, proficiency } = req.body;
  
  if (!userId || !skillId) {
    return next(new ErrorHandler("User ID and Skill ID are required", 400));
  }
  
  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }
  
  if (user.role !== "Service Provider") {
    return next(new ErrorHandler("Only Service Providers can have skills", 403));
  }
  
  const skill = await Skill.findById(skillId).populate("serviceType");
  if (!skill) {
    return next(new ErrorHandler("Skill not found", 404));
  }
  
  if (!skill.isActive) {
    return next(new ErrorHandler("Skill is inactive", 400));
  }
  
  // Check not already assigned
  const alreadyAssigned = user.skillsWithService.some(
    s => s.skill.toString() === skillId
  );
  if (alreadyAssigned) {
    return next(new ErrorHandler("Skill already assigned", 400));
  }
  
  // Check skill limit
  if (user.skillsWithService.length >= 3) {
    return next(new ErrorHandler("Maximum 3 skills per provider", 400));
  }
  
  // Add skill
  user.skillsWithService.push({
    skill: skillId,
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
  
  await user.save();
  
  const updatedUserAfterAdd = await User.findById(userId).populate({
    path: "skillsWithService.skill",
    populate: { path: "serviceType" }
  });

  res.status(200).json({
    success: true,
    message: "Skill added successfully",
    user: updatedUserAfterAdd
  });
});

// Remove skill from user (Admin endpoint)
export const adminRemoveSkillFromUser = catchAsyncError(async (req, res, next) => {
  const { userId, skillId } = req.params;
  
  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }
  
  // Remove from structured array
  const skillToRemove = user.skillsWithService.find(s => s.skill.toString() === skillId);
  if (!skillToRemove) {
    return next(new ErrorHandler("Skill not found for this user", 404));
  }
  
  user.skillsWithService = user.skillsWithService.filter(
    s => s.skill.toString() !== skillId
  );
  
  // Also remove from legacy array
  const skill = await Skill.findById(skillId);
  if (skill) {
    user.skills = user.skills.filter(s => s !== skill.name);
    
    // Check if service type still has remaining skills
    const skillsInService = user.skillsWithService.filter(
      s => s.skill.serviceType.toString() === skill.serviceType.toString()
    );
    if (skillsInService.length === 0) {
      user.serviceTypes = user.serviceTypes.filter(
        st => st.toString() !== skill.serviceType.toString()
      );
    }
  }
  
  await user.save();
  
  const updatedUser = await User.findById(userId).populate({
    path: "skillsWithService.skill",
    populate: { path: "serviceType" }
  });
  
  res.status(200).json({
    success: true,
    message: "Skill removed successfully",
    user: updatedUser
  });
});

// Update user skill details
export const adminUpdateUserSkill = catchAsyncError(async (req, res, next) => {
  const { userId, skillId } = req.params;
  const { yearsOfExperience, proficiency } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  const skillIndex = user.skillsWithService.findIndex(
    s => s.skill.toString() === skillId
  );

  if (skillIndex === -1) {
    return next(new ErrorHandler("Skill not found for this user", 404));
  }

  if (yearsOfExperience !== undefined) {
    user.skillsWithService[skillIndex].yearsOfExperience = yearsOfExperience;
  }

  if (proficiency) {
    user.skillsWithService[skillIndex].proficiency = proficiency;
  }

  await user.save();

  const updatedUser = await User.findById(userId).populate({
    path: "skillsWithService.skill",
    populate: { path: "serviceType" }
  });

  res.status(200).json({
    success: true,
    message: "Skill updated successfully",
    user: updatedUser
  });
});

// Bulk update user skills (replace all skills)
export const adminUpdateUserSkills = catchAsyncError(async (req, res, next) => {
  const { userId } = req.params;
  const { skills } = req.body; // Array of skill names (strings)

  if (!Array.isArray(skills)) {
    return next(new ErrorHandler("Skills must be an array", 400));
  }

  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  if (user.role !== "Service Provider") {
    return next(new ErrorHandler("Only Service Providers can have skills", 403));
  }

  // Validate skill limits per service type (max 3 skills per service type)
  const skillCountsByServiceType = {};

  // Clear existing skills (but preserve serviceTypes)
  // NOTE: serviceTypes are required for Service Providers by schema validation.
  // We should not wipe them here; instead, keep current serviceTypes and only ADD new ones inferred from skills.
  const existingServiceTypes = Array.isArray(user.serviceTypes) ? [...user.serviceTypes] : [];
  user.skills = [];
  user.skillsWithService = [];
  user.serviceTypes = existingServiceTypes;

  // For each skill name, find the corresponding Skill document and validate
  for (const skillName of skills) {
    const trimmedSkillName = skillName.trim();
    if (!trimmedSkillName) continue; // Skip empty skills

    const skill = await Skill.findOne({ name: trimmedSkillName, isActive: true }).populate("serviceType");
    
    if (skill) {
      // Skill exists in Skill collection - add to structured array
      const serviceTypeId = skill.serviceType._id.toString();

      // Initialize count for this service type
      if (!skillCountsByServiceType[serviceTypeId]) {
        skillCountsByServiceType[serviceTypeId] = 0;
      }

      // Check limit per service type (max 3 skills per service type)
      if (skillCountsByServiceType[serviceTypeId] >= 3) {
        return next(new ErrorHandler(`Maximum 3 skills allowed per service type. Cannot add more ${skill.serviceType.name} skills.`, 400));
      }

      // Check if not already added (in case of duplicates in input)
      const alreadyAdded = user.skillsWithService.some(s => s.skill.toString() === skill._id.toString());
      if (!alreadyAdded) {
        user.skillsWithService.push({
          skill: skill._id,
          yearsOfExperience: 0,
          proficiency: "Intermediate",
          addedAt: new Date()
        });

        // Add to legacy array
        if (!user.skills.includes(skill.name)) {
          user.skills.push(skill.name);
        }

        // Add service type if not present
        if (!user.serviceTypes.includes(skill.serviceType._id)) {
          user.serviceTypes.push(skill.serviceType._id);
        }

        // Increment count
        skillCountsByServiceType[serviceTypeId]++;
      }
    } else {
      // Custom skill that doesn't exist in Skill collection - add directly to legacy skills array
      // This allows admins to add custom skills that aren't in the predefined list
      if (!user.skills.includes(trimmedSkillName)) {
        user.skills.push(trimmedSkillName);
      }
    }
  }

  // Validation handling:
  // The User schema requires at least one serviceType for Service Providers.
  // However, admins may manage skills before serviceTypes are configured (or add custom skills).
  // In these cases, skip schema validation to avoid 500s and allow admin recovery actions.
  const shouldSkipValidation =
    user.role === "Service Provider" &&
    (!Array.isArray(user.serviceTypes) || user.serviceTypes.length === 0);

  await user.save({ validateBeforeSave: !shouldSkipValidation });

  const updatedUser = await User.findById(userId).populate({
    path: "skillsWithService.skill",
    populate: { path: "serviceType" }
  });

  res.status(200).json({
    success: true,
    message: "Skills updated successfully",
    user: updatedUser
  });
});

// Update user services (service offerings with rates and descriptions)
export const adminUpdateUserServices = catchAsyncError(async (req, res, next) => {
  const { userId } = req.params;
  const { services } = req.body; // Array of service objects: [{ name, rate, description }]

  if (!Array.isArray(services)) {
    return next(new ErrorHandler("Services must be an array", 400));
  }

  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  if (user.role !== "Service Provider") {
    return next(new ErrorHandler("Only Service Providers can have services", 403));
  }

  // Validate services array
  for (const service of services) {
    if (!service.name || typeof service.name !== 'string') {
      return next(new ErrorHandler("Each service must have a valid name", 400));
    }
    if (service.rate !== undefined && (isNaN(service.rate) || service.rate < 0)) {
      return next(new ErrorHandler("Service rate must be a non-negative number", 400));
    }
  }

  // Update the services array in the user document
  user.services = services;
  await user.save();

  const updatedUserAfterServices = await User.findById(userId).populate({
    path: "skillsWithService.skill",
    populate: { path: "serviceType" }
  });

  res.status(200).json({
    success: true,
    message: "Services updated successfully",
    user: updatedUserAfterServices
  });
});

// Verify user account
export const verifyUser = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  if (user.verified) {
    return next(new ErrorHandler("User is already verified", 400));
  }

  user.verified = true;
  user.verifiedBy = req.admin._id;
  user.verificationDate = new Date();

  await user.save();

  res.status(200).json({
    success: true,
    message: "User verified successfully"
  });
});

// Ban user account
export const banUser = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  user.banned = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: "User banned successfully"
  });
});

export default {
  adminRepairUserSkills,
  adminRebuildAllRatings,
  adminReconnectSkills,
  adminRunConsistencyCheck,
  adminFixExpiredRequests,
  adminBulkRepair,
  getAllUsers,
  getUserWithSkills,
  adminAddSkillToUser,
  adminRemoveSkillFromUser,
  adminUpdateUserSkill,
  adminUpdateUserSkills,
  adminUpdateUserServices,
  verifyUser,
  banUser
};
