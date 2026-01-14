import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

import ServiceRequest from "./models/serviceRequest.js";

console.log("Checking service requests...");

await mongoose.connect(process.env.MONGO_URI);

const openRequests = await ServiceRequest.countDocuments({status: 'Open'});
const totalRequests = await ServiceRequest.countDocuments();

console.log(`Total service requests: ${totalRequests}`);
console.log(`Open service requests: ${openRequests}`);

if (openRequests > 0) {
  const sampleRequests = await ServiceRequest.find({status: 'Open'}).limit(3).select('typeOfWork status expiresAt');
  console.log('Sample open requests:');
  sampleRequests.forEach(req => {
    console.log(`- ${req.typeOfWork} (${req.status}) - expires: ${req.expiresAt}`);
  });
}

await mongoose.connection.close();
