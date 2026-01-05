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

  role: { type: String, required: true, enum: ["Community Member", "Service Provider", "Admin"], default: "Community Member" },

  // Service Provider specific fields
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
  occupation: { type: String, default: "" },
  yearsExperience: { type: Number, default: 0 },
  totalJobsCompleted: { type: Number, default: 0 },
  certificates: [{ type: mongoose.Schema.Types.ObjectId, ref: "Certificate" }],
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

  // Notification preferences
  notificationPreferences: {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true }
  },

  createdAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

userSchema.index({ skills: 1 });

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
