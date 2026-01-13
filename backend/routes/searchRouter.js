import express from 'express';
import {
  searchServiceRequests,
  searchServiceProviders,
  getSearchSuggestions,
  getPopularSearchTerms,
  saveSearch,
  getSavedSearches,
  updateSavedSearch,
  deleteSavedSearch,
  executeSavedSearch
} from '../controllers/searchController.js';
import { isUserAuthenticated } from '../middlewares/auth.js';
import { validateSchema, handleValidationErrors } from '../middlewares/validation.js';
import { savedSearchSchema } from '../validators/schemas.js';

const router = express.Router();

// Public search routes
router.get('/service-requests', searchServiceRequests);
router.get('/service-providers', searchServiceProviders);
router.get('/suggestions', getSearchSuggestions);
router.get('/popular-terms', getPopularSearchTerms);

// Protected saved search routes
router.post('/saved', isUserAuthenticated, validateSchema(savedSearchSchema), handleValidationErrors, saveSearch);
router.get('/saved', isUserAuthenticated, getSavedSearches);
router.put('/saved/:id', isUserAuthenticated, updateSavedSearch);
router.delete('/saved/:id', isUserAuthenticated, deleteSavedSearch);
router.get('/saved/:id/execute', isUserAuthenticated, executeSavedSearch);

export default router;
