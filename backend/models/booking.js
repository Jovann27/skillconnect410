import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  serviceRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceRequest'
  },
  serviceOffer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceOffer'
  },
  status: {
    type: String,
    // Include "Applied" status for provider applications
    enum: ["Applied", "Accepted", "In Progress", "Completed", "Cancelled", "Declined"],
    default: "Accepted"
  },
  commissionFee: {
    type: Number,
    default: 0
  },
  proofOfWork: [{
    type: String,
    default: []
  }],
  completionNotes: {
    type: String,
    default: ""
  },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

bookingSchema.index({ requester: 1, provider: 1, status: 1 });
bookingSchema.index({ provider: 1, status: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
