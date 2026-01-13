import express from "express";
import { register, login } from "../controllers/userController.js";
import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import { validateSchema, handleValidationErrors } from "../middlewares/validation.js";
import { userRegistrationSchema, userLoginSchema } from "../validators/schemas.js";

const router = express.Router();

// User authentication routes - handle both paths
// Main paths for frontend compatibility
router.post("/register", validateSchema(userRegistrationSchema), handleValidationErrors, catchAsyncError(register));
router.post("/login", validateSchema(userLoginSchema), handleValidationErrors, catchAsyncError(login));

// Auth sub-paths (alternative)
router.post("/auth/register", validateSchema(userRegistrationSchema), handleValidationErrors, catchAsyncError(register));
router.post("/auth/login", validateSchema(userLoginSchema), handleValidationErrors, catchAsyncError(login));

export default router;
