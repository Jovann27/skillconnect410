import express from "express";
import { isUserAuthenticated } from "../middlewares/auth.js";
import { totalsReport, demographicsReport, skillsReport } from "../controllers/reportsController.js";
import { getJobFair, getSkilledUsers, acceptServiceRequest,
    getAllRequests, getMyAcceptedRequests, getMyIncomingRequests, getMyCompletedJobs,
    ignoreServiceRequest, completeServiceRequest } from "../controllers/settingsController.js";


const router = express.Router();



router.get("/totals", totalsReport);
router.get("/demographics", demographicsReport);
router.get("/skills", skillsReport);
router.get("/jobfair", getJobFair);
router.get("/skilled-users", getSkilledUsers);  

router.get("/service-requests", getAllRequests);



router.put("/service-requests/:id/accept", isUserAuthenticated, acceptServiceRequest);
router.put("/service-requests/:id/ignore", isUserAuthenticated, ignoreServiceRequest);
router.put("/service-requests/:id/complete", isUserAuthenticated, completeServiceRequest);

router.get("/my-accepted-requests", isUserAuthenticated, getMyAcceptedRequests );
router.get("/my-incoming-requests", isUserAuthenticated, getMyIncomingRequests);
router.get("/my-completed-jobs", isUserAuthenticated, getMyCompletedJobs);

export default router;
