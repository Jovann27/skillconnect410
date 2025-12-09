import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import User from "../models/userSchema.js";
import ServiceRequest from "../models/serviceRequest.js";
import Review from "../models/review.js";
import { sendNotification } from "../utils/socketNotify.js";
import { sendTargetedRequestNotification } from "../utils/emailService.js";
import Booking from "../models/booking.js";
import Chat from "../models/chat.js";
import { io, onlineUsers } from "../server.js";
// import cloudinary from "cloudinary";
import { getActiveRequestsFilter } from "../utils/expirationHandler.js";
import fs from "fs";
import axios from "axios";

// Helper function to upload files to MongoDB (base64 encoded for now)
const uploadToMongoDB = async (filePath, folder) => {
  try {
    // Read file as buffer and convert to base64
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');

    // Create a simple file object with metadata
    const fileData = {
      data: base64Data,
      contentType: filePath.split('.').pop(), // Simple mime type detection
      folder: folder,
      uploadedAt: new Date()
    };

    // Clean up temp file
    fs.unlinkSync(filePath);

    return fileData;
  } catch (error) {
    console.error("Error uploading to MongoDB:", error);
    // Clean up temp file even on error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
};



export const applyProvider = catchAsyncError(async (req, res, next) => {
  const { skills, certificates } = req.body;

  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  user.isApplyingProvider = true;

  // Handle skills
  if (skills) {
    user.skills = Array.isArray(skills)
      ? skills
      : skills.toString().split(",").map(s => s.trim());
  }

  // Handle certificates
  if (certificates) {
    user.certificates = Array.isArray(certificates)
      ? certificates
      : [certificates];
  }

  // Assign temporary provider role (unverified)
  user.role = "Service Provider"; // ✅ no extra space

  await user.save();

  // Notify user
  await sendNotification(
    user._id,
    "Provider Application Received",
    "Your application to become a Service Provider was received. An admin will review it soon.",
    { type: "apply-provider" }
  );

  res.status(200).json({
    success: true,
    message: "Applied to become provider",
    user,
  });
});




export const postServiceRequest = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  const { name, address, phone, typeOfWork, preferredDate, time, budget, notes, location, targetProvider } = req.body;
  if (!name || !address || !phone || !typeOfWork || !time) return next(new ErrorHandler("Missing required fields", 400));

  // Calculate expiration date based on preferred date and time
  let expiresAt;
  if (preferredDate) {
    // Combine preferred date with time to create expiration datetime
    const [hours, minutes] = time.split(':').map(Number);
    const expirationDate = new Date(preferredDate);
    expirationDate.setHours(hours, minutes, 0, 0);
    expiresAt = expirationDate;
  } else {
    // Default to 24 hours from now if no preferred date
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
    location: location || null,
    targetProvider,
    status: "Waiting",
    expiresAt,
  });

  // Find all providers whose skills match the service request
  // Send notification to all matching providers regardless of availability or budget
  const matchingProviders = await User.find({
    role: "Service Provider",
    skills: { $in: [new RegExp(typeOfWork, 'i')] }, // Match Service Needed against skills array
  }).select("_id");

  // Send notification to all matching providers
  for (const provider of matchingProviders) {
    await sendNotification(
      provider._id,
      "New Service Request",
      "Someone has posted a request that matches your service and skills.",
      { requestId: request._id, type: "service-request"}
    );
  }

  // Notify the requester that their request was posted
  await sendNotification(
    req.user._id,
    "Service Request Posted",
    `Your "${typeOfWork}" request has been posted successfully.`,
    { requestId: request._id, type: "service-request-posted"}
  );

  // Emit socket event for real-time updates (to relevant users only)
  // This could be improved by emitting to specific provider rooms

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

  // Emit socket event for real-time updates
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
  // Only participants can leave review (requester or provider)
  if (![String(booking.requester), String(booking.provider)].includes(String(req.user._id))) {
    return next(new ErrorHandler("Not authorized", 403));
  }

  // Check if review already exists before creating
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

  // Emit socket event for real-time updates
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

  // Emit socket event for real-time updates
  io.to(`service-request-${request._id}`).emit("service-request-updated", { requestId: request._id, action: "cancelled" });

  res.status(200).json({ success: true, request });
});


export const acceptServiceRequest = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  const { id } = req.params;
  const request = await ServiceRequest.findById(id).populate('requester');
  if (!request) return next(new ErrorHandler("Service Request not found", 404));
  if (request.status !== "Waiting") return next(new ErrorHandler("Request is not available", 400));

  // Ensure provider
  const provider = await User.findById(req.user._id);
  if (!provider || provider.role !== "Service Provider") return next(new ErrorHandler("Not a provider", 403));

  // Create booking
  const booking = await Booking.create({
    requester: request.requester._id,
    provider: provider._id,
    serviceRequest: request._id,
    status: "Working",
  });

  // Mark request working & set provider
  request.status = "Working";
  request.serviceProvider = provider._id;
  request.eta = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
  await request.save();

  // Notify requester
  await sendNotification(
    request.requester._id,
    "Request Accepted",
    `Your "${request.typeOfWork}" request has been accepted by ${provider.username}`,
    { date: booking.createdAt, service: request.typeOfWork }
  );

  // Emit socket events for real-time updates
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

  // Check if user is authorized
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



export const getChatHistory = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const userId = req.user._id;

  // Find bookings where the user is involved (as requester or provider)
  const bookings = await Booking.find({
    $or: [
      { requester: userId },
      { provider: userId }
    ]
  }).select('_id');

  const bookingIds = bookings.map(b => b._id);

  // Fetch chats for these bookings
  const chats = await Chat.find({
    appointment: { $in: bookingIds }
  })
  .populate('sender', 'firstName lastName')
  .populate('appointment', 'requester provider')
  .sort({ createdAt: 1 }); // Sort by time ascending

  // Group chats by appointment for easier display
  const chatHistory = chats.reduce((acc, chat) => {
    const appointmentId = chat.appointment._id.toString();
    if (!acc[appointmentId]) {
      acc[appointmentId] = {
        appointmentId,
        participants: {
          requester: chat.appointment.requester,
          provider: chat.appointment.provider
        },
        messages: []
      };
    }
    acc[appointmentId].messages.push({
      id: chat._id,
      sender: chat.sender,
      message: chat.message,
      timestamp: chat.createdAt,
      status: chat.status,
      seenBy: chat.seenBy
    });
    return acc;
  }, {});

  res.status(200).json({
    success: true,
    chatHistory: Object.values(chatHistory)
  });
});

export const sendMessage = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { appointmentId, message } = req.body;
  if (!appointmentId || !message) {
    return next(new ErrorHandler("Appointment ID and message are required", 400));
  }

  // Verify user has access to this appointment
  const booking = await Booking.findOne({
    _id: appointmentId,
    $or: [
      { requester: req.user._id },
      { provider: req.user._id }
    ]
  });

  if (!booking) {
    return next(new ErrorHandler("Access denied to this chat", 403));
  }

  // Save message to database
  const chatMessage = await Chat.create({
    appointment: appointmentId,
    sender: req.user._id,
    message: message.trim(),
    status: 'sent'
  });

  // Populate sender info
  await chatMessage.populate('sender', 'firstName lastName profilePic');

  // Emit socket event for real-time update
  io.to(`chat-${appointmentId}`).emit("new-message", chatMessage);

  // Send notification to other user if they're online
  const otherUserId = booking.requester.toString() === req.user._id.toString()
    ? booking.provider.toString()
    : booking.requester.toString();

  const otherSocketId = onlineUsers.get(otherUserId);
  if (otherSocketId) {
    io.to(otherSocketId).emit("message-notification", {
      appointmentId,
      message: chatMessage,
      from: req.user.firstName + " " + req.user.lastName
    });
  }

  res.status(201).json({
    success: true,
    message: chatMessage
  });
});

export const getChatList = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const userId = req.user._id;

  // Find bookings where the user is involved
  const bookings = await Booking.find({
    $or: [
      { requester: userId },
      { provider: userId }
    ]
  })
  .populate('requester', 'firstName lastName username email phone profilePic')
  .populate('provider', 'firstName lastName username email phone profilePic')
  .populate('serviceRequest', 'name typeOfWork')
  .sort({ updatedAt: -1 });

  // Get chat counts and last messages for each booking
  const chatList = await Promise.all(bookings.map(async (booking) => {
    const messageCount = await Chat.countDocuments({ appointment: booking._id });
    const lastMessage = await Chat.findOne({ appointment: booking._id })
      .populate('sender', 'firstName lastName')
      .sort({ createdAt: -1 });

    const otherUser = booking.requester._id.toString() === userId.toString()
      ? booking.provider
      : booking.requester;

    return {
      appointmentId: booking._id,
      otherUser,
      serviceRequest: booking.serviceRequest,
      status: booking.status,
      canComplete: booking.provider.toString() === userId.toString() && booking.status === 'Working',
      lastMessage: lastMessage ? {
        message: lastMessage.message,
        sender: lastMessage.sender,
        timestamp: lastMessage.createdAt,
        status: lastMessage.status
      } : null,
      messageCount,
      unreadCount: await Chat.countDocuments({
        appointment: booking._id,
        sender: { $ne: userId },
        status: { $ne: 'seen' },
        'seenBy.user': { $ne: userId }
      })
    };
  }));

  res.status(200).json({
    success: true,
    chatList
  });
});

export const markMessagesAsSeen = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { appointmentId } = req.params;
  const userId = req.user._id;

  // Verify user has access to this appointment
  const booking = await Booking.findOne({
    _id: appointmentId,
    $or: [
      { requester: userId },
      { provider: userId }
    ]
  });

  if (!booking) {
    return next(new ErrorHandler("Access denied to this chat", 403));
  }

  // Update all messages in this chat that weren't sent by this user
  await Chat.updateMany(
    {
      appointment: appointmentId,
      sender: { $ne: userId },
      'seenBy.user': { $ne: userId }
    },
    {
      $addToSet: {
        seenBy: {
          user: userId,
          seenAt: new Date()
        }
      },
      status: 'seen'
    }
  );

  // Emit socket event to notify sender
  const messages = await Chat.find({
    appointment: appointmentId,
    sender: { $ne: userId }
  }).populate('sender');

  messages.forEach(async (message) => {
    if (message.sender._id.toString() !== userId.toString()) {
      const senderSocketId = onlineUsers.get(message.sender._id.toString());
      if (senderSocketId) {
        io.to(senderSocketId).emit("message-seen-update", {
          messageId: message._id,
          seenBy: req.user.firstName + " " + req.user.lastName,
          appointmentId
        });
      }
    }
  });

  res.status(200).json({
    success: true,
    message: "Messages marked as seen"
  });
});

export const getServiceProviders = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  try {
    // Get all service providers with necessary data for client-side filtering
    const workers = await User.find({
      role: "Service Provider",
      banned: { $ne: true },
      _id: { $ne: req.user._id } // Exclude current user
    })
    .select("firstName lastName skills availability profilePic service serviceRate serviceDescription createdAt certificates services isOnline address birthdate employed")
    .sort({ createdAt: -1 });

    // Get reviews and ratings for each provider
    const providerIds = workers.map(w => w._id);
    const reviews = await Review.find({ reviewee: { $in: providerIds } })
      .populate('reviewer', 'firstName lastName')
      .select('reviewee rating comments createdAt reviewer')
      .sort({ createdAt: -1 });

    // Group reviews by provider
    const reviewsByProvider = {};
    reviews.forEach(review => {
      const providerId = review.reviewee.toString();
      if (!reviewsByProvider[providerId]) {
        reviewsByProvider[providerId] = [];
      }
      reviewsByProvider[providerId].push(review);
    });

    // Calculate ratings and attach reviews to providers
    const workersWithData = workers.map(provider => {
      const providerReviews = reviewsByProvider[provider._id.toString()] || [];
      const averageRating = providerReviews.length > 0
        ? providerReviews.reduce((sum, r) => sum + r.rating, 0) / providerReviews.length
        : 0;

      return {
        ...provider.toObject(),
        reviews: providerReviews.slice(0, 5), // Include up to 5 recent reviews
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews: providerReviews.length
      };
    });

    res.json({ success: true, count: workersWithData.length, workers: workersWithData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export const offerToProvider = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { providerId, requestId } = req.body;

  if (!providerId || !requestId) {
    return next(new ErrorHandler("Provider ID and request ID are required", 400));
  }

  try {
    // Verify the request belongs to the user and is in Waiting status
    const request = await ServiceRequest.findById(requestId).populate('requester', 'firstName lastName');
    if (!request) {
      return next(new ErrorHandler("Request not found", 404));
    }
    if (String(request.requester) !== String(req.user._id) && req.user.role !== "admin") {
      return next(new ErrorHandler("Not authorized", 403));
    }
    if (request.status !== "Waiting") {
      return next(new ErrorHandler("Request is not available for offering", 400));
    }

    // Get provider details
    const provider = await User.findById(providerId).select('firstName lastName email');
    if (!provider) {
      return next(new ErrorHandler("Provider not found", 404));
    }

    // Update request status to Offered and set target provider
    request.status = "Offered";
    request.targetProvider = providerId;
    await request.save();

    const message = `You have been offered a request for "${request.typeOfWork}" by ${request.requester.firstName} ${request.requester.lastName}`;

    // Send in-app notification to the provider
    await sendNotification(
      providerId,
      "Service Request Offer",
      message,
      { requestId, type: "service-request-offer" }
    );

    // Send email notification if provider has email
    if (provider.email) {
      try {
        await sendTargetedRequestNotification(
          provider.email,
          `${provider.firstName} ${provider.lastName}`,
          `${request.requester.firstName} ${request.requester.lastName}`,
          request.typeOfWork,
          requestId
        );
      } catch (emailErr) {
        console.error("Email sending failed:", emailErr);
        // Don't fail the whole request if email fails
      }
    }

    // Create initial chat message to notify provider through chat
    const chatMessage = await Chat.create({
      appointment: null, // No booking yet
      sender: req.user._id,
      message: `I've offered you a service request for "${request.typeOfWork}". Please check your notifications to accept or decline.`,
      status: 'sent'
    });

    // Emit chat notification to provider if online
    const providerSocketId = onlineUsers.get(providerId.toString());
    if (providerSocketId) {
      io.to(providerSocketId).emit("offer-notification", {
        requestId,
        message: chatMessage.message,
        requesterName: `${request.requester.firstName} ${request.requester.lastName}`,
        serviceType: request.typeOfWork
      });
    }

    // Emit socket event for real-time updates
    io.to(`service-request-${request._id}`).emit("service-request-updated", { requestId: request._id, action: "offered" });

    res.status(200).json({
      success: true,
      message: "Offer sent to provider",
      request
    });
  } catch (err) {
    console.error("Error sending offer:", err);
    res.status(500).json({ success: false, message: "Failed to send offer" });
  }
});

export const acceptOffer = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { requestId } = req.params;
  const request = await ServiceRequest.findById(requestId).populate('requester targetProvider');
  if (!request) return next(new ErrorHandler("Service Request not found", 404));
  if (request.status !== "Offered") return next(new ErrorHandler("Request is not in offered status", 400));

  // Ensure only the target provider can accept
  if (String(request.targetProvider._id) !== String(req.user._id)) {
    return next(new ErrorHandler("Not authorized to accept this offer", 403));
  }

  // Create booking
  const booking = await Booking.create({
    requester: request.requester._id,
    provider: req.user._id,
    serviceRequest: request._id,
    status: "Working",
  });

  // Mark request as working & set provider
  request.status = "Working";
  request.serviceProvider = req.user._id;
  request.eta = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
  await request.save();

  // Notify requester
  await sendNotification(
    request.requester._id,
    "Offer Accepted",
    `Your "${request.typeOfWork}" request has been accepted by ${request.targetProvider.firstName} ${request.targetProvider.lastName}`,
    { requestId: request._id, bookingId: booking._id, type: "offer-accepted" }
  );

  // Emit socket events for real-time updates
  io.to(`service-request-${request._id}`).emit("service-request-updated", { requestId: request._id, action: "accepted" });
  io.emit("booking-updated", { bookingId: booking._id, action: "created" });

  res.status(201).json({ success: true, booking, request });
});

export const rejectOffer = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { requestId } = req.params;
  const request = await ServiceRequest.findById(requestId).populate('requester targetProvider');
  if (!request) return next(new ErrorHandler("Service Request not found", 404));
  if (request.status !== "Offered") return next(new ErrorHandler("Request is not in offered status", 400));

  // Ensure only the target provider can reject
  if (String(request.targetProvider._id) !== String(req.user._id)) {
    return next(new ErrorHandler("Not authorized to reject this offer", 403));
  }

  // Reset request to Waiting status and clear target provider
  request.status = "Waiting";
  request.targetProvider = null;
  await request.save();

  // Notify requester
  await sendNotification(
    request.requester._id,
    "Offer Declined",
    `Your offer for "${request.typeOfWork}" was declined by ${request.targetProvider.firstName} ${request.targetProvider.lastName}`,
    { requestId: request._id, type: "offer-rejected" }
  );

  // Emit socket event for real-time updates
  io.to(`service-request-${request._id}`).emit("service-request-updated", { requestId: request._id, action: "rejected" });

  res.status(200).json({ success: true, request });
});

export const completeBooking = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { id } = req.params;
  const { comment } = req.body;
  const booking = await Booking.findById(id);
  if (!booking) return next(new ErrorHandler("Booking not found", 404));

  // Only the provider can complete the booking
  if (String(booking.provider) !== String(req.user._id)) {
    return next(new ErrorHandler("Not authorized to complete this booking", 403));
  }

  if (booking.status !== "Working") {
    return next(new ErrorHandler("Booking is not in working status", 400));
  }

  // Handle proof images upload
  let proofImageUrls = [];
  if (req.files && req.files.proofImages) {
    const files = Array.isArray(req.files.proofImages) ? req.files.proofImages : [req.files.proofImages];
    for (const file of files) {
      const fileData = await uploadToMongoDB(file.tempFilePath, "skillconnect/proof-images");
      proofImageUrls.push(fileData);
    }
  }

  // Update booking
  booking.status = "Complete";
  booking.proofImages = proofImageUrls;
  booking.proofComment = comment || null;
  await booking.save();

  // Update the associated service request status
  const serviceRequest = await ServiceRequest.findById(booking.serviceRequest);
  if (serviceRequest) {
    serviceRequest.status = "Complete";
    await serviceRequest.save();
  }

  // Notify the requester
  await sendNotification(
    booking.requester,
    "Service Completed",
    `Your service has been completed. Please review and rate the provider.`,
    { bookingId: booking._id, type: "service-completed" }
  );

  // Emit socket event for real-time updates
  io.emit("booking-updated", { bookingId: booking._id, action: "status-updated", newStatus: "Complete" });

  res.json({ success: true, booking });
});

// // Helper function to upload to Cloudinary
// const uploadToCloudinary = async (filePath, folder) => {
//   const result = await cloudinary.v2.uploader.upload(filePath, { folder });
//   return result.secure_url;
// };

// // Helper function to upload to Cloudinary
// const uploadToCloudinary = async (filePath, folder) => {
//   const result = await cloudinary.v2.uploader.upload(filePath, { folder });
//   return result.secure_url;
// };

export const getServiceRequests = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  // For providers, return offered requests; for clients, return their own requests
  let filter = {};
  if (req.user.role === "Service Provider") {
    filter = { status: "Offered", targetProvider: req.user._id };
  } else {
    filter = { requester: req.user._id };
  }

  const requests = await ServiceRequest.find(filter)
    .populate('requester', 'firstName lastName email phone')
    .populate('targetProvider', 'firstName lastName email phone')
    .populate('serviceProvider', 'firstName lastName email phone')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, requests });
});

export const getAvailableServiceRequests = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  // Return all waiting service requests for recommendations
  const requests = await ServiceRequest.find({ status: 'Waiting' })
    .populate('requester', 'firstName lastName')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, requests });
});

export const reverseGeocode = catchAsyncError(async (req, res, next) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return next(new ErrorHandler("Latitude and longitude are required", 400));
  }

  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'SkillConnect/1.0 (contact@skillconnect.com)',
          'Accept': 'application/json'
        }
      }
    );

    const data = response.data;
    res.json({ success: true, address: data.display_name || null });
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    res.json({ success: false, address: null, error: error.message });
  }
});
