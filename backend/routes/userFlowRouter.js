import express from "express";
import { isUserAuthenticated, isUserVerified } from "../middlewares/auth.js";
import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import User from "../models/userSchema.js";
import ServiceRequest from '../models/serviceRequest.js';
import Review from '../models/review.js';
import Notification from '../models/notification.js';

import {
  getBookings,
  getBooking,
  updateBookingStatus,
  completeBooking,
  leaveReview,
  postServiceRequest,
  getServiceProfile,
  updateServiceProfile,
  updateServiceStatus,
  getServiceRequest,
  cancelServiceRequest,
  acceptServiceRequest,
  getAvailableServiceRequests,
  getUserServices,
  getServiceProviders,
  getRecommendedProviders,
  offerToProvider,
  acceptOffer,
  rejectOffer,
  reverseGeocode,
  getChatHistory,
  sendMessage,
  getChatList,
  markMessagesAsSeen,
  getProviderOffers,
  getProviderApplications,
  respondToServiceOffer,
  respondToApplication,
  applyToServiceRequest,
  updateProfilePicture,
  sendDirectServiceOffer
} from '../controllers/userFlowController.js';
import { getServices } from '../controllers/adminFlowController.js';
import { updateProfile, updateUserPassword } from '../controllers/userController.js';

const router = express.Router();

// User profile route
router.get('/me', isUserAuthenticated, isUserVerified, catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const user = await User.findById(req.user._id)
    .populate('certificates')
    .populate('workProof')
    .populate('bookings');
  if (!user) return next(new ErrorHandler("User not found", 404));

  const safeUser = {
    _id: user._id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    address: user.address,
    birthdate: user.birthdate,
    occupation: user.occupation,
    employed: user.employed,
    role: user.role,
    skills: user.skills,
    profilePic: user.profilePic,
    verified: user.verified,
    verifiedBy: user.verifiedBy,
    verificationDate: user.verificationDate,
    availability: user.availability,
    acceptedWork: user.acceptedWork,
    service: user.service,
    serviceRate: user.serviceRate,
    serviceDescription: user.serviceDescription,
    isOnline: user.isOnline,
    services: user.services,
    yearsExperience: user.yearsExperience,
    totalJobsCompleted: user.totalJobsCompleted,
    averageRating: user.averageRating,
    totalReviews: user.totalReviews,
    certificates: user.certificates || [],
    workProof: user.workProof || [],
    bookings: user.bookings || [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };

  // For backward compatibility, return both `user` and `profile`
  res.status(200).json({
    success: true,
    user: safeUser,
    profile: safeUser
  });
}));

// Separate endpoints for certificates and work proof
router.get('/my-certificates', isUserAuthenticated, isUserVerified, catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const user = await User.findById(req.user._id).populate('certificates');
  if (!user) return next(new ErrorHandler("User not found", 404));

  res.status(200).json({
    success: true,
    certificates: user.certificates || []
  });
}));

router.get('/my-work-proof', isUserAuthenticated, isUserVerified, catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const user = await User.findById(req.user._id).populate('workProof');
  if (!user) return next(new ErrorHandler("User not found", 404));

  res.status(200).json({
    success: true,
    workProof: user.workProof || []
  });
}));

// Password length route for Settings component
router.get('/me/password', isUserAuthenticated, isUserVerified, catchAsyncError(async (req, res) => {
  // Return a dummy response since we don't want to expose password info
  res.status(200).json({
    success: true,
    hasPassword: true,
    message: "Password change available"
  });
}));

// Dashboard routes
router.get('/dashboard/stats', isUserAuthenticated, isUserVerified, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get total service requests for this provider
    const totalRequests = await ServiceRequest.countDocuments({
      serviceProvider: userId
    });

    const completedJobs = await ServiceRequest.countDocuments({
      serviceProvider: userId,
      status: 'Complete'
    });

    const activeJobs = await ServiceRequest.countDocuments({
      serviceProvider: userId,
      status: 'Working'
    });

    const cancelledJobs = await ServiceRequest.countDocuments({
      serviceProvider: userId,
      status: 'Cancelled'
    });

    // Get pending requests count (open requests where provider can still bid)
    const pendingRequests = await ServiceRequest.countDocuments({
      serviceProvider: userId,
      status: 'Available'
    });

    // Calculate average rating from reviews
    const reviews = await Review.find({ reviewee: userId });
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    // Calculate total earnings from completed jobs
    const completedJobsWithBudget = await ServiceRequest.find({
      serviceProvider: userId,
      status: 'Complete'
    }).select('budget');

    const totalEarnings = completedJobsWithBudget.reduce((sum, job) => sum + (job.budget || 0), 0);

    // Get profile views (this would need to be implemented based on your tracking system)
    // For now, we'll use a placeholder or calculate from other metrics
    const profileViews = Math.floor(totalRequests * 2.5) + Math.floor(completedJobs * 1.8);

    res.status(200).json({
      success: true,
      data: {
        totalRequests,
        completedJobs,
        activeJobs,
        cancelledJobs,
        pendingRequests,
        averageRating: Math.round(averageRating * 10) / 10,
        totalEarnings,
        profileViews
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
});

router.get('/dashboard/recent-activity', isUserAuthenticated, isUserVerified, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get recent service requests for this user
    const recentRequests = await ServiceRequest.find({
      serviceProvider: userId
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('requester', 'firstName lastName')
    .select('title category status budget createdAt');

    // Get recent reviews
    const recentReviews = await Review.find({
      reviewee: userId
    })
    .sort({ createdAt: -1 })
    .limit(3)
    .populate('reviewer', 'firstName lastName')
    .select('rating comments createdAt');

    const activities = [];

    // Format service requests as activities
    recentRequests.forEach((request) => {
      const customerName = request.requester ? `${request.requester.firstName} ${request.requester.lastName}` : 'Unknown';
      activities.push({
        id: `request_${request._id}`,
        type: request.status === 'Complete' ? 'job_completed' : 'new_request',
        title: `${request.title} - ${request.status}`,
        description: `Budget: $${request.budget} - Customer: ${customerName}`,
        time: getTimeAgo(request.createdAt),
        status: request.status === 'Complete' ? 'success' : 'pending'
      });
    });

    // Format reviews as activities
    recentReviews.forEach((review) => {
      const reviewerName = review.reviewer ? `${review.reviewer.firstName} ${review.reviewer.lastName}` : 'Anonymous';
      activities.push({
        id: `review_${review._id}`,
        type: 'rating_received',
        title: 'Rating received',
        description: `${review.rating}-star rating from ${reviewerName} - "${review.comments?.substring(0, 50) || 'No comment'}"`,
        time: getTimeAgo(review.createdAt),
        status: 'success'
      });
    });

    // Sort activities by time (most recent first)
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.status(200).json({
      success: true,
      data: activities.slice(0, 5) // Return only the 5 most recent
    });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activity'
    });
  }
});

// Helper function to calculate time ago
function getTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;

  return date.toLocaleDateString();
}

// NEW ENDPOINTS FOR PROVIDER DASHBOARD
// Service Requests route - for fetching offers
router.get('/service-requests', isUserAuthenticated, isUserVerified, catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  try {
    // Get service requests where this user has been offered a job
    const offers = await ServiceRequest.find({
      $or: [
        { targetProvider: req.user._id, status: 'Offered' },
        { serviceProvider: req.user._id }
      ]
    })
    .populate('requester', 'firstName lastName email')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      requests: offers
    });
  } catch (error) {
    console.error('Error fetching service requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service requests'
    });
  }
}));

// Recommended Jobs route - for fetching recommended jobs
router.get('/recommended-jobs', isUserAuthenticated, isUserVerified, catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    // Get available service requests that match user's skills and services
    const availableRequests = await ServiceRequest.find({
      status: 'Available',
      $or: [
        { category: { $in: user.skills || [] } },
        { typeOfWork: { $in: user.services || [] } },
        { service: user.service }
      ]
    })
    .populate('requester', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(20);

    // Add recommendation score based on various factors
    const scoredRequests = availableRequests.map(request => {
      let score = 0;

      // Score based on skill matching
      if (user.skills?.includes(request.category)) score += 10;
      if (user.services?.includes(request.typeOfWork)) score += 8;
      if (user.service === request.service) score += 12;

      // Score based on budget (prefer reasonable budgets)
      if (request.budget >= 1000 && request.budget <= 5000) score += 5;
      else if (request.budget > 5000) score += 3;

      // Score based on recency
      const daysSincePosted = (new Date() - request.createdAt) / (1000 * 60 * 60 * 24);
      if (daysSincePosted < 1) score += 7;
      else if (daysSincePosted < 3) score += 5;
      else if (daysSincePosted < 7) score += 3;

      // Score based on urgency
      if (request.urgency === 'Urgent') score += 4;
      else if (request.urgency === 'High') score += 2;

      return {
        ...request.toObject(),
        recommendationScore: score
      };
    });

    // Sort by recommendation score
    scoredRequests.sort((a, b) => b.recommendationScore - a.recommendationScore);

    res.status(200).json({
      success: true,
      jobs: scoredRequests
    });
  } catch (error) {
    console.error('Error fetching recommended jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommended jobs'
    });
  }
}));

// Booking routes
router.get('/bookings', isUserAuthenticated, isUserVerified, getBookings);
router.get('/booking/:id', isUserAuthenticated, isUserVerified, getBooking);
router.put('/booking/:id/status', isUserAuthenticated, isUserVerified, updateBookingStatus);
router.put('/booking/:id/complete', isUserAuthenticated, isUserVerified, completeBooking);
router.post('/review', isUserAuthenticated, isUserVerified, leaveReview);

// Service Request routes
router.get('/available-service-requests', isUserAuthenticated, isUserVerified, getAvailableServiceRequests);
router.post('/post-service-request', isUserAuthenticated, isUserVerified, postServiceRequest);
router.get('/service-request/:id', isUserAuthenticated, isUserVerified, getServiceRequest);
router.delete('/service-request/:id/cancel', isUserAuthenticated, isUserVerified, cancelServiceRequest);
router.post('/service-request/:id/accept', isUserAuthenticated, isUserVerified, acceptServiceRequest);

// Service Profile routes
router.get('/service-profile', isUserAuthenticated, isUserVerified, getServiceProfile);
router.post('/service-profile', isUserAuthenticated, isUserVerified, updateServiceProfile);
router.put('/service-status', isUserAuthenticated, isUserVerified, updateServiceStatus);

// User services route
router.get('/services', isUserAuthenticated, isUserVerified, getUserServices);
// Public route for predefined services (for registration form)
router.get('/predefined-services', getServices);

// Service Providers route
router.get('/service-providers', isUserAuthenticated, isUserVerified, getServiceProviders);

// Recommended Providers route
router.get('/recommended-providers', isUserAuthenticated, isUserVerified, getRecommendedProviders);

// Offer routes
router.post('/send-direct-service-offer', isUserAuthenticated, isUserVerified, sendDirectServiceOffer);
router.post('/offer-to-provider', isUserAuthenticated, isUserVerified, offerToProvider);
router.post('/offer/:requestId/accept', isUserAuthenticated, isUserVerified, acceptOffer);
router.post('/offer/:requestId/reject', isUserAuthenticated, isUserVerified, rejectOffer);

// Chat routes
router.get("/chat-history", isUserAuthenticated, isUserVerified, getChatHistory);
router.get("/chat-list", isUserAuthenticated, isUserVerified, getChatList);
router.post("/send-message", isUserAuthenticated, isUserVerified, sendMessage);
router.put("/chat/:appointmentId/mark-seen", isUserAuthenticated, isUserVerified, markMessagesAsSeen);

// Notification routes
router.get('/notifications', isUserAuthenticated, isUserVerified, catchAsyncError(async (req, res) => {
  const userId = req.user._id;
  const notifications = await Notification.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(50);
  res.status(200).json({ success: true, notifications });
}));

router.get('/notifications/unread-count', isUserAuthenticated, isUserVerified, catchAsyncError(async (req, res) => {
  const userId = req.user._id;
  const count = await Notification.countDocuments({ user: userId, read: false });
  res.status(200).json({ success: true, unreadCount: count });
}));

router.put('/notifications/mark-all-read', isUserAuthenticated, isUserVerified, catchAsyncError(async (req, res) => {
  const userId = req.user._id;
  await Notification.updateMany({ user: userId, read: false }, { read: true });
  res.status(200).json({ success: true, message: "All notifications marked as read" });
}));

// Notification preferences route (placeholder)
router.get('/notification-preferences', isUserAuthenticated, isUserVerified, catchAsyncError(async (req, res) => {
  // Return default preferences
  res.status(200).json({
    success: true,
    preferences: {
      email: true,
      sms: false,
      push: true,
      marketing: true
    }
  });
}));

// Reverse geocoding route
router.get('/reverse-geocode', isUserAuthenticated, isUserVerified, reverseGeocode);

// Provider Dashboard routes
router.get('/provider-offers', isUserAuthenticated, isUserVerified, getProviderOffers);
router.get('/provider-applications', isUserAuthenticated, isUserVerified, getProviderApplications);
router.post('/apply-to-request/:requestId', isUserAuthenticated, isUserVerified, applyToServiceRequest);
router.post('/respond-to-offer/:offerId', isUserAuthenticated, isUserVerified, respondToServiceOffer);
router.post('/respond-to-application/:bookingId', isUserAuthenticated, isUserVerified, respondToApplication);
router.post('/update-profile-picture', isUserAuthenticated, isUserVerified, updateProfilePicture);

// Additional endpoints for frontend compatibility

// User service requests (for clients to view their own requests)
router.get('/user-service-requests', isUserAuthenticated, isUserVerified, catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const requests = await ServiceRequest.find({ requester: req.user._id })
    .populate('serviceProvider', 'firstName lastName profilePic')
    .populate('targetProvider', 'firstName lastName profilePic')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, requests });
}));

// Client applications (for clients to view applications to their requests)
router.get('/client-applications', isUserAuthenticated, isUserVerified, catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  // Get bookings where user is requester and status is "Applied"
  const applications = await Booking.find({
    requester: req.user._id,
    status: "Applied"
  })
    .populate('provider', 'firstName lastName profilePic email phone skills averageRating totalReviews')
    .populate({
      path: 'serviceRequest',
      select: 'name address typeOfWork minBudget maxBudget notes preferredDate time'
    })
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, applications });
}));

// Matching requests (for workers - alias for available-service-requests)
router.get('/matching-requests', isUserAuthenticated, isUserVerified, getAvailableServiceRequests);

// Update service request
router.put('/service-request/:id/update', isUserAuthenticated, isUserVerified, catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  
  const { id } = req.params;
  const request = await ServiceRequest.findById(id);
  
  if (!request) return next(new ErrorHandler("Service request not found", 404));
  if (String(request.requester) !== String(req.user._id)) {
    return next(new ErrorHandler("Not authorized to update this request", 403));
  }
  
  // Cannot edit if already accepted/working
  if (['Working', 'Complete', 'Cancelled'].includes(request.status)) {
    return next(new ErrorHandler("Cannot edit request that is in progress or completed", 400));
  }
  
  const { name, address, phone, typeOfWork, serviceCategory, preferredDate, time, budget, notes, title, description, location, budgetRange, preferredSchedule } = req.body;
  
  // Handle both old and new field names
  if (name) request.name = name;
  if (title) request.title = title;
  if (address) request.address = address;
  if (location) request.location = location;
  if (phone) request.phone = phone;
  if (typeOfWork) request.typeOfWork = typeOfWork;
  if (serviceCategory) request.serviceCategory = serviceCategory;
  if (description) request.description = description;
  if (preferredDate) request.preferredDate = preferredDate;
  if (preferredSchedule) request.preferredSchedule = preferredSchedule;
  if (time) request.time = time;
  if (budget !== undefined) request.budget = budget;
  if (budgetRange) request.budgetRange = budgetRange;
  if (notes !== undefined) request.notes = notes;
  
  await request.save();
  
  res.status(200).json({ success: true, request });
}));

// Update profile endpoint
router.put('/update-profile', isUserAuthenticated, isUserVerified, catchAsyncError(updateProfile));

// Update password endpoint
router.put('/password/update', isUserAuthenticated, isUserVerified, catchAsyncError(updateUserPassword));

// Upload profile picture (alias for update-profile-picture)
router.post('/upload-profile-pic', isUserAuthenticated, isUserVerified, updateProfilePicture);

export default router;
