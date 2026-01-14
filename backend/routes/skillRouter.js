import express from "express";
import {
  createSkill,
  getSkillsByServiceType,
  connectRelatedSkills,
  addSkillToUser,
  removeSkillFromUser,
  getAllSkills,
  getUserSkillsWithConnections,
  deleteSkill,
  updateSkill
} from "../controllers/skillController.js";
import { isAdminAuthenticated } from "../middlewares/auth.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";

const router = express.Router();

// Admin only routes - Skill Management
router.post(
  "/create",
  isAdminAuthenticated,
  authorizeRoles("Admin"),
  createSkill
);

router.get(
  "/all",
  getAllSkills
);

router.get(
  "/service/:serviceTypeId",
  getSkillsByServiceType
);

router.put(
  "/connect-related/:serviceTypeId",
  isAdminAuthenticated,
  authorizeRoles("Admin"),
  connectRelatedSkills
);

router.put(
  "/:skillId",
  isAdminAuthenticated,
  authorizeRoles("Admin"),
  updateSkill
);

router.delete(
  "/:skillId",
  isAdminAuthenticated,
  authorizeRoles("Admin"),
  deleteSkill
);

// User skill management routes
router.post(
  "/user/:userId/add",
  addSkillToUser
);

router.delete(
  "/user/:userId/remove/:skillId",
  removeSkillFromUser
);

router.get(
  "/user/:userId/with-connections",
  getUserSkillsWithConnections
);

export default router;
