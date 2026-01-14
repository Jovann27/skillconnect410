import Review from "../models/review.js";
import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import { recalculateUserAverageRating } from "../utils/dataConsistency.js";

// Get all reviews for a specific user (reviewee)
export const getUserReviews = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { userId } = req.params;

  // Validate userId format
  if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new ErrorHandler("Invalid user ID format", 400));
  }

  const { page = 1, limit = 10 } = req.query;

  // Validate pagination parameters
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  if (isNaN(pageNum) || pageNum < 1) return next(new ErrorHandler("Invalid page number", 400));
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) return next(new ErrorHandler("Invalid limit (1-50 allowed)", 400));

  const reviews = await Review.find({ reviewee: userId })
    .populate('reviewer', 'firstName lastName profilePic')
    .populate('booking', 'service')
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  const totalCount = await Review.countDocuments({ reviewee: userId });

  // Format the reviews for the mobile app
  const formattedReviews = reviews.map(review => ({
    id: review._id,
    clientName: `${review.reviewer.firstName} ${review.reviewer.lastName}`,
    service: review.booking?.service || 'Service',
    rating: review.rating,
    comment: review.comments,
    images: [], // Reviews don't have images in the current schema
    createdAt: review.createdAt
  }));

  res.status(200).json({
    success: true,
    reviews: formattedReviews,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum)
    }
  });
});

// Create review & recalculate rating - Pattern 3: Aggregate Recalculation
export const createReview = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { bookingId, rating, comments } = req.body;

  // Validate required fields
  if (!bookingId) {
    return next(new ErrorHandler("Booking ID is required", 400));
  }

  // Validate bookingId format
  if (!bookingId.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new ErrorHandler("Invalid booking ID format", 400));
  }

  // Validate rating
  if (rating === undefined || rating === null) {
    return next(new ErrorHandler("Rating is required", 400));
  }

  const ratingNum = parseFloat(rating);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return next(new ErrorHandler("Rating must be a number between 1 and 5", 400));
  }

  // Validate comments
  if (comments && (typeof comments !== 'string' || comments.trim().length > 1000)) {
    return next(new ErrorHandler("Comments must be a string with maximum 1000 characters", 400));
  }

  // Find the booking to get the reviewee
  const Booking = (await import("../models/booking.js")).default;
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    return next(new ErrorHandler("Booking not found", 404));
  }

  // Check if booking is completed
  if (booking.status !== "Completed") {
    return next(new ErrorHandler("Can only review completed bookings", 400));
  }

  // Check if user is part of this booking
  if (![String(booking.requester), String(booking.provider)].includes(String(req.user._id))) {
    return next(new ErrorHandler("Not authorized to review this booking", 403));
  }

  // Check if user already reviewed this specific booking (unique index ensures this, but we check explicitly)
  const existingReview = await Review.findOne({
    booking: bookingId,
    reviewer: req.user._id
  });

  if (existingReview) {
    return next(new ErrorHandler("You have already reviewed this booking", 400));
  }

  // Determine who is being reviewed (the other party in the booking)
  const revieweeId = booking.requester.toString() === req.user._id.toString()
    ? booking.provider
    : booking.requester;

  const review = await Review.create({
    booking: bookingId,
    reviewer: req.user._id,
    reviewee: revieweeId,
    rating: ratingNum,
    comments: comments ? comments.trim() : ""
  });

  // NOW: Recalculate reviewee's aggregate
  try {
    await recalculateUserAverageRating(revieweeId);
  } catch (error) {
    console.error("Error recalculating rating after review creation:", error);
    // Don't fail the review creation if rating recalculation fails
  }

  res.status(201).json({
    success: true,
    message: "Review created successfully",
    review
  });
});

// Get reviews by the current user (as reviewer)
export const getReviewsByUser = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const reviews = await Review.find({ reviewer: req.user._id })
    .populate('reviewee', 'firstName lastName profilePic')
    .populate('booking')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    reviews
  });
});



// Get review statistics for a user
export const getUserReviewStats = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { userId } = req.params;

  // Validate userId format
  if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new ErrorHandler("Invalid user ID format", 400));
  }

  const stats = await Review.aggregate([
    { $match: { reviewee: userId } },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: "$rating" },
        ratingDistribution: {
          $push: "$rating"
        }
      }
    }
  ]);

  const result = stats[0] || { totalReviews: 0, averageRating: 0, ratingDistribution: [] };

  // Count rating distribution
  const distribution = [1, 2, 3, 4, 5].map(rating => ({
    rating,
    count: result.ratingDistribution.filter(r => r === rating).length
  }));

  res.status(200).json({
    success: true,
    stats: {
      totalReviews: result.totalReviews,
      averageRating: result.averageRating ? Math.round(result.averageRating * 10) / 10 : 0,
      distribution
    }
  });
});
