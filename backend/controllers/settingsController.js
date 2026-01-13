import User from "../models/userSchema.js";
import JobFair from "../models/jobFairSchema.js";
import ServiceRequest from "../models/serviceRequest.js";
import Booking from "../models/booking.js";
import Settings from "../models/settings.js";
import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import { sendNotification } from "../utils/socketNotify.js";
import { io } from "../server.js";

export const getSkilledUsers = async (req, res) => {
  try {
    const workers = await User.find({ role: "Service Provider" })
      .select("firstName lastName skills availability profilePic createdAt");
    res.json({ success: true, count: workers.length, workers });
  } catch (err) {
    console.error("❌ Error fetching skilled users:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getJobFair = async (req, res) => {
  try {
    const jobfair = await JobFair.findOne().sort({ createdAt: -1 });
    if (!jobfair)
      return res.status(404).json({ success: false, message: "No job fair found" });
    res.json({ success: true, jobfair });
  } catch (err) {
    console.error("❌ Error fetching job fair:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllRequests = async (req, res) => {
  try {
    const { skill, status, sort, includeAssigned } = req.query;
    let filter = {};

    if (skill) {
      const regex = new RegExp(skill, "i");
      const usersWithSkill = await User.find({ skills: { $regex: regex } }).select("_id");
      const userIds = usersWithSkill.map(u => u._id);

      const orClauses = [
        { typeOfWork: regex },
        { notes: regex },
        { requester: { $in: userIds } }
      ];
      filter = { $or: orClauses };
    }

    if (status) {
      filter.status = status.toLowerCase();
    }

    // By default, only return unassigned requests so accepted ones are hidden from other providers
    const unassignedFilter = { $or: [{ serviceProvider: { $exists: false } }, { serviceProvider: null }] };
    if (includeAssigned !== "true") {
      filter = Object.keys(filter).length ? { $and: [unassignedFilter, filter] } : unassignedFilter;
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    let sortObj = { createdAt: -1 };
    if (sort) {
      const [f, order] = sort.split(":");
      sortObj = { [f]: order === "asc" ? 1 : -1 };
    }

    const total = await ServiceRequest.countDocuments(filter);

    const requests = await ServiceRequest.find(filter)
      .select("budget typeOfWork time status notes requester serviceProvider")
      .populate("requester", "firstName lastName email role profilePic phone")
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    // Add fullName field for each request
    const requestsWithFullName = requests.map(req => {
      const fullName = req.requester ? `${req.requester.firstName} ${req.requester.lastName}` : "N/A";
      return {
        ...req.toObject(),
        fullName
      };
    });

    res.json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      count: requests.length,
      requests: requestsWithFullName,
    });
  } catch (err) {
    console.error("❌ Error fetching service requests:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const acceptServiceRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await ServiceRequest.findById(id).populate('requester');

    if (!request)
      return res.status(404).json({ success: false, message: "Service request not found" });

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized. Please log in first." });
    }

    if (request.status !== "Waiting")
      return res.status(400).json({ success: false, message: "Request is not available" });

    // Ensure provider
    const provider = await User.findById(req.user._id);
    if (!provider || provider.role !== "Service Provider")
      return res.status(403).json({ success: false, message: "Not a service provider" });

    // If already assigned to a provider, prevent re-accepting
    if (request.serviceProvider)
      return res.status(400).json({ success: false, message: "Request already accepted" });

    // Create booking
    const booking = await Booking.create({
      requester: request.requester._id,
      provider: req.user._id,
      serviceRequest: request._id,
      status: "Working",
    });

    // Assign current user as the service provider and mark as Working (confirmed)
    request.serviceProvider = req.user._id;
    request.acceptedBy = req.user._id; // backward compatibility
    request.status = "Working";
    request.eta = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

    await request.save();

    // Notify requester
    await sendNotification(
      request.requester._id,
      "Request Accepted",
      `Your "${request.typeOfWork}" request has been accepted by ${provider.firstName} ${provider.lastName}`,
      { requestId: request._id, bookingId: booking._id, type: "service-request-accepted" }
    );

    // Emit socket events for real-time updates
    io.emit("service-request-updated", { requestId: request._id, action: "accepted" });
    io.emit("booking-updated", { bookingId: booking._id, action: "created" });

    res.json({ success: true, message: "Service request accepted", request, booking });
  } catch (err) {
    console.error("❌ Error accepting service request:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};




export const getMyAcceptedRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await ServiceRequest.find({
      $or: [ { serviceProvider: userId }, { acceptedBy: userId } ]
    })
    .populate("requester", "firstName lastName email profilePic phone")
    .populate("serviceProvider", "firstName lastName email profilePic phone")
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      requests,
    });
  } catch (err) {
    console.error("Error fetching accepted requests:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyIncomingRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const requests = await ServiceRequest.find({ serviceProvider: userId, status: "Available" })
      .populate("requester", "firstName lastName email profilePic phone")
      .populate("serviceProvider", "firstName lastName email profilePic phone")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, requests });
  } catch (err) {
    console.error("Error fetching incoming requests:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyCompletedJobs = async (req, res) => {
  try {
    const userId = req.user._id;
    const completedJobs = await ServiceRequest.find({
      serviceProvider: userId,
      status: "Complete"
    })
    .populate("requester", "firstName lastName email profilePic phone")
    .populate("serviceProvider", "firstName lastName email profilePic phone")
    .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      jobs: completedJobs,
      count: completedJobs.length
    });
  } catch (err) {
    console.error("Error fetching completed jobs:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const ignoreServiceRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await ServiceRequest.findById(id);

    if (!request) return res.status(404).json({ success: false, message: "Service request not found" });
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });

    // Only assigned provider can reject
    if (!request.serviceProvider || String(request.serviceProvider) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Only the assigned provider can reject this request" });
    }

    request.status = "Cancelled"; // strict reject; user can rebook or choose another provider
    await request.save();

    res.json({ success: true, message: "Service request rejected", request });
  } catch (err) {
    console.error("❌ Error rejecting service request:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const completeServiceRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await ServiceRequest.findById(id);

    if (!request) return res.status(404).json({ success: false, message: "Service request not found" });
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });

    // Only assigned provider can complete
    if (!request.serviceProvider || String(request.serviceProvider) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Only the assigned provider can complete this request" });
    }

    if (request.status !== "Working") {
      return res.status(400).json({ success: false, message: "Only working requests can be completed" });
    }

    // Handle file uploads
    const proofOfWorkUrls = [];
    // if (req.files && req.files.proofImages) {
    //   const cloudinary = (await import("../config/cloudinaryConfig.js")).default;
    //   const files = Array.isArray(req.files.proofImages) ? req.files.proofImages : [req.files.proofImages];

    //   for (const file of files) {
    //     try {
    //       // Upload to cloudinary
    //       const result = await cloudinary.uploader.upload(file.tempFilePath, {
    //     folder: 'proof-of-work',
    //     resource_type: 'auto'
    //   });
    //   proofOfWorkUrls.push(result.secure_url);
    //     } catch (uploadError) {
    //       console.error("Error uploading proof image:", uploadError);
    //       // Continue with other files, don't fail the whole request
    //     }
    //   }
    // }

    // Update request with completion data
    request.status = "Complete";
    request.proofOfWork = proofOfWorkUrls;
    request.completionNotes = req.body.completionNotes || "";
    await request.save();

    res.json({ success: true, message: "Service request marked as completed", request });
  } catch (err) {
    console.error("❌ Error completing service request:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSettings = catchAsyncError(async (req, res) => {
  const settings = await Settings.findOne();
  if (!settings) {
    // Return default settings if none exist
    const defaultSettings = new Settings();
    await defaultSettings.save();
    return res.json({ success: true, settings: defaultSettings });
  }
  res.json({ success: true, settings });
});

export const updateSettings = catchAsyncError(async (req, res) => {
  const updated = await Settings.findOneAndUpdate({}, req.body, { 
    new: true, 
    upsert: true,
    runValidators: true 
  });
  res.json({ success: true, message: "Settings updated successfully", settings: updated });
});
