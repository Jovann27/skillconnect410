import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";

// import "./config/cloudinaryConfig.js";

import userRouter from "./routes/userRouter.js";
import userFlowRouter from "./routes/userFlowRouter.js";
import adminAuthRouter from "./routes/adminAuthRouter.js";
import adminFlowRouter from "./routes/adminFlowRouter.js";
import adminRouter from "./routes/adminRouter.js";
import aiRouter from "./routes/aiRouter.js";
import contactRoutes from "./routes/contact.js";
import reportRoutes from "./routes/reportsRouter.js";
import settingsRouter from "./routes/settingsRouter.js";
import verificationRouter from "./routes/verificationRouter.js";
import helpRouter from "./routes/helpRouter.js";
import reviewRouter from "./routes/reviewRouter.js";
import residentRouter from "./routes/residentRouter.js";

import { errorMiddleware } from "./middlewares/error.js";

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later."
  }
});
app.use(generalLimiter);

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

// Apply auth rate limiting to login and registration routes
app.use("/api/v1/user/login", authLimiter);
app.use("/api/v1/user/register", authLimiter);
app.use("/api/v1/admin/auth/login", authLimiter);
app.use("/api/v1/admin/auth/register", authLimiter);

app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: path.join(__dirname, "temp"),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  abortOnLimit: true
}));

app.use("/api/v1/user", userRouter);
app.use("/api/v1/user", userFlowRouter);
app.use("/api/v1/admin/auth", adminAuthRouter);
app.use("/api/v1/admin", adminFlowRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/admin", aiRouter);
app.use("/api/v1/admin/residents", residentRouter);
app.use("/api/v1/contact", contactRoutes);
app.use("/api/v1/settings", settingsRouter);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/verification", verificationRouter);
app.use("/api/v1/help", helpRouter);
app.use("/api/v1/review", reviewRouter);

// health
app.get("/api/v1/ping", (req, res) => res.json({ success: true, message: "pong" }));

app.use(errorMiddleware);

export default app;
