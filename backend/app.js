import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";

// import "./config/cloudinaryConfig.js";

import userFlowRouter from "./routes/userFlowRouter.js";
import userAuthRouter from "./routes/userAuthRouter.js";
import adminAuthRouter from "./routes/adminAuthRouter.js";
import adminFlowRouter from "./routes/adminFlowRouter.js";
import adminRouter from "./routes/adminRouter.js";
import contactRoutes from "./routes/contact.js";
import reportRoutes from "./routes/reportsRouter.js";
import settingsRouter from "./routes/settingsRouter.js";
import verificationRouter from "./routes/verificationRouter.js";
import helpRouter from "./routes/helpRouter.js";
import reviewRouter from "./routes/reviewRouter.js";
import residentRouter from "./routes/residentRouter.js";

import mvpRoutes from "./routes/mvpRoutes.js";

import { errorMiddleware } from "./middlewares/error.js";
import { validateFileUpload, securityLogger, csrfProtection } from "./middlewares/validation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set("trust proxy", 1);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const allowedOrigins = (process.env.ALLOWED_ORIGINS || FRONTEND_URL).split(",").map(s => s.trim());

app.use(cors({
  origin: allowedOrigins, // Allow configured origins
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' })); // Limit request body size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security logging
app.use(securityLogger);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.example.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(hpp()); // Prevent HTTP Parameter Pollution
app.use(mongoSanitize()); // Sanitize MongoDB queries

// Rate limiting configurations
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later."
  }
});

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts, please try again after 15 minutes."
  },
  skipSuccessfulRequests: true, // Don't count successful requests against the limit
});

// Rate limiting for API endpoints (more restrictive)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "API rate limit exceeded, please try again later."
  }
});

// Rate limiting for file uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Upload rate limit exceeded, please try again later."
  }
});

// Rate limiting for search and listing endpoints
const searchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Search rate limit exceeded, please try again later."
  }
});

// Apply general rate limiting
app.use(generalLimiter);

// Apply stricter limits to API routes
app.use("/api/v1", apiLimiter);

// Apply auth rate limiting to login and registration routes
app.use("/api/v1/user/login", authLimiter);
app.use("/api/v1/user/register", authLimiter);
app.use("/api/v1/admin/auth/login", authLimiter);
app.use("/api/v1/admin/auth/register", authLimiter);

// Apply upload rate limiting to file upload endpoints
app.use("/api/v1/user/profile/upload", uploadLimiter);

// Apply search rate limiting to search endpoints
app.use("/api/v1/user/providers", searchLimiter);
app.use("/api/v1/user/requests", searchLimiter);

app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: path.join(__dirname, "temp"),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  abortOnLimit: true
}));

// File upload validation
app.use(validateFileUpload);

// Mount routers with CSRF protection for sensitive operations
app.use("/api/v1/user", userAuthRouter); // User authentication routes (register, login)
app.use("/api/v1/user", csrfProtection, userFlowRouter); // User flow routes (dashboard, bookings, etc.) - CSRF protected
app.use("/api/v1/user", csrfProtection, mvpRoutes); // MVP service request and offer routes - CSRF protected
app.use("/api/v1/admin/auth", adminAuthRouter);
app.use("/api/v1/admin", csrfProtection, adminFlowRouter);
app.use("/api/v1/admin", csrfProtection, adminRouter);
app.use("/api/v1/admin/residents", csrfProtection, residentRouter);
app.use("/api/v1/contact", contactRoutes);
app.use("/api/v1/settings", csrfProtection, settingsRouter);
app.use("/api/v1/reports", csrfProtection, reportRoutes);
app.use("/api/v1/verification", csrfProtection, verificationRouter);
app.use("/api/v1/help", helpRouter);
app.use("/api/v1/review", csrfProtection, reviewRouter);

// health
app.get("/api/v1/ping", (req, res) => res.json({ success: true, message: "pong" }));

app.use(errorMiddleware);

export default app;
