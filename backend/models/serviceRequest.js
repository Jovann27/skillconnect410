import mongoose from "mongoose";

const serviceRequestSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, trim: true },
  address: { type: String },
  phone: { type: String },
  typeOfWork: { type: String, required: true },
  preferredDate: { type: Date },
  time: { type: String, required: true, match: /^([01]?[0-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i },
  minBudget: { type: Number, default: 0 },
  maxBudget: { type: Number, default: 0 },
  notes: { type: String, default: "" },
  targetProvider: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: {
    type: String,
    enum: ["Open", "Offered", "Accepted", "In Progress", "Completed", "Cancelled"],
    default: "Open"
  },
  cancellationReason: { type: String, default: "" },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  serviceProvider: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  eta: { type: Date },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

serviceRequestSchema.index({ requester: 1, typeOfWork: 1, status: 1 });
serviceRequestSchema.index({ status: 1, createdAt: -1 });

// Text index for full-text search
serviceRequestSchema.index({
  name: 'text',
  typeOfWork: 'text',
  notes: 'text',
  address: 'text'
}, {
  weights: {
    name: 10,
    typeOfWork: 8,
    notes: 3,
    address: 2
  },
  name: 'serviceRequest_text_index'
});

export default mongoose.model("ServiceRequest", serviceRequestSchema);
