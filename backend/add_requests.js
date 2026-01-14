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

console.log("Adding 25 new service requests...");

const existingUsers = await User.find({});
const existingProviders = existingUsers.filter(u => u.role === "Service Provider");
const existingMembers = existingUsers.filter(u => u.role === "Community Member");

if (existingProviders.length === 0 || existingMembers.length === 0) {
  console.log("No existing providers or members found. Please run the initial seeder first.");
  process.exit(1);
}

function generateDateInRange() {
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const oneMonthFuture = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const startTime = oneYearAgo.getTime();
  const endTime = oneMonthFuture.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

const services = ["Plumbing", "Electrical", "Cleaning", "Carpentry", "Painting", "Appliance Repair", "Home Renovation"];
const srStatuses = ["Open", "Offered", "Accepted", "In Progress", "Completed", "Cancelled"];

const serviceRequestsData = [];
for (let i = 0; i < 25; i++) {
  const member = existingMembers[Math.floor(Math.random() * existingMembers.length)];
  const assignedProvider = existingProviders[Math.floor(Math.random() * existingProviders.length)];

  const hour24 = Math.floor(Math.random() * 12) + 8; // 8 to 19
  const minute = Math.floor(Math.random() * 4) * 15;
  const period = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const timeString = `${hour12.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${period}`;

  serviceRequestsData.push({
    requester: member._id,
    name: member.firstName + " " + member.lastName,
    address: member.address,
    phone: member.phone,
    typeOfWork: services[Math.floor(Math.random() * services.length)],
    time: timeString,
    minBudget: Math.floor(Math.random() * 500) + 100,
    maxBudget: Math.floor(Math.random() * 1000) + 500,
    notes: `Additional service request notes for work ${i}`,
    status: srStatuses[Math.floor(Math.random() * srStatuses.length)],
    targetProvider: assignedProvider._id,
    serviceProvider: Math.random() > 0.5 ? assignedProvider._id : null, // Randomly assign provider
    createdAt: generateDateInRange(),
    updatedAt: generateDateInRange()
  });
}

await ServiceRequest.insertMany(serviceRequestsData);
console.log("✓ 25 new service requests created");

console.log("Seeding completed successfully!");
await mongoose.connection.close();
process.exit();
