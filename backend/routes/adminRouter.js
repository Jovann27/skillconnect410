import express from "express";
import { getServiceProviders } from "../controllers/userFlowController.js";
import {
  getAllUsers,
  getUserWithSkills,
  adminAddSkillToUser,
  adminRemoveSkillFromUser,
  adminUpdateUserSkill,
  adminUpdateUserSkills,
  adminUpdateUserServices,
  verifyUser,
  banUser
} from "../controllers/adminController.js";
import { getSettings, updateSettings } from "../controllers/settingsController.js";
import { isAdminAuthenticated } from "../middlewares/auth.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";
import { validateSchema, handleValidationErrors } from "../middlewares/validation.js";
import { jobFairSchema, settingsSchema } from "../validators/schemas.js";

const router = express.Router();

// TODO: Implement jobfair route
// router.post("/jobfairs", isAdminAuthenticated, validateSchema(jobFairSchema), handleValidationErrors, createJobFair);

// User Management
router.get("/users", isAdminAuthenticated, authorizeRoles("Admin"), getAllUsers);
router.get("/users/:userId", isAdminAuthenticated, authorizeRoles("Admin"), getUserWithSkills);
router.put("/user/verify/:id", isAdminAuthenticated, authorizeRoles("Admin"), verifyUser);
router.delete("/user/:id", isAdminAuthenticated, authorizeRoles("Admin"), banUser);

// User Skills Management
router.post("/user/:userId/skills", isAdminAuthenticated, authorizeRoles("Admin"), adminAddSkillToUser);
router.put("/user/skills/:userId", isAdminAuthenticated, authorizeRoles("Admin"), adminUpdateUserSkills);
router.put("/user/:userId/skills/:skillId", isAdminAuthenticated, authorizeRoles("Admin"), adminUpdateUserSkill);
router.delete("/user/:userId/skills/:skillId", isAdminAuthenticated, authorizeRoles("Admin"), adminRemoveSkillFromUser);

// User Services Management
router.put("/user/service-profile/:userId", isAdminAuthenticated, authorizeRoles("Admin"), adminUpdateUserServices);

router.get("/service-providers", isAdminAuthenticated, getServiceProviders);

// TODO: Implement the following routes
// router.get("/service-provider-applicants", isAdminAuthenticated, authorizeRoles("Admin"), getServiceProviderApplicants);
// router.put("/approve-service-provider/:id", isAdminAuthenticated, authorizeRoles("Admin"), approveServiceProvider);
// router.put("/reject-service-provider/:id", isAdminAuthenticated, authorizeRoles("Admin"), rejectServiceProvider);

// Settings Management
router.get("/settings", isAdminAuthenticated, authorizeRoles("Admin"), getSettings);
router.put("/settings", isAdminAuthenticated, authorizeRoles("Admin"), validateSchema(settingsSchema), handleValidationErrors, updateSettings);

export default router;
