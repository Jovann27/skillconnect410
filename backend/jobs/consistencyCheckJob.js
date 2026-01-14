// jobs/consistencyCheckJob.js - Pattern 10: Daily Consistency Checks

import cron from "node-cron";
import {
  validateUserSkillConsistency,
  rebuildAllUserRatings
} from "../utils/dataConsistency.js";
import User from "../models/userSchema.js";
import Skill from "../models/skillSchema.js";
import Booking from "../models/booking.js";
import ServiceRequest from "../models/serviceRequest.js";
import Review from "../models/review.js";
import logger from "../utils/logger.js";

/**
 * Log alerts for consistency issues
 * @param {Object} alert - Alert data
 */
function logAlert(alert) {
  const alertData = {
    ...alert,
    timestamp: new Date().toISOString(),
    level: "CRITICAL"
  };

  logger.error("CONSISTENCY_ALERT", alertData);
  console.error(`⚠️ CONSISTENCY_ALERT: ${JSON.stringify(alertData)}`);
}

/**
 * Run comprehensive daily consistency check
 */
async function runConsistencyCheck() {
  console.log("🔍 Running daily consistency check...");

  const issues = {
    skillSyncErrors: [],
    invalidRatings: [],
    orphanedSkills: [],
    invalidBookings: [],
    expiredRequests: [],
    duplicateReviews: []
  };

  try {
    // Check 1: Skill sync issues
    const providers = await User.find({ role: "Service Provider" }).populate("skillsWithService.skill");
    for (let user of providers) {
      if (!validateUserSkillConsistency(user)) {
        issues.skillSyncErrors.push({
          userId: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          skillsCount: user.skills.length,
          structuredSkillsCount: user.skillsWithService.length
        });
      }
    }

    if (issues.skillSyncErrors.length > 0) {
      logAlert({
        type: "SKILL_SYNC_ERROR",
        count: issues.skillSyncErrors.length,
        userIds: issues.skillSyncErrors.map(u => u.userId)
      });
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

    if (issues.invalidRatings.length > 0) {
      logAlert({
        type: "INVALID_RATING",
        count: issues.invalidRatings.length,
        userIds: issues.invalidRatings.map(u => u.userId)
      });
    }

    // Check 3: Orphaned skills
    const orphanedSkills = await Skill.find({
      serviceType: { $exists: false }
    }).select("_id name");

    issues.orphanedSkills = orphanedSkills.map(skill => ({
      skillId: skill._id,
      name: skill.name
    }));

    if (issues.orphanedSkills.length > 0) {
      logAlert({
        type: "ORPHANED_SKILL",
        count: issues.orphanedSkills.length,
        skillIds: issues.orphanedSkills.map(s => s.skillId)
      });
    }

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

    if (issues.invalidBookings.length > 0) {
      logAlert({
        type: "INVALID_BOOKING",
        count: issues.invalidBookings.length,
        bookingIds: issues.invalidBookings.map(b => b.bookingId)
      });
    }

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

    if (issues.expiredRequests.length > 0) {
      logAlert({
        type: "EXPIRED_REQUEST",
        count: issues.expiredRequests.length,
        requestIds: issues.expiredRequests.map(r => r.requestId)
      });
    }

    // Check 6: Duplicate reviews (same reviewer reviewing same reviewee multiple times for same booking)
    const duplicateReviews = await Review.aggregate([
      {
        $group: {
          _id: { booking: "$booking", reviewer: "$reviewer" },
          count: { $sum: 1 },
          reviews: { $push: "$_id" }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    issues.duplicateReviews = duplicateReviews.map(dup => ({
      bookingId: dup._id.booking,
      reviewerId: dup._id.reviewer,
      count: dup.count,
      reviewIds: dup.reviews
    }));

    if (issues.duplicateReviews.length > 0) {
      logAlert({
        type: "DUPLICATE_REVIEWS",
        count: issues.duplicateReviews.length,
        duplicates: issues.duplicateReviews
      });
    }

    // Auto-fix some issues
    if (issues.expiredRequests.length > 0) {
      console.log(`🔧 Auto-fixing ${issues.expiredRequests.length} expired requests...`);
      const fixResult = await ServiceRequest.updateMany(
        {
          expiresAt: { $lt: now },
          status: { $in: ["Open", "Offered"] }
        },
        {
          status: "Cancelled",
          cancellationReason: "Expired automatically by system maintenance"
        }
      );
      console.log(`✓ Fixed ${fixResult.modifiedCount} expired requests`);
    }

    // Auto-fix invalid ratings
    if (issues.invalidRatings.length > 0) {
      console.log(`🔧 Auto-fixing ${issues.invalidRatings.length} invalid ratings...`);
      await rebuildAllUserRatings();
      console.log("✓ Rebuilt all user ratings");
    }

    const totalIssues = Object.values(issues).reduce((sum, arr) => sum + arr.length, 0);

    console.log(`✅ Consistency check completed. Found ${totalIssues} issues, auto-fixed ${issues.expiredRequests.length + issues.invalidRatings.length}`);

    // Log summary
    logger.info("DAILY_CONSISTENCY_CHECK", {
      timestamp: new Date().toISOString(),
      totalIssues,
      issues: Object.keys(issues).reduce((acc, key) => {
        acc[key] = issues[key].length;
        return acc;
      }, {}),
      autoFixed: issues.expiredRequests.length + issues.invalidRatings.length
    });

  } catch (error) {
    console.error("❌ Consistency check failed:", error);
    logAlert({
      type: "CHECK_FAILED",
      error: error.message,
      stack: error.stack
    });
  }
}

// Schedule job to run at 2 AM daily
const consistencyCheckJob = cron.schedule("0 2 * * *", async () => {
  await runConsistencyCheck();
}, {
  scheduled: false // Don't start automatically
});

// Manual trigger function for testing
export const triggerConsistencyCheck = async () => {
  await runConsistencyCheck();
};

export default consistencyCheckJob;
