import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import logger from "../utils/logger.js";
import {
  validateServiceRequest,
  validateChatMessage,
  validateServiceOffer,
  validateBookingStatus,
  validateReview,
  validateProfileUpdate,
  validateApplication,
  validateApplicationResponse,
  validateOfferResponse,
  validateMongoId,
  handleValidationErrors,
  sanitizeInput
} from "../middlewares/validation.js";
import {
  canTransitionBookingStatus,
  getValidBookingTransitions,
  canTransitionRequestStatus,
  getValidRequestTransitions
} from "../utils/dataConsistency.js";
import User from "../models/userSchema.js";
import ServiceRequest from "../models/serviceRequest.js";
import ServiceOffer from "../models/serviceOffer.js";
import Chat from "../models/chat.js";

import Review from "../models/review.js";
import { sendNotification } from "../utils/socketNotify.js";
import Booking from "../models/booking.js";
import { io } from "../server.js";
import { getRecommendedWorkers, getRecommendedServiceRequests } from "../utils/recommendationEngine.js";
import { sendTargetedRequestNotification } from "../utils/emailService.js";

export const postServiceRequest = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  
  // Accept both old format (name, budget) and new format (title, budgetRange)
  const { 
    name, title,
    address, 
    phone, 
    typeOfWork, serviceCategory,
    preferredDate, 
    time, preferredTime,
    budget, budgetRange,
    notes, 
    description,
    location,
    targetProvider 
  } = req.body;

  // Use new field names if provided, fall back to old field names
  const requestTitle = title || name;
  const requestLocation = location || address;
  const requestTypeOfWork = serviceCategory || typeOfWork;
  const requestTime = preferredTime || time;
  const requestDescription = description || notes;
  const minBudgetAmount = budgetRange?.min || budget || 0;
  const maxBudgetAmount = budgetRange?.max || budget || 0;

  // For inquiries (General Inquiry or Consultation), address and phone are not required
  const isInquiry = requestTypeOfWork === 'General Inquiry' || requestTypeOfWork === 'Consultation';

  if (!requestTitle || !requestTypeOfWork || !requestTime) {
    return next(new ErrorHandler("Missing required fields: title/name, typeOfWork/serviceCategory, and time/preferredTime are required", 400));
  }

  if (!isInquiry && (!requestLocation || !phone)) {
    return next(new ErrorHandler("For service requests, location/address and phone are required", 400));
  }

  // Validate targetProvider if provided (for inquiries)
  if (targetProvider && isInquiry) {
    const providerExists = await User.findById(targetProvider);
    if (!providerExists) {
      return next(new ErrorHandler("Target provider not found", 404));
    }
    if (providerExists.role !== "Service Provider") {
      return next(new ErrorHandler("Target user is not a service provider", 400));
    }
  }

  let preferredDateObj = null;
  let expiresAt;

  if (preferredDate) {
    preferredDateObj = new Date(preferredDate);
    if (isNaN(preferredDateObj.getTime())) {
      return next(new ErrorHandler("Invalid preferred date format", 400));
    }
    const [hours, minutes] = requestTime.split(':').map(Number);
    const expirationDate = new Date(preferredDateObj);
    expirationDate.setHours(hours, minutes, 0, 0);
    expiresAt = expirationDate;
  } else {
    expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  const request = await ServiceRequest.create({
    requester: req.user._id,
    name: requestTitle,
    address: isInquiry ? "" : requestLocation,
    phone: isInquiry ? "" : phone,
    typeOfWork: requestTypeOfWork,
    preferredDate: preferredDateObj,
    time: requestTime,
    minBudget: minBudgetAmount,
    maxBudget: maxBudgetAmount,
    notes: requestDescription,
    targetProvider,
    status: "Open",
    expiresAt,
  });

  const matchingProviders = await User.find({
    role: "Service Provider",
    skills: { $in: [requestTypeOfWork.toLowerCase()] },
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
    `Your "${requestTypeOfWork}" request has been posted successfully.`,
    { requestId: request._id, type: "service-request-posted"}
  );

  res.status(201).json({ success: true, serviceRequest: request });
});

// State Machine Validation - Pattern 4: State Machine Validation
export const updateBookingStatus = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { id } = req.params;
  const { status, notes } = req.body;

  const booking = await Booking.findById(id);
  if (!booking) return next(new ErrorHandler("Booking not found", 404));

  // Validate transition
  if (!canTransitionBookingStatus(booking.status, status)) {
    const validTransitions = getValidBookingTransitions(booking.status);
    return next(new ErrorHandler(
      `Cannot transition from ${booking.status} to ${status}. Valid transitions: ${validTransitions.join(", ")}`,
      400
    ));
  }

  if (![String(booking.requester), String(booking.provider)].includes(String(req.user._id))) {
    return next(new ErrorHandler("Not authorized", 403));
  }

  // Handle specific transitions
  if (status === "Completed") {
    if (!notes) {
      return next(new ErrorHandler("Completion notes required", 400));
    }
    booking.completionNotes = notes;
  }

  booking.status = status;
  booking.updatedAt = new Date();
  await booking.save();

  // Trigger side effects based on transition
  const otherUser = String(booking.requester) === String(req.user._id) ? booking.provider : booking.requester;

  if (status === "Completed") {
    // Now eligible for reviews
    await sendNotification(otherUser, "Booking Completed", `Booking ${booking._id} has been completed and is now available for review`, {
      bookingId: booking._id,
      type: "booking-completed"
    });
  } else if (status === "Cancelled") {
    // Handle cancellation
    await sendNotification(otherUser, "Booking Cancelled", `Booking ${booking._id} has been cancelled`, {
      bookingId: booking._id,
      type: "booking-cancelled"
    });
  } else {
    await sendNotification(otherUser, `Booking ${status}`, `Booking ${booking._id} status changed to ${status}`);
  }

  io.emit("booking-updated", { bookingId: booking._id, action: "status-updated", newStatus: status });

  res.json({ success: true, booking });
});

export const uploadProofOfWork = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { id } = req.params;
  const { completionNotes } = req.body;

  // Validate completionNotes length
  if (completionNotes && (typeof completionNotes !== 'string' || completionNotes.length > 500)) {
    return next(new ErrorHandler("Completion notes must be a string with maximum 500 characters", 400));
  }

  const booking = await Booking.findById(id).populate('serviceRequest');
  if (!booking) return next(new ErrorHandler("Booking not found", 404));

  // Only the provider can upload proof of work
  if (String(booking.provider) !== String(req.user._id)) {
    return next(new ErrorHandler("Not authorized to upload proof for this booking", 403));
  }

  // Only allow upload if booking is "In Progress"
  if (booking.status !== "In Progress") {
    return next(new ErrorHandler("Can only upload proof of work for bookings that are in progress", 400));
  }

  // Handle file uploads
  const proofOfWorkFiles = [];
  if (req.files && req.files.proofOfWork) {
    const files = Array.isArray(req.files.proofOfWork) ? req.files.proofOfWork : [req.files.proofOfWork];

    for (const file of files) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.mimetype)) {
        return next(new ErrorHandler(`Invalid file type for ${file.name}. Only images and PDFs are allowed.`, 400));
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        return next(new ErrorHandler(`File ${file.name} is too large. Maximum size is 5MB.`, 400));
      }

      // Generate unique filename
      const fileName = `proof_${Date.now()}_${Math.floor(Math.random() * 1000000)}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

      // Move file to uploads directory
      await file.mv(`./uploads/${fileName}`);
      proofOfWorkFiles.push(`/uploads/${fileName}`);
    }
  }

  // Update booking with proof of work and completion notes
  booking.proofOfWork = proofOfWorkFiles;
  if (completionNotes) {
    booking.completionNotes = completionNotes;
  }

  // Mark booking as completed
  booking.status = "Completed";
  booking.updatedAt = new Date();
  await booking.save();

  // Update service request status if exists
  if (booking.serviceRequest) {
    booking.serviceRequest.status = "Completed";
    await booking.serviceRequest.save();
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

  // Notify the client that work is completed
  await sendNotification(
    booking.requester,
    "Service Completed",
    `Your service request has been completed by ${req.user.firstName} ${req.user.lastName}. You can now leave a review.`,
    { bookingId: booking._id, type: "service-completed" }
  );

  io.emit("booking-updated", { bookingId: booking._id, action: "completed" });

  res.status(200).json({
    success: true,
    message: "Proof of work uploaded successfully. Service marked as completed.",
    booking
  });
});

export const leaveReview = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  const { bookingId, rating, comments } = req.body;
  if (!bookingId || !rating) return next(new ErrorHandler("Missing required fields", 400));

  const booking = await Booking.findById(bookingId);
  if (!booking) return next(new ErrorHandler("Booking not found", 404));
  if (booking.status !== "Completed") return next(new ErrorHandler("Booking not completed yet", 400));
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
    reviewType: String(booking.requester) === String(req.user._id) ? "Client to Provider" : "Provider to Client",
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

  if(["Completed", "Cancelled"].includes(request.status)) {
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

  const provider = await User.findById(req.user._id);
  if (!provider || provider.role !== "Service Provider") return next(new ErrorHandler("Not a provider", 403));

  // Use findOneAndUpdate to atomically check and update the request status to prevent race conditions
  const request = await ServiceRequest.findOneAndUpdate(
    {
      _id: id,
      status: "Open" // Only accept if still in Open status
    },
    {
      status: "In Progress",
      serviceProvider: req.user._id,
      eta: new Date(Date.now() + 30 * 60 * 1000)
    },
    { new: true }
  ).populate('requester');

  if (!request) {
    // Check if request exists
    const checkRequest = await ServiceRequest.findById(id);
    if (!checkRequest) return next(new ErrorHandler("Service Request not found", 404));
    if (checkRequest.status !== "Open") {
      return next(new ErrorHandler("Request is not available", 400));
    }
    return next(new ErrorHandler("Failed to accept request due to concurrent request", 409));
  }

  // Check if provider already has a request on the same preferred date (after atomic update)
  if (request.preferredDate) {
    const existingRequest = await ServiceRequest.findOne({
      serviceProvider: req.user._id,
      status: "In Progress", // Changed from "Working" to "In Progress"
      preferredDate: request.preferredDate,
      _id: { $ne: id } // Exclude current request
    });

    if (existingRequest) {
      // Revert the status change since we can't proceed
      await ServiceRequest.findByIdAndUpdate(id, { status: "Open", serviceProvider: null, eta: null });
      return next(new ErrorHandler("You already have a confirmed request on this date. Please complete or cancel it before accepting another request.", 400));
    }
  }

  const booking = await Booking.create({
    requester: request.requester._id,
    provider: provider._id,
    serviceRequest: request._id,
    status: "In Progress",
  });

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

  const { page = 1, limit = 10 } = req.query;

  // Validate pagination parameters
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  if (isNaN(pageNum) || pageNum < 1) return next(new ErrorHandler("Invalid page number", 400));
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) return next(new ErrorHandler("Invalid limit (1-100 allowed)", 400));

  const bookings = await Booking.find({
    $or: [
      { requester: req.user._id },
      { provider: req.user._id }
    ]
  }).populate('requester provider', 'firstName lastName')
    .populate('serviceRequest')
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  const totalCount = await Booking.countDocuments({
    $or: [
      { requester: req.user._id },
      { provider: req.user._id }
    ]
  });

  res.status(200).json({
    success: true,
    bookings,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum)
    }
  });
});

export const getBooking = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { id } = req.params;

  // Validate booking ID format
  if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new ErrorHandler("Invalid booking ID format", 400));
  }

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

  // Validate input data
  if (skills && !Array.isArray(skills)) {
    return next(new ErrorHandler("Skills must be an array", 400));
  }

  if (serviceDescription && (typeof serviceDescription !== 'string' || serviceDescription.trim().length > 500)) {
    return next(new ErrorHandler("Service description must be a string with maximum 500 characters", 400));
  }

  if (serviceRate !== undefined) {
    const rate = parseFloat(serviceRate);
    if (isNaN(rate) || rate < 0 || rate > 100000) {
      return next(new ErrorHandler("Service rate must be a valid number between 0 and 100,000", 400));
    }
  }

  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  // Only allow service providers to update service-related fields
  if (user.role !== "Service Provider") {
    return next(new ErrorHandler("Only service providers can update service profiles", 403));
  }

  if (skills) user.skills = skills.map(skill => skill.toString().trim().toLowerCase()).filter(Boolean);
  if (serviceDescription !== undefined) user.serviceDescription = serviceDescription.trim();
  if (serviceRate !== undefined) user.serviceRate = parseFloat(serviceRate);

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

  // Validate isOnline parameter
  if (typeof isOnline !== 'boolean') {
    return next(new ErrorHandler("isOnline must be a boolean value", 400));
  }

  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  // Only allow service providers to update their online status
  if (user.role !== "Service Provider") {
    return next(new ErrorHandler("Only service providers can update online status", 403));
  }

  user.isOnline = isOnline;
  await user.save();

  res.status(200).json({ success: true, message: `Status updated to ${isOnline ? 'Online' : 'Offline'}` });
});

export const getMatchingRequests = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  // Get all users that the current user has had service interactions with
  const userInteractions = await Booking.find({
    $or: [
      { requester: req.user._id },
      { provider: req.user._id }
    ]
  })
  .populate('requester', 'firstName lastName profilePic isOnline')
  .populate('provider', 'firstName lastName profilePic isOnline')
  .select('requester provider status');

  // Also get users from service requests (direct offers, etc.)
  const serviceRequestInteractions = await ServiceRequest.find({
    $or: [
      { requester: req.user._id },
      { serviceProvider: req.user._id },
      { targetProvider: req.user._id }
    ]
  })
  .populate('requester', 'firstName lastName profilePic isOnline')
  .populate('serviceProvider', 'firstName lastName profilePic isOnline')
  .populate('targetProvider', 'firstName lastName profilePic isOnline')
  .select('requester serviceProvider targetProvider status');

  // Collect unique users
  const uniqueUsers = new Map();

  // From bookings
  userInteractions.forEach(booking => {
    const otherUser = booking.requester._id.toString() === req.user._id.toString()
      ? booking.provider
      : booking.requester;

    if (otherUser && !uniqueUsers.has(otherUser._id.toString())) {
      uniqueUsers.set(otherUser._id.toString(), {
        user: otherUser,
        lastInteraction: booking.createdAt,
        type: 'booking',
        status: booking.status
      });
    }
  });

  // From service requests
  serviceRequestInteractions.forEach(request => {
    let otherUser = null;
    let type = 'service_request';

    if (request.requester._id.toString() === req.user._id.toString()) {
      otherUser = request.serviceProvider || request.targetProvider;
      type = request.targetProvider ? 'direct_offer' : 'service_request';
    } else {
      otherUser = request.requester;
    }

    if (otherUser && !uniqueUsers.has(otherUser._id.toString())) {
      uniqueUsers.set(otherUser._id.toString(), {
        user: otherUser,
        lastInteraction: request.createdAt,
        type: type,
        status: request.status
      });
    }
  });

  // Convert to array and sort by last interaction
  const matches = Array.from(uniqueUsers.values())
    .sort((a, b) => new Date(b.lastInteraction) - new Date(a.lastInteraction));

  res.status(200).json({
    success: true,
    requests: matches,
    count: matches.length
  });
});

export const getChatHistory = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { appointmentId, userId, page = 1, limit = 50 } = req.query;

  if (!appointmentId && !userId) {
    return next(new ErrorHandler("Either appointmentId or userId is required", 400));
  }

  let query = {};

  if (appointmentId) {
    // Check if it's a booking ID or service request ID
    query.appointment = appointmentId;

    // First check if it's a booking
    const booking = await Booking.findById(appointmentId);
    if (booking) {
      // It's a booking - verify user is part of it
      if (![String(booking.requester), String(booking.provider)].includes(String(req.user._id))) {
        return next(new ErrorHandler("Not authorized to view this chat", 403));
      }
    } else {
      // Check if it's a service request
      const serviceRequest = await ServiceRequest.findById(appointmentId);
      if (serviceRequest) {
        // Verify user is part of this service request
        if (![String(serviceRequest.requester), String(serviceRequest.targetProvider), String(serviceRequest.serviceProvider)].includes(String(req.user._id))) {
          return next(new ErrorHandler("Not authorized to view this chat", 403));
        }
      } else {
        return next(new ErrorHandler("Appointment not found", 404));
      }
    }
  } else if (userId) {
    // Get chat history between current user and specified user
    // Find bookings where both users are involved
    const bookings = await Booking.find({
      $or: [
        { requester: req.user._id, provider: userId },
        { requester: userId, provider: req.user._id }
      ]
    }).select('_id');

    // Also find service requests where both users are involved
    const serviceRequests = await ServiceRequest.find({
      $or: [
        { requester: req.user._id, $or: [{ targetProvider: userId }, { serviceProvider: userId }] },
        { $or: [{ targetProvider: req.user._id }, { serviceProvider: req.user._id }], requester: userId }
      ],
      status: { $in: ['Open', 'In Progress', 'Offered'] }
    }).select('_id');

    const allConversationIds = [
      ...bookings.map(b => b._id),
      ...serviceRequests.map(sr => sr._id)
    ];

    if (allConversationIds.length === 0) {
      return res.status(200).json({ success: true, chatHistory: [], message: "No chat history found" });
    }

    query.appointment = { $in: allConversationIds };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const chatHistory = await Chat.find(query)
    .populate('sender', 'firstName lastName profilePic')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Reverse to get chronological order (oldest first)
  chatHistory.reverse();

  // Mark messages as seen if the current user is not the sender
  const unseenMessages = chatHistory.filter(msg =>
    msg.sender._id.toString() !== req.user._id.toString() &&
    msg.status !== 'seen' &&
    !msg.seenBy.some(seen => seen.user.toString() === req.user._id.toString())
  );

  if (unseenMessages.length > 0) {
    // Update seen status for messages
    await Chat.updateMany(
      {
        _id: { $in: unseenMessages.map(msg => msg._id) }
      },
      {
        $push: {
          seenBy: {
            user: req.user._id,
            seenAt: new Date()
          }
        },
        $set: { status: 'seen' }
      }
    );
  }

  res.status(200).json({
    success: true,
    chatHistory,
    count: chatHistory.length,
    page: parseInt(page),
    limit: parseInt(limit)
  });
});

export const sendMessage = [
  sanitizeInput,
  validateChatMessage,
  handleValidationErrors,
  catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { appointmentId, message, receiverId } = req.body;

  if (!message || message.trim().length === 0) {
    return next(new ErrorHandler("Message cannot be empty", 400));
  }

  if (message.length > 1000) {
    return next(new ErrorHandler("Message cannot exceed 1000 characters", 400));
  }

  let booking = null;
  let serviceRequest = null;
  let receiver = null;
  let chatRoomId = null;

  if (appointmentId) {
    // Check if it's a booking ID
    booking = await Booking.findById(appointmentId);
    if (booking) {
      // It's a booking
      if (![String(booking.requester), String(booking.provider)].includes(String(req.user._id))) {
        return next(new ErrorHandler("Not authorized to send messages in this conversation", 403));
      }
      receiver = booking.requester._id.toString() === req.user._id.toString()
        ? booking.provider
        : booking.requester;
      chatRoomId = booking._id;
    } else {
      // Check if it's a service request ID (for inquiries)
      serviceRequest = await ServiceRequest.findById(appointmentId);
      if (serviceRequest) {
        // Verify user is part of this service request
        if (![String(serviceRequest.requester), String(serviceRequest.targetProvider), String(serviceRequest.serviceProvider)].includes(String(req.user._id))) {
          return next(new ErrorHandler("Not authorized to send messages in this conversation", 403));
        }

        // Determine receiver
        if (serviceRequest.requester._id.toString() === req.user._id.toString()) {
          // User is requester, receiver is targetProvider or serviceProvider
          receiver = serviceRequest.targetProvider || serviceRequest.serviceProvider;
        } else {
          // User is provider, receiver is requester
          receiver = serviceRequest.requester;
        }

        if (!receiver) {
          return next(new ErrorHandler("No valid receiver found for this conversation", 400));
        }

        chatRoomId = serviceRequest._id;
      } else {
        return next(new ErrorHandler("Appointment not found", 404));
      }
    }
  } else if (receiverId) {
    // Direct message - verify there's an existing relationship
    receiver = await User.findById(receiverId);
    if (!receiver) return next(new ErrorHandler("Receiver not found", 404));

    // Check if there's an existing booking between these users
    booking = await Booking.findOne({
      $or: [
        { requester: req.user._id, provider: receiverId },
        { requester: receiverId, provider: req.user._id }
      ]
    });

    if (booking) {
      chatRoomId = booking._id;
    } else {
      // Check if there's an existing service request (inquiry)
      serviceRequest = await ServiceRequest.findOne({
        $or: [
          { requester: req.user._id, $or: [{ targetProvider: receiverId }, { serviceProvider: receiverId }] },
          { $or: [{ targetProvider: req.user._id }, { serviceProvider: req.user._id }], requester: receiverId }
        ],
        status: { $in: ['Open', 'In Progress', 'Offered'] }
      });

      if (serviceRequest) {
        chatRoomId = serviceRequest._id;
      } else {
        return next(new ErrorHandler("No existing conversation found with this user", 400));
      }
    }
  } else {
    return next(new ErrorHandler("Either appointmentId or receiverId is required", 400));
  }

  // Create the chat message
  const chatMessage = await Chat.create({
    appointment: chatRoomId,
    sender: req.user._id,
    message: message.trim(),
    status: 'sent'
  });

  // Populate sender info for response
  await chatMessage.populate('sender', 'firstName lastName profilePic');

  // Send real-time notification via socket
  io.to(`chat-${chatRoomId}`).emit("new-message", chatMessage);

  // Send notification to receiver
  await sendNotification(
    receiver._id,
    "New Message",
    `You have a new message from ${req.user.firstName} ${req.user.lastName}`,
    {
      appointmentId: chatRoomId,
      messageId: chatMessage._id,
      type: "new-message",
      conversationType: booking ? 'booking' : 'service_request'
    }
  );

  res.status(201).json({
    success: true,
    message: chatMessage
  });
})];



export const getChatList = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  // Get all bookings where user is involved
  const userBookings = await Booking.find({
    $or: [
      { requester: req.user._id },
      { provider: req.user._id }
    ]
  })
  .populate('requester', 'firstName lastName profilePic isOnline')
  .populate('provider', 'firstName lastName profilePic isOnline')
  .populate('serviceRequest', 'name typeOfWork')
  .select('_id requester provider serviceRequest status createdAt');

  // Get all service requests where user is involved (for inquiries that haven't become bookings yet)
  const userServiceRequests = await ServiceRequest.find({
    $or: [
      { requester: req.user._id },
      { targetProvider: req.user._id },
      { serviceProvider: req.user._id }
    ],
    status: { $in: ['Open', 'In Progress', 'Offered'] } // Only active requests
  })
  .populate('requester', 'firstName lastName profilePic isOnline')
  .populate('targetProvider', 'firstName lastName profilePic isOnline')
  .populate('serviceProvider', 'firstName lastName profilePic isOnline')
  .select('_id requester targetProvider serviceProvider name typeOfWork status createdAt');

  // Filter out service requests that already have bookings
  const bookingServiceRequestIds = userBookings.map(b => b.serviceRequest?._id?.toString()).filter(Boolean);
  const activeServiceRequests = userServiceRequests.filter(sr =>
    !bookingServiceRequestIds.includes(sr._id.toString())
  );

  if (userBookings.length === 0 && activeServiceRequests.length === 0) {
    return res.status(200).json({ success: true, chatList: [], message: "No active chats found" });
  }

  // Process bookings
  const bookingChats = await Promise.all(
    userBookings.map(async (booking) => {
      const otherUser = booking.requester._id.toString() === req.user._id.toString()
        ? booking.provider
        : booking.requester;

      // Get latest message for this booking
      const latestMessage = await Chat.findOne({ appointment: booking._id })
        .populate('sender', 'firstName lastName')
        .sort({ createdAt: -1 })
        .select('message sender createdAt status');

      // Count unread messages for current user
      const unreadCount = await Chat.countDocuments({
        appointment: booking._id,
        sender: { $ne: req.user._id },
        status: { $ne: 'seen' },
        seenBy: { $not: { $elemMatch: { user: req.user._id } } }
      });

      return {
        id: booking._id,
        type: 'booking',
        appointmentId: booking._id,
        otherUser: {
          _id: otherUser._id,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          profilePic: otherUser.profilePic,
          isOnline: otherUser.isOnline
        },
        serviceRequest: booking.serviceRequest ? {
          _id: booking.serviceRequest._id,
          name: booking.serviceRequest.name,
          typeOfWork: booking.serviceRequest.typeOfWork
        } : null,
        status: booking.status,
        latestMessage: latestMessage ? {
          message: latestMessage.message,
          sender: latestMessage.sender,
          createdAt: latestMessage.createdAt,
          isFromMe: latestMessage.sender._id.toString() === req.user._id.toString()
        } : null,
        unreadCount,
        lastActivity: latestMessage ? latestMessage.createdAt : booking.createdAt
      };
    })
  );

  // Process service requests (inquiries)
  const serviceRequestChats = await Promise.all(
    activeServiceRequests.map(async (serviceRequest) => {
      // Determine the other user
      let otherUser = null;
      if (serviceRequest.requester._id.toString() === req.user._id.toString()) {
        // User is requester, other user is targetProvider or serviceProvider
        otherUser = serviceRequest.targetProvider || serviceRequest.serviceProvider;
      } else {
        // User is provider, other user is requester
        otherUser = serviceRequest.requester;
      }

      if (!otherUser) return null; // Skip if no other user found

      // Get latest message for this service request
      const latestMessage = await Chat.findOne({ appointment: serviceRequest._id })
        .populate('sender', 'firstName lastName')
        .sort({ createdAt: -1 })
        .select('message sender createdAt status');

      // Count unread messages for current user
      const unreadCount = await Chat.countDocuments({
        appointment: serviceRequest._id,
        sender: { $ne: req.user._id },
        status: { $ne: 'seen' },
        seenBy: { $not: { $elemMatch: { user: req.user._id } } }
      });

      return {
        id: serviceRequest._id,
        type: 'service_request',
        appointmentId: serviceRequest._id,
        otherUser: {
          _id: otherUser._id,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          profilePic: otherUser.profilePic,
          isOnline: otherUser.isOnline
        },
        serviceRequest: {
          _id: serviceRequest._id,
          name: serviceRequest.name,
          typeOfWork: serviceRequest.typeOfWork
        },
        status: serviceRequest.status,
        latestMessage: latestMessage ? {
          message: latestMessage.message,
          sender: latestMessage.sender,
          createdAt: latestMessage.createdAt,
          isFromMe: latestMessage.sender._id.toString() === req.user._id.toString()
        } : null,
        unreadCount,
        lastActivity: latestMessage ? latestMessage.createdAt : serviceRequest.createdAt
      };
    })
  );

  // Combine and filter out null entries
  const allChats = [...bookingChats, ...serviceRequestChats.filter(chat => chat !== null)];

  // Sort by last activity (most recent first)
  allChats.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

  res.status(200).json({
    success: true,
    chatList: allChats,
    count: allChats.length
  });
});

export const markMessagesAsSeen = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { appointmentId } = req.params;

  if (!appointmentId) {
    return next(new ErrorHandler("Appointment ID is required", 400));
  }

  // Check if it's a booking or service request
  const booking = await Booking.findById(appointmentId);
  if (booking) {
    // It's a booking - verify user is part of it
    if (![String(booking.requester), String(booking.provider)].includes(String(req.user._id))) {
      return next(new ErrorHandler("Not authorized to mark messages as seen in this conversation", 403));
    }
  } else {
    // Check if it's a service request
    const serviceRequest = await ServiceRequest.findById(appointmentId);
    if (serviceRequest) {
      // Verify user is part of this service request
      if (![String(serviceRequest.requester), String(serviceRequest.targetProvider), String(serviceRequest.serviceProvider)].includes(String(req.user._id))) {
        return next(new ErrorHandler("Not authorized to mark messages as seen in this conversation", 403));
      }
    } else {
      return next(new ErrorHandler("Appointment not found", 404));
    }
  }

  // Update all unseen messages in this conversation where the sender is not the current user
  const result = await Chat.updateMany(
    {
      appointment: appointmentId,
      sender: { $ne: req.user._id },
      status: { $ne: 'seen' },
      seenBy: { $not: { $elemMatch: { user: req.user._id } } }
    },
    {
      $push: {
        seenBy: {
          user: req.user._id,
          seenAt: new Date()
        }
      },
      $set: { status: 'seen' }
    }
  );

  res.status(200).json({
    success: true,
    message: `${result.modifiedCount} messages marked as seen`,
    modifiedCount: result.modifiedCount
  });
});

export const getServiceProviders = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { page = 1, limit = 20, skills, minRating, maxRate, includeReviews = 'true' } = req.query;
  const skip = (page - 1) * limit;
  const includeReviewsBool = includeReviews === 'true';

  // Build match conditions for aggregation pipeline
  const matchConditions = { role: "Service Provider" };

  if (skills) {
    // Use exact match instead of regex for better index utilization
    // Split skills by comma and trim whitespace
    const skillArray = skills.split(',').map(s => s.trim().toLowerCase());
    matchConditions.skills = { $in: skillArray };
  }

  if (minRating) {
    matchConditions.averageRating = { $gte: parseFloat(minRating) };
  }

  if (maxRate) {
    matchConditions.serviceRate = { $lte: parseFloat(maxRate) };
  }

  // If no limit specified or limit is very high, return all providers
  const shouldReturnAll = !limit || parseInt(limit) >= 10000;

  // Use aggregation pipeline for better performance
  const aggregationPipeline = [
    { $match: matchConditions },
    {
      $facet: {
        providers: [
          {
            $project: {
              firstName: 1,
              lastName: 1,
              email: 1,
              phone: 1,
              skills: 1,
              services: 1,
              serviceDescription: 1,
              serviceRate: 1,
              profilePic: 1,
              isOnline: 1,
              averageRating: 1,
              totalReviews: 1,
              verified: 1,
              address: 1,
              occupation: 1,
              yearsExperience: 1,
              totalJobsCompleted: 1,
              createdAt: 1
            }
          },
          { $sort: { averageRating: -1, totalReviews: -1 } }
        ].concat(shouldReturnAll ? [] : [
          { $skip: skip },
          { $limit: parseInt(limit) }
        ]),
        totalCount: [
          { $count: "count" }
        ]
      }
    }
  ];

  const result = await User.aggregate(aggregationPipeline);
  const providers = result[0].providers;
  const totalCount = result[0].totalCount[0]?.count || 0;

  // If reviews are not needed, return early
  if (!includeReviewsBool) {
    return res.json({
      success: true,
      count: totalCount,
      workers: providers
    });
  }

  // Get reviews for each provider with pagination (limit to 5 most recent reviews per provider)
  const providerIds = providers.map(p => p._id);
  const reviews = await Review.find({
    reviewee: { $in: providerIds }
  })
  .populate('reviewer', 'firstName lastName')
  .sort({ createdAt: -1 })
  .limit(5 * providers.length); // Limit total reviews fetched

  // Group reviews by provider (limit to 5 per provider)
  const reviewsByProvider = {};
  reviews.forEach(review => {
    const providerId = review.reviewee.toString();
    if (!reviewsByProvider[providerId]) {
      reviewsByProvider[providerId] = [];
    }
    if (reviewsByProvider[providerId].length < 5) {
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
    }
  });

  // Add reviews to providers
  const workersWithReviews = providers.map(provider => ({
    ...provider,
    reviews: reviewsByProvider[provider._id.toString()] || []
  }));

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

  // Check if the request can be offered (must be in Open status)
  if (request.status !== "Open") {
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

  // Send email to provider with retry mechanism
  try {
    await sendTargetedRequestNotification(
      provider.email,
      `${provider.firstName} ${provider.lastName}`,
      `${request.requester.firstName} ${request.requester.lastName}`,
      request.typeOfWork,
      request._id
    );
  } catch (emailError) {
    console.error("Failed to send email notification after all retry attempts:", {
      providerEmail: provider.email,
      providerName: `${provider.firstName} ${provider.lastName}`,
      requesterName: `${request.requester.firstName} ${request.requester.lastName}`,
      serviceType: request.typeOfWork,
      requestId: request._id,
      error: emailError.message,
      stack: emailError.stack
    });

    // TODO: Consider implementing a job queue system for failed emails
    // For now, email failure doesn't block the main request flow
    // but we log detailed information for monitoring and debugging
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

  // Use findOneAndUpdate to atomically check and update the request status to prevent race conditions
  const request = await ServiceRequest.findOneAndUpdate(
    {
      _id: requestId,
      targetProvider: req.user._id,
      status: "Offered" // Only accept if still in Offered status
    },
    {
      status: "In Progress",
      serviceProvider: req.user._id,
      eta: new Date(Date.now() + 30 * 60 * 1000)
    },
    { new: true }
  ).populate('requester');

  if (!request) {
    // Check if request exists and user is authorized
    const checkRequest = await ServiceRequest.findById(requestId);
    if (!checkRequest) return next(new ErrorHandler("Service request not found", 404));
    if (String(checkRequest.targetProvider) !== String(req.user._id)) {
      return next(new ErrorHandler("Not authorized to accept this offer", 403));
    }
    if (checkRequest.status !== "Offered") {
      return next(new ErrorHandler("This offer has already been accepted or is no longer available", 400));
    }
    return next(new ErrorHandler("Failed to accept offer due to concurrent request", 409));
  }

  // Check if provider already has a request on the same preferred date (after atomic update)
  if (request.preferredDate) {
    const existingRequest = await ServiceRequest.findOne({
      serviceProvider: req.user._id,
      status: "In Progress", // Changed from "Working" to "In Progress"
      preferredDate: request.preferredDate,
      _id: { $ne: requestId } // Exclude current request
    });

    if (existingRequest) {
      // Revert the status change since we can't proceed
      await ServiceRequest.findByIdAndUpdate(requestId, { status: "Offered", serviceProvider: null, eta: null });
      return next(new ErrorHandler("You already have a confirmed request on this date. Please complete or cancel it before accepting another request.", 400));
    }
  }

  // Create booking
  const booking = await Booking.create({
    requester: request.requester._id,
    provider: req.user._id,
    serviceRequest: request._id,
    status: "In Progress",
  });

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

  booking.status = "Completed";
  await booking.save();

  // Update service request status
  const serviceRequest = await ServiceRequest.findById(booking.serviceRequest);
  if (serviceRequest) {
    serviceRequest.status = "Completed";
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
  
  logger.info(`[getAvailableServiceRequests] User: ${req.user._id} (${req.user.firstName} ${req.user.lastName}), Role: ${req.user.role}`);
  logger.info(`[getAvailableServiceRequests] Params: useRecommendations=${useRecommendations}, limit=${limit}, page=${page}`);

  // Service providers should get recommendations by default, unless explicitly disabled
  const shouldUseRecommendations = req.user.role === "Service Provider" && useRecommendations !== "false";
  
  logger.info(`[getAvailableServiceRequests] shouldUseRecommendations=${shouldUseRecommendations}`);

  if (shouldUseRecommendations) {
    try {
      // Get full worker profile with all necessary fields for recommendation
      const worker = await User.findById(req.user._id)
        .select('_id firstName lastName email phone skills serviceDescription serviceRate profilePic isOnline averageRating totalReviews address verified occupation yearsExperience totalJobsCompleted createdAt serviceTypes')
        .populate('serviceTypes', 'name');

      if (!worker) {
        return next(new ErrorHandler("User not found", 404));
      }
      
      logger.info(`[getAvailableServiceRequests] Worker profile loaded: skills=${JSON.stringify(worker.skills)}, occupation=${worker.occupation}`);

      // Get ALL recommended service requests based on provider's offered services
      const recommendedRequests = await getRecommendedServiceRequests(worker, {
        limit: parseInt(limit) || 20,
        minScore: 0.0, // Include all matching requests, sorted by score
        page: parseInt(page) || 1
      });
      
      logger.info(`[getAvailableServiceRequests] Recommendation engine returned ${recommendedRequests.length} requests`);

      return res.json({
        success: true,
        count: recommendedRequests.length,
        requests: recommendedRequests,
        algorithm: "hybrid",
        description: "Showing all available service requests that match your skills and expertise, ranked by relevance"
      });
    } catch (error) {
      logger.error('Error in recommended service requests:', error);
      console.error('Error in recommended service requests:', error);
      // Fall through to regular query if recommendation fails
    }
  }

  // Fallback: Use basic filtering with optional provider skill matching
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build match conditions for aggregation pipeline
  const matchConditions = {
    status: "Open",
    expiresAt: { $gt: new Date() }
  };

  // If this is a Service Provider with skills, match their skills by default
  if (req.user.role === "Service Provider") {
    const providerSkills = req.user.skills || [];
    const providerOccupation = req.user.occupation || '';

    logger.info(`[getAvailableServiceRequests Fallback] Skills: ${JSON.stringify(providerSkills)}, Occupation: ${providerOccupation}`);

    // Build OR conditions for skill/occupation matching
    if (providerSkills.length > 0 || providerOccupation) {
      const orConditions = [];
      
      // Add skill patterns
      if (providerSkills.length > 0) {
        providerSkills.forEach(skill => {
          orConditions.push(
            { typeOfWork: new RegExp(skill, 'i') },
            { serviceCategory: new RegExp(skill, 'i') },
            { notes: new RegExp(skill, 'i') },
            { description: new RegExp(skill, 'i') }
          );
        });
      }
      
      // Add occupation pattern
      if (providerOccupation) {
        orConditions.push(
          { typeOfWork: new RegExp(providerOccupation, 'i') },
          { serviceCategory: new RegExp(providerOccupation, 'i') },
          { notes: new RegExp(providerOccupation, 'i') },
          { description: new RegExp(providerOccupation, 'i') }
        );
      }
      
      if (orConditions.length > 0) {
        matchConditions.$or = orConditions;
        logger.info(`[getAvailableServiceRequests Fallback] Using skill-based filtering with ${orConditions.length} conditions`);
      } else {
        logger.warn(`[getAvailableServiceRequests Fallback] Provider has no skills/occupation, returning all open requests`);
      }
    } else {
      logger.warn(`[getAvailableServiceRequests Fallback] Provider skills array is empty and no occupation`);
    }
  }

  // Apply explicit skills filter if provided (overrides provider skills)
  if (skills) {
    const skillArray = skills.split(',').map(s => s.trim().toLowerCase());
    matchConditions.typeOfWork = { $in: skillArray };
  }

  // Use aggregation pipeline for better performance and selective population
  const aggregationPipeline = [
    { $match: matchConditions },
    {
      $lookup: {
        from: 'users',
        localField: 'requester',
        foreignField: '_id',
        as: 'requester',
        pipeline: [
          {
            $project: {
              firstName: 1,
              lastName: 1,
              profilePic: 1
            }
          }
        ]
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'targetProvider',
        foreignField: '_id',
        as: 'targetProvider',
        pipeline: [
          {
            $project: {
              firstName: 1,
              lastName: 1
            }
          }
        ]
      }
    },
    {
      $addFields: {
        requester: { $arrayElemAt: ['$requester', 0] },
        targetProvider: { $arrayElemAt: ['$targetProvider', 0] }
      }
    },
    {
      $facet: {
        requests: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: parseInt(limit) }
        ],
        totalCount: [
          { $count: "count" }
        ]
      }
    }
  ];

  const result = await ServiceRequest.aggregate(aggregationPipeline);
  const requests = result[0].requests;
  const totalCount = result[0].totalCount[0]?.count || 0;
  
  logger.info(`[getAvailableServiceRequests] Fallback query returned ${totalCount} requests`);
  
  // If no matching requests found and provider has skill-based filter, try showing all open requests
  if (totalCount === 0 && req.user.role === "Service Provider" && matchConditions.$or) {
    logger.warn(`[getAvailableServiceRequests] No matching requests with skills, trying all open requests`);
    const allRequestsPipeline = [
      {
        $match: {
          status: "Open",
          expiresAt: { $gt: new Date() }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'requester',
          foreignField: '_id',
          as: 'requester',
          pipeline: [
            {
              $project: {
                firstName: 1,
                lastName: 1,
                profilePic: 1
              }
            }
          ]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'targetProvider',
          foreignField: '_id',
          as: 'targetProvider',
          pipeline: [
            {
              $project: {
                firstName: 1,
                lastName: 1
              }
            }
          ]
        }
      },
      {
        $addFields: {
          requester: { $arrayElemAt: ['$requester', 0] },
          targetProvider: { $arrayElemAt: ['$targetProvider', 0] }
        }
      },
      {
        $facet: {
          requests: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) }
          ],
          totalCount: [
            { $count: "count" }
          ]
        }
      }
    ];
    
    const allResult = await ServiceRequest.aggregate(allRequestsPipeline);
    return res.json({
      success: true,
      count: allResult[0].totalCount[0]?.count || 0,
      requests: allResult[0].requests,
      algorithm: "all_open",
      description: "No requests matching your skills found. Showing all available open requests."
    });
  }

  res.json({
    success: true,
    count: totalCount,
    requests,
    algorithm: "filtered",
    description: "Using basic filtered search for available service requests"
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
    status: "Open",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });

  // Notify matching service providers
  const matchingProviders = await User.find({
    role: "Service Provider",
    verified: true,
    skills: { $in: [serviceCategory.toLowerCase()] }
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

  // Build match conditions for aggregation pipeline
  const matchConditions = {
    role: "Service Provider",
    verified: true
  };

  if (serviceCategory) {
    // Use exact match instead of regex for better index utilization
    matchConditions.skills = { $in: [serviceCategory.toLowerCase()] };
  }

  if (location) {
    matchConditions.address = { $regex: location, $options: 'i' };
  }

  if (minRating) {
    matchConditions.averageRating = { $gte: parseFloat(minRating) };
  }

  if (maxRate) {
    matchConditions.serviceRate = { $lte: parseFloat(maxRate) };
  }

  // Use aggregation pipeline for better performance
  const aggregationPipeline = [
    { $match: matchConditions },
    {
      $facet: {
        providers: [
          {
            $project: {
              firstName: 1,
              lastName: 1,
              email: 1,
              phone: 1,
              skills: 1,
              serviceDescription: 1,
              serviceRate: 1,
              profilePic: 1,
              isOnline: 1,
              averageRating: 1,
              totalReviews: 1,
              address: 1
            }
          },
          { $sort: { averageRating: -1, totalReviews: -1 } },
          { $skip: skip },
          { $limit: parseInt(limit) }
        ],
        totalCount: [
          { $count: "count" }
        ]
      }
    }
  ];

  const result = await User.aggregate(aggregationPipeline);
  const providers = result[0].providers;
  const totalCount = result[0].totalCount[0]?.count || 0;

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
    status: "Open"
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
  let directOffersQuery = { provider: req.user._id, status: "Open" };
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

  if (offer.status !== "Open") {
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
  const { commissionFee } = req.body;

  const serviceRequest = await ServiceRequest.findById(requestId).populate('requester');
  if (!serviceRequest) return next(new ErrorHandler("Service request not found", 404));
  if (serviceRequest.status !== "Open") {
    return next(new ErrorHandler("Service request is not available for applications", 400));
  }

  // Validate commission fee
  const fee = parseFloat(commissionFee);
  if (isNaN(fee) || fee < 0) {
    return next(new ErrorHandler("Invalid commission fee", 400));
  }

  // Check if commission fee is within budget range
  if (serviceRequest.maxBudget && fee > serviceRequest.maxBudget) {
    return next(new ErrorHandler(`Commission fee cannot exceed ₱${serviceRequest.maxBudget.toLocaleString()}`, 400));
  }
  if (serviceRequest.minBudget && fee < serviceRequest.minBudget) {
    return next(new ErrorHandler(`Commission fee cannot be less than ₱${serviceRequest.minBudget.toLocaleString()}`, 400));
  }

  // Check if provider already applied
  const existingBooking = await Booking.findOne({
    provider: req.user._id,
    serviceRequest: requestId
  });

  if (existingBooking) {
    return next(new ErrorHandler("You have already applied to this request", 400));
  }

  // Create application record (booking with status "Applied" for applications)
  const booking = await Booking.create({
    requester: serviceRequest.requester._id,
    provider: req.user._id,
    serviceRequest: requestId,
    status: "Applied",
    commissionFee: fee
  });

  await sendNotification(
    serviceRequest.requester._id,
    "New Application",
    `${req.user.firstName} ${req.user.lastName} applied to your service request with a commission fee of ₱${fee.toLocaleString()}`,
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

  if (booking.status !== "Applied") {
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

export const getClientServiceOffers = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  if (req.user.role !== "Community Member") {
    return next(new ErrorHandler("Only community members can view their service offers", 403));
  }

  const { page = 1, limit = 20, status } = req.query;
  const skip = (page - 1) * limit;

  let query = { requester: req.user._id };
  if (status) {
    query.status = status;
  }

  const offers = await ServiceOffer.find(query)
    .populate('provider', 'firstName lastName email phone profilePic skills averageRating totalReviews verified')
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

export const getProviderProfile = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { providerId } = req.params;

  if (!providerId) {
    return next(new ErrorHandler("Provider ID is required", 400));
  }

  // Validate that the providerId is a valid MongoDB ObjectId format
  if (!providerId.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new ErrorHandler("Invalid provider ID format", 400));
  }

  const provider = await User.findById(providerId)
    .select('firstName lastName email phone skills services serviceDescription serviceRate profilePic isOnline averageRating totalReviews verified occupation address role');

  if (!provider) {
    // Log the issue for debugging
    console.error(`Provider not found with ID: ${providerId}`);
    return next(new ErrorHandler("Provider profile not available", 404));
  }

  // Get provider reviews (only if they have reviews as a service provider)
  const reviews = await Review.find({ reviewee: providerId })
    .populate('reviewer', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(5);

  res.status(200).json({
    success: true,
    provider: {
      ...provider.toObject(),
      reviews,
      // Add a flag to indicate if this user is currently a service provider
      isActiveProvider: provider.role === "Service Provider"
    }
  });
});

export const getAllUserRequests = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { page = 1, limit = 20, status, type } = req.query;
  const skip = (page - 1) * limit;

  const allRequests = [];

  // 1. Get service requests posted by user
  if (!type || type === 'service-requests') {
    let serviceRequestQuery = { requester: req.user._id };
    if (status) {
      serviceRequestQuery.status = status;
    }

    const serviceRequests = await ServiceRequest.find(serviceRequestQuery)
      .populate('serviceProvider', 'firstName lastName profilePic')
      .populate('targetProvider', 'firstName lastName profilePic')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    serviceRequests.forEach(request => {
      allRequests.push({
        _id: request._id,
        type: 'service-request',
        title: request.name,
        description: request.notes,
        location: request.address,
        minBudget: request.minBudget,
        maxBudget: request.maxBudget,
        preferredDate: request.preferredDate,
        status: request.status,
        createdAt: request.createdAt,
        serviceProvider: request.serviceProvider,
        targetProvider: request.targetProvider,
        data: request
      });
    });
  }

  // 2. Get service offers sent by user (only include offers where provider still exists)
  if (!type || type === 'offers') {
    let offerQuery = { requester: req.user._id };
    if (status) {
      offerQuery.status = status;
    }

    const offers = await ServiceOffer.find(offerQuery)
      .populate({
        path: 'provider',
        select: 'firstName lastName email phone profilePic skills averageRating totalReviews verified',
        match: { _id: { $exists: true } } // Ensure provider exists
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Only include offers where provider was successfully populated (i.e., provider still exists)
    offers.forEach(offer => {
      if (offer.provider) { // Only add if provider exists
        allRequests.push({
          _id: offer._id,
          type: 'offer',
          title: offer.title,
          description: offer.description,
          location: offer.location,
          minBudget: offer.minBudget,
          maxBudget: offer.maxBudget,
          preferredDate: offer.preferredDate,
          status: offer.status,
          createdAt: offer.createdAt,
          provider: offer.provider,
          data: offer
        });
      }
    });
  }

  // 3. Get applications submitted by user (if any)
  if (!type || type === 'applications') {
    let applicationQuery = { provider: req.user._id };
    if (status) {
      applicationQuery.status = status;
    }

    const applications = await Booking.find(applicationQuery)
      .populate('requester', 'firstName lastName email phone profilePic')
      .populate('serviceRequest', 'name address typeOfWork minBudget maxBudget notes preferredDate time')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    applications.forEach(application => {
      allRequests.push({
        _id: application._id,
        type: 'application',
        title: `Application for: ${application.serviceRequest?.name || 'Service Request'}`,
        description: `Applied with commission fee: ₱${application.commissionFee?.toLocaleString() || 'N/A'}`,
        location: application.serviceRequest?.address,
        minBudget: application.serviceRequest?.minBudget,
        maxBudget: application.serviceRequest?.maxBudget,
        preferredDate: application.serviceRequest?.preferredDate,
        status: application.status,
        createdAt: application.createdAt,
        requester: application.requester,
        serviceRequest: application.serviceRequest,
        data: application
      });
    });
  }

  // 4. Get bookings/ongoing work
  if (!type || type === 'bookings') {
    let bookingQuery = {
      $or: [
        { requester: req.user._id },
        { provider: req.user._id }
      ]
    };
    if (status) {
      bookingQuery.status = status;
    }

    const bookings = await Booking.find(bookingQuery)
      .populate('requester', 'firstName lastName email phone profilePic')
      .populate('provider', 'firstName lastName email phone profilePic')
      .populate('serviceRequest', 'name address typeOfWork')
      .populate('serviceOffer', 'title description location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    bookings.forEach(booking => {
      const isRequester = String(booking.requester._id) === String(req.user._id);
      const otherParty = isRequester ? booking.provider : booking.requester;

      allRequests.push({
        _id: booking._id,
        type: 'booking',
        title: booking.serviceRequest?.name || booking.serviceOffer?.title || 'Service Booking',
        description: booking.serviceRequest?.notes || booking.serviceOffer?.description || 'Ongoing service work',
        location: booking.serviceRequest?.address || booking.serviceOffer?.location,
        status: booking.status,
        createdAt: booking.createdAt,
        otherParty: otherParty,
        serviceRequest: booking.serviceRequest,
        serviceOffer: booking.serviceOffer,
        data: booking
      });
    });
  }

  // Sort all requests by created date (most recent first)
  allRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Apply pagination after combining
  const paginatedRequests = allRequests.slice(skip, skip + parseInt(limit));

  res.json({
    success: true,
    count: allRequests.length,
    requests: paginatedRequests
  });
});

// Report user endpoint
export const reportUser = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { reportedUserId, reason, appointmentId } = req.body;

  if (!reportedUserId || !reason) {
    return next(new ErrorHandler("Reported user ID and reason are required", 400));
  }

  // Validate that reported user exists
  const reportedUser = await User.findById(reportedUserId);
  if (!reportedUser) {
    return next(new ErrorHandler("Reported user not found", 404));
  }

  // Check if appointment exists and user is part of it
  if (appointmentId) {
    const booking = await Booking.findById(appointmentId);
    if (!booking) {
      return next(new ErrorHandler("Booking not found", 404));
    }
    if (![String(booking.requester), String(booking.provider)].includes(String(req.user._id))) {
      return next(new ErrorHandler("Not authorized to report from this conversation", 403));
    }
  }

  // Create report (you might want to create a Report model for this)
  // For now, we'll just log it and return success
  console.log(`User ${req.user._id} reported user ${reportedUserId} for: ${reason}`);

  // In a real implementation, you would save this to a reports collection
  // const report = await Report.create({
  //   reporter: req.user._id,
  //   reportedUser: reportedUserId,
  //   reason,
  //   appointment: appointmentId,
  //   status: 'pending'
  // });

  res.status(200).json({
    success: true,
    message: "User report submitted successfully. Our team will review it."
  });
});

// Block user endpoint
export const blockUser = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { targetUserId } = req.body;

  if (!targetUserId) {
    return next(new ErrorHandler("Target user ID is required", 400));
  }

  // Validate that target user exists
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    return next(new ErrorHandler("Target user not found", 404));
  }

  // Check if user is trying to block themselves
  if (String(req.user._id) === String(targetUserId)) {
    return next(new ErrorHandler("You cannot block yourself", 400));
  }

  // Get current user and add to blocked users list
  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  // Initialize blockedUsers array if it doesn't exist
  if (!user.blockedUsers) {
    user.blockedUsers = [];
  }

  // Check if already blocked
  if (user.blockedUsers.includes(targetUserId)) {
    return next(new ErrorHandler("User is already blocked", 400));
  }

  // Add to blocked users
  user.blockedUsers.push(targetUserId);
  await user.save();

  res.status(200).json({
    success: true,
    message: `${targetUser.firstName} ${targetUser.lastName} has been blocked successfully`
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
  await profilePic.mv(`./uploads/${fileName}`);

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
