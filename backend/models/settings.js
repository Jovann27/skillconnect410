import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  siteName: { type: String, default: "SkillConnect4B410" },
  siteDescription: { type: String, default: "Connecting skilled workers with community needs" },
  contactEmail: { type: String, default: "" },
  contactPhone: { type: String, default: "" },
  maintenanceMode: { type: Boolean, default: false },
  allowRegistrations: { type: Boolean, default: true },
  maxFileSize: { type: Number, default: 5 * 1024 * 1024 }, // 5MB default
  allowedFileTypes: { type: [String], default: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'] },
  notificationSettings: {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false }
  },
  systemSettings: {
    timezone: { type: String, default: "Asia/Manila" },
    currency: { type: String, default: "PHP" },
    language: { type: String, default: "en" }
  }
}, {
  timestamps: true
});

export default mongoose.model("Settings", settingsSchema);
