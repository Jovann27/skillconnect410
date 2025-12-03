import express from "express";
import { adminLogin, adminRegister, adminLogout, getAdminMe } from "../controllers/adminAuthController.js";
import { isAdminAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

router.post("/login", adminLogin);
router.post("/register", adminRegister);
router.get("/logout", adminLogout);
router.get("/me", isAdminAuthenticated, getAdminMe);


export default router;
