import express from "express";
import { adminLogin, adminRegister, adminLogout, getAdminMe } from "../controllers/adminAuthController.js";
import { isAdminAuthenticated } from "../middlewares/auth.js";
import { validateSchema, handleValidationErrors } from "../middlewares/validation.js";
import { adminLoginSchema } from "../validators/schemas.js";

const router = express.Router();

router.post("/login", validateSchema(adminLoginSchema), handleValidationErrors, adminLogin);
router.post("/register", validateSchema(adminLoginSchema), handleValidationErrors, adminRegister);
router.get("/logout", adminLogout);
router.get("/me", isAdminAuthenticated, getAdminMe);


export default router;
