import express from "express";
import { isUserAuthenticated } from "../middlewares/auth.js";
import { validateSchema, handleValidationErrors } from "../middlewares/validation.js";
import { reviewSchema } from "../validators/schemas.js";
import {
  getUserReviews,
  createReview,
  getUserReviewStats
} from "../controllers/reviewController.js";

const router = express.Router();

// Get reviews for a specific user
router.get("/user/:userId", getUserReviews);

// Get review statistics for a user
router.get("/stats/:userId", getUserReviewStats);

// Create a new review (requires authentication)
router.post("/", isUserAuthenticated, validateSchema(reviewSchema), handleValidationErrors, createReview);

export default router;
