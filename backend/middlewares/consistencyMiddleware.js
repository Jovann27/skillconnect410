// middlewares/consistencyMiddleware.js - Pattern 9: Auto-validation Middleware

import { validateUserSkillConsistency } from "../utils/dataConsistency.js";

/**
 * Middleware to validate consistency after user-related operations
 * @param {string} entity - The entity type to validate ('user', 'skill', etc.)
 */
export const validateConsistencyAfter = (entity) => {
  return async (req, res, next) => {
    // Store original send method
    const originalJson = res.json;

    // Override json method to validate before sending response
    res.json = function(data) {
      // If successful response with entity data
      if (data.success && data[entity]) {
        const entityData = data[entity];

        try {
          // Run post-operation validation based on entity type
          if (entity === "user" && entityData.role === "Service Provider") {
            const isConsistent = validateUserSkillConsistency(entityData);
            if (!isConsistent) {
              console.error("POST-RESPONSE CONSISTENCY ERROR: User skill data inconsistent", {
                userId: entityData._id,
                endpoint: req.originalUrl,
                method: req.method
              });

              // Return error instead of success
              return originalJson.call(this, {
                success: false,
                message: "Internal consistency error detected",
                error: "Skill consistency validation failed after operation"
              });
            }
          }
        } catch (error) {
          console.error("Error during post-response consistency validation:", error);
          // Log but don't fail the request - consistency check errors shouldn't break successful operations
        }
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Middleware to validate consistency before saving user data
 */
export const validateConsistencyBeforeSave = async (req, res, next) => {
  // This would be used with pre-save hooks, but implemented as middleware for demonstration
  next();
};

/**
 * Middleware to automatically repair consistency issues
 */
export const autoRepairConsistency = (entity) => {
  return async (req, res, next) => {
    const originalJson = res.json;

    res.json = function(data) {
      // If response has consistency errors, attempt auto-repair
      if (data.success && data[entity] && entity === "user") {
        const entityData = data[entity];

        try {
          if (entityData.role === "Service Provider") {
            const isConsistent = validateUserSkillConsistency(entityData);
            if (!isConsistent) {
              console.warn("AUTO-REPAIR: Attempting to fix consistency issue", {
                userId: entityData._id,
                endpoint: req.originalUrl
              });

              // For now, just log - in production you might implement auto-repair logic
              // This is a placeholder for auto-repair functionality
            }
          }
        } catch (error) {
          console.error("Error during auto-repair attempt:", error);
        }
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Middleware to monitor consistency over time
 */
export const consistencyMonitor = (entity) => {
  return async (req, res, next) => {
    const startTime = Date.now();

    // Store original methods
    const originalJson = res.json;
    const originalStatus = res.status;

    let responseStatus = 200;

    res.status = function(code) {
      responseStatus = code;
      return originalStatus.call(this, code);
    };

    res.json = function(data) {
      const duration = Date.now() - startTime;

      // Log consistency metrics
      if (data.success && data[entity]) {
        console.log("CONSISTENCY_METRIC", {
          endpoint: req.originalUrl,
          method: req.method,
          entity,
          status: responseStatus,
          duration,
          timestamp: new Date().toISOString(),
          userId: req.user?.id || "anonymous"
        });
      }

      return originalJson.call(this, data);
    };

    next();
  };
};
