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
  otherContact: { type: String, default: "" },
  address: { type: String, required: true },
  birthdate: { type: Date, required: true },
  occupation: { type: String, default: "" },

  employed: { type: String, required: true },

  role: { type: String, required: true, enum: ["Community Member", "Service Provider"], default: "Community Member" },

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
      message: 'You must select between 1 and 3 skills'
    },
    default: []
  },
  certificates: { type: [String], default: [] },
  profilePic: { type: String, default: "" },
  validId: { type: String, required: true },
  verified: { type: Boolean, default: false },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },

  availability: { type: String, enum: ["Available", "Currently Working", "Not Available"], default: "Not Available" },
  acceptedWork: { type: Boolean, default: false },

  service: {
    type: String,
    enum: [
      "Plumbing",
      "Electrical",
      "Cleaning",
      "Carpentry",
      "Painting",
      "Appliance Repair",
      "Home Renovation",
      "Pest Control",
      "Gardening & Landscaping",
      "Air Conditioning & Ventilation",
      "Laundry / Labandera"
    ],
    required: false
  },
  serviceRate: { type: Number, default: 0 },
  serviceDescription: { type: String, default: "" },
  isOnline: { type: Boolean, default: true },
  services: [{
    name: { type: String, required: true, trim: true },
    rate: { type: Number, default: 0, min: 0 },
    description: { type: String, default: "", trim: true }
  }],

  bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Booking" }],
  notifications: [{ type: mongoose.Schema.Types.ObjectId, ref: "Notification" }],

  password: { type: String, required: true, minLength: 8, select: false },
  passwordLength: { type: Number, default: 0 },

  banned: { type: Boolean, default: false },
  suspended: { type: Boolean, default: false },

  // Notification preferences
  notificationPreferences: {
    eReceipts: { type: Boolean, default: false },
    proofOfDelivery: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    pushNotifications: { type: Boolean, default: true }
  },

  // Blocked users (for user-level blocking)
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  // Favourite workers
  favourites: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

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
