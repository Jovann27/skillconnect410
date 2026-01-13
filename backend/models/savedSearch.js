import mongoose from 'mongoose';

const savedSearchSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  description: {
    type: String,
    trim: true,
    maxLength: 500
  },
  searchType: {
    type: String,
    enum: ['providers', 'requests'],
    required: true
  },
  searchParams: {
    // For provider searches
    q: String,
    skills: [String],
    serviceTypes: [mongoose.Schema.Types.ObjectId],
    location: String,
    availability: String,
    minRating: Number,
    maxRate: Number,
    verified: Boolean,
    sortBy: {
      type: String,
      default: 'averageRating'
    },
    sortOrder: {
      type: String,
      enum: ['asc', 'desc'],
      default: 'desc'
    },

    // For request searches
    status: String,
    typeOfWork: String,
    minBudget: Number,
    maxBudget: Number
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notificationEnabled: {
    type: Boolean,
    default: false
  },
  lastExecuted: {
    type: Date,
    default: null
  },
  resultCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
savedSearchSchema.index({ user: 1, name: 1 });
savedSearchSchema.index({ user: 1, searchType: 1 });
savedSearchSchema.index({ user: 1, isActive: 1 });

// Update the updatedAt field before saving
savedSearchSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('SavedSearch', savedSearchSchema);
