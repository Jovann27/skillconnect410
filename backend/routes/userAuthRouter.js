import express from "express";
import { register, login } from "../controllers/userController.js";
import { catchAsyncError } from "../middlewares/catchAsyncError.js";

const router = express.Router();

// User authentication routes - handle both paths
// Main paths for frontend compatibility
router.post("/register", catchAsyncError(register));
router.post("/login", catchAsyncError(login));

// Auth sub-paths (alternative)
router.post("/auth/register", catchAsyncError(register));
router.post("/auth/login", catchAsyncError(login));

export default router;
