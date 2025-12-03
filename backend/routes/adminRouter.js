import express from "express";
import {
  createJobFair,
  adminGetAllServiceRequests,
  verifyUser,
  banUser ,
  getAllUsers,
  getServiceProviders,
  getDashboardMetrics,
  approveServiceProvider,
  rejectServiceProvider,
  getServiceProviderApplicants,
  updateUserServiceProfile,
} from "../controllers/adminController.js";
import { getSettings, updateSettings } from "../controllers/settingsController.js";
import { isAdminAuthenticated } from "../middlewares/auth.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";

const router = express.Router();

router.post("/jobfairs", isAdminAuthenticated, createJobFair);
router.get("/service-requests", isAdminAuthenticated, adminGetAllServiceRequests);
router.get("/dashboard-metrics", isAdminAuthenticated, getDashboardMetrics);
router.get("/users", isAdminAuthenticated, authorizeRoles("Admin"), getAllUsers);
router.put("/user/verify/:id", isAdminAuthenticated, authorizeRoles("Admin"), verifyUser);
router.put("/user/service-profile/:id", isAdminAuthenticated, authorizeRoles("Admin"), updateUserServiceProfile);
router.delete("/user/:id", isAdminAuthenticated, authorizeRoles("Admin"), banUser);
router.get("/service-providers", isAdminAuthenticated, getServiceProviders);

// Service Provider Application Management
router.get("/service-provider-applicants", isAdminAuthenticated, authorizeRoles("Admin"), getServiceProviderApplicants);
router.put("/approve-service-provider/:id", isAdminAuthenticated, authorizeRoles("Admin"), approveServiceProvider);
router.put("/reject-service-provider/:id", isAdminAuthenticated, authorizeRoles("Admin"), rejectServiceProvider);

// Settings Management
router.get("/settings", isAdminAuthenticated, authorizeRoles("Admin"), getSettings);
router.put("/settings", isAdminAuthenticated, authorizeRoles("Admin"), updateSettings);

export default router;
