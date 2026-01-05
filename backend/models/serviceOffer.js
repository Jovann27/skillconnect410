import mongoose from "mongoose";

const serviceOfferSchema = new mongoose.Schema({
  requester: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  provider: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  serviceRequest: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "ServiceRequest" 
  },
  title: { 
    type: String, 
    required: true, 
    trim: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  location: { 
    type: String, 
    required: true 
  },
  budget: { 
    type: Number, 
    required: true 
  },
  preferredDate: { 
    type: Date 
  },
  status: { 
    type: String, 
    enum: ["Pending", "Accepted", "Declined", "Expired"], 
    default: "Pending" 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  expiresAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) 
  }
}, {
  timestamps: true
});

serviceOfferSchema.index({ requester: 1, provider: 1, status: 1 });
serviceOfferSchema.index({ provider: 1, status: 1 });

export default mongoose.model("ServiceOffer", serviceOfferSchema);
