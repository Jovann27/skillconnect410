import express from 'express';
import {
  getAllResidents,
  getResident,
  createResident,
  updateResident,
  deleteResident,
  importResidents
} from '../controllers/residentController.js';
import { isAdminAuthenticated } from '../middlewares/auth.js';
import { authorizeRoles } from '../middlewares/authorizeRoles.js';

const router = express.Router();

// All routes require admin authentication
router.use(isAdminAuthenticated);
router.use(authorizeRoles('Admin'));

// Routes
router.route('/').get(getAllResidents).post(createResident);
router.route('/:id').get(getResident).put(updateResident).delete(deleteResident);
router.route('/import').post(importResidents);

export default router;
