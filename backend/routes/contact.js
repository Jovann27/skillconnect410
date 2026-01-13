import express from "express";
import { sendContactMessage } from "../controllers/contactController.js";
import { validateSchema, handleValidationErrors } from "../middlewares/validation.js";
import { contactMessageSchema } from "../validators/schemas.js";

const router = express.Router();
router.post("/send", validateSchema(contactMessageSchema), handleValidationErrors, sendContactMessage);

export default router;
