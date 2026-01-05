import express from "express";
import { isUserAuthenticated, isUserVerified } from "../middlewares/auth.js";
import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";

import {
  createServiceRequest,
  browseServiceProviders,
  viewProviderProfile,
  sendDirectServiceOffer,
  getProviderOffers,
  respondToServiceOffer,
  markServiceCompleted,
  applyToServiceRequest,
  getProviderApplications,
  respondToApplication
} from '../controllers/userFlowController.js';

const router = express.Router();

// MVP Service Request Flow routes
router.post('/create-service-request', isUserAuthenticated, isUserVerified, createServiceRequest);
router.get('/browse-service-providers', isUserAuthenticated, isUserVerified, browseServiceProviders);
router.get('/provider/:providerId/profile', isUserAuthenticated, isUserVerified, viewProviderProfile);

// MVP Direct Service Offer routes
router.post('/send-direct-offer', isUserAuthenticated, isUserVerified, sendDirectServiceOffer);
router.get('/provider-offers', isUserAuthenticated, isUserVerified, getProviderOffers);
router.post('/offer/:offerId/respond', isUserAuthenticated, isUserVerified, respondToServiceOffer);

// MVP Service Completion routes
router.post('/booking/:bookingId/complete', isUserAuthenticated, isUserVerified, markServiceCompleted);

// MVP Application Flow routes
router.post('/apply-to-request/:requestId', isUserAuthenticated, isUserVerified, applyToServiceRequest);
router.get('/provider-applications', isUserAuthenticated, isUserVerified, getProviderApplications);
router.post('/application/:applicationId/respond', isUserAuthenticated, isUserVerified, respondToApplication);

export default router;
