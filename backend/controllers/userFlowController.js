import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import User from "../models/userSchema.js";
import ServiceRequest from "../models/serviceRequest.js";
import ServiceOffer from "../models/serviceOffer.js";

import Review from "../models/review.js";
import { sendNotification } from "../utils/socketNotify.js";
import Booking from "../models/booking.js";
import { io } from "../server.js";
import { getRecommendedWorkers, getRecommendedServiceRequests } from "../utils/recommendationEngine.js";
import { sendTargetedRequestNotification } from "../utils/emailService.js";

export const postServiceRequest = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  const { name, address, phone, typeOfWork, preferredDate, time, budget, notes, targetProvider } = req.body;

  // For inquiries (General Inquiry), address and phone are not required
  const isInquiry = typeOfWork === 'General Inquiry';
  if (!name || !typeOfWork || !time || (!isInquiry && (!address || !phone))) return next(new ErrorHandler("Missing required fields", 400));

  let preferredDateObj = null;
  let expiresAt;

  if (preferredDate) {
    preferredDateObj = new Date(preferredDate);
    if (isNaN(preferredDateObj.getTime())) {
      return next(new ErrorHandler("Invalid preferred date format", 400));
    }
    const [hours, minutes] = time.split(':').map(Number);
    const expirationDate = new Date(preferredDateObj);
    expirationDate.setHours(hours, minutes, 0, 0);
    expiresAt = expirationDate;
  } else {
    expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  const request = await ServiceRequest.create({
    requester: req.user._id,
    name,
    address: isInquiry ? "" : address,
    phone: isInquiry ? "" : phone,
    typeOfWork,
    preferredDate: preferredDateObj,
    time,
    budget: budget || 0,
    notes,
    targetProvider,
    status: "Waiting",
    expiresAt,
  });

  const matchingProviders = await User.find({
    role: "Service Provider",
    skills: { $in: [new RegExp(typeOfWork, 'i')] },
  }).select("_id");

  for (const provider of matchingProviders) {
    await sendNotification(
      provider._id,
      "New Service Request",
      "Someone has posted a request that matches your service and skills.",
      { requestId: request._id, type: "service-request"}
    );
  }

  await sendNotification(
    req.user._id,
    "Service Request Posted",
    `Your "${typeOfWork}" request has been posted successfully.`,
    { requestId: request._id, type: "service-request-posted"}
  );

  res.status(201).json({ success: true, request });
});

export const updateBookingStatus = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  const { id } = req.params;
  const { status } = req.body;
  const booking = await Booking.findById(id);
  if (!booking) return next(new ErrorHandler("Booking not found", 404));

  const allowed = ["Available", "Working", "Complete", "Cancelled"];
  if (!allowed.includes(status)) return next(new ErrorHandler("Invalid status", 400));

  if (![String(booking.requester), String(booking.provider)].includes(String(req.user._id))) {
    return next(new ErrorHandler("Not authorized", 403));
  }

  booking.status = status;
  await booking.save();

  const otherUser = String(booking.requester) === String(req.user._id) ? booking.provider : booking.requester;
  await sendNotification(otherUser, `Booking ${status}`, `Booking ${booking._id} status changed to ${status}`);

  io.emit("booking-updated", { bookingId: booking._id, action: "status-updated", newStatus: status });

  res.json({ success: true, booking });
});

export const leaveReview = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  const { bookingId, rating, comments } = req.body;
  if (!bookingId || !rating) return next(new ErrorHandler("Missing required fields", 400));

  const booking = await Booking.findById(bookingId);
  if (!booking) return next(new ErrorHandler("Booking not found", 404));
  if (booking.status !== "Complete") return next(new ErrorHandler("Booking not completed yet", 400));
  if (![String(booking.requester), String(booking.provider)].includes(String(req.user._id))) {
    return next(new ErrorHandler("Not authorized", 403));
  }

  const existing = await Review.findOne({
    booking: bookingId,
    reviewer: req.user._id,
  });
  if (existing) return next(new ErrorHandler("You already reviewed this booking", 400));

  const review = await Review.create({
    booking: booking._id,
    reviewer: req.user._id,
    reviewee: String(booking.requester) === String(req.user._id) ? booking.provider : booking.requester,
    rating,
    comments,
  });

  await sendNotification(review.reviewee, "New Review", `You received a ${rating}-star review.`);

  io.emit("review-updated", { bookingId: booking._id, action: "review-added" });

  res.status(201).json({ success: true, review });
});

export const cancelServiceRequest = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { id } = req.params;
  const { cancellationReason } = req.body;

  const request = await ServiceRequest.findById(id);
  if (!request) return next(new ErrorHandler("Service request not found", 404));

  if (String(request.requester) !== String(req.user._id) && req.user.role !== "admin") {
    return next(new ErrorHandler("Not authorized to cancel this request", 403));
  }

  if(["Complete", "Cancelled"].includes(request.status)) {
    return next(new ErrorHandler("Cannot cancel a request that is already completed or cancelled", 400));
  }

  request.status = "Cancelled";
  request.cancellationReason = cancellationReason || "";
  await request.save();

  io.to(`service-request-${request._id}`).emit("service-request-updated", { requestId: request._id, action: "cancelled" });

  res.status(200).json({ success: true, request });
});

export const acceptServiceRequest = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  const { id } = req.params;
  const request = await ServiceRequest.findById(id).populate('requester');
  if (!request) return next(new ErrorHandler("Service Request not found", 404));
  if (request.status !== "Waiting") return next(new ErrorHandler("Request is not available", 400));

  const provider = await User.findById(req.user._id);
  if (!provider || provider.role !== "Service Provider") return next(new ErrorHandler("Not a provider", 403));

  // Check if provider already has a request on the same preferred date
  if (request.preferredDate) {
    const existingRequest = await ServiceRequest.findOne({
      serviceProvider: req.user._id,
      status: "Working",
      preferredDate: request.preferredDate
    });

    if (existingRequest) {
      return next(new ErrorHandler("You already have a confirmed request on this date. Please complete or cancel it before accepting another request.", 400));
    }
  }

  const booking = await Booking.create({
    requester: request.requester._id,
    provider: provider._id,
    serviceRequest: request._id,
    status: "Working",
  });

  request.status = "Working";
  request.serviceProvider = provider._id;
  request.eta = new Date(Date.now() + 30 * 60 * 1000);
  await request.save();

  await sendNotification(
    request.requester._id,
    "Request Accepted",
    `Your "${request.typeOfWork}" request has been accepted by ${provider.username}`,
    { date: booking.createdAt, service: request.typeOfWork }
  );

  io.to(`service-request-${request._id}`).emit("service-request-updated", { requestId: request._id, action: "accepted" });
  io.emit("booking-updated", { bookingId: booking._id, action: "created" });

  res.status(201).json({ success: true, booking, request });
});

export const getBookings = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const bookings = await Booking.find({
    $or: [
      { requester: req.user._id },
      { provider: req.user._id }
    ]
  }).populate('requester provider', 'firstName lastName')
    .populate('serviceRequest');

  res.status(200).json({ success: true, bookings });
});

export const getBooking = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { id } = req.params;

  const booking = await Booking.findById(id)
    .populate('requester', 'firstName lastName username email phone profilePic')
    .populate('provider', 'firstName lastName username email phone profilePic')
    .populate('serviceRequest');

  if (!booking) return next(new ErrorHandler("Booking not found", 404));

  if (String(booking.requester) !== String(req.user._id) && String(booking.provider) !== String(req.user._id)) {
    return next(new ErrorHandler("Not authorized", 403));
  }

  res.status(200).json({ success: true, booking });
});

export const getUserServices = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const user = await User.findById(req.user._id).select("services");
  if (!user) return next(new ErrorHandler("User not found", 404));

  res.json({ success: true, services: user.services });
});

export const getServiceProfile = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  res.status(200).json({
    success: true,
    profile: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      skills: user.skills,
      serviceDescription: user.serviceDescription,
      serviceRate: user.serviceRate,
      certificates: user.certificates,
      profilePic: user.profilePic,
      isOnline: user.isOnline
    }
  });
});

export const updateServiceProfile = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  
  const { skills, serviceDescription, serviceRate } = req.body;
  
  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorHandler("User not found", 404));
  
  if (skills) user.skills = skills;
  if (serviceDescription) user.serviceDescription = serviceDescription;
  if (serviceRate) user.serviceRate = serviceRate;
  
  await user.save();
  
  res.status(200).json({ success: true, profile: {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    skills: user.skills,
    serviceDescription: user.serviceDescription,
    serviceRate: user.serviceRate,
    certificates: user.certificates,
    profilePic: user.profilePic,
    isOnline: user.isOnline
  }});
});

export const updateServiceStatus = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { isOnline } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  user.isOnline = isOnline;
  await user.save();

  res.status(200).json({ success: true, message: `Status updated to ${isOnline ? 'Online' : 'Offline'}` });
});

export const getMatchingRequests = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  
  res.status(200).json({ success: true, requests: [] });
});

export const getChatHistory = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  
  res.status(200).json({ success: true, chatHistory: [] });
});

export const sendMessage = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  
  res.status(201).json({ success: true, message: {} });
});

export const getChatList = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  
  res.status(200).json({ success: true, chatList: [] });
});

export const markMessagesAsSeen = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  
  res.status(200).json({ success: true, message: "Messages marked as seen" });
});

export const getServiceProviders = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { page = 1, limit = 20, skills, minRating, maxRate } = req.query;
  const skip = (page - 1) * limit;

  // Build query - return all service providers, not just verified ones
  let query = { role: "Service Provider" };

  if (skills) {
    query.skills = { $in: [new RegExp(skills, 'i')] };
  }

  // If no limit specified or limit is very high, return all providers
  const shouldReturnAll = !limit || parseInt(limit) >= 10000;

  // Get providers with filters
  let providersQuery = User.find(query)
    .select('firstName lastName email phone skills services serviceDescription serviceRate profilePic isOnline averageRating totalReviews verified address occupation yearsExperience totalJobsCompleted createdAt')
    .sort({ averageRating: -1, totalReviews: -1 });

  if (!shouldReturnAll) {
    providersQuery = providersQuery.skip(skip).limit(parseInt(limit));
  }

  const providers = await providersQuery;

  // Get total count for pagination
  const totalCount = await User.countDocuments(query);

  // Get reviews for each provider
  const providerIds = providers.map(p => p._id);
  const reviews = await Review.find({ reviewee: { $in: providerIds } })
    .populate('reviewer', 'firstName lastName')
    .sort({ createdAt: -1 });

  // Group reviews by provider
  const reviewsByProvider = {};
  reviews.forEach(review => {
    const providerId = review.reviewee.toString();
    if (!reviewsByProvider[providerId]) {
      reviewsByProvider[providerId] = [];
    }
    reviewsByProvider[providerId].push({
      _id: review._id,
      comment: review.comments,
      rating: review.rating,
      reviewer: {
        firstName: review.reviewer.firstName,
        lastName: review.reviewer.lastName
      },
      createdAt: review.createdAt
    });
  });

  // Add reviews to providers
  const workersWithReviews = providers.map(provider => {
    const providerObj = provider.toObject();
    providerObj.reviews = reviewsByProvider[provider._id.toString()] || [];
    return providerObj;
  });

  res.json({ 
    success: true, 
    count: totalCount,
    workers: workersWithReviews 
  });
});

export const getServiceRequest = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { id } = req.params;

  const request = await ServiceRequest.findById(id)
    .populate('requester', 'firstName lastName username email phone profilePic')
    .populate('serviceProvider', 'firstName lastName username email phone profilePic')
    .populate('targetProvider', 'firstName lastName username email phone profilePic');

  if (!request) return next(new ErrorHandler("Service request not found", 404));

  if (String(request.requester) !== String(req.user._id) && 
      String(request.serviceProvider) !== String(req.user._id) &&
      String(request.targetProvider) !== String(req.user._id) &&
      req.user.role !== "admin") {
    return next(new ErrorHandler("Not authorized", 403));
  }

  res.status(200).json({ success: true, request });
});

export const offerToProvider = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  const { providerId, requestId } = req.body;

  if (!providerId || !requestId) {
    return next(new ErrorHandler("Provider ID and Request ID are required", 400));
  }

  const request = await ServiceRequest.findById(requestId).populate('requester', 'firstName lastName');
  if (!request) return next(new ErrorHandler("Service request not found", 404));

  // Check if the requester is the one making the offer
  if (String(request.requester) !== String(req.user._id)) {
    return next(new ErrorHandler("Not authorized to offer this request", 403));
  }

  // Check if the request can be offered (must be in Waiting status)
  if (request.status !== "Waiting") {
    return next(new ErrorHandler("This request cannot be offered at this time", 400));
  }

  // Check if the request already has a target provider
  if (request.targetProvider) {
    return next(new ErrorHandler("This request has already been offered to a provider", 400));
  }

  // Get provider details for email
  const provider = await User.findById(providerId).select('firstName lastName email');
  if (!provider) return next(new ErrorHandler("Provider not found", 404));

  // Check if the provider is a service provider
  if (provider.role !== "Service Provider") {
    return next(new ErrorHandler("Selected user is not a service provider", 400));
  }

  // Update the request with target provider
  request.targetProvider = providerId;
  request.status = "Offered";
  await request.save();

  // Create notification for provider
  await sendNotification(
    providerId,
    "Direct Service Request",
    `${req.user.firstName} ${req.user.lastName} have requested your service`,
    { requestId: request._id, type: "service-offer" }
  );

  // Send email to provider
  try {
    await sendTargetedRequestNotification(
      provider.email,
      `${provider.firstName} ${provider.lastName}`,
      `${request.requester.firstName} ${request.requester.lastName}`,
      request.typeOfWork,
      request._id
    );
  } catch (emailError) {
    console.error("Error sending email notification:", emailError);
    // Don't fail the request if email fails, just log it
  }

  // Emit socket event
  io.emit("service-request-updated", {
    requestId: request._id,
    action: "offered",
    providerId
  });

  res.status(200).json({ success: true, message: "Offer sent to provider" });
});

export const acceptOffer = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  const { requestId } = req.params;

  const request = await ServiceRequest.findById(requestId).populate('requester');
  if (!request) return next(new ErrorHandler("Service request not found", 404));

  // Check if the provider is the target
  if (String(request.targetProvider) !== String(req.user._id)) {
    return next(new ErrorHandler("Not authorized to accept this offer", 403));
  }

  // Check if provider already has a request on the same preferred date
  if (request.preferredDate) {
    const existingRequest = await ServiceRequest.findOne({
      serviceProvider: req.user._id,
      status: "Working",
      preferredDate: request.preferredDate
    });

    if (existingRequest) {
      return next(new ErrorHandler("You already have a confirmed request on this date. Please complete or cancel it before accepting another request.", 400));
    }
  }

  // Create booking
  const booking = await Booking.create({
    requester: request.requester._id,
    provider: req.user._id,
    serviceRequest: request._id,
    status: "Working",
  });

  request.status = "Working";
  request.serviceProvider = req.user._id;
  request.eta = new Date(Date.now() + 30 * 60 * 1000);
  await request.save();

  await sendNotification(
    request.requester._id,
    "Offer Accepted",
    `Your offer for "${request.typeOfWork}" has been accepted`,
    { requestId: request._id, type: "offer-accepted" }
  );

  io.to(`service-request-${request._id}`).emit("service-request-updated", { requestId: request._id, action: "offer-accepted" });
  io.emit("booking-updated", { bookingId: booking._id, action: "created" });

  res.status(201).json({ success: true, booking, request });
});

export const completeBooking = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  const { id } = req.params;

  const booking = await Booking.findById(id);
  if (!booking) return next(new ErrorHandler("Booking not found", 404));

  if (![String(booking.requester), String(booking.provider)].includes(String(req.user._id))) {
    return next(new ErrorHandler("Not authorized", 403));
  }

  booking.status = "Complete";
  await booking.save();

  // Update service request status
  const serviceRequest = await ServiceRequest.findById(booking.serviceRequest);
  if (serviceRequest) {
    serviceRequest.status = "Complete";
    await serviceRequest.save();
  }

  const otherUser = String(booking.requester) === String(req.user._id) ? booking.provider : booking.requester;
  await sendNotification(otherUser, "Booking Completed", `Booking ${booking._id} has been marked as complete`);

  io.emit("booking-updated", { bookingId: booking._id, action: "completed" });

  res.json({ success: true, booking });
});

export const getAvailableServiceRequests = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { page = 1, limit = 20, skills, location, useRecommendations } = req.query;
  const skip = (page - 1) * limit;

  // If user is a service provider and wants recommendations, use hybrid algorithm
  if (req.user.role === "Service Provider" && useRecommendations === "true") {
    try {
      const worker = await User.findById(req.user._id);
      const recommendedRequests = await getRecommendedServiceRequests(worker, {
        limit: parseInt(limit),
        minScore: 0.3
      });

      return res.json({
        success: true,
        count: recommendedRequests.length,
        requests: recommendedRequests,
        algorithm: "hybrid",
        description: "Using hybrid recommendation algorithm to match service requests to your profile"
      });
    } catch (error) {
      console.error('Error in recommended service requests:', error);
      // Fall through to regular query
    }
  }

  // Regular query with filters
  let query = { 
    status: "Waiting",
    expiresAt: { $gt: new Date() }
  };

  if (skills) {
    query.typeOfWork = { $in: [new RegExp(skills, 'i')] };
  }

  const requests = await ServiceRequest.find(query)
    .populate('requester', 'firstName lastName profilePic')
    .populate('targetProvider', 'firstName lastName')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const totalCount = await ServiceRequest.countDocuments(query);

  res.json({
    success: true,
    count: totalCount,
    requests,
    algorithm: "filtered",
    description: "Using filtered search"
  });
});

export const rejectOffer = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  const { requestId } = req.params;

  const request = await ServiceRequest.findById(requestId).populate('requester');
  if (!request) return next(new ErrorHandler("Service request not found", 404));

  // Check if the provider is the target
  if (String(request.targetProvider) !== String(req.user._id)) {
    return next(new ErrorHandler("Not authorized to reject this offer", 403));
  }

  // Reset the request status and clear target provider
  request.status = "Waiting";
  request.targetProvider = null;
  await request.save();

  await sendNotification(
    request.requester._id,
    "Offer Rejected",
    `Your offer for "${request.typeOfWork}" has been rejected`,
    { requestId: request._id, type: "offer-rejected" }
  );

  io.to(`service-request-${request._id}`).emit("service-request-updated", { requestId: request._id, action: "offer-rejected" });

  res.status(200).json({ success: true, message: "Offer rejected successfully" });
});

export const reverseGeocode = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return next(new ErrorHandler("Latitude and longitude are required", 400));
  }

  // This is a placeholder implementation
  // In a real application, you would use a geocoding service like Google Maps API
  res.json({
    success: true,
    address: "Address lookup not implemented",
    location: { lat: parseFloat(lat), lng: parseFloat(lng) }
  });
});

// MVP Service Request Flow
export const createServiceRequest = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  if (req.user.role !== "Community Member") {
    return next(new ErrorHandler("Only community members can create service requests", 403));
  }

  const { title, description, location, budgetRange, preferredDate, preferredTime, serviceCategory } = req.body;

  if (!title || !description || !location || !serviceCategory) {
    return next(new ErrorHandler("Missing required fields: title, description, location, serviceCategory", 400));
  }

  // Parse and validate preferred date and time
  let preferredDateObj = null;
  let timeStr = "";

  if (preferredDate) {
    preferredDateObj = new Date(preferredDate);
    if (isNaN(preferredDateObj.getTime())) {
      return next(new ErrorHandler("Invalid preferred date format", 400));
    }

    // Validate that preferred date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (preferredDateObj < today) {
      return next(new ErrorHandler("Preferred date cannot be in the past", 400));
    }
  }

  if (preferredTime) {
    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(preferredTime)) {
      return next(new ErrorHandler("Invalid time format. Please use HH:MM format (24-hour)", 400));
    }
    timeStr = preferredTime;
  }

  const serviceRequest = await ServiceRequest.create({
    requester: req.user._id,
    name: title, // Map title to name field
    address: location, // Map location to address field
    typeOfWork: serviceCategory, // Map serviceCategory to typeOfWork field
    preferredDate: preferredDateObj,
    time: timeStr,
    minBudget: budgetRange ? budgetRange.min || 0 : 0,
    maxBudget: budgetRange ? budgetRange.max || 0 : 0,
    notes: description, // Map description to notes field
    status: "Waiting",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });

  // Notify matching service providers
  const matchingProviders = await User.find({
    role: "Service Provider",
    verified: true,
    skills: { $in: [new RegExp(serviceCategory, 'i')] }
  });

  for (const provider of matchingProviders) {
    await sendNotification(
      provider._id,
      "New Service Request",
      `New ${serviceCategory} request available in your area`,
      { requestId: serviceRequest._id, type: "service-request" }
    );
  }

  res.status(201).json({ success: true, serviceRequest });
});

export const browseServiceProviders = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { page = 1, limit = 20, serviceCategory, location, minRating, maxRate } = req.query;
  const skip = (page - 1) * limit;

  let query = {
    role: "Service Provider",
    verified: true
  };

  if (serviceCategory) {
    query.skills = { $in: [new RegExp(serviceCategory, 'i')] };
  }

  if (location) {
    query.address = { $regex: location, $options: 'i' };
  }

  if (minRating) {
    query.averageRating = { $gte: parseFloat(minRating) };
  }

  if (maxRate) {
    query.serviceRate = { $lte: parseFloat(maxRate) };
  }

  const providers = await User.find(query)
    .select('firstName lastName email phone skills serviceDescription serviceRate profilePic isOnline averageRating totalReviews address')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ averageRating: -1, totalReviews: -1 });

  const totalCount = await User.countDocuments(query);

  res.json({
    success: true,
    count: totalCount,
    providers: providers
  });
});

export const viewProviderProfile = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { providerId } = req.params;

  const provider = await User.findById(providerId)
    .select('firstName lastName email phone skills serviceDescription serviceRate profilePic isOnline averageRating totalReviews address verified');

  if (!provider || provider.role !== "Service Provider") {
    return next(new ErrorHandler("Provider not found", 404));
  }

  // Get provider reviews
  const reviews = await Review.find({ reviewee: providerId })
    .populate('reviewer', 'firstName lastName')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    provider: {
      ...provider.toObject(),
      reviews
    }
  });
});

export const sendDirectServiceOffer = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  if (req.user.role !== "Community Member") {
    return next(new ErrorHandler("Only community members can send service offers", 403));
  }

  const { providerId, title, description, location, minBudget, maxBudget, preferredDate, preferredTime } = req.body;

  if (!providerId || !title || !description || !location) {
    return next(new ErrorHandler("Missing required fields", 400));
  }

  if (!minBudget || isNaN(parseFloat(minBudget)) || parseFloat(minBudget) <= 0) {
    return next(new ErrorHandler("Valid minimum budget is required", 400));
  }

  if (!maxBudget || isNaN(parseFloat(maxBudget)) || parseFloat(maxBudget) <= 0) {
    return next(new ErrorHandler("Valid maximum budget is required", 400));
  }

  if (parseFloat(minBudget) > parseFloat(maxBudget)) {
    return next(new ErrorHandler("Minimum budget cannot be greater than maximum budget", 400));
  }

  const provider = await User.findById(providerId);
  if (!provider || provider.role !== "Service Provider") {
    return next(new ErrorHandler("Provider not found", 404));
  }

  // Combine preferredDate and preferredTime into a Date object
  let preferredDateTime = null;
  if (preferredDate) {
    preferredDateTime = new Date(preferredDate);
    if (preferredTime) {
      const [hours, minutes] = preferredTime.split(':').map(Number);
      preferredDateTime.setHours(hours, minutes, 0, 0);
    }
  }

  const serviceOffer = await ServiceOffer.create({
    requester: req.user._id,
    provider: providerId,
    title,
    description,
    location,
    minBudget: parseFloat(minBudget),
    maxBudget: parseFloat(maxBudget),
    preferredDate: preferredDateTime,
    status: "Pending"
  });

  await sendNotification(
    providerId,
    "Direct Service Request",
    `${req.user.firstName} ${req.user.lastName} have requested your service`,
    { offerId: serviceOffer._id, type: "service-offer" }
  );

  res.status(201).json({ success: true, serviceOffer });
});

export const getProviderOffers = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  if (req.user.role !== "Service Provider") {
    return next(new ErrorHandler("Only service providers can view offers", 403));
  }

  const { page = 1, limit = 20, status } = req.query;
  const skip = (page - 1) * limit;

  // First, get direct service offers (ServiceOffer records)
  let directOffersQuery = { provider: req.user._id, status: "Pending" };
  if (status) {
    directOffersQuery.status = status;
  }

  const directOffers = await ServiceOffer.find(directOffersQuery)
    .populate('requester', 'firstName lastName email phone profilePic')
    .sort({ createdAt: -1 });

  // Second, get service requests offered to this provider
  let offeredRequestsQuery = { targetProvider: req.user._id, status: "Offered" };
  if (status && status !== "Pending") {
    // Map status to request status if needed
    offeredRequestsQuery.status = status;
  }

  const offeredRequests = await ServiceRequest.find(offeredRequestsQuery)
    .populate('requester', 'firstName lastName email phone profilePic')
    .sort({ createdAt: -1 });

  // Combine and format the results
  const allOffers = [
    ...directOffers.map(offer => ({
      _id: offer._id,
      type: 'direct',
      title: offer.title,
      description: offer.description,
      location: offer.location,
      minBudget: offer.minBudget,
      maxBudget: offer.maxBudget,
      preferredDate: offer.preferredDate,
      status: offer.status,
      createdAt: offer.createdAt,
      requester: offer.requester,
      serviceOffer: offer
    })),
    ...offeredRequests.map(request => ({
      _id: request._id,
      type: 'request',
      title: `Service Request: ${request.name}`,
      description: request.notes,
      location: request.address,
      minBudget: request.minBudget,
      maxBudget: request.maxBudget,
      preferredDate: request.preferredDate,
      status: 'Pending', // Map request status to offer status
      createdAt: request.createdAt,
      requester: request.requester,
      serviceRequest: request
    }))
  ];

  // Sort combined results by created date
  allOffers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Apply pagination
  const totalCount = allOffers.length;
  const paginatedOffers = allOffers.slice(skip, skip + parseInt(limit));

  res.json({
    success: true,
    count: totalCount,
    offers: paginatedOffers
  });
});

export const respondToServiceOffer = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  if (req.user.role !== "Service Provider") {
    return next(new ErrorHandler("Only service providers can respond to offers", 403));
  }

  const { offerId } = req.params;
  const { action } = req.body; // 'accept' or 'decline'

  if (!action || !['accept', 'decline'].includes(action)) {
    return next(new ErrorHandler("Action must be 'accept' or 'decline'", 400));
  }

  const offer = await ServiceOffer.findById(offerId).populate('requester');
  if (!offer) return next(new ErrorHandler("Offer not found", 404));
  if (String(offer.provider) !== String(req.user._id)) {
    return next(new ErrorHandler("Not authorized to respond to this offer", 403));
  }

  if (offer.status !== "Pending") {
    return next(new ErrorHandler("Offer has already been responded to", 400));
  }

  offer.status = action === 'accept' ? "Accepted" : "Declined";
  await offer.save();

  if (action === 'accept') {
    // Create booking
    const booking = await Booking.create({
      requester: offer.requester._id,
      provider: req.user._id,
      serviceOffer: offer._id,
      status: "In Progress"
    });

    await sendNotification(
      offer.requester._id,
      "Offer Accepted",
      `${req.user.firstName} ${req.user.lastName} accepted your service offer`,
      { bookingId: booking._id, type: "offer-accepted" }
    );

    res.status(201).json({ success: true, booking, offer });
  } else {
    await sendNotification(
      offer.requester._id,
      "Offer Declined",
      `${req.user.firstName} ${req.user.lastName} declined your service offer`,
      { offerId: offer._id, type: "offer-declined" }
    );

    res.json({ success: true, offer });
  }
});

export const markServiceCompleted = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { bookingId } = req.params;
  const { proofOfWork, completionNotes } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking) return next(new ErrorHandler("Booking not found", 404));

  if (![String(booking.requester), String(booking.provider)].includes(String(req.user._id))) {
    return next(new ErrorHandler("Not authorized", 403));
  }

  booking.status = "Completed";
  booking.proofOfWork = proofOfWork || [];
  booking.completionNotes = completionNotes || "";
  await booking.save();

  // Update service request status if exists
  if (booking.serviceRequest) {
    const serviceRequest = await ServiceRequest.findById(booking.serviceRequest);
    if (serviceRequest) {
      serviceRequest.status = "Completed";
      await serviceRequest.save();
    }
  }

  // Update provider ratings
  const provider = await User.findById(booking.provider);
  if (provider) {
    const reviews = await Review.find({ reviewee: booking.provider });
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    provider.averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
    provider.totalReviews = reviews.length;
    await provider.save();
  }

  const otherUser = String(booking.requester) === String(req.user._id) ? booking.provider : booking.requester;
  await sendNotification(otherUser, "Service Completed", `Booking ${booking._id} has been completed`);

  res.json({ success: true, booking });
});

export const applyToServiceRequest = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  if (req.user.role !== "Service Provider" || !req.user.verified) {
    return next(new ErrorHandler("Only verified service providers can apply to requests", 403));
  }

  const { requestId } = req.params;

  const serviceRequest = await ServiceRequest.findById(requestId).populate('requester');
  if (!serviceRequest) return next(new ErrorHandler("Service request not found", 404));
  if (serviceRequest.status !== "Open") {
    return next(new ErrorHandler("Service request is not open for applications", 400));
  }

  // Check if provider already applied
  const existingBooking = await Booking.findOne({
    provider: req.user._id,
    serviceRequest: requestId
  });

  if (existingBooking) {
    return next(new ErrorHandler("You have already applied to this request", 400));
  }

  const booking = await Booking.create({
    requester: serviceRequest.requester._id,
    provider: req.user._id,
    serviceRequest: requestId,
    status: "Pending"
  });

  await sendNotification(
    serviceRequest.requester._id,
    "New Application",
    `${req.user.firstName} ${req.user.lastName} applied to your ${serviceRequest.serviceCategory} request`,
    { bookingId: booking._id, type: "application" }
  );

  res.status(201).json({ success: true, booking });
});

export const getProviderApplications = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  if (req.user.role !== "Service Provider") {
    return next(new ErrorHandler("Only service providers can view applications", 403));
  }

  const { page = 1, limit = 20, status } = req.query;
  const skip = (page - 1) * limit;

  let query = { provider: req.user._id };
  if (status) {
    query.status = status;
  }

  const bookings = await Booking.find(query)
    .populate('requester', 'firstName lastName email phone profilePic')
    .populate('serviceRequest', 'name address typeOfWork minBudget maxBudget notes preferredDate time')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const totalCount = await Booking.countDocuments(query);

  res.json({
    success: true,
    count: totalCount,
    applications: bookings
  });
});

export const respondToApplication = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  if (req.user.role !== "Community Member") {
    return next(new ErrorHandler("Only community members can respond to applications", 403));
  }

  const { bookingId } = req.params;
  const { action } = req.body; // 'accept' or 'decline'

  if (!action || !['accept', 'decline'].includes(action)) {
    return next(new ErrorHandler("Action must be 'accept' or 'decline'", 400));
  }

  const booking = await Booking.findById(bookingId).populate('provider serviceRequest');
  if (!booking) return next(new ErrorHandler("Application not found", 404));
  if (String(booking.requester) !== String(req.user._id)) {
    return next(new ErrorHandler("Not authorized to respond to this application", 403));
  }

  if (booking.status !== "Pending") {
    return next(new ErrorHandler("Application has already been responded to", 400));
  }

  if (action === 'accept') {
    booking.status = "In Progress";
    await booking.save();

    // Update service request
    if (booking.serviceRequest) {
      booking.serviceRequest.status = "In Progress";
      booking.serviceRequest.serviceProvider = booking.provider._id;
      await booking.serviceRequest.save();
    }

    await sendNotification(
      booking.provider._id,
      "Application Accepted",
      `${req.user.firstName} ${req.user.lastName} accepted your application for ${booking.serviceRequest.title}`,
      { bookingId: booking._id, type: "application-accepted" }
    );

    res.json({ success: true, booking });
  } else {
    booking.status = "Declined";
    await booking.save();

    await sendNotification(
      booking.provider._id,
      "Application Declined",
      `${req.user.firstName} ${req.user.lastName} declined your application`,
      { bookingId: booking._id, type: "application-declined" }
    );

    res.json({ success: true, booking });
  }
});

export const getRecommendedProviders = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { serviceRequestId } = req.query;

  try {
    // If a service request ID is provided, use hybrid recommendation
    if (serviceRequestId) {
      const serviceRequest = await ServiceRequest.findById(serviceRequestId);
      if (serviceRequest) {
        const recommendedWorkers = await getRecommendedWorkers(serviceRequest, {
          limit: 10,
          minScore: 0.3
        });

        return res.json({
          success: true,
          providers: recommendedWorkers,
          algorithm: "hybrid",
          description: "Using hybrid recommendation algorithm (content-based + collaborative filtering)"
        });
      }
    }

    // Fallback: Get top-rated providers (basic recommendation)
    const providers = await User.find({
      role: "Service Provider",
      verified: true,
      averageRating: { $gte: 4.0 }
    })
    .select('firstName lastName email phone skills serviceDescription serviceRate profilePic isOnline averageRating totalReviews address verified occupation yearsExperience totalJobsCompleted createdAt')
    .sort({ averageRating: -1, totalReviews: -1 })
    .limit(10);

    res.json({
      success: true,
      providers,
      algorithm: "basic",
      description: "Using basic rating-based recommendation"
    });
  } catch (error) {
    console.error('Error in getRecommendedProviders:', error);
    // Fallback to basic recommendation on error
    const providers = await User.find({
      role: "Service Provider",
      verified: true,
      averageRating: { $gte: 4.0 }
    })
    .select('firstName lastName email phone skills serviceDescription serviceRate profilePic isOnline averageRating totalReviews address verified occupation yearsExperience totalJobsCompleted createdAt')
    .sort({ averageRating: -1, totalReviews: -1 })
    .limit(10);

    res.json({
      success: true,
      providers,
      algorithm: "fallback",
      description: "Using fallback recommendation due to error"
    });
  }
});

export const updateProfilePicture = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  if (!req.files || !req.files.profilePic) {
    return next(new ErrorHandler("Please upload a profile picture", 400));
  }

  const profilePic = req.files.profilePic;

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(profilePic.mimetype)) {
    return next(new ErrorHandler("Please upload a valid image file (JPEG, PNG, WebP)", 400));
  }

  // Validate file size (5MB limit)
  if (profilePic.size > 5 * 1024 * 1024) {
    return next(new ErrorHandler("File size must be less than 5MB", 400));
  }

  // Generate unique filename
  const fileName = `profilePic_${Date.now()}_${Math.floor(Math.random() * 1000000)}.${profilePic.mimetype.split('/')[1]}`;

  // Move file to uploads directory
  await profilePic.mv(`backend/uploads/${fileName}`);

  // Update user profile picture
  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  user.profilePic = `/uploads/${fileName}`;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Profile picture updated successfully",
    profilePic: user.profilePic
  });
});
