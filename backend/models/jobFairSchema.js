import mongoose from "mongoose";

const jobFairSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  location: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expireAt: { type: String, expires: 0 },
});

jobFairSchema.pre('save', function (next) {
  this.expiresAt = this.date;
  next();
});

export default mongoose.model("JobFair", jobFairSchema);
