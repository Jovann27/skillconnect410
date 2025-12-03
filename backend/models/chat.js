import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'seen'],
    default: 'sent'
  },
  seenBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    seenAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export default mongoose.model("Chat", chatSchema);
