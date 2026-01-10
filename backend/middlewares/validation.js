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

// Security logging middleware
export const securityLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const method = req.method;
  const url = req.originalUrl;
  const userId = req.user ? req.user._id : 'unauthenticated';
  const adminId = req.admin ? req.admin._id : null;

  // Log security events
  if (req.method !== 'GET' && req.method !== 'OPTIONS') {
    console.log(`[${timestamp}] SECURITY: ${method} ${url} - IP: ${ip} - User: ${userId}${adminId ? ` - Admin: ${adminId}` : ''} - UA: ${userAgent.substring(0, 100)}`);
  }

  // Log potential security threats
  if (req.body && typeof req.body === 'object') {
    const bodyString = JSON.stringify(req.body);
    if (bodyString.length > 10000) {
      console.warn(`[${timestamp}] LARGE_PAYLOAD: ${method} ${url} - Size: ${bodyString.length} - IP: ${ip}`);
    }

    // Check for suspicious patterns
    const suspiciousPatterns = ['<script', 'javascript:', 'onload=', 'onerror=', 'eval(', 'document.cookie'];
    for (const pattern of suspiciousPatterns) {
      if (bodyString.toLowerCase().includes(pattern)) {
        console.warn(`[${timestamp}] SUSPICIOUS_PATTERN: ${pattern} in ${method} ${url} - IP: ${ip} - User: ${userId}`);
        break;
      }
    }
  }

  next();
};

// CSRF protection middleware (basic implementation for sensitive operations)
export const csrfProtection = (req, res, next) => {
  // Skip CSRF check for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // For state-changing operations, verify origin/referer
  const origin = req.get('origin');
  const referer = req.get('referer');
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim());

  // Check if request comes from allowed origin
  let isAllowed = false;
  if (origin) {
    isAllowed = allowedOrigins.some(allowedOrigin => origin.startsWith(allowedOrigin));
  } else if (referer) {
    isAllowed = allowedOrigins.some(allowedOrigin => referer.startsWith(allowedOrigin));
  }

  if (!isAllowed && process.env.NODE_ENV === 'production') {
    console.warn(`[${new Date().toISOString()}] CSRF_ATTEMPT: ${req.method} ${req.originalUrl} - Origin: ${origin} - Referer: ${referer} - IP: ${req.ip}`);
    return res.status(403).json({
      success: false,
      message: 'CSRF protection: Invalid origin'
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

// Enhanced sanitization middleware
export const sanitizeInput = (req, res, next) => {
  // Recursively sanitize strings in the request body
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove potentially dangerous HTML/script content
        obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        obj[key] = obj[key].replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
        obj[key] = obj[key].replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
        obj[key] = obj[key].replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
        obj[key] = obj[key].replace(/<[^>]*>/g, ''); // Remove HTML tags

        // Remove null bytes and other dangerous characters
        obj[key] = obj[key].replace(/\0/g, '');
        obj[key] = obj[key].replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters

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

// File upload validation middleware
export const validateFileUpload = (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return next(); // No files to validate
  }

  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const maxSize = 5 * 1024 * 1024; // 5MB

  for (const [fieldName, file] of Object.entries(req.files)) {
    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `Invalid file type for ${fieldName}. Allowed types: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX`
      });
    }

    // Check file size
    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: `File ${fieldName} is too large. Maximum size: 5MB`
      });
    }

    // Check for malicious file extensions in filename
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.jar', '.js', '.php', '.asp', '.jsp'];
    const fileName = file.name.toLowerCase();
    if (dangerousExtensions.some(ext => fileName.includes(ext))) {
      return res.status(400).json({
        success: false,
        message: `Dangerous file extension detected in ${fieldName}`
      });
    }
  }

  next();
};
