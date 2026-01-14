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
          return skills.length >= 1; // Allow more skills, validation handled per service type
        }
      },
      message: 'Service providers must select at least one skill'
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
  services: [{
    name: { type: String, required: true },
    rate: { type: Number, required: true, min: 0 },
    description: { type: String, default: "" }
  }],
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

/**
 * Auto-sync skills from serviceTypes for Service Providers.
 * Ensures up to 3 active skills per selected serviceType are stored on:
 * - `skillsWithService` (structured)
 * - `skills` (legacy string array used by multiple frontend screens)
 *
 * This only ADDS missing skills; it does not remove any existing skills.
 */
userSchema.pre("save", async function ensureDefaultSkillsForServiceTypes(next) {
  try {
    if (this.role !== "Service Provider") return next();
    if (!Array.isArray(this.serviceTypes) || this.serviceTypes.length === 0) return next();

    // Lazy import to avoid circular deps at load time
    const Skill = (await import("./skillSchema.js")).default;

    if (!Array.isArray(this.skills)) this.skills = [];
    if (!Array.isArray(this.skillsWithService)) this.skillsWithService = [];

    const existingSkillIds = this.skillsWithService
      .map(s => s?.skill)
      .filter(Boolean)
      .map(id => id.toString());

    const existingSkillDocs = existingSkillIds.length
      ? await Skill.find({ _id: { $in: existingSkillIds } }).select("_id name serviceType")
      : [];

    const existingByServiceType = {};
    const existingSkillIdSet = new Set(existingSkillDocs.map(d => d._id.toString()));

    for (const doc of existingSkillDocs) {
      const st = doc.serviceType?.toString();
      if (!st) continue;
      if (!existingByServiceType[st]) existingByServiceType[st] = [];
      existingByServiceType[st].push(doc);

      // keep legacy array in sync
      if (doc.name && !this.skills.includes(doc.name)) {
        this.skills.push(doc.name);
      }
    }

    for (const serviceTypeId of this.serviceTypes) {
      const stId = serviceTypeId?.toString();
      if (!stId) continue;

      const already = existingByServiceType[stId]?.length || 0;
      const needed = Math.max(0, 3 - already);
      if (needed === 0) continue;

      const missingSkills = await Skill.find({
        serviceType: stId,
        isActive: true,
        _id: { $nin: Array.from(existingSkillIdSet) }
      })
        .sort({ createdAt: 1, name: 1 })
        .limit(needed)
        .select("_id name serviceType");

      for (const ms of missingSkills) {
        const msId = ms._id.toString();
        if (existingSkillIdSet.has(msId)) continue;

        this.skillsWithService.push({
          skill: ms._id,
          yearsOfExperience: 0,
          proficiency: "Intermediate",
          addedAt: new Date()
        });

        existingSkillIdSet.add(msId);

        if (ms.name && !this.skills.includes(ms.name)) {
          this.skills.push(ms.name);
        }
      }
    }

    return next();
  } catch (err) {
    return next(err);
  }
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
