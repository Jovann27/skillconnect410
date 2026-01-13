import express from "express";
import {
  totalsReport,
  demographicsReport,
  skillsReport,
  skilledPerTrade,
  mostBookedServices,
  totalsOverTime,
  getDashboardAnalytics,
  exportAnalyticsReport
} from "../controllers/reportsController.js";
import { isAdminAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

// Existing routes
router.get("/totals", isAdminAuthenticated, totalsReport);
router.get("/demographics", isAdminAuthenticated, demographicsReport);
router.get("/skills", isAdminAuthenticated, skillsReport);
router.get("/skilled-per-trade", isAdminAuthenticated, skilledPerTrade);
router.get("/most-booked-services", isAdminAuthenticated, mostBookedServices);
router.get('/totals-over-time', isAdminAuthenticated, totalsOverTime);

// Enhanced analytics dashboard
router.get("/analytics/dashboard", isAdminAuthenticated, getDashboardAnalytics);
router.get("/analytics/export", isAdminAuthenticated, exportAnalyticsReport);

export default router;
