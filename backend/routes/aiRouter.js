import express from 'express';
import { getAIRecommendations } from '../controllers/aiController.js';
import { authorizeRoles } from '../middlewares/authorizeRoles.js';

const router = express.Router();

// AI Recommendations route - Admin only
router.post('/recommendations', authorizeRoles('admin'), getAIRecommendations);

export default router;
