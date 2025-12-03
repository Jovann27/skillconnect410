import express from "express";
import { totalsReport, demographicsReport, skillsReport, skilledPerTrade, mostBookedServices, totalsOverTime } from "../controllers/reportsController.js";
import { isAdminAuthenticated } from "../middlewares/auth.js";

const router = express.Router();
router.get("/totals", isAdminAuthenticated, totalsReport);
router.get("/demographics", isAdminAuthenticated, demographicsReport);
router.get("/skills", isAdminAuthenticated, skillsReport);
router.get("/skilled-per-trade", isAdminAuthenticated, skilledPerTrade);
router.get("/most-booked-services", isAdminAuthenticated, mostBookedServices);
router.get('/totals-over-time', isAdminAuthenticated, totalsOverTime);

export default router;
