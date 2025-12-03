import express from "express";
import {
  createVerificationAppointment,
  getAllVerificationAppointments,
  getProviderAppointments,
  updateVerificationAppointment,
  deleteVerificationAppointment,
} from "../controllers/verificationController.js";

import { isAdminAuthenticated } from "../middlewares/auth.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";

const router = express.Router();

// Admin-only routes
router.post("/", isAdminAuthenticated, authorizeRoles("Admin"), createVerificationAppointment);
router.get("/", isAdminAuthenticated, authorizeRoles("Admin"), getAllVerificationAppointments);
router.get("/provider/:id", isAdminAuthenticated, authorizeRoles("Admin"), getProviderAppointments);
router.put("/:id", isAdminAuthenticated, authorizeRoles("Admin"), updateVerificationAppointment);
router.delete("/:id", isAdminAuthenticated, authorizeRoles("Admin"), deleteVerificationAppointment);

export default router;
