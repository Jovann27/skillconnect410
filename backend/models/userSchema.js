import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minLength: 3, maxLength: 20 },
  firstName: { type: String, required: true, trim: true, minLength: 2, maxLength: 30 },
  lastName: { type: String, required: true, trim: true, minLength: 2, maxLength: 30 },
  email: { type: String, required: true, unique: true, lowercase: true, validate: [validator.isEmail, "Invalid email"] },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  birthdate: { type: Date, required: true },
  employed: { type: String, enum: ["employed", "unemployed"], required: true },

  role: { type: String, required: true, enum: ["Community Member", "Service Provider", "Admin"], default: "Community Member" },

  // Service Provider specific fields
  // Legacy skills field maintained for backwards compatibility
  skills: {
    type: [String],
    validate: {
      validator: function(skills) {
        if (this.role === "Community Member") {
          return true;
        } else {
          return skills.length >= 1 && skills.length <= 3;
        }
      },
      message: 'Service providers must select between 1 and 3 skills'
    },
    default: []
  },
  
  // New structured skills field with service type connections
  skillsWithService: [{
    skill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Skill",
      required: true
    },
    yearsOfExperience: {
      type: Number,
      default: 0
    },
    proficiency: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced", "Expert"],
      default: "Intermediate"
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  serviceTypes: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }],
    validate: {
      validator: function(serviceTypes) {
        if (this.role === "Community Member") {
          return true;
        } else {
          return serviceTypes.length >= 1;
        }
      },
      message: 'Service providers must select at least one service type'
    },
    default: []
  },
  occupation: { type: String, default: "" },
  yearsExperience: { type: Number, default: 0 },
  totalJobsCompleted: { type: Number, default: 0 },
  certificates: [String],
  workProof: [{ type: mongoose.Schema.Types.ObjectId, ref: "WorkProof" }],
  profilePic: { type: String, default: "" },
  validId: { type: String, required: true },
  
  // Credential-based verification
  verified: { type: Boolean, default: false },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  verificationDate: { type: Date },
  
  // Service Provider availability and services
  availability: { type: String, enum: ["Available", "Currently Working", "Not Available"], default: "Not Available" },
  serviceRate: { type: Number, default: 0 },
  serviceDescription: { type: String, default: "" },
  isOnline: { type: Boolean, default: true },
  
  // Ratings and reviews
  averageRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },

  // Community Member specific fields
  bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Booking" }],
  notifications: [{ type: mongoose.Schema.Types.ObjectId, ref: "Notification" }],
  favourites: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  password: { type: String, required: true, minLength: 8, select: false },
  passwordLength: { type: Number, default: 0 },

  banned: { type: Boolean, default: false },
  suspended: { type: Boolean, default: false },

  // Enhanced notification preferences
  notificationPreferences: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true },
    bookingRequests: { type: Boolean, default: true },
    bookingUpdates: { type: Boolean, default: true },
    paymentNotifications: { type: Boolean, default: true },
    systemUpdates: { type: Boolean, default: false }
  },

  // Device tokens for push notifications
  deviceTokens: [{
    token: { type: String, required: true },
    platform: { type: String, enum: ['ios', 'android'], default: 'android' },
    deviceId: { type: String },
    addedAt: { type: Date, default: Date.now }
  }],

  createdAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

userSchema.index({ skills: 1 });
userSchema.index({ "skillsWithService.skill": 1 });

// Text index for full-text search on service providers
userSchema.index({
  firstName: 'text',
  lastName: 'text',
  username: 'text',
  skills: 'text',
  occupation: 'text',
  serviceDescription: 'text',
  address: 'text'
}, {
  weights: {
    firstName: 10,
    lastName: 10,
    username: 8,
    skills: 9,
    occupation: 6,
    serviceDescription: 5,
    address: 3
  },
  name: 'user_text_index'
});

userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  this.passwordLength = this.password.length;
  next();
});

userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.getJWTToken = function() {
  return jwt.sign({ id: this._id, role: this.role, type: "user" }, 
    process.env.JWT_SECRET_KEY, { expiresIn: process.env.JWT_EXPIRE });
};

export default mongoose.model("User", userSchema);
