import User from "../models/userSchema.js";
import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import sendToken from "../utils/jwtToken.js";
import { sendNotification } from "../utils/socketNotify.js";
import { sendEmail } from "../utils/emailService.js";
// import cloudinary from "cloudinary";
import bcrypt from "bcryptjs";
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// const uploadToCloudinary = async (filePath, folder) => {
//   const res = await cloudinary.v2.uploader.upload(filePath, { folder });
//   if (filePath) {
//     fs.unlinkSync(filePath);
//   }
//   return res.secure_url;
// };

export const register = catchAsyncError(async (req, res, next) => {
  const { username, firstName, lastName, email, phone, address, birthdate, employed, password, confirmPassword, role } = req.body;

  if (!role) {
    return next(new ErrorHandler("Role is required", 400));
  }

  if (!["Community Member", "Service Provider"].includes(role)) {
    return next(new ErrorHandler("Invalid role selected", 400));
  }

  // Role-specific field validation
  if (role === "Community Member") {
    if (!username || !firstName || !lastName || !email || !phone || !password || !confirmPassword || !address || !birthdate) {
      return next(new ErrorHandler("Please fill up all required fields", 400));
    }
  } else if (role === "Service Provider") {
    if (!username || !firstName || !lastName || !email || !phone || !address || !birthdate || !employed || !password || !confirmPassword) {
      return next(new ErrorHandler("Please fill up all required fields", 400));
    }
  }

  // Validate employed status only for Service Providers
  if (role === "Service Provider" && !["employed", "unemployed"].includes(employed)) {
    return next(new ErrorHandler("Employment status must be Employed or Unemployed", 400));
  }

  if (password !== confirmPassword) return next(new ErrorHandler("Passwords do not match", 400));
  if (password.length < 8) return next(new ErrorHandler("Password must be at least 8 characters", 400));

  // Validate birthdate 

  const birthDate = new Date(birthdate);
  if (isNaN(birthDate.getTime())) return next(new ErrorHandler("Invalid birthdate format", 400));
  if (birthDate > new Date()) return next(new ErrorHandler("Birthdate cannot be in the future", 400));


  // Validate phone number format
  if (!/^(\+63|0)[0-9]{10}$/.test(phone)) return next(new ErrorHandler("Invalid phone number format. Use +63XXXXXXXXXX or 0XXXXXXXXXX", 400));

  const [isUsername, isPhone, isEmail] = await Promise.all([
    User.findOne({ username }),
    User.findOne({ phone }),
    User.findOne({ email: email.toLowerCase() }),
  ]);

  if (isUsername) return next(new ErrorHandler("Username already exists", 400));
  if (isPhone) return next(new ErrorHandler("Phone already exists", 400));
  if (isEmail) return next(new ErrorHandler("Email already exists", 400));

  const validIdFile = req.files?.validId;
  let uploadedFiles = {};

  // Valid ID is required for all users
  if (!validIdFile) return next(new ErrorHandler("Valid ID is required", 400));
  if (!validIdFile.mimetype.startsWith("image/")) {
    return next(new ErrorHandler("Valid ID must be an image file (JPG, PNG, etc.)", 400));
  }

  // Save validId locally
  const validIdFilename = `validId_${Date.now()}_${Math.random().toString(36).substring(7)}${path.extname(validIdFile.name)}`;
  const validIdPath = path.join(__dirname, '..', 'uploads', validIdFilename);

  // Ensure uploads directory exists
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Move file from temp to uploads directory
  fs.renameSync(validIdFile.tempFilePath, validIdPath);
  uploadedFiles.validId = `/uploads/${validIdFilename}`;

  // Handle profile picture upload if provided
  if (req.files?.profilePic) {
    if (!req.files.profilePic.mimetype.startsWith("image/")) {
      return next(new ErrorHandler("Profile picture must be an image file (JPG, PNG, etc.)", 400));
    }
    const profilePicFilename = `profilePic_${Date.now()}_${Math.random().toString(36).substring(7)}${path.extname(req.files.profilePic.name)}`;
    const profilePicPath = path.join(uploadsDir, profilePicFilename);
    fs.renameSync(req.files.profilePic.tempFilePath, profilePicPath);
    uploadedFiles.profilePic = `/uploads/${profilePicFilename}`;
  }

  // Upload validId for all roles
  const uploadPromises = [];

  // Optimize registration based on role
  if (role === "Service Provider") {
    // Service Providers need additional file processing for certificates
    const certificatePaths = [];
    if (req.files?.certificates) {
      const filesArray = Array.isArray(req.files.certificates) ? req.files.certificates : [req.files.certificates];
      for (const file of filesArray) {
        if (!file.mimetype.startsWith("image/") && !file.mimetype.startsWith("application/pdf")) {
          return next(new ErrorHandler("Certificates must be image files or PDFs", 400));
        }
        const certFilename = `certificate_${Date.now()}_${Math.random().toString(36).substring(7)}${path.extname(file.name)}`;
        const certPath = path.join(uploadsDir, certFilename);
        fs.renameSync(file.tempFilePath, certPath);
        certificatePaths.push(`/uploads/${certFilename}`);
      }
      uploadedFiles.certificates = certificatePaths;
    }

    // Wait for all uploads to complete
    // await Promise.all(uploadPromises);

    // Normalize skills for Service Providers
    let normalizedSkills = [];
    if (req.body.skills) {
      const incoming = Array.isArray(req.body.skills) ? req.body.skills : (typeof req.body.skills === 'string' ? req.body.skills.split(',') : []);
      normalizedSkills = incoming.map(s => s.toString().trim().toLowerCase()).filter(Boolean);
    }

    // Create user with Service Provider data
    const user = await User.create({
      username, firstName, lastName, email, phone, address, birthdate, employed,
      password, role: role,
      validId: uploadedFiles.validId,
      profilePic: uploadedFiles.profilePic || "",
      certificates: uploadedFiles.certificates || [],
      skills: normalizedSkills,
    });

    // Send notification for new Service Provider registration (non-blocking)
    sendNotification(
      user._id,
      "Application Under Review",
      "Your application to become a Service Provider is being reviewed by our administrators. You will receive a notification once your application is approved."
    ).catch(err => console.error("Notification error:", err));

    sendToken(user, 201, res, "User registered successfully");
    return;
  }

  // For Community Members: Fast path - minimal processing
  // Wait for validId upload to complete
  await Promise.all(uploadPromises);

  // Create user with Community Member data including validId
  // Provide defaults for optional fields
  const user = await User.create({
    username, firstName, lastName, email, phone,
    address: address || "",
    birthdate: birthdate ? new Date(birthdate) : new Date('2000-01-01'),
    employed: employed || "unemployed",
    password, role: role,
    profilePic: uploadedFiles.profilePic || "",
    validId: uploadedFiles.validId,
    certificates: [],
    skills: [],
  });

  // Upload profile picture asynchronously after user creation (non-blocking)
  // if (req.files?.profilePic) {
  //   uploadToCloudinary(req.files.profilePic.tempFilePath, "skillconnect/profiles")
  //     .then(profilePicUrl => {
  //       user.profilePic = profilePicUrl;
  //       user.save().catch(err => console.error("Error updating profile picture:", err));
  //     })
  //     .catch(err => console.error("Error uploading profile picture:", err));
  // }

  // Send response immediately without waiting for profile picture upload
  sendToken(user, 201, res, "User registered successfully");
});

export const login = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return next(new ErrorHandler("Please fill up all fields", 400));

  // Check if input is email or username
  const isEmail = email.includes('@');
  const query = isEmail
    ? { email: email.toLowerCase() }
    : { username: email };

  const user = await User.findOne(query).select("+password");
  if (!user) return next(new ErrorHandler("Invalid email/username or password!", 400));

  const isPasswordMatched = await user.comparePassword(password);
  if (!isPasswordMatched) return next(new ErrorHandler("Invalid email/username or password!", 400));

  if (user.banned) return next(new ErrorHandler("Account is banned", 403));

  // Allow login for both verified and unverified users
  // Frontend AccountStatusGuard will handle showing VerificationPending screen for unverified users
  sendToken(user, 200, res, `${user.role} logged in successfully`);
});

export const logout = catchAsyncError(async (req, res, next) => {
  res
    .status(200)
    .cookie("token", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
    })
    .json({
      success: true,
      message: "User logged out successfully",
    });
});

export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch profile: " + err.message });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select("-password -email -phone -address -birthdate");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch profile: " + err.message });
  }
};

export const updateProfile = catchAsyncError(async (req, res) => {
  const userId = req.user._id;
  const updates = req.body || {};

  console.log('updateProfile called with userId:', userId);
  console.log('req.body:', req.body);
  console.log('req.files:', req.files);

  delete updates.password;
  delete updates._id;
  delete updates.createdAt;
  delete updates.updatedAt;

  // Validate employed status
  if (updates.employed && !["employed", "unemployed"].includes(updates.employed)) {
    throw new ErrorHandler("Employment status must be Employed or Unemployed", 400);
  }

  // Validate email uniqueness if email is being updated
  if (updates.email) {
    const existingUser = await User.findOne({ email: updates.email.toLowerCase() });
    if (existingUser && existingUser._id.toString() !== userId.toString()) {
      throw new ErrorHandler("Email already exists", 400);
    }
  }

  // Validate phone uniqueness if phone is being updated
  if (updates.phone) {
    const existingUser = await User.findOne({ phone: updates.phone });
    if (existingUser && existingUser._id.toString() !== userId.toString()) {
      throw new ErrorHandler("Phone already exists", 400);
    }
  }

  // Ensure uploads directory exists
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Handle profile picture upload if provided
  if (req.files?.profilePic) {
    console.log('Processing profile picture:', req.files.profilePic);
    if (!req.files.profilePic.mimetype.startsWith("image/")) {
      throw new ErrorHandler("Profile picture must be an image file (JPG, PNG, etc.)", 400);
    }
    const profilePicFilename = `profilePic_${Date.now()}_${Math.random().toString(36).substring(7)}${path.extname(req.files.profilePic.name)}`;
    const profilePicPath = path.join(uploadsDir, profilePicFilename);
    try {
      fs.renameSync(req.files.profilePic.tempFilePath, profilePicPath);
      updates.profilePic = `/uploads/${profilePicFilename}`;
      console.log('Profile picture saved:', profilePicPath);
    } catch (error) {
      console.error("Error saving profile picture:", error);
      throw new ErrorHandler("Failed to save profile picture", 500);
    }
  }

  // Handle valid ID upload if provided
  if (req.files?.validId) {
    // Validate that validId is an image
    if (!req.files.validId.mimetype.startsWith("image/")) {
      throw new ErrorHandler("Valid ID must be an image file (JPG, PNG, etc.)", 400);
    }
    const validIdFilename = `validId_${Date.now()}_${Math.random().toString(36).substring(7)}${path.extname(req.files.validId.name)}`;
    const validIdPath = path.join(uploadsDir, validIdFilename);
    fs.renameSync(req.files.validId.tempFilePath, validIdPath);
    updates.validId = `/uploads/${validIdFilename}`;
  }

  // Handle certificate uploads if provided
  if (req.files?.certificates) {
    const filesArray = Array.isArray(req.files.certificates) ? req.files.certificates : [req.files.certificates];
    const certificatePaths = [];
    for (const file of filesArray) {
      if (!file || !file.mimetype) continue; // Skip if file is invalid
      if (!file.mimetype.startsWith("image/") && !file.mimetype.startsWith("application/pdf")) {
        throw new ErrorHandler("Certificates must be image files or PDFs", 400);
      }
      const certFilename = `certificate_${Date.now()}_${Math.random().toString(36).substring(7)}${path.extname(file.name)}`;
      const certPath = path.join(uploadsDir, certFilename);
      try {
        fs.renameSync(file.tempFilePath, certPath);
        certificatePaths.push(`/uploads/${certFilename}`);
      } catch (error) {
        console.error("Error moving certificate file:", error);
        throw new ErrorHandler("Failed to save certificate file", 500);
      }
    }
    if (certificatePaths.length > 0) {
      updates.certificates = certificatePaths;
    }
  }

  // Normalize skills if provided
  if (updates.skills) {
    const incoming = Array.isArray(updates.skills) ? updates.skills : (typeof updates.skills === 'string' ? updates.skills.split(',') : []);
    updates.skills = incoming.map(s => s.toString().trim().toLowerCase()).filter(Boolean);
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { ...updates, updatedAt: new Date() },
    { new: true, runValidators: true }
  ).select("-password");

  if (!updatedUser) {
    throw new ErrorHandler("User not found", 404);
  }

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    user: updatedUser
  });
});



export const getPasswordLength = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401)); 

  const user = await User.findById(req.user._id).select("passwordLength");
  if (!user) return next(new ErrorHandler("User not found", 404));
  res.status(200).json({
    success: true,
    length: user.passwordLength || 0,
  });
});


export const updateUserPassword = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { newPassword } = req.body;
  if (!newPassword) return next(new ErrorHandler("New password required", 400));

  const hash = await bcrypt.hash(newPassword, 10);

  await User.findByIdAndUpdate(
    req.user._id,
    { password: hash, passwordLength: newPassword.length },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
});


const otpStore = new Map();

// Generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendVerificationOTP = catchAsyncError(async (req, res, next) => {
  const { email, purpose } = req.body;

  if (!email) {
    return next(new ErrorHandler("Email is required", 400));
  }

  const trimmedEmail = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return next(new ErrorHandler("Invalid email format", 400));
  }

  // Check if user exists with this email
  const user = await User.findOne({ email: trimmedEmail.toLowerCase() });
  if (!user) {
    return next(new ErrorHandler("No account found with this email address", 404));
  }

  // Generate OTP
  const otp = generateOTP();
  const expiresAt = Date.now() + (10 * 60 * 1000);

  // Store OTP with email and purpose
  const key = `${trimmedEmail}_${purpose}`;
  otpStore.set(key, { otp, expiresAt, userId: user._id });

  // Clean up expired OTPs
  for (const [storedKey, data] of otpStore.entries()) {
    if (data.expiresAt < Date.now()) {
      otpStore.delete(storedKey);
    }
  }

  try {
    // Create transporter
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

    // Email content
    const mailOptions = {
      from: `"SkillConnect" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: "Password Reset Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #ce4da3ff; text-align: center;">Password Reset Verification</h2>
          <p>Hello,</p>
          <p>You have requested to reset your password for your SkillConnect account.</p>
          <p>Your verification code is:</p>
          <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #ce4da3ff; margin: 0; font-size: 32px;">${otp}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <p>Best regards,<br>SkillConnect Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: "Verification code sent to your email",
    });

  } catch (error) {
    console.error("Email sending error:", error);
    otpStore.delete(key);
    return next(new ErrorHandler("Failed to send verification email. Please try again.", 500));
  }
});

export const verifyOTP = catchAsyncError(async (req, res, next) => {
  const { email, otp, purpose } = req.body;

  if (!email || !otp || !purpose) {
    return next(new ErrorHandler("Email, OTP, and purpose are required", 400));
  }

  const trimmedEmail = email.trim();
  const key = `${trimmedEmail}_${purpose}`;
  const storedData = otpStore.get(key);

  if (!storedData) {
    return next(new ErrorHandler("Verification code not found or expired", 400));
  }

  if (storedData.expiresAt < Date.now()) {
    otpStore.delete(key);
    return next(new ErrorHandler("Verification code has expired", 400));
  }

  if (storedData.otp !== otp) {
    return next(new ErrorHandler("Invalid verification code", 400));
  }

  // Generate a temporary token for password reset
  const resetToken = "dummy";

  // Clean up the used OTP
  otpStore.delete(key);

  res.status(200).json({
    success: true,
    message: "Email verified successfully",
    token: resetToken,
    userId: storedData.userId,
  });
});

export const resetPassword = catchAsyncError(async (req, res, next) => {
  const { email, token, newPassword } = req.body;

  if (!email || !token || !newPassword) {
    return next(new ErrorHandler("Email, token, and new password are required", 400));
  }

  if (newPassword.length < 8) {
    return next(new ErrorHandler("Password must be at least 8 characters", 400));
  }

  // Find user by email
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update user password
  await User.findByIdAndUpdate(user._id, {
    password: hashedPassword,
    passwordLength: newPassword.length,
    updatedAt: new Date()
  });

  res.status(200).json({
    success: true,
    alert: "Password reset successfully",
  });
});

// Get user notification preferences
export const getNotificationPreferences = catchAsyncError(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId).select("notificationPreferences email");
  if (!user) {
    throw new ErrorHandler("User not found", 404);
  }

  res.status(200).json({
    success: true,
    preferences: {
      ...user.notificationPreferences,
      email: user.email
    }
  });
});

// Update user notification preferences
export const updateNotificationPreferences = catchAsyncError(async (req, res) => {
  const userId = req.user._id;
  const { eReceipts, proofOfDelivery, emailNotifications, smsNotifications, pushNotifications } = req.body;

  // Validate input
  const updates = {};
  if (typeof eReceipts === 'boolean') updates['notificationPreferences.eReceipts'] = eReceipts;
  if (typeof proofOfDelivery === 'boolean') updates['notificationPreferences.proofOfDelivery'] = proofOfDelivery;
  if (typeof emailNotifications === 'boolean') updates['notificationPreferences.emailNotifications'] = emailNotifications;
  if (typeof smsNotifications === 'boolean') updates['notificationPreferences.smsNotifications'] = smsNotifications;
  if (typeof pushNotifications === 'boolean') updates['notificationPreferences.pushNotifications'] = pushNotifications;

  const user = await User.findByIdAndUpdate(
    userId,
    updates,
    { new: true, runValidators: true }
  ).select("notificationPreferences email");

  if (!user) {
    throw new ErrorHandler("User not found", 404);
  }

  res.status(200).json({
    success: true,
    message: "Notification preferences updated successfully",
    preferences: {
      ...user.notificationPreferences,
      email: user.email
    }
  });
});

// Get user's blocked users list
export const getBlockedUsers = catchAsyncError(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId).populate('blockedUsers', 'firstName lastName profilePic skills');
  if (!user) {
    throw new ErrorHandler("User not found", 404);
  }

  res.status(200).json({
    success: true,
    blockedUsers: user.blockedUsers
  });
});

// Block a user
export const blockUser = catchAsyncError(async (req, res, next) => {
  const userId = req.user._id;
  const { targetUserId } = req.body;

  if (!targetUserId) {
    return next(new ErrorHandler("Target user ID is required", 400));
  }

  if (userId.toString() === targetUserId.toString()) {
    return next(new ErrorHandler("Cannot block yourself", 400));
  }

  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  // Check if target user exists
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    return next(new ErrorHandler("Target user not found", 404));
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
    message: "User blocked successfully"
  });
});

// Unblock a user
export const unblockUser = catchAsyncError(async (req, res, next) => {
  const userId = req.user._id;
  const { targetUserId } = req.params;

  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  // Check if user is actually blocked
  const blockedIndex = user.blockedUsers.indexOf(targetUserId);
  if (blockedIndex === -1) {
    return next(new ErrorHandler("User is not blocked", 400));
  }

  // Remove from blocked users
  user.blockedUsers.splice(blockedIndex, 1);
  await user.save();

  res.status(200).json({
    success: true,
    message: "User unblocked successfully"
  });
});

// Get user's favourite workers
export const getFavourites = catchAsyncError(async (req, res, next) => {
  const userId = req.user._id;

  const user = await User.findById(userId).populate('favourites', 'firstName lastName profilePic service skills');
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  res.status(200).json({
    success: true,
    favourites: user.favourites
  });
});

// Add worker to favourites
export const addToFavourites = catchAsyncError(async (req, res, next) => {
  const userId = req.user._id;
  const { workerId } = req.body;

  if (!workerId) {
    return next(new ErrorHandler("Worker ID is required", 400));
  }

  if (userId.toString() === workerId.toString()) {
    return next(new ErrorHandler("Cannot add yourself to favourites", 400));
  }

  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  // Check if target worker exists and is a service provider
  const worker = await User.findById(workerId);
  if (!worker) {
    return next(new ErrorHandler("Worker not found", 404));
  }

  if (worker.role !== "Service Provider") {
    return next(new ErrorHandler("Only service providers can be added to favourites", 400));
  }

  // Check if already in favourites
  if (user.favourites.includes(workerId)) {
    return next(new ErrorHandler("Worker is already in favourites", 400));
  }

  // Add to favourites
  user.favourites.push(workerId);
  await user.save();

  res.status(200).json({
    success: true,
    message: "Worker added to favourites successfully"
  });
});

// Remove worker from favourites
export const removeFromFavourites = catchAsyncError(async (req, res, next) => {
  const userId = req.user._id;
  const { workerId } = req.params;

  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  // Check if worker is in favourites
  const favouriteIndex = user.favourites.indexOf(workerId);
  if (favouriteIndex === -1) {
    return next(new ErrorHandler("Worker is not in favourites", 400));
  }

  // Remove from favourites
  user.favourites.splice(favouriteIndex, 1);
  await user.save();

  res.status(200).json({
    success: true,
    message: "Worker removed from favourites successfully"
  });
});
