export const serviceRequestSchema = {
  name: {
    type: 'string',
    required: true,
    minLength: 3,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-_.]+$/
  },
  address: {
    type: 'string',
    required: false,
    minLength: 5,
    maxLength: 200
  },
  phone: {
    type: 'string',
    required: false,
    pattern: /^[\+]?[1-9][\d]{0,15}$/
  },
  typeOfWork: {
    type: 'string',
    required: true,
    minLength: 2,
    maxLength: 50
  },
  time: {
    type: 'string',
    required: false,
    pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  budget: {
    type: 'number',
    required: false,
    min: 0,
    max: 100000
  },
  notes: {
    type: 'string',
    required: false,
    maxLength: 500
  },
  targetProvider: {
    type: 'string',
    required: false,
    pattern: /^[0-9a-fA-F]{24}$/ // MongoDB ObjectId
  }
};

export const userRegistrationSchema = {
  username: {
    type: 'string',
    required: true,
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_-]+$/
  },
  firstName: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 50,
    pattern: /^[a-zA-Z\s\-_.]+$/
  },
  lastName: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 50,
    pattern: /^[a-zA-Z\s\-_.]+$/
  },
  email: {
    type: 'string',
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  phone: {
    type: 'string',
    required: true,
    pattern: /^(\+63|0)[0-9]{10}$/
  },
  address: {
    type: 'string',
    required: true,
    minLength: 5,
    maxLength: 200
  },
  birthdate: {
    type: 'string',
    required: true,
    // Will be validated as date in controller
  },
  password: {
    type: 'string',
    required: true,
    minLength: 8,
    maxLength: 128
  },
  confirmPassword: {
    type: 'string',
    required: true,
    minLength: 8,
    maxLength: 128
  },
  role: {
    type: 'string',
    required: true,
    enum: ['Community Member', 'Service Provider']
  },
  employed: {
    type: 'string',
    enum: ['employed', 'unemployed']
  },
  occupation: {
    type: 'string',
    maxLength: 100
  },
  // File fields will be handled by multer/express-fileupload, not schema validation
  // validId, profilePic, certificates, workProofs, skills, serviceTypes
};

export const userLoginSchema = {
  email: {
    type: 'string',
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    type: 'string',
    required: true,
    minLength: 1
  }
};

export const serviceOfferSchema = {
  providerId: {
    type: 'string',
    required: true,
    pattern: /^[0-9a-fA-F]{24}$/
  },
  title: {
    type: 'string',
    required: true,
    minLength: 3,
    maxLength: 100
  },
  description: {
    type: 'string',
    required: true,
    minLength: 10,
    maxLength: 1000
  },
  location: {
    type: 'string',
    required: true,
    minLength: 3,
    maxLength: 200
  },
  minBudget: {
    type: 'number',
    required: true,
    min: 0,
    max: 100000
  },
  maxBudget: {
    type: 'number',
    required: true,
    min: 0,
    max: 100000,
    custom: (value, req) => value >= req.body.minBudget
  }
};

export const reviewSchema = {
  bookingId: {
    type: 'string',
    required: true,
    pattern: /^[0-9a-fA-F]{24}$/
  },
  rating: {
    type: 'number',
    required: true,
    min: 1,
    max: 5
  },
  comments: {
    type: 'string',
    maxLength: 500
  }
};

export const chatMessageSchema = {
  message: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 1000
  },
  appointmentId: {
    type: 'string',
    pattern: /^[0-9a-fA-F]{24}$/
  },
  receiverId: {
    type: 'string',
    pattern: /^[0-9a-fA-F]{24}$/
  }
};

export const profileUpdateSchema = {
  skills: {
    type: 'array',
    items: {
      type: 'string',
      minLength: 1,
      maxLength: 50
    }
  },
  serviceDescription: {
    type: 'string',
    maxLength: 500
  },
  serviceRate: {
    type: 'number',
    min: 0,
    max: 100000
  }
};

export const applicationSchema = {
  requestId: {
    type: 'string',
    required: true,
    pattern: /^[0-9a-fA-F]{24}$/
  },
  commissionFee: {
    type: 'number',
    required: true,
    min: 0
  }
};

export const applicationResponseSchema = {
  bookingId: {
    type: 'string',
    required: true,
    pattern: /^[0-9a-fA-F]{24}$/
  },
  action: {
    type: 'string',
    required: true,
    enum: ['accept', 'decline']
  }
};

export const offerResponseSchema = {
  offerId: {
    type: 'string',
    required: true,
    pattern: /^[0-9a-fA-F]{24}$/
  },
  action: {
    type: 'string',
    required: true,
    enum: ['accept', 'decline']
  }
};

export const bookingStatusSchema = {
  status: {
    type: 'string',
    required: true,
    enum: ['Active', 'Completed', 'Cancelled']
  }
};

export const notificationPreferencesSchema = {
  preferences: {
    type: 'object',
    required: true
  }
};

export const deviceTokenSchema = {
  deviceToken: {
    type: 'string',
    required: true
  },
  platform: {
    type: 'string',
    enum: ['android', 'ios']
  },
  deviceId: {
    type: 'string',
    required: true
  }
};

export const savedSearchSchema = {
  name: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 100
  },
  searchCriteria: {
    type: 'object',
    required: true
  }
};

export const contactMessageSchema = {
  name: {
    type: 'string',
    required: true,
    minLength: 2,
    maxLength: 100
  },
  email: {
    type: 'string',
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  message: {
    type: 'string',
    required: true,
    minLength: 10,
    maxLength: 1000
  }
};

export const adminLoginSchema = {
  email: {
    type: 'string',
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    type: 'string',
    required: true,
    minLength: 1
  }
};

export const jobFairSchema = {
  title: {
    type: 'string',
    required: true,
    minLength: 3,
    maxLength: 200
  },
  description: {
    type: 'string',
    required: true,
    minLength: 10,
    maxLength: 2000
  },
  date: {
    type: 'string',
    required: true
  },
  location: {
    type: 'string',
    required: true,
    minLength: 3,
    maxLength: 200
  },
  maxAttendees: {
    type: 'number',
    min: 1,
    max: 1000
  }
};

export const verificationAppointmentSchema = {
  providerId: {
    type: 'string',
    required: true,
    pattern: /^[0-9a-fA-F]{24}$/
  },
  date: {
    type: 'string',
    required: true
  },
  time: {
    type: 'string',
    required: true,
    pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  notes: {
    type: 'string',
    maxLength: 500
  }
};

export const helpTopicSchema = {
  title: {
    type: 'string',
    required: true,
    minLength: 3,
    maxLength: 200
  },
  content: {
    type: 'string',
    required: true,
    minLength: 10,
    maxLength: 5000
  },
  category: {
    type: 'string',
    required: true,
    minLength: 2,
    maxLength: 50
  }
};

export const proofOfWorkSchema = {
  completionNotes: {
    type: 'string',
    maxLength: 500
  }
  // proofOfWork files will be handled by multer/express-fileupload
};

export const settingsSchema = {
  maintenanceMode: {
    type: 'boolean'
  },
  allowRegistrations: {
    type: 'boolean'
  },
  maxFileSize: {
    type: 'number',
    min: 1024,
    max: 10485760 // 10MB
  },
  allowedFileTypes: {
    type: 'array',
    items: {
      type: 'string'
    }
  }
};
