import Resident from '../models/residentSchema.js';
import { catchAsyncError } from '../middlewares/catchAsyncError.js';
import ErrorHandler from '../middlewares/error.js';

// Get all residents
export const getAllResidents = catchAsyncError(async (req, res) => {
  const residents = await Resident.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    residents
  });
});

// Get single resident
export const getResident = catchAsyncError(async (req, res, next) => {
  const resident = await Resident.findById(req.params.id);

  if (!resident) {
    return next(new ErrorHandler('Resident not found', 404));
  }

  res.status(200).json({
    success: true,
    resident
  });
});

// Create new resident
export const createResident = catchAsyncError(async (req, res) => {
  const { name, address, phoneNumber, email } = req.body;

  const resident = await Resident.create({
    name,
    address,
    phoneNumber,
    email
  });

  res.status(201).json({
    success: true,
    resident
  });
});

// Update resident
export const updateResident = catchAsyncError(async (req, res, next) => {
  const resident = await Resident.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  if (!resident) {
    return next(new ErrorHandler('Resident not found', 404));
  }

  res.status(200).json({
    success: true,
    resident
  });
});

// Delete resident
export const deleteResident = catchAsyncError(async (req, res, next) => {
  const resident = await Resident.findById(req.params.id);

  if (!resident) {
    return next(new ErrorHandler('Resident not found', 404));
  }

  await resident.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Resident deleted successfully'
  });
});

// Import residents from Excel
export const importResidents = catchAsyncError(async (req, res, next) => {
  const { residents } = req.body;

  if (!residents || !Array.isArray(residents) || residents.length === 0) {
    return next(new ErrorHandler('No resident data provided', 400));
  }

  // Validate each resident
  const validResidents = residents.filter(resident =>
    resident.name && resident.address && resident.phoneNumber
  );

  if (validResidents.length === 0) {
    return next(new ErrorHandler('No valid resident data found', 400));
  }

  // Create residents in bulk
  const createdResidents = await Resident.insertMany(validResidents);

  res.status(201).json({
    success: true,
    message: `${createdResidents.length} residents imported successfully`,
    residents: createdResidents
  });
});
