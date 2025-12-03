import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  rate: { type: Number, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  createdAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

export default mongoose.model("Service", serviceSchema);
