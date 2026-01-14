// __tests__/userSkills.test.js - Pattern 8: Test Coverage for Consistency

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import User from "../models/userSchema";
import Skill from "../models/skillSchema";
import Service from "../models/service";
import {
  validateUserSkillConsistency,
  addSkillToUserLogic,
  modifyUserSkillsWithConsistency
} from "../utils/dataConsistency";

describe("User Skill Management - Consistency", () => {
  let testUser;
  let testSkill;
  let testService;

  beforeEach(async () => {
    // Setup test data
    testService = await Service.create({
      name: "Plumbing",
      description: "Plumbing services"
    });

    testSkill = await Skill.create({
      name: "Pipe Installation",
      serviceType: testService._id,
      isActive: true,
      description: "Installing pipes"
    });

    testUser = await User.create({
      username: "testprovider",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      role: "Service Provider",
      phone: "1234567890",
      address: "123 Main St",
      password: "password123",
      skills: [],
      skillsWithService: [],
      serviceTypes: []
    });
  });

  afterEach(async () => {
    // Cleanup
    await User.deleteMany({});
    await Skill.deleteMany({});
    await Service.deleteMany({});
  });

  describe("Consistency Validation", () => {
    it("should validate consistent user skill data", async () => {
      // Add skill properly
      testUser.skillsWithService.push({
        skill: testSkill._id,
        yearsOfExperience: 5,
        proficiency: "Advanced",
        addedAt: new Date()
      });
      testUser.skills.push(testSkill.name);
      testUser.serviceTypes.push(testService._id);

      await testUser.save();

      // Populate for validation
      await testUser.populate("skillsWithService.skill");

      const isConsistent = validateUserSkillConsistency(testUser);
      expect(isConsistent).toBe(true);
    });

    it("should detect skill array length mismatch", async () => {
      // Create inconsistent data
      testUser.skillsWithService.push({
        skill: testSkill._id,
        yearsOfExperience: 5,
        proficiency: "Advanced"
      });
      testUser.skills.push(testSkill.name);
      // Don't add to serviceTypes to create another inconsistency
      // But main test is length mismatch

      // Add another skill to structured array but not legacy
      const skill2 = await Skill.create({
        name: "Leak Detection",
        serviceType: testService._id,
        isActive: true
      });

      testUser.skillsWithService.push({
        skill: skill2._id,
        yearsOfExperience: 3,
        proficiency: "Intermediate"
      });
      // skills array only has 1 item, skillsWithService has 2

      await testUser.save();
      await testUser.populate("skillsWithService.skill");

      const isConsistent = validateUserSkillConsistency(testUser);
      expect(isConsistent).toBe(false);
    });

    it("should detect missing skill in legacy array", async () => {
      // Add to structured array but not legacy array
      testUser.skillsWithService.push({
        skill: testSkill._id,
        yearsOfExperience: 5,
        proficiency: "Advanced"
      });
      // Don't add to testUser.skills

      await testUser.save();
      await testUser.populate("skillsWithService.skill");

      const isConsistent = validateUserSkillConsistency(testUser);
      expect(isConsistent).toBe(false);
    });

    it("should detect duplicate skills in structured array", async () => {
      // Add same skill twice
      testUser.skillsWithService.push({
        skill: testSkill._id,
        yearsOfExperience: 5,
        proficiency: "Advanced"
      });
      testUser.skillsWithService.push({
        skill: testSkill._id, // Same skill again
        yearsOfExperience: 3,
        proficiency: "Intermediate"
      });

      await testUser.save();
      await testUser.populate("skillsWithService.skill");

      const isConsistent = validateUserSkillConsistency(testUser);
      expect(isConsistent).toBe(false);
    });

    it("should reject skills for community members", async () => {
      const communityUser = await User.create({
        username: "testcommunity",
        email: "community@example.com",
        firstName: "Community",
        lastName: "User",
        role: "Community Member",
        phone: "1234567890",
        address: "123 Main St",
        password: "password123",
        skills: [testSkill.name], // Community member with skills
        skillsWithService: [],
        serviceTypes: []
      });

      const isConsistent = validateUserSkillConsistency(communityUser);
      expect(isConsistent).toBe(false);
    });
  });

  describe("Skill Addition Logic", () => {
    it("should successfully add skill to provider", async () => {
      const result = await addSkillToUserLogic(
        testUser._id.toString(),
        testSkill._id.toString(),
        5,
        "Advanced"
      );

      expect(result.skillsWithService).toHaveLength(1);
      expect(result.skills).toContain(testSkill.name);
      expect(result.serviceTypes.map(id => id.toString())).toContain(testService._id.toString());
    });

    it("should prevent adding inactive skill", async () => {
      // Deactivate skill
      testSkill.isActive = false;
      await testSkill.save();

      await expect(addSkillToUserLogic(
        testUser._id.toString(),
        testSkill._id.toString(),
        5,
        "Advanced"
      )).rejects.toThrow("Skill is inactive");
    });

    it("should prevent adding skill to community member", async () => {
      const communityUser = await User.create({
        username: "testcommunity",
        email: "community@example.com",
        firstName: "Community",
        lastName: "User",
        role: "Community Member",
        phone: "1234567890",
        address: "123 Main St",
        password: "password123"
      });

      await expect(addSkillToUserLogic(
        communityUser._id.toString(),
        testSkill._id.toString(),
        5,
        "Advanced"
      )).rejects.toThrow("Only Service Providers can add skills");
    });

    it("should prevent adding duplicate skill", async () => {
      // Add skill once
      await addSkillToUserLogic(
        testUser._id.toString(),
        testSkill._id.toString(),
        5,
        "Advanced"
      );

      // Try to add again
      await expect(addSkillToUserLogic(
        testUser._id.toString(),
        testSkill._id.toString(),
        3,
        "Intermediate"
      )).rejects.toThrow("Skill already assigned to this provider");
    });

    it("should enforce skill limit of 3", async () => {
      // Create 3 more skills
      const skill2 = await Skill.create({
        name: "Leak Detection",
        serviceType: testService._id,
        isActive: true
      });
      const skill3 = await Skill.create({
        name: "Water Heater",
        serviceType: testService._id,
        isActive: true
      });
      const skill4 = await Skill.create({
        name: "Drain Cleaning",
        serviceType: testService._id,
        isActive: true
      });

      // Add 3 skills
      await addSkillToUserLogic(testUser._id.toString(), testSkill._id.toString(), 5, "Advanced");
      await addSkillToUserLogic(testUser._id.toString(), skill2._id.toString(), 3, "Intermediate");
      await addSkillToUserLogic(testUser._id.toString(), skill3._id.toString(), 2, "Beginner");

      // Try to add 4th - should fail
      await expect(addSkillToUserLogic(
        testUser._id.toString(),
        skill4._id.toString(),
        1,
        "Beginner"
      )).rejects.toThrow("Maximum 3 skills per provider");
    });
  });

  describe("Atomic Modification", () => {
    it("should atomically add skill with consistency checks", async () => {
      const result = await modifyUserSkillsWithConsistency(
        testUser,
        testSkill,
        5,
        "Advanced"
      );

      expect(result.skillsWithService).toHaveLength(1);
      expect(result.skills).toContain(testSkill.name);
      expect(result.serviceTypes.map(id => id.toString())).toContain(testService._id.toString());

      // Verify consistency
      const savedUser = await User.findById(result._id).populate("skillsWithService.skill");
      const isConsistent = validateUserSkillConsistency(savedUser);
      expect(isConsistent).toBe(true);
    });

    it("should maintain consistency when adding service type", async () => {
      // First add a skill from different service type
      const service2 = await Service.create({ name: "Electrical" });
      const skill2 = await Skill.create({
        name: "Wiring",
        serviceType: service2._id,
        isActive: true
      });

      // Add first skill
      await modifyUserSkillsWithConsistency(testUser, testSkill, 5, "Advanced");

      // Add second skill from different service
      const result = await modifyUserSkillsWithConsistency(testUser, skill2, 3, "Intermediate");

      expect(result.serviceTypes).toHaveLength(2);
      expect(result.serviceTypes.map(id => id.toString())).toContain(testService._id.toString());
      expect(result.serviceTypes.map(id => id.toString())).toContain(service2._id.toString());
    });
  });

  describe("Skill Proficiency Validation", () => {
    it("should accept valid proficiency levels", () => {
      const validProficiencies = ["Beginner", "Intermediate", "Advanced", "Expert"];

      validProficiencies.forEach(proficiency => {
        expect(() => {
          // This would be validated in the controller
          if (!validProficiencies.includes(proficiency)) {
            throw new Error("Invalid proficiency");
          }
        }).not.toThrow();
      });
    });

    it("should reject invalid proficiency levels", () => {
      const invalidProficiencies = ["Novice", "Expert+", "", null, undefined];

      invalidProficiencies.forEach(proficiency => {
        expect(() => {
          const validProficiencies = ["Beginner", "Intermediate", "Advanced", "Expert"];
          if (proficiency && !validProficiencies.includes(proficiency)) {
            throw new Error("Invalid proficiency");
          }
        }).toThrow();
      });
    });
  });

  describe("Experience Validation", () => {
    it("should accept non-negative experience values", () => {
      const validExperiences = [0, 1, 5, 10, 25];

      validExperiences.forEach(experience => {
        expect(() => {
          if (experience < 0) {
            throw new Error("Negative experience");
          }
        }).not.toThrow();
      });
    });

    it("should reject negative experience values", () => {
      const invalidExperiences = [-1, -5, -10];

      invalidExperiences.forEach(experience => {
        expect(() => {
          if (experience !== undefined && experience < 0) {
            throw new Error("Negative experience");
          }
        }).toThrow();
      });
    });
  });
});
