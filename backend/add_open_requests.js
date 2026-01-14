import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

import User from "./models/userSchema.js";
import ServiceRequest from "./models/serviceRequest.js";

console.log("Adding 5 open service requests with proper expiresAt...");

await mongoose.connect(process.env.MONGO_URI);

const existingMembers = await User.find({ role: "Community Member" });

if (existingMembers.length === 0) {
  console.log("No existing community members found. Please run the initial seeder first.");
  process.exit(1);
}

const services = ["Plumbing", "Electrical", "Cleaning", "Carpentry", "Painting"];

const openRequestsData = [];
for (let i = 0; i < 5; i++) {
  const member = existingMembers[Math.floor(Math.random() * existingMembers.length)];

  const hour24 = Math.floor(Math.random() * 12) + 8; // 8 to 19
  const minute = Math.floor(Math.random() * 4) * 15;
  const period = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const timeString = `${hour12.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${period}`;

  openRequestsData.push({
    requester: member._id,
    name: `${member.firstName} ${member.lastName}`,
    address: member.address,
    phone: member.phone,
    typeOfWork: services[Math.floor(Math.random() * services.length)],
    time: timeString,
    minBudget: Math.floor(Math.random() * 500) + 100,
    maxBudget: Math.floor(Math.random() * 1000) + 500,
    notes: `Open service request ${i + 1} - needs immediate attention`,
    status: "Open",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    createdAt: new Date(),
    updatedAt: new Date()
  });
}

await ServiceRequest.insertMany(openRequestsData);
console.log("✓ 5 open service requests with expiresAt created");

console.log("Seeding completed successfully!");
await mongoose.connection.close();
process.exit();
