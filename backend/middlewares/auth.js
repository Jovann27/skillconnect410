import jwt from "jsonwebtoken";
import User from "../models/userSchema.js";
import Admin from "../models/adminSchema.js";
import logger from "../utils/logger.js";

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
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';
    const method = req.method;
    const url = req.originalUrl;
    const timestamp = new Date().toISOString();

    if (!token) {
      logger.warn(`[${timestamp}] AUTH_FAILURE: No token provided - ${method} ${url} - IP: ${ip} - UA: ${userAgent.substring(0, 100)}`);
      return res.status(401).json({ success: false, message: "Please login first (user)" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch (err) {
      logger.warn(`[${timestamp}] AUTH_FAILURE: Invalid token - ${method} ${url} - IP: ${ip} - UA: ${userAgent.substring(0, 100)} - Error: ${err.message}`);
      return res.status(401).json({ success: false, message: "Invalid or expired token (user)" });
    }

    if (!decoded || decoded.type !== "user") {
      logger.warn(`[${timestamp}] AUTH_FAILURE: Invalid token type - ${method} ${url} - IP: ${ip} - UA: ${userAgent.substring(0, 100)} - Type: ${decoded?.type || 'null'}`);
      return res.status(401).json({ success: false, message: "Not a user token" });
    }

    const user = await User.findById(decoded.id).select("+password");
    if (!user) {
      logger.warn(`[${timestamp}] AUTH_FAILURE: User not found - ${method} ${url} - IP: ${ip} - UA: ${userAgent.substring(0, 100)} - UserID: ${decoded.id}`);
      return res.status(401).json({ success: false, message: "User not found" });
    }

    if (user.banned) {
      logger.warn(`[${timestamp}] AUTH_FAILURE: Banned user attempt - ${method} ${url} - IP: ${ip} - UA: ${userAgent.substring(0, 100)} - UserID: ${user._id} - Username: ${user.username}`);
      return res.status(403).json({ success: false, message: "Account is banned" });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error(`AUTH_ERROR: ${error.message} - ${req.method} ${req.originalUrl} - IP: ${req.ip} - UA: ${req.get('User-Agent')?.substring(0, 100) || 'Unknown'}`);
    return res.status(401).json({ success: false, message: "Authentication failed (user)" });
  }
};

export const isAdminAuthenticated = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';
    const method = req.method;
    const url = req.originalUrl;
    const timestamp = new Date().toISOString();

    if (!token) {
      logger.warn(`[${timestamp}] ADMIN_AUTH_FAILURE: No token provided - ${method} ${url} - IP: ${ip} - UA: ${userAgent.substring(0, 100)}`);
      return res.status(401).json({ success: false, message: "Please login first (admin)" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET_KEY);
      logger.debug("Decoded admin token:", decoded);
    } catch (err) {
      logger.warn(`[${timestamp}] ADMIN_AUTH_FAILURE: Invalid token - ${method} ${url} - IP: ${ip} - UA: ${userAgent.substring(0, 100)} - Error: ${err.message}`);
      return res.status(401).json({ success: false, message: "Invalid or expired token (admin)" });
    }

    if (!decoded || decoded.type !== "admin") {
      logger.warn(`[${timestamp}] ADMIN_AUTH_FAILURE: Invalid token type - ${method} ${url} - IP: ${ip} - UA: ${userAgent.substring(0, 100)} - Type: ${decoded?.type || 'null'}`);
      return res.status(401).json({ success: false, message: "Not an admin token" });
    }

    if (!decoded.id) {
      logger.warn(`[${timestamp}] ADMIN_AUTH_FAILURE: No admin ID - ${method} ${url} - IP: ${ip} - UA: ${userAgent.substring(0, 100)} - Decoded: ${JSON.stringify(decoded)}`);
      return res.status(401).json({ success: false, message: "Invalid admin token - no ID" });
    }

    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      logger.warn(`[${timestamp}] ADMIN_AUTH_FAILURE: Admin not found - ${method} ${url} - IP: ${ip} - UA: ${userAgent.substring(0, 100)} - AdminID: ${decoded.id}`);
      return res.status(401).json({ success: false, message: "Admin not found" });
    }

    logger.debug(`[${timestamp}] ADMIN_AUTH_SUCCESS: ${method} ${url} - AdminID: ${admin._id} - Username: ${admin.username} - IP: ${ip}`);
    req.admin = admin;
    next();
  } catch (error) {
    logger.error(`ADMIN_AUTH_ERROR: ${error.message} - ${req.method} ${req.originalUrl} - IP: ${req.ip} - UA: ${req.get('User-Agent')?.substring(0, 100) || 'Unknown'}`);
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
