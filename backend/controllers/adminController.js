import JobFair from "../models/jobFairSchema.js";
import User from "../models/userSchema.js";
import ServiceRequest from "../models/serviceRequest.js";
import Booking from "../models/booking.js";
import Certificate from "../models/certificate.js";
import WorkProof from "../models/workProof.js";
import ErrorHandler from "../middlewares/error.js";
import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import { sendNotification } from "../utils/socketNotify.js";

// Create Job Fair
export const createJobFair = async (req, res) => {
  try {
    const { title, description, date, startTime, endTime, location } = req.body;

    const jobfair = await JobFair.create({
      title,
      description,
      date,
      startTime,
      endTime,
      location,
    });

    res.status(201).json({ success: true, jobfair });
  } catch (err) {
    console.error("createJobFair error", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all service requests
export const adminGetAllServiceRequests = async (req, res) => {
  try {
    const { skill, status, sort } = req.query;

    let filter = {};
    // skill filter commented out

    if (status) {
      // normalize to capitalized enum
      const normalized = status[0].toUpperCase() + status.slice(1).toLowerCase();
      filter.status = normalized;
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Sorting
    let sortOptions = { createdAt: -1 };
    if (sort === 'oldest') {
      sortOptions = { createdAt: 1 };
    }

    const requests = await ServiceRequest.find(filter)
      .populate('requester', 'firstName lastName profilePic')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const totalRequests = await ServiceRequest.countDocuments(filter);
    const totalPages = Math.ceil(totalRequests / limit);

    res.json({
      count: totalRequests,
      totalPages,
      requests
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Verify user
export const verifyUser = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  // Debug logging
  console.log("verifyUser called with params:", { id });
  console.log("req.admin:", req.admin);
  console.log("req.headers.authorization:", req.headers.authorization);
  console.log("req.cookies:", req.cookies);

  // Validate request
  if (!id) {
    return next(new ErrorHandler("User ID is required", 400));
  }

  if (!req.admin || !req.admin._id) {
    console.error("Admin authentication failed - req.admin is missing or invalid:", req.admin);
    return next(new ErrorHandler("Admin authentication required", 401));
  }

  const user = await User.findById(id);

  if (!user) return next(new ErrorHandler("User not found", 404));
  if (user.verified) return next(new ErrorHandler("User is already verified", 400));

  user.verified = true;
  user.verifiedBy = req.admin._id; // Admin who verified the user
  await user.save();

  console.log(`User ${id} verified successfully by admin ${req.admin._id}`);

  // Send notification to the user (won't fail if socket not available)
  await sendNotification(
    user._id,
    "Account Verified",
    "Your account has been verified by an administrator. You can now log in to the system.",
    { type: "account-verified" }
  );

  res.status(200).json({
    success: true,
    message: `User (${user.firstName} ${user.lastName}) has been verified successfully`,
    user
  });
});

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get service providers
export const getServiceProviders = async (req, res) => {
  try {
    const workers = await User.find({ "role": "Service Provider" })
      .select("firstName lastName skills availability profilePic createdAt");
    res.json({ success: true, count: workers.length, workers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Approve Service Provider (set availability to Available)
export const approveServiceProvider = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const user = await User.findById(id);

  if (!user) return next(new ErrorHandler("User not found", 404));
  if (user.role !== "Service Provider") return next(new ErrorHandler("User is not a Service Provider", 400));

  user.availability = "Available"; // Set to available
  await user.save();

  res.status(200).json({
    success: true,
    message: `Service Provider (${user.firstName} ${user.lastName}) has been approved.`,
    user
  });
});

// Reject Service Provider (set availability to Not Available)
export const rejectServiceProvider = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body;
  const user = await User.findById(id);

  if (!user) return next(new ErrorHandler("User not found", 404));
  if (user.role !== "Service Provider") return next(new ErrorHandler("User is not a Service Provider", 400));

  user.availability = "Not Available"; // Set to not available
  await user.save();

  let message = `Service Provider (${user.firstName} ${user.lastName}) has been rejected`;
  if (reason) {
    message += ` Reason: ${reason}`;
  }

  res.status(200).json({
    success: true,
    message,
    user
  });
});

// Get Service Providers
export const getServiceProviderApplicants = catchAsyncError(async (req, res, next) => {
  const providers = await User.find({ "role": "Service Provider" })
    .select("-password")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: providers.length,
    providers
  });
});

//Ban User
export const banUser = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ success: false, message: "User ID is required" });
  }

  try {
    const user = await User.findById(id);

    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role === "Admin") return res.status(403).json({ success: false, message: "Cannot ban another admin" });
    if (user.banned) return res.status(400).json({ success: false, message: "User is already banned" });

    user.availability = "Not Available";
    user.banned = true;
    await user.save();

    console.log(`User ${id} banned successfully`);

    // Send notification to banned user (won't fail if socket not available)
    await sendNotification(
      user._id,
      "Account Banned",
      "Your account has been banned by an administrator. Please contact support for more information.",
      { type: "account-banned" }
    );

    res.status(200).json({
      success: true,
      message: `User (${user.firstName} ${user.lastName}) has been banned successfully.`,
      user
    });
  } catch (error) {
    console.error("Error banning user:", error.message, error.stack);
    return res.status(500).json({ success: false, message: `Failed to ban user: ${error.message}` });
  }
};

// Update user service profile
export const updateUserServiceProfile = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { services } = req.body;

  const user = await User.findById(id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  // Validate services array
  if (!Array.isArray(services)) {
    return next(new ErrorHandler("Services must be an array", 400));
  }

  // Validate each service object
  for (const service of services) {
    if (!service.name || typeof service.name !== 'string' || service.name.trim() === '') {
      return next(new ErrorHandler("Each service must have a valid name", 400));
    }
    if (service.rate !== undefined && (typeof service.rate !== 'number' || service.rate < 0)) {
      return next(new ErrorHandler("Service rate must be a positive number", 400));
    }
  }

  // Update services array
  user.services = services.map(service => ({
    name: service.name.trim(),
    rate: service.rate || 0,
    description: service.description ? service.description.trim() : ''
  }));

  await user.save();

  res.status(200).json({
    success: true,
    message: "User service profile updated successfully",
    user: {
      _id: user._id,
      services: user.services
    }
  });
});

// Get dashboard metrics
export const getDashboardMetrics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProviders = await User.countDocuments({ "role": "Service Provider" });
    const activeBookings = await Booking.countDocuments();
    const totalBookings = await Booking.countDocuments();

    res.json({
      success: true,
      metrics: {
        totalUsers,
        totalProviders,
        activeBookings,
        totalBookings
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get pending certificates for verification
export const getPendingCertificates = catchAsyncError(async (req, res, next) => {
  const certificates = await Certificate.find({ verified: false })
    .populate('provider', 'firstName lastName email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: certificates.length,
    certificates
  });
});

// Verify certificate
export const verifyCertificate = catchAsyncError(async (req, res, next) => {
  const { certificateId } = req.params;
  const certificate = await Certificate.findById(certificateId).populate('provider');

  if (!certificate) return next(new ErrorHandler("Certificate not found", 404));

  certificate.verified = true;
  certificate.verifiedBy = req.admin._id;
  certificate.verificationDate = new Date();
  await certificate.save();

  // Update provider's verification status if they have at least one verified certificate
  const provider = certificate.provider;
  const verifiedCertificates = await Certificate.countDocuments({ 
    provider: provider._id, 
    verified: true 
  });

  if (verifiedCertificates > 0) {
    provider.verified = true;
    provider.verificationDate = new Date();
    await provider.save();
  }

  await sendNotification(
    certificate.provider._id,
    "Certificate Verified",
    `Your ${certificate.title} certificate has been verified by an administrator.`,
    { type: "certificate-verified" }
  );

  res.status(200).json({
    success: true,
    message: "Certificate verified successfully",
    certificate
  });
});

// Reject certificate
export const rejectCertificate = catchAsyncError(async (req, res, next) => {
  const { certificateId } = req.params;
  const { reason } = req.body;
  const certificate = await Certificate.findById(certificateId).populate('provider');

  if (!certificate) return next(new ErrorHandler("Certificate not found", 404));

  await Certificate.findByIdAndDelete(certificateId);

  await sendNotification(
    certificate.provider._id,
    "Certificate Rejected",
    `Your ${certificate.title} certificate has been rejected. Reason: ${reason || 'Invalid certificate'}`,
    { type: "certificate-rejected" }
  );

  res.status(200).json({
    success: true,
    message: "Certificate rejected successfully"
  });
});

// Get pending work proof for verification
export const getPendingWorkProof = catchAsyncError(async (req, res, next) => {
  const workProofs = await WorkProof.find({ verified: false })
    .populate('provider', 'firstName lastName email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: workProofs.length,
    workProofs
  });
});

// Verify work proof
export const verifyWorkProof = catchAsyncError(async (req, res, next) => {
  const { workProofId } = req.params;
  const workProof = await WorkProof.findById(workProofId).populate('provider');

  if (!workProof) return next(new ErrorHandler("Work proof not found", 404));

  workProof.verified = true;
  workProof.verifiedBy = req.admin._id;
  workProof.verificationDate = new Date();
  await workProof.save();

  await sendNotification(
    workProof.provider._id,
    "Work Proof Verified",
    `Your ${workProof.title} work proof has been verified by an administrator.`,
    { type: "work-proof-verified" }
  );

  res.status(200).json({
    success: true,
    message: "Work proof verified successfully",
    workProof
  });
});

// Reject work proof
export const rejectWorkProof = catchAsyncError(async (req, res, next) => {
  const { workProofId } = req.params;
  const { reason } = req.body;
  const workProof = await WorkProof.findById(workProofId).populate('provider');

  if (!workProof) return next(new ErrorHandler("Work proof not found", 404));

  await WorkProof.findByIdAndDelete(workProofId);

  await sendNotification(
    workProof.provider._id,
    "Work Proof Rejected",
    `Your ${workProof.title} work proof has been rejected. Reason: ${reason || 'Invalid work proof'}`,
    { type: "work-proof-rejected" }
  );

  res.status(200).json({
    success: true,
    message: "Work proof rejected successfully"
  });
});

// Get provider verification status
export const getProviderVerificationStatus = catchAsyncError(async (req, res, next) => {
  const { providerId } = req.params;

  const provider = await User.findById(providerId);
  if (!provider) return next(new ErrorHandler("Provider not found", 404));

  const certificates = await Certificate.find({ provider: providerId });
  const workProofs = await WorkProof.find({ provider: providerId });

  res.status(200).json({
    success: true,
    provider: {
      _id: provider._id,
      firstName: provider.firstName,
      lastName: provider.lastName,
      verified: provider.verified,
      verificationDate: provider.verificationDate
    },
    certificates,
    workProofs
  });
});
