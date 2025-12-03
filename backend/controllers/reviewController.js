import Review from "../models/review.js";
import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";

// Get all reviews for a specific user (reviewee)
export const getUserReviews = catchAsyncError(async (req, res) => {
  const { userId } = req.params;

  const reviews = await Review.find({ reviewee: userId })
    .populate('reviewer', 'firstName lastName profilePic')
    .populate('booking', 'service')
    .sort({ createdAt: -1 });

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
    reviews: formattedReviews
  });
});

// Create a new review
export const createReview = catchAsyncError(async (req, res, next) => {
  const { bookingId, rating, comments } = req.body;
  const reviewerId = req.user._id;

  // Find the booking to get the reviewee
  const Booking = (await import("../models/booking.js")).default;
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    return next(new ErrorHandler("Booking not found", 404));
  }

  // Determine who is being reviewed (the other party in the booking)
  const revieweeId = booking.requester.toString() === reviewerId.toString()
    ? booking.provider
    : booking.requester;

  const review = await Review.create({
    booking: bookingId,
    reviewer: reviewerId,
    reviewee: revieweeId,
    rating,
    comments
  });

  res.status(201).json({
    success: true,
    message: "Review created successfully",
    review
  });
});

// Get review statistics for a user
export const getUserReviewStats = catchAsyncError(async (req, res) => {
  const { userId } = req.params;

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
      averageRating: Math.round(result.averageRating * 10) / 10,
      distribution
    }
  });
});
