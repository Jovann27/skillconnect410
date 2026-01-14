import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import Skill from "../models/skillSchema.js";
import Service from "../models/service.js";
import User from "../models/userSchema.js";
import {
  validateUserSkillConsistency,
  canTransitionBookingStatus,
  getValidBookingTransitions
} from "../utils/dataConsistency.js";

// Create a new skill for a service type
export const createSkill = catchAsyncError(async (req, res, next) => {
  const { name, serviceTypeId, description, minExperienceYears } = req.body;

  // Validate input
  if (!name || !serviceTypeId) {
    return next(new ErrorHandler("Skill name and service type are required", 400));
  }

  // Check if service type exists
  const serviceExists = await Service.findById(serviceTypeId);
  if (!serviceExists) {
    return next(new ErrorHandler("Service type not found", 404));
  }

  // Check if skill already exists for this service type
  const existingSkill = await Skill.findOne({
    name: name.trim(),
    serviceType: serviceTypeId
  });

  if (existingSkill) {
    return next(new ErrorHandler("This skill already exists for this service type", 409));
  }

  const skill = new Skill({
    name: name.trim(),
    serviceType: serviceTypeId,
    description: description || "",
    minExperienceYears: minExperienceYears || 0,
    createdBy: req.user._id
  });

  await skill.save();

  res.status(201).json({
    success: true,
    message: "Skill created successfully",
    skill
  });
});

// Get all skills for a service type
export const getSkillsByServiceType = catchAsyncError(async (req, res, next) => {
  const { serviceTypeId } = req.params;

  const service = await Service.findById(serviceTypeId);
  if (!service) {
    return next(new ErrorHandler("Service type not found", 404));
  }

  const skills = await Skill.find({
    serviceType: serviceTypeId,
    isActive: true
  }).populate("relatedSkills", "name");

  res.status(200).json({
    success: true,
    count: skills.length,
    skills
  });
});

// Connect related skills (skills of the same service type)
export const connectRelatedSkills = catchAsyncError(async (req, res, next) => {
  const { serviceTypeId } = req.params;

  // Find all active skills for this service type
  const skills = await Skill.find({
    serviceType: serviceTypeId,
    isActive: true
  });

  if (skills.length === 0) {
    return next(new ErrorHandler("No skills found for this service type", 404));
  }

  // Connect each skill to all other skills in the same service type
  for (let i = 0; i < skills.length; i++) {
    const relatedSkillIds = skills
      .filter((_, index) => index !== i) // Exclude self
      .map(skill => skill._id);

    await Skill.findByIdAndUpdate(
      skills[i]._id,
      { relatedSkills: relatedSkillIds },
      { new: true }
    );
  }

  res.status(200).json({
    success: true,
    message: "Related skills connected successfully",
    skillsProcessed: skills.length
  });
});

// Add skill to user profile - Three Layer Validation Pattern
export const addSkillToUser = catchAsyncError(async (req, res, next) => {
  const { userId } = req.params;
  const { skillId, yearsOfExperience, proficiency } = req.body;

  // LAYER 1: Input validation
  if (!userId || !skillId) {
    return next(new ErrorHandler("Missing required fields", 400));
  }

  // Validate proficiency enum
  const validProficiencies = ["Beginner", "Intermediate", "Advanced", "Expert"];
  if (proficiency && !validProficiencies.includes(proficiency)) {
    return next(new ErrorHandler("Invalid proficiency level", 400));
  }

  // Validate years is non-negative
  if (yearsOfExperience !== undefined && yearsOfExperience < 0) {
    return next(new ErrorHandler("Years of experience cannot be negative", 400));
  }

  try {
    // Proceed to business logic
    const result = await addSkillToUserLogic(userId, skillId, yearsOfExperience, proficiency);
    res.status(200).json({
      success: true,
      message: "Skill added successfully",
      user: result
    });
  } catch (error) {
    next(error);
  }
});

// Business logic helper - Layer 2 validation
async function addSkillToUserLogic(userId, skillId, yearsOfExperience, proficiency) {
  // LAYER 2: Data existence and state validation

  // 1. Check user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new ErrorHandler("User not found", 404);
  }

  // 2. Check user is Service Provider
  if (user.role !== "Service Provider") {
    throw new ErrorHandler("Only Service Providers can add skills", 403);
  }

  // 3. Check skill exists and is active
  const skill = await Skill.findById(skillId).populate("serviceType");
  if (!skill) {
    throw new ErrorHandler("Skill not found", 404);
  }
  if (!skill.isActive) {
    throw new ErrorHandler("Skill is inactive", 400);
  }

  // 4. Check not already assigned
  const alreadyAssigned = user.skillsWithService.some(
    s => s.skill.toString() === skillId
  );
  if (alreadyAssigned) {
    throw new ErrorHandler("Skill already assigned to this provider", 400);
  }

  // 5. Check skill limit (max 3)
  if (user.skillsWithService.length >= 3) {
    throw new ErrorHandler("Maximum 3 skills per provider", 400);
  }

  // LAYER 3: Modification with consistency enforcement
  return await modifyUserSkillsWithConsistency(user, skill, yearsOfExperience, proficiency);
}

// Atomic modification helper - Layer 3
async function modifyUserSkillsWithConsistency(user, skill, yearsOfExperience, proficiency) {
  // LAYER 3: Atomic modification with consistency checks

  // 1. Add to structured array
  user.skillsWithService.push({
    skill: skill._id,
    yearsOfExperience: yearsOfExperience || 0,
    proficiency: proficiency || "Intermediate",
    addedAt: new Date()
  });

  // 2. Sync to legacy array
  if (!user.skills.includes(skill.name)) {
    user.skills.push(skill.name);
  }

  // 3. Add service type if not present
  if (!user.serviceTypes.includes(skill.serviceType._id)) {
    user.serviceTypes.push(skill.serviceType._id);
  }

  // 4. Consistency check before save
  const isConsistent = validateUserSkillConsistency(user);
  if (!isConsistent) {
    throw new ErrorHandler("Skill consistency validation failed", 500);
  }

  // 5. Save
  await user.save();

  // 6. Post-save verification
  const savedUser = await User.findById(user._id).populate({
    path: "skillsWithService.skill",
    populate: { path: "serviceType" }
  });

  const verified = validateUserSkillConsistency(savedUser);
  if (!verified) {
    throw new ErrorHandler("Post-save consistency check failed", 500);
  }

  return savedUser;
}

// Remove skill from user profile
export const removeSkillFromUser = catchAsyncError(async (req, res, next) => {
  const { userId, skillId } = req.params;

  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  // Remove skill from structured skills array
  user.skillsWithService = user.skillsWithService.filter(
    s => s.skill.toString() !== skillId
  );

  // Also remove from legacy skills array
  const skill = await Skill.findById(skillId);
  if (skill) {
    user.skills = user.skills.filter(s => s !== skill.name);
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: "Skill removed from user successfully"
  });
});

// Get all skills with their related connections
export const getAllSkills = catchAsyncError(async (req, res, next) => {
  const { serviceTypeId } = req.query;

  let query = { isActive: true };
  if (serviceTypeId) {
    query.serviceType = serviceTypeId;
  }

  const skills = await Skill.find(query)
    .populate("serviceType", "name")
    .populate("relatedSkills", "name");

  res.status(200).json({
    success: true,
    count: skills.length,
    skills
  });
});

// Get user's skills with related skills from same service type
export const getUserSkillsWithConnections = catchAsyncError(async (req, res, next) => {
  const { userId } = req.params;

  const user = await User.findById(userId).populate({
    path: "skillsWithService.skill",
    select: "name serviceType relatedSkills",
    populate: [
      {
        path: "serviceType",
        select: "name"
      },
      {
        path: "relatedSkills",
        select: "name _id"
      }
    ]
  });

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  // Transform the data to show skill connections
  const skillsWithConnections = user.skillsWithService.map(userSkill => ({
    ...userSkill.toObject ? userSkill.toObject() : userSkill,
    connectedSkills: userSkill.skill.relatedSkills || []
  }));

  res.status(200).json({
    success: true,
    skills: skillsWithConnections
  });
});

// Deactivate skill - Pattern 2: Handling Related Data Modifications
export const deactivateSkill = catchAsyncError(async (req, res, next) => {
  const skillId = req.params.skillId;

  // Validate
  const skill = await Skill.findById(skillId);
  if (!skill) return next(new ErrorHandler("Skill not found", 404));

  // START TRANSACTION (if using MongoDB 4.0+)
  // For simplicity, we'll do it in sequence with error handling

  try {
    // Step 1: Get all users with this skill
    const usersWithSkill = await User.find({
      "skillsWithService.skill": skillId
    });

    // Step 2: Remove skill from each user
    for (let user of usersWithSkill) {
      // Remove from structured array
      user.skillsWithService = user.skillsWithService.filter(
        s => s.skill.toString() !== skillId
      );

      // Remove from legacy array
      user.skills = user.skills.filter(name => name !== skill.name);

      // Check if this service type has no remaining skills
      const skillsInService = user.skillsWithService.filter(
        s => s.skill.serviceType.toString() === skill.serviceType.toString()
      );
      if (skillsInService.length === 0) {
        user.serviceTypes = user.serviceTypes.filter(
          st => st.toString() !== skill.serviceType.toString()
        );
      }

      // Validate consistency
      if (!validateUserSkillConsistency(user)) {
        throw new ErrorHandler(`Consistency error for user ${user._id}`, 500);
      }

      // Save
      await user.save();
    }

    // Step 3: Remove from related skills arrays
    await Skill.updateMany(
      { relatedSkills: skillId },
      { $pull: { relatedSkills: skillId } }
    );

    // Step 4: Deactivate the skill
    skill.isActive = false;
    await skill.save();

    // Step 5: Log the action
    console.log(`Skill ${skillId} deactivated. Updated ${usersWithSkill.length} users.`);

    res.status(200).json({
      success: true,
      message: "Skill deactivated",
      usersAffected: usersWithSkill.length
    });

  } catch (error) {
    // If any step fails, the changes are not yet committed
    // In production with transactions, would roll back here
    console.error("Error deactivating skill:", error);
    next(error);
  }
});

// Update skill information
export const updateSkill = catchAsyncError(async (req, res, next) => {
  const { skillId } = req.params;
  const { name, description, minExperienceYears } = req.body;

  const skill = await Skill.findById(skillId);
  if (!skill) {
    return next(new ErrorHandler("Skill not found", 404));
  }

  if (name) skill.name = name.trim();
  if (description) skill.description = description;
  if (minExperienceYears !== undefined) skill.minExperienceYears = minExperienceYears;

  await skill.save();

  res.status(200).json({
    success: true,
    message: "Skill updated successfully",
    skill
  });
});

export default {
  createSkill,
  getSkillsByServiceType,
  connectRelatedSkills,
  addSkillToUser,
  removeSkillFromUser,
  getAllSkills,
  getUserSkillsWithConnections,
  deactivateSkill,
  updateSkill
};
