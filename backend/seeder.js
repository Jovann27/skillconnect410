import mongoose from "mongoose";
import dotenv from "dotenv";
import logger from "./utils/logger.js";
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

logger.info("Cleared existing data");

const DEFAULT_PASSWORD = process.env.ADMIN_SEED_PASSWORD || null;

let passwordToUse = DEFAULT_PASSWORD;

if (!passwordToUse) {
  passwordToUse = "AdminPass123";
}

let admin = null;
const existingAdmin = await Admin.findOne({ email: "skillconnect@gmail.com" });
if (existingAdmin) {
  logger.info("Admin already exists, skipping admin creation.");
  admin = existingAdmin;
} else {
  admin = await Admin.create({
    name: "Admin",
    profilePic: "",
    email: "skillconnect@gmail.com",
    password: passwordToUse,
    role: "Admin"
  });
  logger.info("Admin created successfully.");
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

// Create comprehensive services covering all barangay community needs
const servicesData = [
  // Home & Property Maintenance
  { name: "Home Cleaning", description: "General house cleaning, deep cleaning, and post-construction cleanup services", rate: 500, createdBy: admin._id },
  { name: "Plumbing Services", description: "Pipe installation, leak repair, toilet and sink installation, drain cleaning", rate: 300, createdBy: admin._id },
  { name: "Electrical Services", description: "Wiring, lighting repair, outlet installation, electrical panel maintenance", rate: 400, createdBy: admin._id },
  { name: "Carpentry & Woodwork", description: "Furniture repair, custom woodwork, door/window fixing, cabinet installation", rate: 600, createdBy: admin._id },
  { name: "Painting Services", description: "Interior/exterior painting, repainting, wallpaper installation", rate: 800, createdBy: admin._id },
  { name: "Roofing & Tiling", description: "Roof repair, tile installation, waterproofing services", rate: 1000, createdBy: admin._id },
  { name: "Masonry & Concrete Work", description: "Bricklaying, concrete work, foundation repair, driveway paving", rate: 700, createdBy: admin._id },
  { name: "Flooring Installation", description: "Hardwood, tile, laminate, and vinyl flooring installation and repair", rate: 900, createdBy: admin._id },

  // Appliance & Equipment Repair
  { name: "Appliance Repair", description: "Refrigerator, washing machine, air conditioner, microwave repair", rate: 350, createdBy: admin._id },
  { name: "TV & Electronics Repair", description: "Television, computer, phone, and other electronics repair", rate: 250, createdBy: admin._id },
  { name: "Generator & Power Equipment", description: "Generator installation, maintenance, and repair services", rate: 600, createdBy: admin._id },

  // Pest Control & Gardening
  { name: "Pest Control Services", description: "Termite treatment, cockroach control, rodent extermination", rate: 450, createdBy: admin._id },
  { name: "Gardening & Landscaping", description: "Lawn mowing, plant care, landscape design, tree trimming", rate: 400, createdBy: admin._id },
  { name: "Irrigation Systems", description: "Sprinkler system installation and maintenance", rate: 550, createdBy: admin._id },

  // HVAC & Ventilation
  { name: "Air Conditioning Services", description: "AC installation, cleaning, repair, and maintenance", rate: 500, createdBy: admin._id },
  { name: "Ventilation & Duct Cleaning", description: "HVAC maintenance, duct cleaning, ventilation setup", rate: 600, createdBy: admin._id },

  // Security & Technology
  { name: "Home Security Systems", description: "CCTV installation, alarm systems, smart locks", rate: 800, createdBy: admin._id },
  { name: "IT & Computer Services", description: "Computer setup, network installation, WiFi setup, virus removal", rate: 300, createdBy: admin._id },
  { name: "Phone & Tablet Repair", description: "Mobile phone, tablet, and smartphone repair services", rate: 200, createdBy: admin._id },

  // Automotive Services
  { name: "Car Wash & Detailing", description: "Professional car washing, detailing, and interior cleaning", rate: 250, createdBy: admin._id },
  { name: "Automotive Repair", description: "Basic car maintenance, tire repair, battery replacement, oil changes", rate: 400, createdBy: admin._id },
  { name: "Car Painting", description: "Automotive painting, scratch removal, and body work", rate: 1200, createdBy: admin._id },

  // Laundry & Textile Services
  { name: "Laundry Services", description: "Washing, drying, ironing, folding, and dry cleaning", rate: 150, createdBy: admin._id },
  { name: "Upholstery Cleaning", description: "Sofa, chair, and furniture upholstery cleaning", rate: 350, createdBy: admin._id },
  { name: "Curtain & Textile Care", description: "Curtain cleaning, alteration, and textile repair", rate: 200, createdBy: admin._id },

  // Specialty Services
  { name: "Pool & Spa Maintenance", description: "Swimming pool cleaning, chemical balancing, equipment repair", rate: 400, createdBy: admin._id },
  { name: "Water Tank & Purification", description: "Water tank cleaning, purification system installation", rate: 350, createdBy: admin._id },
  { name: "Elevator & Lift Services", description: "Elevator maintenance, repair, and modernization", rate: 1500, createdBy: admin._id },
  { name: "Solar Panel Services", description: "Solar panel installation, maintenance, and repair", rate: 800, createdBy: admin._id },

  // Event & Entertainment Services
  { name: "Event Setup & Coordination", description: "Party setup, decoration, sound system, and lighting", rate: 600, createdBy: admin._id },
  { name: "Photography & Videography", description: "Event photography, wedding videography, portraits", rate: 1000, createdBy: admin._id },
  { name: "Catering & Food Services", description: "Event catering, food preparation, and service", rate: 800, createdBy: admin._id },

  // Health & Wellness
  { name: "Massage Therapy", description: "Professional massage, relaxation, and therapeutic services", rate: 300, createdBy: admin._id },
  { name: "First Aid & Medical Assistance", description: "Basic first aid, health monitoring, and medical support", rate: 250, createdBy: admin._id },
  { name: "Elder Care Services", description: "Assistance for elderly, companionship, and personal care", rate: 350, createdBy: admin._id },
  { name: "Child Care Services", description: "Babysitting, tutoring, and childcare assistance", rate: 200, createdBy: admin._id },

  // Educational Services
  { name: "Tutoring Services", description: "Academic tutoring, homework help, and educational support", rate: 250, createdBy: admin._id },
  { name: "Language Lessons", description: "English, Filipino, and foreign language instruction", rate: 300, createdBy: admin._id },
  { name: "Music & Art Lessons", description: "Piano, guitar, singing, painting, and art instruction", rate: 350, createdBy: admin._id },
  { name: "Computer Training", description: "Basic computer skills, internet usage, software training", rate: 200, createdBy: admin._id },

  // Pet Services
  { name: "Pet Grooming", description: "Dog bathing, haircuts, nail trimming, and pet care", rate: 200, createdBy: admin._id },
  { name: "Pet Sitting & Walking", description: "Pet sitting, dog walking, and animal care services", rate: 150, createdBy: admin._id },
  { name: "Veterinary Assistance", description: "Basic animal health care and veterinary support", rate: 300, createdBy: admin._id },
  { name: "Aquarium Services", description: "Fish tank setup, maintenance, and cleaning", rate: 250, createdBy: admin._id },

  // Business & Professional Services
  { name: "Accounting & Bookkeeping", description: "Financial record keeping, tax preparation, and accounting services", rate: 500, createdBy: admin._id },
  { name: "Legal Assistance", description: "Basic legal advice, document preparation, and consultation", rate: 600, createdBy: admin._id },
  { name: "Marketing & Advertising", description: "Business marketing, social media management, and advertising", rate: 400, createdBy: admin._id },
  { name: "Business Consulting", description: "Business planning, strategy, and operational consulting", rate: 700, createdBy: admin._id },
  { name: "Grant Writing & Funding", description: "Grant application assistance and funding consultation", rate: 800, createdBy: admin._id },
  { name: "Translation Services", description: "Document translation, interpretation, and language services", rate: 300, createdBy: admin._id },

  // Construction & Renovation
  { name: "Home Renovation", description: "Kitchen remodeling, bathroom renovation, room additions", rate: 1500, createdBy: admin._id },
  { name: "Fence & Gate Installation", description: "Fence building, gate installation, and security barriers", rate: 700, createdBy: admin._id },
  { name: "Window & Door Services", description: "Window installation, door repair, and glass replacement", rate: 500, createdBy: admin._id },
  { name: "Insulation & Weatherproofing", description: "Home insulation, weatherproofing, and energy efficiency", rate: 600, createdBy: admin._id },

  // Environmental & Waste Services
  { name: "Waste Management", description: "Garbage collection, recycling services, and waste disposal", rate: 300, createdBy: admin._id },
  { name: "Composting Services", description: "Compost setup, maintenance, and organic waste management", rate: 250, createdBy: admin._id },
  { name: "Water Conservation", description: "Water-saving fixtures, leak detection, and conservation consulting", rate: 400, createdBy: admin._id },

  // Community Services
  { name: "Community Event Planning", description: "Barangay events, celebrations, and community gatherings", rate: 500, createdBy: admin._id },
  { name: "Disaster Preparedness", description: "Emergency planning, first aid training, and disaster response", rate: 350, createdBy: admin._id },
  { name: "Neighborhood Watch", description: "Community safety, security coordination, and watch programs", rate: 200, createdBy: admin._id }
];

await Service.insertMany(servicesData);
console.log(`${servicesData.length} comprehensive services created`);

// Update users with bookings where applicable
for (const booking of bookings) {
  await User.findByIdAndUpdate(booking.requester, { $push: { bookings: booking._id } });
  await User.findByIdAndUpdate(booking.provider, { $push: { bookings: booking._id } });
}

console.log("Seeding completed successfully!");
process.exit();
