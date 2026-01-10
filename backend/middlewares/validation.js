import { body, param, query, validationResult } from 'express-validator';

// Handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }
  next();
};

// Validation rules for service requests
export const validateServiceRequest = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Service name must be between 3 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_.]+$/)
    .withMessage('Service name contains invalid characters'),

  body('address')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters'),

  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Invalid phone number format'),

  body('typeOfWork')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Type of work must be between 2 and 50 characters'),

  body('time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format'),

  body('budget')
    .optional()
    .isFloat({ min: 0, max: 100000 })
    .withMessage('Budget must be a valid number between 0 and 100,000'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),

  body('targetProvider')
    .optional()
    .isMongoId()
    .withMessage('Invalid provider ID')
];

// Validation for chat messages
export const validateChatMessage = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),

  body('appointmentId')
    .optional()
    .isMongoId()
    .withMessage('Invalid appointment ID'),

  body('receiverId')
    .optional()
    .isMongoId()
    .withMessage('Invalid receiver ID')
];

// Validation for service offers
export const validateServiceOffer = [
  body('providerId')
    .isMongoId()
    .withMessage('Invalid provider ID'),

  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),

  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),

  body('location')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Location must be between 3 and 200 characters'),

  body('minBudget')
    .isFloat({ min: 0, max: 100000 })
    .withMessage('Minimum budget must be between 0 and 100,000'),

  body('maxBudget')
    .isFloat({ min: 0, max: 100000 })
    .withMessage('Maximum budget must be between 0 and 100,000')
    .custom((value, { req }) => {
      if (value < req.body.minBudget) {
        throw new Error('Maximum budget cannot be less than minimum budget');
      }
      return true;
    })
];

// Validation for booking status updates
export const validateBookingStatus = [
  body('status')
    .isIn(['Active', 'Completed', 'Cancelled'])
    .withMessage('Invalid booking status')
];

// Validation for review submission
export const validateReview = [
  body('bookingId')
    .isMongoId()
    .withMessage('Invalid booking ID'),

  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('comments')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Comments cannot exceed 500 characters')
];

// Validation for profile updates
export const validateProfileUpdate = [
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),

  body('skills.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each skill must be between 1 and 50 characters'),

  body('serviceDescription')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Service description cannot exceed 500 characters'),

  body('serviceRate')
    .optional()
    .isFloat({ min: 0, max: 100000 })
    .withMessage('Service rate must be between 0 and 100,000')
];

// Validation for application submission
export const validateApplication = [
  param('requestId')
    .isMongoId()
    .withMessage('Invalid request ID'),

  body('commissionFee')
    .isFloat({ min: 0 })
    .withMessage('Commission fee must be a positive number')
];

// Validation for application response
export const validateApplicationResponse = [
  param('bookingId')
    .isMongoId()
    .withMessage('Invalid booking ID'),

  body('action')
    .isIn(['accept', 'decline'])
    .withMessage('Action must be accept or decline')
];

// Validation for offer response
export const validateOfferResponse = [
  param('offerId')
    .isMongoId()
    .withMessage('Invalid offer ID'),

  body('action')
    .isIn(['accept', 'decline'])
    .withMessage('Action must be accept or decline')
];

// General MongoDB ID validation
export const validateMongoId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format')
];

// Sanitization middleware
export const sanitizeInput = (req, res, next) => {
  // Recursively sanitize strings in the request body
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove potentially dangerous HTML/script content
        obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        obj[key] = obj[key].replace(/<[^>]*>/g, ''); // Remove HTML tags
        obj[key] = obj[key].trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};
