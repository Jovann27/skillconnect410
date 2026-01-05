import mongoose from "mongoose";

const workProofSchema = new mongoose.Schema({
  provider: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  title: { 
    type: String, 
    required: true, 
    trim: true 
  },
  description: { 
    type: String, 
    trim: true 
  },
  imageUrl: { 
    type: String, 
    required: true 
  },
  serviceType: { 
    type: String, 
    required: true 
  },
  projectDate: { 
    type: Date, 
    default: Date.now 
  },
  verified: { 
    type: Boolean, 
    default: false 
  },
  verifiedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Admin" 
  },
  verificationDate: { 
    type: Date 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

workProofSchema.index({ provider: 1, verified: 1 });

export default mongoose.model("WorkProof", workProofSchema);
