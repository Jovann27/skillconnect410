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
    ref: 'ServiceRequest',
    required: true
  },
  status: {
    type: String,
    enum: ['Available', 'Working', 'Complete', 'Cancelled'],
    default: 'Available'
  },
  proofImages: [{
    type: String,
    default: []
  }],
  proofComment: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
