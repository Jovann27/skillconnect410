import express from "express";
import { isUserAuthenticated, isUserVerified } from "../middlewares/auth.js";
import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import User from "../models/userSchema.js";

import {
  uploadCertificate,
  uploadWorkProof,
  getProviderCertificates,
  getProviderWorkProof,
  getMyCertificates,
  getMyWorkProof,
  deleteCertificate,
  deleteWorkProof
} from '../controllers/certificateController.js';

const router = express.Router();

// Certificate routes
router.post('/upload-certificate', isUserAuthenticated, isUserVerified, uploadCertificate);
router.get('/provider/:providerId/certificates', isUserAuthenticated, isUserVerified, getProviderCertificates);
router.get('/my-certificates', isUserAuthenticated, isUserVerified, getMyCertificates);
router.delete('/certificate/:certificateId', isUserAuthenticated, isUserVerified, deleteCertificate);

// Work Proof routes
router.post('/upload-work-proof', isUserAuthenticated, isUserVerified, uploadWorkProof);
router.get('/provider/:providerId/work-proof', isUserAuthenticated, isUserVerified, getProviderWorkProof);
router.get('/my-work-proof', isUserAuthenticated, isUserVerified, getMyWorkProof);
router.delete('/work-proof/:workProofId', isUserAuthenticated, isUserVerified, deleteWorkProof);

export default router;
