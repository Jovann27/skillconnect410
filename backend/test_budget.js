// Simple test to verify budget range saving
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ServiceRequest from './models/serviceRequest.js';

dotenv.config();

async function testBudgetRange() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/skillconnect');

    // Create a test service request with budget range
    const testRequest = await ServiceRequest.create({
      requester: new mongoose.Types.ObjectId(), // dummy ID
      name: "Test Request",
      address: "Test Address",
      typeOfWork: "Plumbing",
      minBudget: 1000,
      maxBudget: 2000,
      notes: "Test notes",
      status: "Waiting"
    });

    console.log('Created test request:', {
      id: testRequest._id,
      minBudget: testRequest.minBudget,
      maxBudget: testRequest.maxBudget
    });

    // Find the request to verify it was saved
    const foundRequest = await ServiceRequest.findById(testRequest._id);
    console.log('Retrieved request:', {
      id: foundRequest._id,
      minBudget: foundRequest.minBudget,
      maxBudget: foundRequest.maxBudget
    });

    // Clean up
    await ServiceRequest.findByIdAndDelete(testRequest._id);
    console.log('Test completed successfully!');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Test failed:', error);
    await mongoose.disconnect();
  }
}

testBudgetRange();
