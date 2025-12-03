import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reviewee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comments: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

reviewSchema.index({ reviewee: 1, rating: -1 });

export default mongoose.model("Review", reviewSchema);
