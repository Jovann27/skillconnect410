import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import Admin from "../models/adminSchema.js";
import { sendAdminToken } from "../utils/jwtToken.js";
// import { v2 as cloudinary } from "cloudinary";

// const uploadToCloudinary = async (filePath, folder = "skillconnect/admins") => {
//   const res = await cloudinary.uploader.upload(filePath, { folder });
//   // Clean up temp file after upload
//   if (filePath) {
//     fs.unlinkSync(filePath);
//   }
//   return res.secure_url;
// };

export const adminLogin = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;
  const trimmedEmail = email?.trim();
  const trimmedPassword = password?.trim();
  if (!trimmedEmail || !trimmedPassword) return next(new ErrorHandler("Please fill all fields", 400));

  const admin = await Admin.findOne({ email: { $regex: new RegExp('^' + trimmedEmail.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } }).select("+password");
  if (!admin) return next(new ErrorHandler("Invalid email or password", 400));

  const isMatched = await admin.comparePassword(trimmedPassword);
  if (!isMatched) return next(new ErrorHandler("Invalid email or password", 400));

  sendAdminToken(admin, 200, res, "Admin logged in successfully");
});

export const adminRegister = catchAsyncError(async (req, res, next) => {
  const { name, email, password } = req.body;
  const trimmedName = name?.trim();
  const trimmedEmail = email?.trim();
  const trimmedPassword = password?.trim();

  if (!trimmedName || !trimmedEmail || !trimmedPassword) {
    return next(new ErrorHandler("Please fill all fields", 400));
  }

  // Strong password validation
  if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/.test(trimmedPassword)) {
    return next(new ErrorHandler("Password must include uppercase, lowercase, and numbers", 400));
  }

  // Allow admin registration without authentication

  const existingAdmin = await Admin.findOne({ email: { $regex: new RegExp('^' + trimmedEmail.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } });
  if (existingAdmin) return next(new ErrorHandler("Admin already exists", 400));

  let profilePicUrl = "";
  // if (req.files?.profilePic) {
  //   profilePicUrl = await uploadToCloudinary(req.files.profilePic.tempFilePath, "skillconnect/admins");
  // }

  const admin = await Admin.create({
    name: trimmedName,
    email: trimmedEmail,
    password: trimmedPassword,
    profilePic: profilePicUrl || ""
  });
  sendAdminToken(admin, 201, res, "Admin registered successfully");
});

export const adminLogout = catchAsyncError(async (req, res) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.status(200).json({ success: true, message: "Admin logged out successfully" });
});

export const getAdminMe = catchAsyncError(async (req, res) => {
  const admin = req.admin;
  // Return consistent format with user endpoints for frontend compatibility
  res.status(200).json({
    success: true,
    user: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role || "Admin",
      type: "admin",
      profilePic: admin.profilePic || ""
    }
  });
});
