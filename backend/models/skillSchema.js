import mongoose from "mongoose";

const skillSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true,
    unique: false // Can have same skill name for different services
  },
  
  // Reference to the service type this skill belongs to
  serviceType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Service",
    required: true
  },

  // Description of the skill
  description: { 
    type: String, 
    default: "" 
  },

  // Related skills (other skills connected to the same service type)
  relatedSkills: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Skill" 
  }],

  // Skill level requirements
  minExperienceYears: {
    type: Number,
    default: 0
  },

  // Additional metadata
  isActive: {
    type: Boolean,
    default: true
  },

  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Admin", 
    required: true 
  },

  createdAt: { 
    type: Date, 
    default: Date.now 
  },
}, {
  timestamps: true,
});

// Index for faster queries
skillSchema.index({ serviceType: 1, name: 1 });
skillSchema.index({ serviceType: 1 });
skillSchema.index({ name: 1 });

// Compound unique index: name must be unique within a service type
skillSchema.index({ serviceType: 1, name: 1 }, { unique: true });

export default mongoose.model("Skill", skillSchema);
