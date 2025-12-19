import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

import Admin from "./models/adminSchema.js";
import User from "./models/userSchema.js";
import Booking from "./models/booking.js";
import Chat from "./models/chat.js";
import HelpRequest from "./models/helpSchema.js";
import JobFair from "./models/jobFairSchema.js";
import Notification from "./models/notification.js";
import Report from "./models/report.js";
import Resident from "./models/residentSchema.js";
import Review from "./models/review.js";
import Service from "./models/service.js";
import ServiceRequest from "./models/serviceRequest.js";
import Settings from "./models/settings.js";
import VerificationAppointment from "./models/verificationSchema.js";

console.log("MONGO_URI:", process.env.MONGO_URI); // Debug log

await mongoose.connect(process.env.MONGO_URI);

console.log("Starting new data seeding (preserving existing data)...");

function generateDateInRange() {
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const oneMonthFuture = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const startTime = oneYearAgo.getTime();
  const endTime = oneMonthFuture.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

function generateUniqueSuffix() {
  return `_${Math.floor(Math.random() * 1000)}`;
}

const firstNames = [
  "Maria", "Juan", "Pedro", "Ana", "Jose", "Carmen", "Francisco", "Antonio", "Rosa", "Luis",
  "Elena", "Ricardo", "Teresa", "Manuel", "Consuelo", "Rafael", "Isabel", "Carlos", "Sofia", "Miguel",
  "Mercedes", "Angel", "Victoria", "Fernando", "Patricia", "Alberto", "Dolores", "Pablo", "Luisa", "Sergio"
];

const lastNames = [
  "Dela Cruz", "Garcia", "Santos", "Reyes", "Cruz", "Mendoza", "Flores", "Punzalan", "Villanueva", "Tan",
  "Morales", "Aquino", "Domingo", "Martinez", "Hernandez", "De Jesus", "Legaspi", "Tolentino", "Rosario", "Valdez"
];

const houseNumbers = [
  "123", "456", "789", "101", "202", "303", "404", "505", "606", "707",
  "808", "909", "111", "222", "333", "444", "555", "666", "777", "888"
];

function generateName() {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return { firstName: first, lastName: last };
}

function generateEmail(first, last, index) {
  const suffix = generateUniqueSuffix();
  return `${first.toLowerCase()}.${last.toLowerCase().replace(' ', '')}${suffix}@gmail.com`;
}

function generatePhone() {
  const prefixes = ["0917", "0918", "0919", "0920", "0921", "0927", "0935"];
  return prefixes[Math.floor(Math.random() * prefixes.length)] + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
}

function generateAddress() {
  const house = houseNumbers[Math.floor(Math.random() * houseNumbers.length)];
  const streets = ["Main St", "Elm St", "Oak Ave", "Pine Rd", "Cedar Ln"];
  const street = streets[Math.floor(Math.random() * streets.length)];
  const barangays = ["Sampaloc", "Santa Cruz", "Tondo", "Quiapo", "Binondo"];
  const barangay = barangays[Math.floor(Math.random() * barangays.length)];
  return `${house} ${street}, ${barangay}, Manila`;
}

function generateBirthdate() {
  const now = new Date();
  const minAge = 18;
  const maxAge = 65;
  const age = Math.floor(Math.random() * (maxAge - minAge)) + minAge;
  const birthYear = now.getFullYear() - age;
  const birthMonth = Math.floor(Math.random() * 12);
  const birthDay = Math.floor(Math.random() * 28) + 1;
  return new Date(birthYear, birthMonth, birthDay);
}

const skills = ["Plumbing", "Electrical", "Cleaning", "Carpentry", "Painting", "Welding"];
const services = ["Plumbing", "Electrical", "Cleaning", "Carpentry", "Painting", "Appliance Repair", "Home Renovation"];

function getRandomSkills(num) {
  const shuffled = skills.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, num);
}

const existingUsers = await User.find({});
const existingProviders = existingUsers.filter(u => u.role === "Service Provider");
const existingMembers = existingUsers.filter(u => u.role === "Community Member");

const admin = await Admin.findOne({ email: "skillconnect@gmail.com" });
if (!admin) {
  console.log("No admin found. Please create admin first.");
  process.exit(1);
}

console.log("Creating 50 new settings...");
const settingsData = [];
for (let i = 0; i < 50; i++) {
  settingsData.push({
    siteName: `SkillConnect${generateUniqueSuffix()}`,
    siteDescription: `Connecting skilled workers with community needs - New Dataset ${i}`,
    contactEmail: `contact${generateUniqueSuffix()}@skillconnect.com`,
    contactPhone: generatePhone(),
    maintenanceMode: Math.random() > 0.9,
    allowRegistrations: Math.random() > 0.1,
    maxFileSize: (Math.floor(Math.random() * 10) + 1) * 1024 * 1024,
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/jpg'],
    notificationSettings: {
      emailNotifications: Math.random() > 0.3,
      pushNotifications: Math.random() > 0.2,
      smsNotifications: Math.random() > 0.5
    },
    systemSettings: {
      timezone: "Asia/Manila",
      currency: "PHP",
      language: "en"
    },
    createdAt: generateDateInRange(),
    updatedAt: generateDateInRange()
  });
}

await Settings.insertMany(settingsData);
console.log("✓ 50 new settings created");

console.log("Creating 50 new help requests...");
const helpCategories = ["Technical", "Account", "General", "Billing", "Service Request"];
const helpRequestsData = [];
for (let i = 0; i < 50; i++) {
  helpRequestsData.push({
    title: `New Help Request ${generateUniqueSuffix()}`,
    description: `Description for new help request ${i}. Need assistance with service-related issues.`,
    category: helpCategories[Math.floor(Math.random() * helpCategories.length)],
    createdAt: generateDateInRange(),
    updatedAt: generateDateInRange()
  });
}

await HelpRequest.insertMany(helpRequestsData);
console.log("✓ 50 new help requests created");

console.log("Creating 50 new job fairs...");
const jobFairLocations = ["Barangay Hall", "Community Center", "School Gym", "Town Plaza"];
const jobFairsData = [];
for (let i = 0; i < 50; i++) {
  const date = generateDateInRange();
  jobFairsData.push({
    title: `New Job Fair ${generateUniqueSuffix()}`,
    description: `Job fair event ${i} for skilled workers and community members.`,
    date: date,
    location: jobFairLocations[Math.floor(Math.random() * jobFairLocations.length)],
    startTime: `${Math.floor(Math.random() * 12) + 8}:00 AM`,
    endTime: `${Math.floor(Math.random() * 12) + 1}:00 PM`,
    createdAt: generateDateInRange(),
    updatedAt: generateDateInRange()
  });
}

await JobFair.insertMany(jobFairsData);
console.log("✓ 50 new job fairs created");

console.log("Creating 50 new residents...");
const residentsData = [];
for (let i = 0; i < 50; i++) {
  const name = generateName();
  residentsData.push({
    name: name.firstName + " " + name.lastName + generateUniqueSuffix(),
    address: generateAddress(),
    phoneNumber: generatePhone(),
    email: generateEmail(name.firstName, name.lastName, i),
    createdAt: generateDateInRange(),
    updatedAt: generateDateInRange()
  });
}

await Resident.insertMany(residentsData);
console.log("✓ 50 new residents created");

console.log("Creating 50 new users...");
const usersData = [];
for (let i = 0; i < 50; i++) {
  const name = generateName();
  const email = generateEmail(name.firstName, name.lastName, i);
  const phone = generatePhone();
  const address = generateAddress();
  const birthdate = generateBirthdate();
  const employed = Math.random() > 0.4 ? "employed" : "unemployed";
  const role = Math.random() > 0.5 ? "Service Provider" : "Community Member";

  // Generate username with length limit of 20 characters
  let username = `${name.firstName}${name.lastName}${generateUniqueSuffix()}`;
  if (username.length > 20) {
    // Truncate if too long, prioritizing first name and suffix
    const maxLength = 20;
    const firstName = name.firstName.substring(0, Math.min(name.firstName.length, 8));
    const suffix = generateUniqueSuffix();
    const lastName = name.lastName.replace(' ', '');
    const remainingLength = maxLength - firstName.length - suffix.length;
    username = firstName + lastName.substring(0, Math.max(0, remainingLength)) + suffix;
  }

  const userData = {
    username: username,
    firstName: name.firstName,
    lastName: name.lastName,
    email: email,
    phone: phone,
    address: address,
    birthdate: birthdate,
    occupation: role === "Service Provider" ? services[Math.floor(Math.random() * services.length)] : "",
    employed: employed,
    role: role,
    profilePic: `https://picsum.photos/200/200?random=${Date.now()}_${i}`,
    validId: `https://via.placeholder.com/300x200/cccccc/000000?text=Valid+ID+${i}`,
    password: "password123",
    verified: Math.random() > 0.7 ? false : true,
    createdAt: generateDateInRange(),
    updatedAt: generateDateInRange()
  };

  if (role === "Service Provider") {
    const numSkills = Math.floor(Math.random() * 3) + 1;
    userData.skills = getRandomSkills(numSkills);
    userData.availability = ["Available", "Currently Working", "Not Available"][Math.floor(Math.random() * 3)];
    userData.acceptedWork = Math.random() > 0.3;

    const numServices = Math.floor(Math.random() * 3) + 1;
    userData.services = [];
    for (let j = 0; j < numServices; j++) {
      const serviceName = services[Math.floor(Math.random() * services.length)];
      userData.services.push({
        name: serviceName,
        rate: Math.floor(Math.random() * 500) + 100,
        description: `Professional ${serviceName.toLowerCase()} service.`
      });
    }

    if (Math.random() > 0.4) {
      const numCertificates = Math.floor(Math.random() * 3) + 1;
      userData.certificates = [];
      for (let j = 0; j < numCertificates; j++) {
        userData.certificates.push(`https://via.placeholder.com/300x200/cccccc/000000?text=Certificate+${j + 1}+${i}`);
      }
    }
  }

  usersData.push(userData);
}

const newUsers = await User.create(usersData);
console.log("✓ 50 new users created");

const allProviders = [...existingProviders, ...newUsers.filter(u => u.role === "Service Provider")];
const allMembers = [...existingMembers, ...newUsers.filter(u => u.role === "Community Member")];

const srStatuses = ["Waiting", "Working", "Complete", "Cancelled", "No Longer Available"];

console.log("Creating 50 new service requests...");
const serviceRequestsData = [];
for (let i = 0; i < 50; i++) {
  const member = allMembers[Math.floor(Math.random() * allMembers.length)];
  const assignedProvider = allProviders[Math.floor(Math.random() * allProviders.length)];
  serviceRequestsData.push({
    requester: member._id,
    serviceProvider: assignedProvider._id,
    name: member.firstName + " " + member.lastName,
    address: member.address,
    phone: member.phone,
    serviceProviderName: assignedProvider.firstName + " " + assignedProvider.lastName,
    typeOfWork: services[Math.floor(Math.random() * services.length)],
    time: `${Math.floor(Math.random() * 12) + 1}:00 PM`,
    budget: Math.floor(Math.random() * 1000) + 200,
    notes: `New service request notes for work ${i}`,
    status: srStatuses[Math.floor(Math.random() * srStatuses.length)],
    serviceProviderPhone: assignedProvider.phone,
    serviceProviderAddress: assignedProvider.address,
    createdAt: generateDateInRange(),
    updatedAt: generateDateInRange()
  });
}

const newServiceRequests = await ServiceRequest.insertMany(serviceRequestsData);
console.log("✓ 50 new service requests created");

const bookingStatuses = ["Available", "Working", "Complete", "Cancelled"];

console.log("Creating 50 new bookings...");
const bookingsData = [];
for (let i = 0; i < 50; i++) {
  const serviceRequest = newServiceRequests[i];
  bookingsData.push({
    requester: serviceRequest.requester,
    provider: serviceRequest.serviceProvider,
    serviceRequest: serviceRequest._id,
    status: bookingStatuses[Math.floor(Math.random() * bookingStatuses.length)],
    createdAt: generateDateInRange(),
    updatedAt: generateDateInRange()
  });
}

const newBookings = await Booking.insertMany(bookingsData);
console.log("✓ 50 new bookings created");

console.log("Creating 50 new reviews...");
const reviewsData = [];
for (let i = 0; i < 50; i++) {
  const booking = newBookings[i];
  reviewsData.push({
    booking: booking._id,
    reviewer: booking.requester,
    reviewee: booking.provider,
    rating: Math.floor(Math.random() * 5) + 1,
    comments: `New sample review comment ${i} - Quality service and professional work.`,
    createdAt: generateDateInRange(),
    updatedAt: generateDateInRange()
  });
}

await Review.insertMany(reviewsData);
console.log("✓ 50 new reviews created");

console.log("Creating 50 new reports...");
const reportsData = [];
for (let i = 0; i < 50; i++) {
  const member = allMembers[Math.floor(Math.random() * allMembers.length)];
  const provider = allProviders[Math.floor(Math.random() * allProviders.length)];
  reportsData.push({
    reporter: member._id,
    reportedUser: provider._id,
    reason: `New report reason ${i}`,
    description: `New report description ${i} - Additional details about the issue.`,
    createdAt: generateDateInRange(),
    updatedAt: generateDateInRange()
  });
}

await Report.insertMany(reportsData);
console.log("✓ 50 new reports created");

console.log("Creating 50 new notifications...");
const notificationsData = [];
for (let i = 0; i < 50; i++) {
  const user = newUsers[Math.floor(Math.random() * newUsers.length)];
  notificationsData.push({
    user: user._id,
    title: `New Notification ${generateUniqueSuffix()}`,
    message: `This is a sample notification ${i} for ${user.firstName}. Important updates.`,
    createdAt: generateDateInRange(),
    updatedAt: generateDateInRange()
  });
}

const newNotifications = await Notification.insertMany(notificationsData);
console.log("✓ 50 new notifications created");

console.log("Creating 50 new verification appointments...");
const verificationsData = [];
for (let i = 0; i < 50; i++) {
  const provider = allProviders[Math.floor(Math.random() * allProviders.length)];
  verificationsData.push({
    provider: provider._id,
    scheduledBy: admin._id,
    appointmentDate: generateDateInRange(),
    location: "Barangay Hall, Sampaloc, Manila",
    createdAt: generateDateInRange(),
    updatedAt: generateDateInRange()
  });
}

await VerificationAppointment.insertMany(verificationsData);
console.log("✓ 50 new verification appointments created");

console.log("Creating 50 new chats...");
const chatsData = [];
for (let i = 0; i < 50; i++) {
  const booking = newBookings[Math.floor(Math.random() * newBookings.length)];
  const sender = Math.random() > 0.5 ? booking.requester : booking.provider;
  chatsData.push({
    appointment: booking._id,
    sender: sender,
    message: `Sample chat message ${i}`,
    status: ["sent", "delivered", "seen"][Math.floor(Math.random() * 3)],
    createdAt: generateDateInRange(),
    updatedAt: generateDateInRange()
  });
}

await Chat.insertMany(chatsData);
console.log("✓ 50 new chats created");

console.log("Creating 50 new services...");
const servicesData = [];
for (let i = 0; i < 50; i++) {
  servicesData.push({
    name: `Service ${generateUniqueSuffix()}`,
    description: `Description for service ${i}`,
    rate: Math.floor(Math.random() * 500) + 50,
    createdBy: admin._id,
    createdAt: generateDateInRange(),
    updatedAt: generateDateInRange()
  });
}

await Service.insertMany(servicesData);
console.log("✓ 50 new services created");

console.log("Seeding completed successfully!");
await mongoose.connection.close();
process.exit();
