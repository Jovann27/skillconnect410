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
import { isAuthenticatedUser } from '../middlewares/auth.js';

const router = express.Router();

// Public search routes
router.get('/service-requests', searchServiceRequests);
router.get('/service-providers', searchServiceProviders);
router.get('/suggestions', getSearchSuggestions);
router.get('/popular-terms', getPopularSearchTerms);

// Protected saved search routes
router.post('/saved', isAuthenticatedUser, saveSearch);
router.get('/saved', isAuthenticatedUser, getSavedSearches);
router.put('/saved/:id', isAuthenticatedUser, updateSavedSearch);
router.delete('/saved/:id', isAuthenticatedUser, deleteSavedSearch);
router.get('/saved/:id/execute', isAuthenticatedUser, executeSavedSearch);

export default router;
