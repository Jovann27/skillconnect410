// Additional functions to complete the userFlowController.js file

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

  // Update request status
  request.status = "Working";
  request.serviceProvider = req.user._id;
  request.eta = new Date(Date.now() + 30 * 60 * 1000);
  await request.save();

  // Send notifications
  await sendNotification(
    request.requester._id,
    "Offer Accepted",
    `Your service request has been accepted by the provider.`,
    { requestId: request._id, type: "offer-accepted" }
  );

  // Emit socket events
  io.to(`service-request-${request._id}`).emit("service-request-updated", { requestId: request._id, action: "accepted" });
  io.emit("booking-updated", { bookingId: booking._id, action: "created" });

  res.status(201).json({ success: true, booking, request });
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

  // Update request status back to Waiting
  request.status = "Waiting";
  request.targetProvider = null;
  await request.save();

  // Send notification to requester
  await sendNotification(
    request.requester._id,
    "Offer Rejected",
    `Your service request offer has been rejected by the provider.`,
    { requestId: request._id, type: "offer-rejected" }
  );

  // Emit socket events
  io.to(`service-request-${request._id}`).emit("service-request-updated", { requestId: request._id, action: "rejected" });

  res.status(200).json({ success: true, message: "Offer rejected successfully" });
});

export const completeBooking = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  const { id } = req.params;
  const booking = await Booking.findById(id);
  if (!booking) return next(new ErrorHandler("Booking not found", 404));

  // Check if user is authorized
  if (![String(booking.requester), String(booking.provider)].includes(String(req.user._id))) {
    return next(new ErrorHandler("Not authorized", 403));
  }

  // Update booking status
  booking.status = "Complete";
  await booking.save();

  // Update service request status
  const serviceRequest = await ServiceRequest.findById(booking.serviceRequest);
  if (serviceRequest) {
    serviceRequest.status = "Complete";
    await serviceRequest.save();
  }

  // Send notifications
  const otherUser = String(booking.requester) === String(req.user._id) ? booking.provider : booking.requester;
  await sendNotification(otherUser, "Booking Completed", `Booking ${booking._id} has been completed`);

  // Emit socket event
  io.emit("booking-updated", { bookingId: booking._id, action: "completed" });

  res.json({ success: true, booking });
});

export const getAvailableServiceRequests = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const user = await User.findById(req.user._id);
  if (!user || user.role !== "Service Provider") {
    return next(new ErrorHandler("Only service providers can view available requests", 403));
  }

  const now = new Date();
  const requests = await ServiceRequest.find({
    status: "Waiting",
    expiresAt: { $gt: now },
    $or: [
      { targetProvider: req.user._id },
      { targetProvider: { $exists: false } }
    ]
  })
  .populate('requester', 'firstName lastName username email phone profilePic')
  .sort({ createdAt: -1 });

  res.status(200).json({ success: true, requests });
});

export const reverseGeocode = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return next(new ErrorHandler("Latitude and longitude are required", 400));
  }

  // For now, return a mock response since we don't have a geocoding service configured
  // In a real implementation, you would use a service like Google Maps or OpenStreetMap
  res.json({
    success: true,
    data: {
      address: `Location at ${lat}, ${lng}`,
      coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) }
    }
  });
});
