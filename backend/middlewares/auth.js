import jwt from "jsonwebtoken";
import User from "../models/userSchema.js";
import Admin from "../models/adminSchema.js";

const getTokenFromRequest = (req) => {
  // Check for Bearer token in Authorization header first
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    return req.headers.authorization.split(" ")[1];
  }
  // Use the standard token cookie for both users and admins
  return req.cookies?.token;
};

export const isUserAuthenticated = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return res.status(401).json({ success: false, message: "Please login first (user)" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch {
      return res.status(401).json({ success: false, message: "Invalid or expired token (user)" });
    }

    if (!decoded || decoded.type !== "user") return res.status(401).json({ success: false, message: "Not a user token" });

    const user = await User.findById(decoded.id).select("+password");
    if (!user) return res.status(401).json({ success: false, message: "User not found" });

    if (user.banned) return res.status(403).json({ success: false, message: "Account is banned" });

    req.user = user;
    next();
  } catch (error) {
    console.error("User auth error:", error.message);
    return res.status(401).json({ success: false, message: "Authentication failed (user)" });
  }
};

export const isAdminAuthenticated = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      console.log("No token found in admin authentication");
      return res.status(401).json({ success: false, message: "Please login first (admin)" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET_KEY);
      console.log("Decoded admin token:", decoded);
    } catch (err) {
      console.error("Admin token verification failed:", err.message);
      return res.status(401).json({ success: false, message: "Invalid or expired token (admin)" });
    }

    if (!decoded || decoded.type !== "admin") {
      console.log("Invalid admin token structure or type:", decoded);
      return res.status(401).json({ success: false, message: "Not an admin token" });
    }

    if (!decoded.id) {
      console.log("No admin ID found in decoded token:", decoded);
      return res.status(401).json({ success: false, message: "Invalid admin token - no ID" });
    }

    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      console.log("Admin not found in database for ID:", decoded.id);
      return res.status(401).json({ success: false, message: "Admin not found" });
    }

    console.log("Admin authenticated successfully:", admin._id);
    req.admin = admin;
    next();
  } catch (error) {
    console.error("Admin auth error:", error.message, error.stack);
    return res.status(401).json({ success: false, message: "Authentication failed (admin)" });
  }
};

export const isUserVerified = (req, res, next) => {
  if (req.user.verified) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: "Account not verified. Please wait for admin verification.",
      code: "ACCOUNT_NOT_VERIFIED"
    });
  }
};
