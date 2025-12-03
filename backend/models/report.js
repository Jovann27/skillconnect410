import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ["pending", "investigating", "resolved", "dismissed"],
    default: "pending"
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking"
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Prevent duplicate reports from same user to same reported user
reportSchema.index({ reporter: 1, reportedUser: 1 }, { unique: false });

export default mongoose.model("Report", reportSchema);
