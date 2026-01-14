import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

import User from "./models/userSchema.js";
import ServiceRequest from "./models/serviceRequest.js";

console.log("MONGO_URI:", process.env.MONGO_URI);

await mongoose.connect(process.env.MONGO_URI);

console.log("Adding 12 plumbing service requests with status 'Open'...");

const existingMembers = await User.find({ role: "Community Member" });

if (existingMembers.length === 0) {
  console.log("No existing community members found. Please run the initial seeder first.");
  process.exit(1);
}

const plumbingRequestsData = [];
for (let i = 0; i < 12; i++) {
  const member = existingMembers[Math.floor(Math.random() * existingMembers.length)];

  // Generate 24-hour format time
  const hour = Math.floor(Math.random() * 12) + 8; // 8 AM to 8 PM
  const minute = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45 minutes
  const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

  plumbingRequestsData.push({
    requester: member._id,
    name: member.firstName + " " + member.lastName,
    address: member.address,
    phone: member.phone,
    typeOfWork: "Plumbing",
    time: timeString,
    minBudget: Math.floor(Math.random() * 500) + 100,
    maxBudget: Math.floor(Math.random() * 1000) + 500,
    notes: `Plumbing service request notes ${i + 1}`,
    status: "Open",
    createdAt: new Date(),
    updatedAt: new Date()
  });
}

await ServiceRequest.insertMany(plumbingRequestsData);
console.log("✓ 12 plumbing service requests with status 'Open' created");

console.log("Seeding completed successfully!");
await mongoose.connection.close();
process.exit();
