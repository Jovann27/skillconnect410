import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import User from "../models/userSchema.js";
import Certificate from "../models/certificate.js";
import WorkProof from "../models/workProof.js";
import { sendNotification } from "../utils/socketNotify.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadCertificate = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  if (req.user.role !== "Service Provider") {
    return next(new ErrorHandler("Only service providers can upload certificates", 403));
  }

  const { title, description } = req.body;
  const certificateFile = req.files?.certificate;

  if (!title || !certificateFile) {
    return next(new ErrorHandler("Title and certificate file are required", 400));
  }

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, '../../uploads/certificates');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Generate unique filename
  const fileExtension = path.extname(certificateFile.name);
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExtension}`;
  const filePath = path.join(uploadsDir, fileName);

  // Move file to uploads directory
  fs.copyFileSync(certificateFile.tempFilePath, filePath);

  // Create relative URL for the file
  const certificateUrl = `/uploads/certificates/${fileName}`;

  const certificate = await Certificate.create({
    provider: req.user._id,
    title,
    description: description || "",
    certificateUrl
  });

  res.status(201).json({ success: true, certificate });
});

export const uploadWorkProof = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  if (req.user.role !== "Service Provider") {
    return next(new ErrorHandler("Only service providers can upload work proof", 403));
  }

  const { title, description, serviceType } = req.body;
  const imageFile = req.files?.image;

  if (!title || !serviceType || !imageFile) {
    return next(new ErrorHandler("Title, service type, and image are required", 400));
  }

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, '../../uploads/work-proof');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Generate unique filename
  const fileExtension = path.extname(imageFile.name);
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExtension}`;
  const filePath = path.join(uploadsDir, fileName);

  // Move file to uploads directory
  fs.copyFileSync(imageFile.tempFilePath, filePath);

  // Create relative URL for the file
  const imageUrl = `/uploads/work-proof/${fileName}`;

  const workProof = await WorkProof.create({
    provider: req.user._id,
    title,
    description: description || "",
    imageUrl,
    serviceType
  });

  res.status(201).json({ success: true, workProof });
});

export const getProviderCertificates = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { providerId } = req.params;

  const certificates = await Certificate.find({ 
    provider: providerId, 
    verified: true 
  }).sort({ createdAt: -1 });

  res.json({ success: true, certificates });
});

export const getProviderWorkProof = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { providerId } = req.params;

  const workProofs = await WorkProof.find({ 
    provider: providerId, 
    verified: true 
  }).sort({ createdAt: -1 });

  res.json({ success: true, workProof: workProofs });
});

export const getMyCertificates = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  if (req.user.role !== "Service Provider") {
    return next(new ErrorHandler("Only service providers can view certificates", 403));
  }

  const certificates = await Certificate.find({ provider: req.user._id })
    .sort({ createdAt: -1 });

  res.json({ success: true, certificates });
});

export const getMyWorkProof = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  if (req.user.role !== "Service Provider") {
    return next(new ErrorHandler("Only service providers can view work proof", 403));
  }

  const workProofs = await WorkProof.find({ provider: req.user._id })
    .sort({ createdAt: -1 });

  res.json({ success: true, workProof: workProofs });
});

export const deleteCertificate = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  if (req.user.role !== "Service Provider") {
    return next(new ErrorHandler("Only service providers can delete certificates", 403));
  }

  const { certificateId } = req.params;

  const certificate = await Certificate.findById(certificateId);
  if (!certificate) return next(new ErrorHandler("Certificate not found", 404));
  if (String(certificate.provider) !== String(req.user._id)) {
    return next(new ErrorHandler("Not authorized to delete this certificate", 403));
  }

  await Certificate.findByIdAndDelete(certificateId);

  res.json({ success: true, message: "Certificate deleted successfully" });
});

export const deleteWorkProof = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  if (req.user.role !== "Service Provider") {
    return next(new ErrorHandler("Only service providers can delete work proof", 403));
  }

  const { workProofId } = req.params;

  const workProof = await WorkProof.findById(workProofId);
  if (!workProof) return next(new ErrorHandler("Work proof not found", 404));
  if (String(workProof.provider) !== String(req.user._id)) {
    return next(new ErrorHandler("Not authorized to delete this work proof", 403));
  }

  await WorkProof.findByIdAndDelete(workProofId);

  res.json({ success: true, message: "Work proof deleted successfully" });
});
