import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: [
      'booking_request', 'booking_accepted', 'booking_completed', 'booking_cancelled',
      'payment_received', 'payment_released', 'account_verified', 'account_banned',
      'service_expired', 'new_message', 'rating_received', 'system_update',
      'payment_reminder', 'service_reminder'
    ],
    default: 'system_update'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  read: { type: Boolean, default: false },
  readAt: { type: Date },
  emailSent: { type: Boolean, default: false },
  pushSent: { type: Boolean, default: false },
  meta: { type: Object, default: {} },
  expiresAt: { type: Date }, // For time-sensitive notifications
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Notification", notificationSchema);
