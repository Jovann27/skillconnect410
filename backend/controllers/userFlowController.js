import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import User from "../models/userSchema.js";
import ServiceRequest from "../models/serviceRequest.js";
import Review from "../models/review.js";
import { sendNotification } from "../utils/socketNotify.js";
import Booking from "../models/booking.js";
import { io } from "../server.js";

export const postServiceRequest = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  const { name, address, phone, typeOfWork, preferredDate, time, budget, notes, targetProvider } = req.body;
  if (!name || !address || !phone || !typeOfWork || !time) return next(new ErrorHandler("Missing required fields", 400));

  let expiresAt;
  if (preferredDate) {
    const [hours, minutes] = time.split(':').map(Number);
    const expirationDate = new Date(preferredDate);
    expirationDate.setHours(hours, minutes, 0, 0);
    expiresAt = expirationDate;
  } else {
    expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  const request = await ServiceRequest.create({
    requester: req.user._id,
    name,
    address,
    phone,
    typeOfWork,
    preferredDate: preferredDate || "",
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

  // Build query
  let query = { role: "Service Provider", isVerified: true };
  
  if (skills) {
    query.skills = { $in: [new RegExp(skills, 'i')] };
  }

  // Get providers with filters
  const providers = await User.find(query)
    .select('firstName lastName email phone skills serviceDescription serviceRate profilePic isOnline averageRating totalReviews isVerified address')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ averageRating: -1, totalReviews: -1 });

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

  const request = await ServiceRequest.findById(requestId);
  if (!request) return next(new ErrorHandler("Service request not found", 404));

  // Check if the requester is the one making the offer
  if (String(request.requester) !== String(req.user._id)) {
    return next(new ErrorHandler("Not authorized to offer this request", 403));
  }

  // Update the request with target provider
  request.targetProvider = providerId;
  request.status = "Offered";
  await request.save();

  // Create notification for provider
  await sendNotification(
    providerId,
    "New Service Offer",
    `You have received an offer for: ${request.typeOfWork}`,
    { requestId: request._id, type: "service-offer" }
  );

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

  const { page = 1, limit = 20, skills, location } = req.query;
  const skip = (page - 1) * limit;

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
    requests
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
