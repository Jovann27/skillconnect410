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

export default {
  adminRepairUserSkills,
  adminRebuildAllRatings,
  adminReconnectSkills,
  adminRunConsistencyCheck,
  adminFixExpiredRequests,
  adminBulkRepair
};
