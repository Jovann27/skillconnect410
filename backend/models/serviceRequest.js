import mongoose from "mongoose";

const serviceRequestSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  budgetRange: { 
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 }
  },
  preferredSchedule: { type: String, default: "" },
  serviceCategory: { 
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
    required: true 
  },
  status: { 
    type: String, 
    enum: ["Open", "In Progress", "Completed", "Cancelled"], 
    default: "Open" 
  },
  cancellationReason: { type: String, default: "" },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  serviceProvider: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

serviceRequestSchema.index({ requester: 1, serviceCategory: 1, status: 1 });
serviceRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("ServiceRequest", serviceRequestSchema);
