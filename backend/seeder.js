import mongoose from "mongoose";
import dotenv from "dotenv";
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

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

// Clear all collections for fresh seeding
await User.deleteMany({});
await Booking.deleteMany({});
await Chat.deleteMany({});
await HelpRequest.deleteMany({});
await JobFair.deleteMany({});
await Notification.deleteMany({});
await Report.deleteMany({});
await Resident.deleteMany({});
await Review.deleteMany({});
await Service.deleteMany({});
await ServiceRequest.deleteMany({});
await Settings.deleteMany({});
await VerificationAppointment.deleteMany({});

console.log("Cleared existing data");

const DEFAULT_PASSWORD = process.env.ADMIN_SEED_PASSWORD || null;

let passwordToUse = DEFAULT_PASSWORD;

if (!passwordToUse) {
  passwordToUse = "AdminPass123";
}

let admin = null;
const existingAdmin = await Admin.findOne({ email: "skillconnect@gmail.com" });
if (existingAdmin) {
  console.log("Admin already exists, skipping admin creation.");
  admin = existingAdmin;
} else {
  admin = await Admin.create({
    name: "Admin",
    profilePic: "",
    email: "skillconnect@gmail.com",
    password: passwordToUse,
    role: "Admin"
  });
  console.log("Admin created successfully.");
}

// Create 50 Settings
const settingsData = [];
for (let i = 0; i < 50; i++) {
  settingsData.push({
    siteName: `SkillConnect${i}`,
    siteDescription: `Connecting skilled workers with community needs ${i}`,
    contactEmail: `contact${i}@skillconnect.com`,
    contactPhone: generatePhone(),
    maintenanceMode: Math.random() > 0.9, // 10% chance
    allowRegistrations: Math.random() > 0.1, // 90% allow
    maxFileSize: (Math.floor(Math.random() * 10) + 1) * 1024 * 1024, // 1-10 MB
    allowedFileTypes: ['image/jpeg', 'image/png'],
    notificationSettings: {
      emailNotifications: Math.random() > 0.5,
      pushNotifications: Math.random() > 0.5,
      smsNotifications: Math.random() > 0.5
    },
    systemSettings: {
      timezone: "Asia/Manila",
      currency: "PHP",
      language: "en"
    }
  });
}

await Settings.insertMany(settingsData);
console.log("50 settings created");

// Create 50 HelpRequests
const helpCategories = ["Technical", "Account", "General", "Billing", "Other"];
const helpRequestsData = [];
for (let i = 0; i < 50; i++) {
  helpRequestsData.push({
    title: `Help Request ${i}`,
    description: `Description for help request ${i}. Need assistance with issue.`,
    category: helpCategories[Math.floor(Math.random() * helpCategories.length)]
  });
}

await HelpRequest.insertMany(helpRequestsData);
console.log("50 help requests created");

// Create 50 JobFairs
const jobFairLocations = ["Barangay Hall", "Community Center", "School Gym", "Town Plaza"];
const jobFairsData = [];
for (let i = 0; i < 50; i++) {
  const date = new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000); // random date within a year
  jobFairsData.push({
    title: `Job Fair ${i}`,
    description: `Job fair event ${i} for skilled workers.`,
    date: date,
    location: jobFairLocations[Math.floor(Math.random() * jobFairLocations.length)],
    startTime: `${Math.floor(Math.random() * 12) + 8}:00 AM`, // 8am to 8pm
    endTime: `${Math.floor(Math.random() * 12) + 1}:00 PM`
  });
}

// Philippine Names
const firstNames = [
  "Maria", "Juan", "Pedro", "Ana", "Jose", "Carmen", "Francisco", "Antonio", "Rosa", "Luis",
  "Elena", "Ricardo", "Teresa", "Manuel", "Consuelo", "Rafael", "Isabel", "Carlos", "Sofia", "Miguel",
  "Mercedes", "Angel", "Victoria", "Fernando", "Patricia", "Alberto", "Dolores", "Pablo", "Luisa", "Sergio"
];

const lastNames = [
  "Dela Cruz", "Garcia", "Santos", "Reyes", "Cruz", "Mendoza", "Flores", "Punzalan", "Villanueva", "Tan",
  "Morales", "Aquino", "Domingo", "Martinez", "Hernandez", "De Jesus", "Legaspi", "Tolentino", "Rosario", "Valdez",
  "Macapagal", "Romualdez", "Luz", "Pineda", "Salazar", "Fernandez", "Torres", "Ramirez", "Lopez", "Gomez"
];

const houseNumbers = [
  "123", "456", "789", "101", "202", "303", "404", "505", "606", "707",
  "808", "909", "111", "222", "333", "444", "555", "666", "777", "888",
  "999", "121", "212", "313", "414", "515", "616", "717", "818", "919"
];

// Generate name
function generateName() {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return { firstName: first, lastName: last };
}

// Generate email
function generateEmail(first, last) {
  return `${first.toLowerCase()}.${last.toLowerCase().replace(' ', '')}${Math.floor(Math.random() * 100)}@gmail.com`;
}

// Generate phone
function generatePhone() {
  const prefixes = ["0917", "0918", "0919", "0920", "0921", "0927", "0935"];
  return prefixes[Math.floor(Math.random() * prefixes.length)] + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
}

// Generate address
function generateAddress() {
  const house = houseNumbers[Math.floor(Math.random() * houseNumbers.length)];
  const streets = ["Main St", "Elm St", "Oak Ave", "Pine Rd", "Cedar Ln", "Maple Blvd", "Birch Way"];
  const street = streets[Math.floor(Math.random() * streets.length)];
  return `${house} ${street}, Sampaloc, Manila`;
}

await JobFair.insertMany(jobFairsData);
console.log("50 job fairs created");

// Create 50 Residents
const residentsData = [];
for (let i = 0; i < 50; i++) {
  const name = generateName();
  const resident = {
    name: name.firstName + " " + name.lastName,
    address: generateAddress(),
    phoneNumber: generatePhone(),
    email: generateEmail(name.firstName, name.lastName)
  };
  residentsData.push(resident);
}

await Resident.insertMany(residentsData);
console.log("50 residents created");

// Generate birthdate (18-60 years old)
function generateBirthdate() {
  const now = new Date();
  const minAge = 18;
  const maxAge = 60;
  const age = Math.floor(Math.random() * (maxAge - minAge)) + minAge;
  const birthYear = now.getFullYear() - age;
  const birthMonth = Math.floor(Math.random() * 12);
  const birthDay = Math.floor(Math.random() * 28) + 1;
  return new Date(birthYear, birthMonth, birthDay);
}

// Skills
const skills = ["Plumbing", "Electrical", "Cleaning", "Carpentry", "Painting"];

// Function to get random skills
function getRandomSkills(num) {
  const shuffled = skills.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, num);
}

// Services
const services = [
  "Plumbing", "Electrical", "Cleaning", "Carpentry", "Painting", "Appliance Repair",
  "Home Renovation", "Pest Control", "Gardening & Landscaping", "Air Conditioning & Ventilation", "Laundry / Labandera"
];

// Create 50 users
const usersData = [];
for (let i = 0; i < 50; i++) {
  const name = generateName();
  const email = generateEmail(name.firstName, name.lastName);
  const phone = generatePhone();
  const address = generateAddress();
  const birthdate = generateBirthdate();
  const employed = Math.random() > 0.5 ? "employed" : "unemployed";
  const role = Math.random() > 0.5 ? "Service Provider" : "Community Member";

  const userData = {
    username: `${name.firstName}${name.lastName}${i}`,
    firstName: name.firstName,
    lastName: name.lastName,
    email: email,
    phone: phone,
    address: address,
    birthdate: birthdate,
    occupation: role === "Service Provider" ? services[Math.floor(Math.random() * services.length)] : "",
    employed: employed,
    role: role,
    profilePic: `https://picsum.photos/200/200?random=${i}`,
    validId: "https://via.placeholder.com/300x200/cccccc/000000?text=Valid+ID",
    password: "password123",
    verified: Math.random() > 0.8 ? false : true // 80% verified, 20% pending
  };

  if (role === "Service Provider") {
    const numSkills = Math.floor(Math.random() * 3) + 1; // 1-3 skills
    userData.skills = getRandomSkills(numSkills);
    userData.availability = ["Available", "Currently Working", "Not Available"][Math.floor(Math.random() * 3)];
    userData.acceptedWork = Math.random() > 0.5; // Randomly set acceptedWork

    // Create services array for service providers (1-3 services)
    const numServices = Math.floor(Math.random() * 3) + 1;
    userData.services = [];
    for (let j = 0; j < numServices; j++) {
      const serviceName = services[Math.floor(Math.random() * services.length)];
      userData.services.push({
        name: serviceName,
        rate: Math.floor(Math.random() * 500) + 100,
        description: `Professional ${serviceName.toLowerCase()} service. Quality work guaranteed.`
      });
    }

    // Add certificates (50% chance)
    if (Math.random() > 0.5) {
      const numCertificates = Math.floor(Math.random() * 3) + 1;
      userData.certificates = [];
      for (let j = 0; j < numCertificates; j++) {
        userData.certificates.push(`https://via.placeholder.com/300x200/cccccc/000000?text=Certificate+${j + 1}`);
      }
    }
  }

  usersData.push(userData);
}

const users = await User.create(usersData);
console.log("50 users created");

// Get user providers and members
const providers = users.filter(u => u.role === "Service Provider");
const members = users.filter(u => u.role === "Community Member");

// Service Request Statuses
const srStatuses = ["Waiting", "Working", "Complete", "Cancelled", "No Longer Available"];

// Booking Statuses
const bookingStatuses = ["Available", "Working", "Complete", "Cancelled"];

// Create 50 ServiceRequests (connected to members and assign providers)
const serviceRequestsData = [];
for (let i = 0; i < 50; i++) {
  const member = members[Math.floor(Math.random() * members.length)];
  const assignedProvider = providers[Math.floor(Math.random() * providers.length)];
  serviceRequestsData.push({
    requester: member._id,
    serviceProvider: assignedProvider._id,
    name: member.firstName + " " + member.lastName,
    address: member.address,
    phone: member.phone,
    serviceProviderName: assignedProvider.firstName + " " + assignedProvider.lastName,
    typeOfWork: services[Math.floor(Math.random() * services.length)],
    time: `${Math.floor(Math.random() * 12) + 1}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')} PM`,
    budget: Math.floor(Math.random() * 1000) + 200,
    notes: "Sample service request notes",
    status: srStatuses[Math.floor(Math.random() * srStatuses.length)],
    serviceProviderPhone: assignedProvider.phone,
    serviceProviderAddress: assignedProvider.address
  });
}

const serviceRequests = await ServiceRequest.insertMany(serviceRequestsData);
console.log("50 service requests created");

// Create 50 Bookings (link to serviceRequests with their assigned providers)
const bookingsData = serviceRequests.map(sr => ({
  requester: sr.requester,
  provider: sr.serviceProvider,
  serviceRequest: sr._id,
  status: bookingStatuses[Math.floor(Math.random() * bookingStatuses.length)]
}));

const bookings = await Booking.insertMany(bookingsData);
console.log("50 bookings created");

// Create 50 Reviews (for bookings)
const reviewsData = bookings.map(booking => ({
  booking: booking._id,
  reviewer: booking.requester,
  reviewee: booking.provider,
  rating: Math.floor(Math.random() * 5) + 1,
  comments: "Sample review comment"
}));

const reviews = await Review.insertMany(reviewsData);
console.log("50 reviews created");

// Create 50 Reports (from members to providers)
const reportsData = [];
for (let i = 0; i < 50; i++) {
  const member = members[Math.floor(Math.random() * members.length)];
  const provider = providers[Math.floor(Math.random() * providers.length)];
  reportsData.push({
    reporter: member._id,
    reportedUser: provider._id,
    reason: "Sample reason",
    description: "Sample description"
  });
}

await Report.insertMany(reportsData);
console.log("50 reports created");

// Create 50 Notifications
const notificationsData = [];
for (let i = 0; i < 50; i++) {
  const user = users[Math.floor(Math.random() * users.length)];
  notificationsData.push({
    user: user._id,
    title: `Notification ${i}`,
    message: `This is a sample notification ${i} for ${user.firstName}.`
  });
}

const notifications = await Notification.insertMany(notificationsData);
console.log("50 notifications created");

// Update users with notifications
for (const notif of notifications) {
  await User.findByIdAndUpdate(notif.user, { $push: { notifications: notif._id } });
}

// Create 50 VerificationAppointments
const verificationsData = [];
for (let i = 0; i < 50; i++) {
  const provider = providers[Math.floor(Math.random() * providers.length)];
  verificationsData.push({
    provider: provider._id,
    scheduledBy: admin._id,
    appointmentDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
    location: "Barangay Hall, Sampaloc, Manila"
  });
}

await VerificationAppointment.insertMany(verificationsData);
console.log("50 verification appointments created");

// Create 50 Chats
const chatsData = [];
for (let i = 0; i < 50; i++) {
  const booking = bookings[Math.floor(Math.random() * bookings.length)];
  const sender = Math.random() > 0.5 ? booking.requester : booking.provider;
  chatsData.push({
    appointment: booking._id,
    sender: sender,
    message: `Sample chat message ${i}`,
    status: ["sent", "delivered", "seen"][Math.floor(Math.random() * 3)]
  });
}

await Chat.insertMany(chatsData);
console.log("50 chats created");

// Create 50 Services (created by admin)
const servicesData = [];
const serviceNamesSet = new Set();
while (serviceNamesSet.size < 50) {
  const name = `Service ${Math.random().toString(36).substring(7)}`;
  serviceNamesSet.add(name);
}
for (const name of serviceNamesSet) {
  servicesData.push({
    name: name,
    description: `Description for ${name}`,
    rate: Math.floor(Math.random() * 500) + 50,
    createdBy: admin._id
  });
}

await Service.insertMany(servicesData);
console.log("50 services created");

// Update users with bookings where applicable
for (const booking of bookings) {
  await User.findByIdAndUpdate(booking.requester, { $push: { bookings: booking._id } });
  await User.findByIdAndUpdate(booking.provider, { $push: { bookings: booking._id } });
}

console.log("Seeding completed successfully!");
process.exit();
