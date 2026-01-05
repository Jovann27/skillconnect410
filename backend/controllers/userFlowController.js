import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import User from "../models/userSchema.js";
import ServiceRequest from "../models/serviceRequest.js";
import ServiceOffer from "../models/serviceOffer.js";
import Certificate from "../models/certificate.js";
import WorkProof from "../models/workProof.js";
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
  let query = { role: "Service Provider", verified: true };
  
  if (skills) {
    query.skills = { $in: [new RegExp(skills, 'i')] };
  }

  // Get providers with filters
  const providers = await User.find(query)
    .select('firstName lastName email phone skills serviceDescription serviceRate profilePic isOnline averageRating totalReviews verified address occupation yearsExperience totalJobsCompleted createdAt')
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

// MVP Service Request Flow
export const createServiceRequest = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  if (req.user.role !== "Community Member") {
    return next(new ErrorHandler("Only community members can create service requests", 403));
  }

  const { title, description, location, budgetRange, preferredSchedule, serviceCategory } = req.body;
  
  if (!title || !description || !location || !serviceCategory) {
    return next(new ErrorHandler("Missing required fields: title, description, location, serviceCategory", 400));
  }

  const serviceRequest = await ServiceRequest.create({
    requester: req.user._id,
    title,
    description,
    location,
    budgetRange: budgetRange || { min: 0, max: 0 },
    preferredSchedule: preferredSchedule || "",
    serviceCategory,
    status: "Open",
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

  // Get certificates and work proof for each provider
  const providerIds = providers.map(p => p._id);
  const certificates = await Certificate.find({ provider: { $in: providerIds }, verified: true });
  const workProofs = await WorkProof.find({ provider: { $in: providerIds }, verified: true });

  // Group by provider
  const certsByProvider = {};
  certificates.forEach(cert => {
    if (!certsByProvider[cert.provider.toString()]) {
      certsByProvider[cert.provider.toString()] = [];
    }
    certsByProvider[cert.provider.toString()].push({
      title: cert.title,
      description: cert.description,
      certificateUrl: cert.certificateUrl
    });
  });

  const proofsByProvider = {};
  workProofs.forEach(proof => {
    if (!proofsByProvider[proof.provider.toString()]) {
      proofsByProvider[proof.provider.toString()] = [];
    }
    proofsByProvider[proof.provider.toString()].push({
      title: proof.title,
      description: proof.description,
      imageUrl: proof.imageUrl,
      serviceType: proof.serviceType
    });
  });

  // Add credentials to providers
  const providersWithCredentials = providers.map(provider => {
    const providerObj = provider.toObject();
    providerObj.certificates = certsByProvider[provider._id.toString()] || [];
    providerObj.workProof = proofsByProvider[provider._id.toString()] || [];
    return providerObj;
  });

  res.json({
    success: true,
    count: totalCount,
    providers: providersWithCredentials
  });
});

export const viewProviderProfile = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { providerId } = req.params;

  const provider = await User.findById(providerId)
    .select('firstName lastName email phone skills serviceDescription serviceRate profilePic isOnline averageRating totalReviews address');

  if (!provider || provider.role !== "Service Provider" || !provider.verified) {
    return next(new ErrorHandler("Provider not found or not verified", 404));
  }

  // Get provider credentials
  const certificates = await Certificate.find({ provider: providerId, verified: true });
  const workProofs = await WorkProof.find({ provider: providerId, verified: true });
  const reviews = await Review.find({ reviewee: providerId })
    .populate('reviewer', 'firstName lastName')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    provider: {
      ...provider.toObject(),
      certificates,
      workProof: workProofs,
      reviews
    }
  });
});

export const sendDirectServiceOffer = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  if (req.user.role !== "Community Member") {
    return next(new ErrorHandler("Only community members can send service offers", 403));
  }

  const { providerId, title, description, location, budget, preferredDate } = req.body;

  if (!providerId || !title || !description || !location || !budget) {
    return next(new ErrorHandler("Missing required fields", 400));
  }

  const provider = await User.findById(providerId);
  if (!provider || provider.role !== "Service Provider" || !provider.isVerified) {
    return next(new ErrorHandler("Provider not found or not verified", 404));
  }

  const serviceOffer = await ServiceOffer.create({
    requester: req.user._id,
    provider: providerId,
    title,
    description,
    location,
    budget,
    preferredDate: preferredDate || null,
    status: "Pending"
  });

  await sendNotification(
    providerId,
    "Direct Service Offer",
    `${req.user.firstName} ${req.user.lastName} sent you a service offer`,
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

  let query = { provider: req.user._id };
  if (status) {
    query.status = status;
  }

  const offers = await ServiceOffer.find(query)
    .populate('requester', 'firstName lastName email phone profilePic')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const totalCount = await ServiceOffer.countDocuments(query);

  res.json({
    success: true,
    count: totalCount,
    offers
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
    .populate('serviceRequest', 'title description serviceCategory location')
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

  // Get top-rated providers with good reviews
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
    providers
  });
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
