import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import VerificationAppointment from "../models/verificationSchema.js";
import User from "../models/userSchema.js";
import Notification from "../models/notification.js";
import Service from "../models/service.js";
import { io, onlineUsers } from "../server.js";

// simple notify helper
const sendNotification = async (userId, title, message, meta = {}) => {
  try {
    const n = await Notification.create({ user: userId, title, message, meta });
    return n;
  } catch (err) {
    console.error("sendNotification error:", err);
    return null;
  }
};

// Schedule a verification appointment (admin)
export const scheduleVerificationAppointment = catchAsyncError(async (req, res, next) => {
  const { providerId, appointmentDate, location } = req.body;
  if (!providerId || !appointmentDate) return next(new ErrorHandler("Missing required fields", 400));
  // must be admin (assume isAdminAuthenticated middleware sets req.admin)
  if (!req.admin) return next(new ErrorHandler("Admin only", 401));

  const provider = await User.findById(providerId);
  if (!provider) return next(new ErrorHandler("Provider not found", 404));

  const appt = await VerificationAppointment.create({
    provider: provider._id,
    scheduledBy: req.admin._id,
    appointmentDate: new Date(appointmentDate),
    location,
    status: "Pending",
  });

  const notification = await sendNotification(
    provider._id, 
    "Verification Appointment Scheduled", 
    `Your verification appointment is scheduled on ${appt.appointmentDate.toISOString()}`, { 
      apptId: appt._id }
  );
  
  const providerSocketId = onlineUsers.get(provider._id.toString());
  if (providerSocketId) {
    io.to(providerSocketId).emit("appointment-notification", {
      title: "Verification Appointment Scheduled",
      message: `Your verification appointment is scheduled on ${appt.appointmentDate.toLocaleString()}`,
      appointment: appt,
      notification,
    });
    console.log("Sent real-time notification to provider");
  } else {
    console.log("Provider not online, real-time notification not sent");
  }

  res.status(201).json({ success: true, appt });
});

// Admin updates appointment status (confirm/completed/cancel)
export const updateVerificationAppointment = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { status, remarks, markVerified } = req.body;
  if (!req.admin) return next(new ErrorHandler("Admin only", 401));

  const appt = await VerificationAppointment.findById(id);
  if (!appt) return next(new ErrorHandler("Appointment not found", 404));

  if (status) appt.status = status;
  if (remarks) appt.remarks = remarks;

  await appt.save();

  // Optionally mark provider as verified when appointment completed and markVerified flag provided
  if (status === "Complete" && markVerified) {
    const provider = await User.findById(appt.provider);
    if (provider) {
      provider.isApplyingProvider = false;
      await provider.save();
      await sendNotification(provider._id, "Verification Completed", "Your account is now verified as a Service Provider.");
    }
  }

  res.json({ success: true, appt });
});

// Get providers pending verification
export const getPendingProviderApplications = catchAsyncError(async (req, res, next) => {
  if (!req.admin) return next(new ErrorHandler("Admin only", 401));
  const pending = await User.find({
    role: "Service Provider",
    availability: "Not Available" })
    .select("-password");
  res.json({ success: true, count: pending.length, pending });
});


// Get all services
export const getServices = catchAsyncError(async (req, res) => {
  const services = await Service.find().sort({ createdAt: -1 });
  res.json({ success: true, services });
});

// Add service to user (admin only)
export const addUserService = async (req, res) => {
  if (!req.admin) return res.status(401).json({ success: false, message: "Admin only" });
  const { userId, service } = req.body;
  if (!userId || !service) return res.status(400).json({ success: false, message: "Missing required fields" });

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (!user.services.includes(service)) {
      user.services.push(service);
      await user.save();
    }

    res.json({ success: true, services: user.services });
  } catch (error) {
    console.error("addUserService error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Edit user service (admin only)
export const editUserService = catchAsyncError(async (req, res, next) => {
  if (!req.admin) return next(new ErrorHandler("Admin only", 401));
  const { userId, oldService, newService } = req.body;
  if (!userId || !oldService || !newService) return next(new ErrorHandler("Missing required fields", 400));

  const user = await User.findById(userId);
  if (!user) return next(new ErrorHandler("User not found", 404));

  const index = user.services.indexOf(oldService);
  if (index > -1) {
    user.services[index] = newService;
    await user.save();
  }

  res.json({ success: true, services: user.services });
});

// Delete user service (admin only)
export const deleteUserService = catchAsyncError(async (req, res, next) => {
  if (!req.admin) return next(new ErrorHandler("Admin only", 401));
  const { userId, service } = req.body;
  if (!userId || !service) return next(new ErrorHandler("Missing required fields", 400));

  const user = await User.findById(userId);
  if (!user) return next(new ErrorHandler("User not found", 404));

  user.services = user.services.filter(s => s !== service);
  await user.save();

  res.json({ success: true, services: user.services });
});

// Schedule an interview for a service provider (admin)
export const scheduleInterview = catchAsyncError(async (req, res, next) => {
  const { applicantId, interviewDate, location, notes } = req.body;
  if (!applicantId || !interviewDate || !location) return next(new ErrorHandler("Missing required fields", 400));
  if (!req.admin) return next(new ErrorHandler("Admin only", 401));

  const applicant = await User.findById(applicantId);
  if (!applicant) return next(new ErrorHandler("Provider not found", 404));
  if (applicant.role !== "Service Provider") return next(new ErrorHandler("User is not a Service Provider", 400));

  const interview = await VerificationAppointment.create({
    provider: applicant._id,
    scheduledBy: req.admin._id,
    appointmentDate: new Date(interviewDate),
    location,
    notes: notes || "",
    type: "interview",
    status: "Pending",
  });

  // Format the date for notification
  const formattedDate = new Date(interviewDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Send notification to applicant
  const notification = await sendNotification(
    applicant._id,
    "Interview Scheduled",
    `Your interview has been scheduled for ${formattedDate} at ${location}. Please arrive on time and bring all required documents.`,
    { interviewId: interview._id, type: "interview" }
  );

  // Send real-time notification if user is online
  const applicantSocketId = onlineUsers.get(applicant._id.toString());
  if (applicantSocketId) {
    io.to(applicantSocketId).emit("interview-notification", {
      title: "Interview Scheduled",
      message: `Your interview has been scheduled for ${formattedDate} at ${location}`,
      interview,
      notification,
    });
    console.log("Sent real-time interview notification to applicant");
  } else {
    console.log("Applicant not online, real-time notification not sent");
  }

  // Send email notification
  try {
    const nodemailer = (await import('nodemailer')).default;
    const createTransporter = () => {
      return nodemailer.createTransporter({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    };

    const transporter = createTransporter();
    const mailOptions = {
      from: `"SkillConnect" <${process.env.SMTP_EMAIL}>`,
      to: applicant.email,
      subject: "Interview Scheduled - SkillConnect",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #ce4da3ff; text-align: center;">Interview Scheduled</h2>
          <p>Hello ${applicant.firstName || applicant.username},</p>
          <p>Your interview for the Service Provider position has been scheduled.</p>
          <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px; padding: 20px; text-align: center; margin: 20px 0;">
            <h3 style="color: #ce4da3ff; margin: 0;">Interview Details</h3>
            <p style="margin: 10px 0;"><strong>Date & Time:</strong> ${formattedDate}</p>
            <p style="margin: 10px 0;"><strong>Location:</strong> ${location}</p>
            ${notes ? `<p style="margin: 10px 0;"><strong>Notes:</strong> ${notes}</p>` : ''}
          </div>
          <p><strong>Important:</strong></p>
          <ul>
            <li>Please arrive 15 minutes early</li>
            <li>Bring all required documents and certificates</li>
            <li>Come prepared to discuss your skills and experience</li>
          </ul>
          <p>If you have any questions or need to reschedule, please contact our support team.</p>
          <p>Best regards,<br>SkillConnect Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Interview email sent successfully");
  } catch (emailError) {
    console.error("Failed to send interview email:", emailError);
    // Don't fail the request if email fails
  }

  res.status(201).json({ success: true, interview });
});

// Get user services (admin only)
export const getUserServices = catchAsyncError(async (req, res, next) => {
  if (!req.admin) return next(new ErrorHandler("Admin only", 401));
  const { userId } = req.params;
  if (!userId) return next(new ErrorHandler("User ID required", 400));

  const user = await User.findById(userId).select("services");
  if (!user) return next(new ErrorHandler("User not found", 404));

  res.json({ success: true, services: user.services });
});
